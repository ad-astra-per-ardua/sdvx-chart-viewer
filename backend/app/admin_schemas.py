from typing import List, Optional
from pydantic import BaseModel, Field


class SongCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    artist: str = Field(..., min_length=1, max_length=255)
    keywords: str = ""


class SongUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    artist: Optional[str] = Field(None, min_length=1, max_length=255)
    keywords: Optional[str] = None


class ChartCreate(BaseModel):
    song_id: int
    difficulty: str = Field(..., pattern="^(NOV|ADV|EXH|MXM|INF|GRV|HVN|VVD|XCD|ULT|NBL)$")
    level: float = Field(..., ge=1.0, le=20.9)
    tag_ids: List[int] = []
    jacket_url: Optional[str] = Field(None, max_length=512)


class ChartUpdate(BaseModel):
    difficulty: Optional[str] = Field(None, pattern="^(NOV|ADV|EXH|MXM|INF|GRV|HVN|VVD|XCD|ULT|NBL)$")
    level: Optional[float] = Field(None, ge=1.0, le=20.9)
    tag_ids: Optional[List[int]] = None
    jacket_url: Optional[str] = Field(None, max_length=512)


class ChartImageCreate(BaseModel):
    chart_id: int
    image_url: str = Field(..., min_length=1, max_length=512)
    order_idx: int = 0
    part: str = Field("main", pattern="^(intro|outro|main|alt)$")


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=32)


class UploadResponse(BaseModel):
    url: str
    filename: str
    size: int
