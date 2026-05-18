"""
SQLAlchemy ORM models for the SDVX Megamix chart viewer.

Song  ─< Chart (NOV/ADV/EXH/MXM/…)  ─< ChartImage (intro/outro/main/alt)
                                      >─ Tag  (via chart_tag)
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey,
    Table, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship
from .database import Base


# ── Many-to-many: Song <-> Tag (레거시) ──────────────────────────────────────
song_tag = Table(
    "song_tag", Base.metadata,
    Column("song_id", Integer, ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id",  Integer, ForeignKey("tags.id",  ondelete="CASCADE"), primary_key=True),
)

# ── Many-to-many: Chart <-> Tag ──────────────────────────────────────────────
chart_tag = Table(
    "chart_tag", Base.metadata,
    Column("chart_id", Integer, ForeignKey("charts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id",   Integer, ForeignKey("tags.id",   ondelete="CASCADE"), primary_key=True),
)
# PK는 (chart_id, tag_id) 복합이므로 chart_id 선두 → tag_id 단독 조회용 인덱스 추가
Index("idx_chart_tag_tag_id", chart_tag.c.tag_id)


class Tag(Base):
    __tablename__ = "tags"
    id   = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(32), unique=True, nullable=False)
    # UNIQUE constraint이 name 인덱스를 자동 생성


class Song(Base):
    __tablename__ = "songs"
    __table_args__ = (
        Index("idx_songs_created_at", "created_at"),   # 신곡순 정렬
        Index("idx_songs_title",      "title"),         # 제목 검색
        Index("idx_songs_artist",     "artist"),        # 아티스트 검색
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    title      = Column(String(255), nullable=False)
    artist     = Column(String(255), nullable=False)
    jacket_url = Column(String(512), nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    charts = relationship("Chart", back_populates="song",
                          cascade="all, delete-orphan",
                          order_by="Chart.id",
                          lazy="select")
    # song_tag는 레거시 — 쿼리 시 JOIN이 발생하지 않도록 noload
    tags = relationship("Tag", secondary=song_tag, lazy="noload")


class Chart(Base):
    """한 곡의 단일 난이도 패턴."""
    __tablename__ = "charts"
    __table_args__ = (
        UniqueConstraint("song_id", "difficulty", name="uq_song_diff"),
        Index("idx_charts_song_id",     "song_id"),             # Song→Charts JOIN
        Index("idx_charts_level",       "level"),               # 레벨 범위 필터
        Index("idx_charts_diff_level",  "difficulty", "level"), # 난이도+레벨 복합 필터
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    song_id    = Column(Integer, ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    difficulty = Column(String(8), nullable=False)
    level      = Column(Float, nullable=False)
    jacket_url = Column(String(512), nullable=True)

    song   = relationship("Song", back_populates="charts")
    images = relationship("ChartImage", back_populates="chart",
                          cascade="all, delete-orphan",
                          order_by="ChartImage.order_idx",
                          lazy="select")
    # selectinload로 명시 로드 — 암묵적 JOIN 방지
    tags   = relationship("Tag", secondary=chart_tag, lazy="select")


class ChartImage(Base):
    """패턴 상세 이미지 (파트별, 순서 있음)."""
    __tablename__ = "chart_images"
    __table_args__ = (
        # chart_id 단독 조회 (차트의 전체 이미지 목록)
        Index("idx_chart_images_chart_id",   "chart_id"),
        # chart_id + part 복합 (파트별 이미지 조회 — 가장 자주 사용)
        Index("idx_chart_images_chart_part", "chart_id", "part"),
    )

    id        = Column(Integer, primary_key=True, autoincrement=True)
    chart_id  = Column(Integer, ForeignKey("charts.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(512), nullable=False)
    order_idx = Column(Integer, default=0, nullable=False)
    part      = Column(String(8), default="main", nullable=False)  # intro/outro/main/alt

    chart = relationship("Chart", back_populates="images")
