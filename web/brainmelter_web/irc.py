"""Minimal read-only IRC client that follows a brockman channel."""

import asyncio
import logging
import random
import re
import ssl
from dataclasses import dataclass
from typing import Awaitable, Callable

log = logging.getLogger(__name__)

# mIRC formatting: bold, color (with optional fg,bg digits), reset, italics, underline, reverse, monospace, strike
FORMATTING = re.compile(r"\x03(\d{1,2}(,\d{1,2})?)?|[\x02\x0f\x11\x16\x1d\x1e\x1f]")


@dataclass
class Message:
    nick: str
    command: str  # PRIVMSG or NOTICE
    text: str


def parse_line(line: str) -> tuple[str, str, list[str]]:
    """Split an IRC line into (prefix, command, params); the trailing param keeps its spaces."""
    prefix = ""
    if line.startswith(":"):
        prefix, _, line = line[1:].partition(" ")
    if " :" in line:
        line, _, trailing = line.partition(" :")
        params = line.split()
        params.append(trailing)
    else:
        params = line.split()
    command = params.pop(0).upper() if params else ""
    return prefix, command, params


async def follow(
    host: str,
    port: int,
    use_tls: bool,
    channel: str,
    nick: str,
    on_message: Callable[[Message], Awaitable[None]],
) -> None:
    """Stay joined to `channel` forever, reconnecting with backoff."""
    backoff = 1.0
    while True:
        try:
            await _session(host, port, use_tls, channel, nick, on_message)
            backoff = 1.0
        except (OSError, asyncio.IncompleteReadError, ConnectionError, TimeoutError) as err:
            log.warning("irc connection to %s:%d lost: %r", host, port, err)
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 60.0)


async def _session(host, port, use_tls, channel, nick, on_message) -> None:
    context = ssl.create_default_context() if use_tls else None
    reader, writer = await asyncio.wait_for(
        asyncio.open_connection(host, port, ssl=context, happy_eyeballs_delay=0.25), timeout=30
    )

    def send(line: str) -> None:
        writer.write(line.encode() + b"\r\n")

    current_nick = nick
    send(f"NICK {current_nick}")
    send(f"USER {nick} 0 * :brainmelter installation")
    log.info("connecting to %s:%d as %s", host, port, current_nick)
    try:
        while True:
            # the server pings at least every few minutes; silence means a dead link
            raw = await asyncio.wait_for(reader.readline(), timeout=300)
            if not raw:
                raise ConnectionError("server closed the connection")
            line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
            prefix, command, params = parse_line(line)
            if command == "PING":
                send("PONG :" + (params[-1] if params else ""))
            elif command == "001":
                send(f"JOIN {channel}")
                log.info("joined %s", channel)
            elif command == "433":  # nickname in use
                current_nick = f"{nick}{random.randint(0, 9999)}"
                send(f"NICK {current_nick}")
            elif command in ("PRIVMSG", "NOTICE") and len(params) == 2:
                target, text = params
                if target.lower() == channel.lower():
                    sender = prefix.split("!", 1)[0]
                    await on_message(Message(sender, command, FORMATTING.sub("", text).strip()))
            await writer.drain()
    finally:
        writer.close()
