import time

_store: dict = {}
TTL = 300.0


def get(key: tuple):
    entry = _store.get(key)
    if entry and time.monotonic() - entry[2] < TTL:
        return entry[0], entry[1]
    return None


def set(key: tuple, body: bytes, total: str) -> None:
    _store[key] = (body, total, time.monotonic())


def invalidate() -> None:
    _store.clear()
