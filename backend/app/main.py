import hashlib
from pathlib import Path
from typing import Optional
import orjson
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
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
    # Drop indexes no query can use (leading-wildcard LIKE, client-side filtering).
    "DROP INDEX IF EXISTS idx_songs_title",
    "DROP INDEX IF EXISTS idx_songs_artist",
    "DROP INDEX IF EXISTS idx_charts_level",
    "DROP INDEX IF EXISTS idx_charts_diff_level",
    "DROP INDEX IF EXISTS idx_chart_tag_tag_id",
    "DROP INDEX IF EXISTS idx_chart_images_chart_part",
]:
    try:
        with engine.connect() as _conn:
            _conn.execute(sql_text(_stmt))
            _conn.commit()
    except Exception:
        pass

app = FastAPI(title="SDVX Megamix Chart Viewer API")

app.add_middleware(GZipMiddleware, minimum_size=512, compresslevel=5)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
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


@app.get("/api/songs")
def list_songs(
        response: Response,
        db: Session = Depends(get_db),
        sort: str = Query("new", regex="^(new|level_asc|level_desc)$"),
        q: Optional[str] = Query(None),
        limit: Optional[int] = Query(None, ge=1, le=500),
):
    response.headers["Cache-Control"] = "public, max-age=15"

    # The frontend loads the full set once and filters client-side; only
    # text search (used by the Megamix picker) is still done server-side.
    conds = ["c.level >= 1"]
    params: dict = {}
    if q:
        conds.append("(s.title LIKE :q OR s.artist LIKE :q OR s.keywords LIKE :q)")
        params["q"] = f"%{q}%"

    # "new" order is resolved in SQL so no Python sort is needed for it.
    sql = sql_text(
        "SELECT s.id, s.title, s.artist, s.keywords, s.created_at,"
        "       c.id AS chart_id, c.difficulty, c.level, c.jacket_url AS chart_jacket"
        " FROM songs s"
        " JOIN charts c ON c.song_id = s.id"
        f" WHERE {' AND '.join(conds)}"
        " ORDER BY s.created_at DESC, s.id, c.id"
    )

    # Fetch all chart tags in one indexed query (empty table = instant)
    tag_rows = db.execute(sql_text(
        "SELECT ct.chart_id, t.id, t.name FROM chart_tag ct JOIN tags t ON t.id = ct.tag_id"
    )).fetchall()
    tags_by_chart: dict = {}
    for tr in tag_rows:
        tags_by_chart.setdefault(tr[0], []).append({"id": tr[1], "name": tr[2]})

    rows = db.execute(sql, params).fetchall()

    if not rows:
        response.headers["X-Total-Count"] = "0"
        return Response(content=b"[]", media_type="application/json")

    songs_map: dict = {}
    for row in rows:
        sid = row[0]
        lv = row[7]
        s = songs_map.get(sid)
        if s is None:
            s = songs_map[sid] = {
                "id": sid,
                "title": row[1],
                "artist": row[2],
                "keywords": row[3] or "",
                "created_at": row[4],
                "_max": lv,
                "charts": [],
            }
        elif lv > s["_max"]:
            s["_max"] = lv
        s["charts"].append({
            "id": row[5],
            "difficulty": row[6],
            "level": lv,
            "jacket_url": row[8],
            "tags": tags_by_chart.get(row[5], []),
        })

    songs_list = list(songs_map.values())

    if sort == "level_desc":
        songs_list.sort(key=lambda s: s["_max"], reverse=True)
    elif sort == "level_asc":
        songs_list.sort(key=lambda s: s["_max"])

    total = len(songs_list)

    if limit is not None:
        songs_list = songs_list[:limit]

    fallback = models.FALLBACK_JACKET_URL
    for s in songs_list:
        del s["_max"]
        top = max(s["charts"], key=lambda c: c["level"], default=None)
        s["jacket_url"] = (top["jacket_url"] if top else None) or fallback

    response.headers["X-Total-Count"] = str(total)
    return Response(content=orjson.dumps(songs_list), media_type="application/json")


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
        jacket_url=c.jacket_url or models.FALLBACK_JACKET_URL,
        song=_song_detail(c.song, c.song.charts),
        images=[schemas.ChartImageOut.model_validate(i) for i in c.images],
        tags=[schemas.TagOut.model_validate(t) for t in c.tags],
    )
