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
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    artist: str
    jacket_url: Optional[str] = None
    created_at: datetime
    charts: List[ChartOut]


class SongDetail(SongListItem):
    pass


class SongAdminOut(SongListItem):
    keywords: str = ""


class ChartDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    difficulty: str
    level: float
    jacket_url: Optional[str] = None
    song: SongDetail
    images: List[ChartImageOut]
    tags: List[TagOut]


class FilterMeta(BaseModel):
    difficulties: List[str]
    tags: List[str]
    level_min: float
    level_max: float
