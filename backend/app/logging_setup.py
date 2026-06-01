import logging
import logging.handlers
import os
from pathlib import Path

_LOG_DIR = Path(os.getenv("LOG_DIR", "data/logs"))
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB per file
_BACKUP_COUNT = 5


def _file_handler(filename: str, level: int) -> logging.Handler:
    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    handler = logging.handlers.RotatingFileHandler(
        _LOG_DIR / filename,
        maxBytes=_MAX_BYTES,
        backupCount=_BACKUP_COUNT,
        encoding="utf-8",
    )
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    ))
    return handler


def configure() -> None:
    for name, filename in (
        ("sdvx.audit",   "audit.log"),
        ("sdvx.security", "security.log"),
    ):
        logger = logging.getLogger(name)
        if not logger.handlers:
            logger.addHandler(_file_handler(filename, logging.INFO))
            logger.propagate = True
