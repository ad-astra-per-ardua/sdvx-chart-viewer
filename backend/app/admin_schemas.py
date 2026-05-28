import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

_BLOCKED_SCHEMES = re.compile(r'^(javascript|vbscript|data|file|ftp)\s*:', re.IGNORECASE)


def _validate_url(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    if _BLOCKED_SCHEMES.match(v):
        raise ValueError("URL scheme not allowed")
    if not (v.startswith("http://") or v.startswith("https://") or v.startswith("/uploads/")):
        raise ValueError("URL must start with http://, https://, or /uploads/")
    return v


class SongCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    artist: str = Field(..., min_length=1, max_length=255)
    keywords: str = Field("", max_length=1000)


class SongUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    artist: Optional[str] = Field(None, min_length=1, max_length=255)
    keywords: Optional[str] = Field(None, max_length=1000)


class ChartCreate(BaseModel):
    song_id: int
    difficulty: str = Field(..., pattern="^(NOV|ADV|EXH|MXM|INF|GRV|HVN|VVD|XCD|ULT|NBL)$")
    level: float = Field(..., ge=1.0, le=20.9)
    tag_ids: List[int] = []
    jacket_url: Optional[str] = Field(None, max_length=512)

    @field_validator("jacket_url")
    @classmethod
    def validate_jacket_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url(v)


class ChartUpdate(BaseModel):
    difficulty: Optional[str] = Field(None, pattern="^(NOV|ADV|EXH|MXM|INF|GRV|HVN|VVD|XCD|ULT|NBL)$")
    level: Optional[float] = Field(None, ge=1.0, le=20.9)
    tag_ids: Optional[List[int]] = None
    jacket_url: Optional[str] = Field(None, max_length=512)

    @field_validator("jacket_url")
    @classmethod
    def validate_jacket_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url(v)


class ChartImageCreate(BaseModel):
    chart_id: int
    image_url: str = Field(..., min_length=1, max_length=512)
    order_idx: int = 0
    part: str = Field("main", pattern="^(intro|outro|main|alt)$")

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str) -> str:
        result = _validate_url(v)
        assert result is not None
        return result


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=32, pattern=r"^[A-Za-z0-9 \-_]+$")


class UploadResponse(BaseModel):
    url: str
    filename: str
    size: int
