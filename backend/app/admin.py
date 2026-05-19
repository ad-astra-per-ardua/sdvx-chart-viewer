import os
import re
import secrets
import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .admin_schemas import (
    ChartCreate, ChartImageCreate, ChartUpdate,
    SongCreate, SongUpdate, TagCreate, UploadResponse,
)
from .database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _admin_token() -> str:
    return os.getenv("ADMIN_TOKEN", "change-me-in-production")


def require_admin(x_admin_token: str = Header(default="")) -> None:
    expected = _admin_token()
    if not secrets.compare_digest(x_admin_token or "", expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid admin token")


@router.post("/login")
def login(payload: dict):
    token = (payload or {}).get("token", "")
    if not secrets.compare_digest(token, _admin_token()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid admin token")
    return {"ok": True}


_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


@router.post("/upload", response_model=UploadResponse, dependencies=[Depends(require_admin)])
def upload(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"unsupported extension {ext!r}")

    safe = _SAFE_NAME.sub("_", Path(file.filename or "f").stem)[:60] or "file"
    final = f"{secrets.token_urlsafe(8)}_{safe}{ext}"
    dest = UPLOAD_DIR / final

    size = 0
    with dest.open("wb") as f:
        while True:
            chunk = file.file.read(64 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                f.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(413, "file too large (max 8MB)")
            f.write(chunk)

    base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    url = f"{base}/uploads/{final}" if base else f"/uploads/{final}"
    return UploadResponse(url=url, filename=final, size=size)


def _build_admin_song_out(s: models.Song) -> schemas.SongAdminOut:
    top = max(s.charts, key=lambda c: c.level, default=None)
    effective_jacket = (top.jacket_url if top else None) or models.FALLBACK_JACKET_URL
    return schemas.SongAdminOut(
        id=s.id, title=s.title, artist=s.artist,
        jacket_url=effective_jacket,
        created_at=s.created_at,
        keywords=s.keywords or "",
        charts=[schemas.ChartOut.model_validate(c) for c in s.charts],
    )


@router.get("/songs", response_model=List[schemas.SongAdminOut], dependencies=[Depends(require_admin)])
def admin_list_songs(db: Session = Depends(get_db), q: str | None = None):
    qry = (db.query(models.Song)
           .options(selectinload(models.Song.charts).selectinload(models.Chart.tags))
           .order_by(models.Song.created_at.desc()))
    if q:
        like = f"%{q}%"
        qry = qry.filter(
            (models.Song.title.ilike(like)) |
            (models.Song.artist.ilike(like)) |
            (models.Song.keywords.ilike(like))
        )
    return [_build_admin_song_out(s) for s in qry.all()]


@router.get("/songs/{song_id}", response_model=schemas.SongAdminOut, dependencies=[Depends(require_admin)])
def admin_get_song(song_id: int, db: Session = Depends(get_db)):
    s = (db.query(models.Song)
         .options(selectinload(models.Song.charts).selectinload(models.Chart.tags))
         .filter(models.Song.id == song_id)
         .first())
    if not s:
        raise HTTPException(404, "song not found")
    return _build_admin_song_out(s)


@router.post("/songs", response_model=schemas.SongAdminOut, dependencies=[Depends(require_admin)])
def admin_create_song(payload: SongCreate, db: Session = Depends(get_db)):
    song = models.Song(title=payload.title, artist=payload.artist,
                       keywords=payload.keywords)
    db.add(song)
    db.commit()
    db.refresh(song)
    return _build_admin_song_out(song)


@router.put("/songs/{song_id}", response_model=schemas.SongAdminOut, dependencies=[Depends(require_admin)])
def admin_update_song(song_id: int, payload: SongUpdate, db: Session = Depends(get_db)):
    song = (db.query(models.Song)
            .options(selectinload(models.Song.charts).selectinload(models.Chart.tags))
            .filter(models.Song.id == song_id)
            .first())
    if not song:
        raise HTTPException(404, "song not found")

    if payload.title is not None: song.title = payload.title
    if payload.artist is not None: song.artist = payload.artist
    if payload.keywords is not None: song.keywords = payload.keywords

    db.commit()
    db.refresh(song)
    return _build_admin_song_out(song)


@router.delete("/songs/{song_id}", status_code=204, dependencies=[Depends(require_admin)])
def admin_delete_song(song_id: int, db: Session = Depends(get_db)):
    song = db.query(models.Song).filter(models.Song.id == song_id).first()
    if not song:
        raise HTTPException(404, "song not found")
    db.delete(song)
    db.commit()


@router.post("/charts", response_model=schemas.ChartOut, dependencies=[Depends(require_admin)])
def admin_create_chart(payload: ChartCreate, db: Session = Depends(get_db)):
    if not db.query(models.Song).filter(models.Song.id == payload.song_id).first():
        raise HTTPException(404, "song not found")
    existing = (db.query(models.Chart)
                .filter(models.Chart.song_id == payload.song_id,
                        models.Chart.difficulty == payload.difficulty)
                .first())
    if existing:
        raise HTTPException(409, f"chart for {payload.difficulty} already exists on this song")
    chart = models.Chart(song_id=payload.song_id,
                         difficulty=payload.difficulty,
                         level=payload.level,
                         jacket_url=payload.jacket_url)
    if payload.tag_ids:
        chart.tags = db.query(models.Tag).filter(models.Tag.id.in_(payload.tag_ids)).all()
    db.add(chart)
    db.commit()
    return (db.query(models.Chart)
            .options(selectinload(models.Chart.tags))
            .filter(models.Chart.id == chart.id)
            .first())


@router.put("/charts/{chart_id}", response_model=schemas.ChartOut, dependencies=[Depends(require_admin)])
def admin_update_chart(chart_id: int, payload: ChartUpdate, db: Session = Depends(get_db)):
    chart = (db.query(models.Chart)
             .options(selectinload(models.Chart.tags))
             .filter(models.Chart.id == chart_id)
             .first())
    if not chart:
        raise HTTPException(404, "chart not found")
    if payload.difficulty is not None: chart.difficulty = payload.difficulty
    if payload.level is not None: chart.level = payload.level
    if payload.jacket_url is not None: chart.jacket_url = payload.jacket_url or None
    if payload.tag_ids is not None:
        chart.tags = db.query(models.Tag).filter(models.Tag.id.in_(payload.tag_ids)).all()
    db.commit()
    return (db.query(models.Chart)
            .options(selectinload(models.Chart.tags))
            .filter(models.Chart.id == chart_id)
            .first())


@router.delete("/charts/{chart_id}", status_code=204, dependencies=[Depends(require_admin)])
def admin_delete_chart(chart_id: int, db: Session = Depends(get_db)):
    chart = db.query(models.Chart).filter(models.Chart.id == chart_id).first()
    if not chart:
        raise HTTPException(404, "chart not found")
    db.delete(chart)
    db.commit()


@router.post("/chart-images", response_model=schemas.ChartImageOut, dependencies=[Depends(require_admin)])
def admin_create_chart_image(payload: ChartImageCreate, db: Session = Depends(get_db)):
    if not db.query(models.Chart).filter(models.Chart.id == payload.chart_id).first():
        raise HTTPException(404, "chart not found")
    img = models.ChartImage(chart_id=payload.chart_id,
                            image_url=payload.image_url,
                            order_idx=payload.order_idx,
                            part=payload.part)
    db.add(img)
    db.commit()
    db.refresh(img)
    return img


@router.delete("/chart-images/{image_id}", status_code=204, dependencies=[Depends(require_admin)])
def admin_delete_chart_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(models.ChartImage).filter(models.ChartImage.id == image_id).first()
    if not img:
        raise HTTPException(404, "image not found")
    db.delete(img)
    db.commit()


@router.get("/tags", response_model=List[schemas.TagOut], dependencies=[Depends(require_admin)])
def admin_list_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).order_by(models.Tag.name).all()


@router.post("/tags", response_model=schemas.TagOut, dependencies=[Depends(require_admin)])
def admin_create_tag(payload: TagCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Tag).filter(models.Tag.name == payload.name).first()
    if existing:
        return existing
    t = models.Tag(name=payload.name)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/tags/{tag_id}", status_code=204, dependencies=[Depends(require_admin)])
def admin_delete_tag(tag_id: int, db: Session = Depends(get_db)):
    t = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not t:
        raise HTTPException(404, "tag not found")
    db.delete(t)
    db.commit()
