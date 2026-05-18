"""
Database connection layer.

Default: SQLite (WAL mode + 64 MB cache for read-heavy workloads).
Production: set DATABASE_URL, e.g.
    postgresql+psycopg2://user:pass@host:5432/dbname
"""

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/songs.db")

_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        future=True,
        # SQLite는 단일 파일 — 과도한 풀링 불필요
        pool_size=1,
        max_overflow=0,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(conn, _rec):
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")       # 동시 읽기 성능 향상
        cur.execute("PRAGMA synchronous=NORMAL")     # 안전성 유지하며 fsync 감소
        cur.execute("PRAGMA cache_size=-65536")      # 64 MB 페이지 캐시
        cur.execute("PRAGMA temp_store=MEMORY")      # 임시 테이블을 메모리에
        cur.execute("PRAGMA mmap_size=268435456")    # 256 MB memory-mapped I/O
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

else:
    engine = create_engine(
        DATABASE_URL,
        future=True,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,   # 30분마다 커넥션 재생성 (방화벽 타임아웃 방지)
        pool_pre_ping=True,  # 스테일 커넥션 자동 감지
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
