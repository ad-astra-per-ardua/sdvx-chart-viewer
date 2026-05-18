"""Pydantic schemas — the API contract."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ChartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    difficulty: str
    level: float
    jacket_url: Optional[str] = None
    tags: List[TagOut] = []


class ChartImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_url: str
    order_idx: int
    part: str


class SongListItem(BaseModel):
    """Row used in the discover list."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    artist: str
    jacket_url: Optional[str] = None
    created_at: datetime
    charts: List[ChartOut]


class SongDetail(SongListItem):
    """Same as list item for now — kept separate so we can grow it."""
    pass


class ChartDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    difficulty: str
    level: float
    jacket_url: Optional[str] = None
    song: SongDetail
    images: List[ChartImageOut]
    tags: List[TagOut]  # chart-level tags


class FilterMeta(BaseModel):
    """Used by the frontend to populate filter chips."""
    difficulties: List[str]
    tags: List[str]
    level_min: int
    level_max: int
