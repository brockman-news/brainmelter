"""brainmelter-web: follow brockman's firehose channel and serve the installation to browsers."""

import argparse
import asyncio
import json
import logging
import os
import re
import threading
import weakref
from dataclasses import asdict
from pathlib import Path

from aiohttp import WSMsgType, web

from . import irc
from .lang import Detector
from .pool import Pool
from .tts import Busy, Speech

log = logging.getLogger("brainmelter")
STATIC = Path(__file__).parent / "static"
URL = re.compile(r"https?://\S+")


def parse_args() -> argparse.Namespace:
    state_home = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local/state"))
    env_path = lambda key: Path(os.environ[key]) if os.environ.get(key) else None  # noqa: E731
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8080)
    p.add_argument("--irc-host", default="brockman.news")
    # brockman.news only opens 6667 in its firewall; its TLS listener on 6697 is not reachable from outside
    p.add_argument("--irc-port", type=int, default=6667)
    p.add_argument("--tls", action="store_true", help="connect with TLS (e.g. --irc-port 6697)")
    p.add_argument("--channel", default="#all")
    p.add_argument("--nick", default="brainmelter")
    p.add_argument("--voices", type=Path, default=env_path("BRAINMELTER_VOICES"), help="directory of piper *.onnx models")
    p.add_argument("--fonts", type=Path, default=env_path("BRAINMELTER_FONTS"), help="directory with fonts.json and font files")
    p.add_argument("--state", type=Path, default=state_home / "brainmelter" / "headlines.jsonl")
    p.add_argument("--pool-size", type=int, default=20000, help="headlines kept for replay")
    p.add_argument("--snapshot", type=int, default=3000, help="headlines sent to a browser on connect")
    # defaults leave half the CPU to the browser: an X220 (2 cores, 4 threads) gets 2 single-threaded syntheses
    p.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 4) // 2), help="parallel syntheses")
    p.add_argument("--threads-per-job", type=int, default=1, help="onnxruntime threads per synthesis")
    p.add_argument("--max-models", type=int, default=0, help="piper models kept in memory, ~100 MB each (0: as many as fit in 40%% of free RAM)")
    p.add_argument("--robot-share", type=float, default=0.12, help="share of utterances given to espeak-ng robots")
    p.add_argument("--no-preload", dest="preload", action="store_false", help="load piper models on first use")
    return p.parse_args()


def split_message(message: irc.Message) -> tuple[str, str, str]:
    """brockman posts '<short url> <title>'; notices are feed errors."""
    text = message.text
    if message.command == "NOTICE":
        found = URL.search(text)
        return text, found.group(0) if found else "", "error"
    head, _, rest = text.partition(" ")
    if URL.fullmatch(head):
        return rest.strip(), head, "news"
    return text, "", "news"


def make_app(args: argparse.Namespace) -> web.Application:
    args.state.parent.mkdir(parents=True, exist_ok=True)
    pool = Pool(args.state, args.pool_size)
    speech = Speech(args.voices, args.workers, args.threads_per_job, args.robot_share, args.max_models)
    detector = Detector()
    sockets: weakref.WeakSet[web.WebSocketResponse] = weakref.WeakSet()
    fonts = json.loads((args.fonts / "fonts.json").read_text()) if args.fonts else []

    async def on_message(message: irc.Message) -> None:
        title, url, kind = split_message(message)
        if not title:
            return
        lang = detector.detect(message.nick, title) if kind == "news" else "en"
        item = pool.add(message.nick, title, url, lang, kind)
        payload = json.dumps({"type": "item", "item": asdict(item)}, ensure_ascii=False)
        for ws in list(sockets):
            try:
                await ws.send_str(payload)
            except ConnectionError:
                sockets.discard(ws)

    async def index(_: web.Request) -> web.FileResponse:
        return web.FileResponse(STATIC / "index.html")

    async def fonts_json(_: web.Request) -> web.Response:
        return web.json_response(fonts)

    async def websocket(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse(heartbeat=30)
        await ws.prepare(request)
        await ws.send_json(
            {
                "type": "hello",
                "items": [asdict(i) for i in pool.recent(args.snapshot)],
            },
            dumps=lambda o: json.dumps(o, ensure_ascii=False),
        )
        sockets.add(ws)
        async for msg in ws:  # clients never send anything meaningful; just keep the socket open
            if msg.type == WSMsgType.ERROR:
                break
        sockets.discard(ws)
        return ws

    async def speak(request: web.Request) -> web.Response:
        item = pool.get(request.query.get("id", ""))
        if item is None:
            raise web.HTTPNotFound()
        try:
            seed = int(request.query.get("seed", "0"))
        except ValueError:
            raise web.HTTPBadRequest()
        wrong = request.query.get("wrong") == "1"
        try:
            utterance = await speech.speak(item.id, item.title[:400], item.lang, seed, wrong)
        except Busy:
            raise web.HTTPServiceUnavailable(text="synthesis backlog full")
        return web.Response(
            body=utterance.wav,
            content_type="audio/wav",
            headers={"X-Voice": utterance.voice, "Cache-Control": "max-age=3600"},
        )

    async def start_background(app: web.Application) -> None:
        app["irc"] = asyncio.create_task(
            irc.follow(args.irc_host, args.irc_port, args.tls, args.channel, args.nick, on_message)
        )
        if args.preload:
            threading.Thread(target=speech.preload, name="preload", daemon=True).start()

    async def stop_background(app: web.Application) -> None:
        app["irc"].cancel()
        for ws in list(sockets):
            await ws.close()

    app = web.Application()
    app.on_startup.append(start_background)
    app.on_shutdown.append(stop_background)

    async def revalidate(request: web.Request, response: web.StreamResponse) -> None:
        # nix store files are dated 1970, which browsers take as "cache for decades": after an update they
        # would keep running the old page. Fonts never change, so they may stay cached.
        if request.path == "/" or request.path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-cache"

    app.on_response_prepare.append(revalidate)
    app.router.add_get("/", index)
    app.router.add_get("/fonts.json", fonts_json)
    app.router.add_get("/ws", websocket)
    app.router.add_get("/speak", speak)
    app.router.add_static("/static", STATIC)
    if args.fonts:
        # the font directory is a nix store tree of symlinks
        app.router.add_static("/fonts", args.fonts, follow_symlinks=True)
    return app


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    args = parse_args()
    log.info("melting brains at http://%s:%d/", args.host, args.port)
    # access logs would mostly be /speak requests, several per second, for days
    web.run_app(make_app(args), host=args.host, port=args.port, print=None, access_log=None)


if __name__ == "__main__":
    main()
