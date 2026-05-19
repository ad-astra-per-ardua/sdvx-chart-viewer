from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey,
    Table, UniqueConstraint, Index, Text,
)
from sqlalchemy.orm import relationship
from .database import Base

FALLBACK_JACKET_URL = "/uploads/PTnXJN2w2xo_600px-Generic_Jacket_EG.png"

chart_tag = Table(
    "chart_tag", Base.metadata,
    Column("chart_id", Integer, ForeignKey("charts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)
Index("idx_chart_tag_tag_id", chart_tag.c.tag_id)


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(32), unique=True, nullable=False)


class Song(Base):
    __tablename__ = "songs"
    __table_args__ = (
        Index("idx_songs_created_at", "created_at"),
        Index("idx_songs_title", "title"),
        Index("idx_songs_artist", "artist"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=False)
    keywords = Column(Text, nullable=False, server_default="", default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    charts = relationship("Chart", back_populates="song",
                          cascade="all, delete-orphan",
                          order_by="Chart.id",
                          lazy="select")


class Chart(Base):
    __tablename__ = "charts"
    __table_args__ = (
        UniqueConstraint("song_id", "difficulty", name="uq_song_diff"),
        Index("idx_charts_song_id", "song_id"),
        Index("idx_charts_level", "level"),
        Index("idx_charts_diff_level", "difficulty", "level"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    song_id = Column(Integer, ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    difficulty = Column(String(8), nullable=False)
    level = Column(Float, nullable=False)
    jacket_url = Column(String(512), nullable=True)

    song = relationship("Song", back_populates="charts")
    images = relationship("ChartImage", back_populates="chart",
                          cascade="all, delete-orphan",
                          order_by="ChartImage.order_idx",
                          lazy="select")
    tags = relationship("Tag", secondary=chart_tag, lazy="select")


class ChartImage(Base):
    __tablename__ = "chart_images"
    __table_args__ = (
        Index("idx_chart_images_chart_id", "chart_id"),
        Index("idx_chart_images_chart_part", "chart_id", "part"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    chart_id = Column(Integer, ForeignKey("charts.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(512), nullable=False)
    order_idx = Column(Integer, default=0, nullable=False)
    part = Column(String(8), default="main", nullable=False)

    chart = relationship("Chart", back_populates="images")
