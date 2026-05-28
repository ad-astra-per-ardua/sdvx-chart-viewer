import time
from collections import OrderedDict
from threading import Lock

TTL = 300.0
MAX_ENTRIES = 256

_store: "OrderedDict[tuple, tuple]" = OrderedDict()
_lock = Lock()


def get(key: tuple):
    with _lock:
        entry = _store.get(key)
        if not entry:
            return None
        if time.monotonic() - entry[2] >= TTL:
            _store.pop(key, None)
            return None
        _store.move_to_end(key)
        return entry[0], entry[1]


def set(key: tuple, body: bytes, total: str) -> None:
    with _lock:
        _store[key] = (body, total, time.monotonic())
        _store.move_to_end(key)
        while len(_store) > MAX_ENTRIES:
            _store.popitem(last=False)


def invalidate() -> None:
    with _lock:
        _store.clear()
