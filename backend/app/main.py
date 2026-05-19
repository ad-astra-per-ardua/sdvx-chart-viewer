from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text as sql_text
from sqlalchemy.orm import Session, selectinload

from .database import engine, Base, get_db
from . import models, schemas
from .admin import router as admin_router, UPLOAD_DIR

Base.metadata.create_all(bind=engine)

for _stmt in [
    "ALTER TABLE songs ADD COLUMN keywords TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE songs DROP COLUMN jacket_url",
]:
    try:
        with engine.connect() as _conn:
            _conn.execute(sql_text(_stmt))
            _conn.commit()
    except Exception:
        pass

app = FastAPI(title="SDVX Megamix Chart Viewer API")

app.add_middleware(GZipMiddleware, minimum_size=512)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.include_router(admin_router)


def _song_detail(s: models.Song, charts: list) -> schemas.SongDetail:
    top = max(charts, key=lambda c: c.level, default=None)
    jacket = (top.jacket_url if top else None) or models.FALLBACK_JACKET_URL
    return schemas.SongDetail(
        id=s.id, title=s.title, artist=s.artist,
        jacket_url=jacket, created_at=s.created_at,
        charts=[schemas.ChartOut.model_validate(c) for c in charts],
    )


@app.get("/api/meta", response_model=schemas.FilterMeta)
def get_meta(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60"
    diffs = ["NOV", "ADV", "EXH", "MXM", "INF", "GRV", "HVN", "VVD", "XCD", "ULT", "NBL"]
    tags = [r[0] for r in db.execute(select(models.Tag.name).order_by(models.Tag.name)).all()]
    return schemas.FilterMeta(difficulties=diffs, tags=tags, level_min=1, level_max=20.9)


@app.get("/api/songs", response_model=List[schemas.SongListItem])
def list_songs(
        db: Session = Depends(get_db),
        level_min: float = Query(1.0, ge=1.0, le=20.9),
        level_max: float = Query(20.9, ge=1.0, le=20.9),
        difficulties: Optional[List[str]] = Query(None),
        tags: Optional[List[str]] = Query(None),
        quick_level: Optional[int] = Query(None, ge=1, le=20),
        sort: str = Query("new", regex="^(new|level_asc|level_desc)$"),
        q: Optional[str] = Query(None),
):
    stmt = select(models.Chart.id, models.Chart.song_id).where(
        models.Chart.level >= level_min,
        models.Chart.level <= level_max,
    )
    if difficulties:
        stmt = stmt.where(models.Chart.difficulty.in_(difficulties))
    if quick_level is not None:
        stmt = stmt.where(
            models.Chart.level >= float(quick_level),
            models.Chart.level < float(quick_level) + 1.0,
        )
    if tags:
        for tag_name in tags:
            stmt = stmt.where(models.Chart.tags.any(models.Tag.name == tag_name))

    rows = db.execute(stmt).all()
    if not rows:
        return []

    matching_chart_ids = {r.id for r in rows}
    matching_song_ids = {r.song_id for r in rows}

    song_q = (
        db.query(models.Song)
        .options(selectinload(models.Song.charts).selectinload(models.Chart.tags))
        .filter(models.Song.id.in_(matching_song_ids))
    )
    if q:
        like = f"%{q}%"
        song_q = song_q.filter(
            (models.Song.title.ilike(like)) |
            (models.Song.artist.ilike(like)) |
            (models.Song.keywords.ilike(like))
        )

    if sort == "new":
        song_q = song_q.order_by(models.Song.created_at.desc())
        songs = song_q.all()
    else:
        songs = song_q.all()

        def _level_key(s: models.Song) -> float:
            lvs = [c.level for c in s.charts if c.id in matching_chart_ids]
            return max(lvs) if lvs else 0.0

        songs.sort(key=_level_key, reverse=(sort == "level_desc"))

    out: List[schemas.SongListItem] = []
    for s in songs:
        visible = [c for c in s.charts if c.id in matching_chart_ids]
        top = max(visible, key=lambda c: c.level, default=None)
        jacket = (top.jacket_url if top else None) or models.FALLBACK_JACKET_URL
        out.append(schemas.SongListItem(
            id=s.id, title=s.title, artist=s.artist,
            jacket_url=jacket, created_at=s.created_at,
            charts=[schemas.ChartOut.model_validate(c) for c in visible],
        ))
    return out


@app.get("/api/songs/{song_id}", response_model=schemas.SongDetail)
def get_song(song_id: int, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=30"
    s = (
        db.query(models.Song)
        .options(selectinload(models.Song.charts).selectinload(models.Chart.tags))
        .filter(models.Song.id == song_id)
        .first()
    )
    if not s:
        raise HTTPException(404, "Song not found")
    return _song_detail(s, s.charts)


@app.get("/api/charts/{chart_id}", response_model=schemas.ChartDetail)
def get_chart(chart_id: int, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=30"
    c = (
        db.query(models.Chart)
        .options(
            selectinload(models.Chart.images),
            selectinload(models.Chart.tags),
            selectinload(models.Chart.song)
            .selectinload(models.Song.charts)
            .selectinload(models.Chart.tags),
        )
        .filter(models.Chart.id == chart_id)
        .first()
    )
    if not c:
        raise HTTPException(404, "Chart not found")
    return schemas.ChartDetail(
        id=c.id, difficulty=c.difficulty, level=c.level,
        jacket_url=c.jacket_url,
        song=_song_detail(c.song, c.song.charts),
        images=[schemas.ChartImageOut.model_validate(i) for i in c.images],
        tags=[schemas.TagOut.model_validate(t) for t in c.tags],
    )
