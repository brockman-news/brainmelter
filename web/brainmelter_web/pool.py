"""Bounded, persistent pool of headlines seen on the channel.

The live channel delivers a few headlines per minute; the installation replays the pool to stay overwhelming,
and the state file keeps the pool filled across restarts (or when the congress network is down).
"""

import hashlib
import json
import logging
import time
from collections import OrderedDict
from dataclasses import asdict, dataclass, fields
from pathlib import Path

log = logging.getLogger(__name__)


@dataclass
class Item:
    id: str
    nick: str
    title: str
    url: str
    kind: str  # "news" or "error"
    t: float


FIELDS = {f.name for f in fields(Item)}


def item_id(nick: str, title: str) -> str:
    return hashlib.sha1(f"{nick}\0{title}".encode()).hexdigest()[:12]


class Pool:
    def __init__(self, path: Path | None, size: int) -> None:
        self.path = path
        self.size = size
        self.items: OrderedDict[str, Item] = OrderedDict()
        if path and path.exists():
            self._load()

    def _load(self) -> None:
        with self.path.open(encoding="utf-8") as lines:
            for line in lines:
                try:
                    self._put(Item(**{k: v for k, v in json.loads(line).items() if k in FIELDS}))
                except (ValueError, TypeError):
                    continue
        log.info("loaded %d headlines from %s", len(self.items), self.path)
        # compact: rewrite only what survived the size limit
        tmp = self.path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as out:
            for item in self.items.values():
                out.write(json.dumps(asdict(item), ensure_ascii=False) + "\n")
        tmp.replace(self.path)

    def _put(self, item: Item) -> None:
        self.items.pop(item.id, None)
        self.items[item.id] = item
        while len(self.items) > self.size:
            self.items.popitem(last=False)

    def add(self, nick: str, title: str, url: str, kind: str) -> Item:
        item = Item(item_id(nick, title), nick, title, url, kind, time.time())
        self._put(item)
        if self.path:
            with self.path.open("a", encoding="utf-8") as out:
                out.write(json.dumps(asdict(item), ensure_ascii=False) + "\n")
        return item

    def get(self, id_: str) -> Item | None:
        return self.items.get(id_)

    def recent(self, n: int) -> list[Item]:
        return list(self.items.values())[-n:]
