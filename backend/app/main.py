import logging
import os
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from pathlib import Path
from typing import Optional
import orjson
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .limiter import limiter
from . import models, schemas, cache as song_cache
from .admin import router as admin_router, UPLOAD_DIR

Base.metadata.create_all(bind=engine)

logger = logging.getLogger("sdvx.security")

for _stmt in [
    "ALTER TABLE songs ADD COLUMN keywords TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE songs DROP COLUMN jacket_url",
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
    except Exception as _e:
        _msg = str(_e).lower()
        if "already exists" not in _msg and "duplicate" not in _msg and "no such column" not in _msg:
            logger.warning("Migration warning: %s", _e)

app = FastAPI(title="SDVX Megamix Chart Viewer API")
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    ip = request.client.host if request.client else "unknown"
    logger.warning("RATE_LIMIT  ip=%s  %s %s", ip, request.method, request.url.path)
    return _rate_limit_exceeded_handler(request, exc)
app.add_middleware(GZipMiddleware, minimum_size=512, compresslevel=5)

_ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "https://megamix-info.vercel.app,http://localhost:5173"
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
    expose_headers=["X-Total-Count"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if not request.url.path.startswith("/uploads"):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data: https:; "
            "script-src 'self'; style-src 'self' 'unsafe-inline'"
        )
    return response

Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.include_router(admin_router)



@app.get("/api/meta", response_model=schemas.FilterMeta)
@limiter.limit("60/minute")
def get_meta(request: Request, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60"
    diffs = ["NOV", "ADV", "EXH", "MXM", "INF", "GRV", "HVN", "VVD", "XCD", "ULT", "NBL"]
    tags = [r[0] for r in db.execute(sql_text("SELECT name FROM tags ORDER BY name")).fetchall()]
    return schemas.FilterMeta(difficulties=diffs, tags=tags, level_min=1, level_max=20.9)


@app.get("/api/songs")
@limiter.limit("60/minute")
def list_songs(
        request: Request,
        response: Response,
        db: Session = Depends(get_db),
        sort: str = Query("new", regex="^(new|level_asc|level_desc)$"),
        q: Optional[str] = Query(None),
        limit: Optional[int] = Query(None, ge=1, le=500),
):
    cache_key = (sort, q or "", limit or 0)
    entry = song_cache.get(cache_key)
    if entry:
        response.headers["Cache-Control"] = "public, max-age=300"
        response.headers["X-Total-Count"] = entry[1]
        return Response(content=entry[0], media_type="application/json")

    response.headers["Cache-Control"] = "public, max-age=60"
    conds = ["c.level >= 1"]
    params: dict = {}
    if q:
        conds.append("(s.title ILIKE :q OR s.artist ILIKE :q OR s.keywords ILIKE :q)")
        params["q"] = f"%{q}%"

    sql = sql_text(
        "SELECT s.id, s.title, s.artist, s.keywords, s.created_at,"
        "       c.id AS chart_id, c.difficulty, c.level, c.jacket_url AS chart_jacket"
        " FROM songs s"
        " JOIN charts c ON c.song_id = s.id"
        f" WHERE {' AND '.join(conds)}"
        " ORDER BY s.created_at DESC, s.id, c.id"
    )

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

    body = orjson.dumps(songs_list)
    song_cache.set(cache_key, body, str(total))
    response.headers["X-Total-Count"] = str(total)
    return Response(content=body, media_type="application/json")


@app.get("/api/songs/{song_id}", response_model=schemas.SongDetail)
@limiter.limit("60/minute")
def get_song(request: Request, song_id: int, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=30"
    song_row = db.execute(sql_text(
        "SELECT id, title, artist, created_at FROM songs WHERE id = :sid"
    ), {"sid": song_id}).fetchone()
    if not song_row:
        raise HTTPException(404, "Song not found")

    rows = db.execute(sql_text(
        "SELECT c.id, c.difficulty, c.level, c.jacket_url, t.id, t.name"
        " FROM charts c"
        " LEFT JOIN chart_tag ct ON ct.chart_id = c.id"
        " LEFT JOIN tags t ON t.id = ct.tag_id"
        " WHERE c.song_id = :sid ORDER BY c.id"
    ), {"sid": song_id}).fetchall()

    charts_map: dict = {}
    for r in rows:
        cid = r[0]
        if cid not in charts_map:
            charts_map[cid] = {"id": cid, "difficulty": r[1], "level": r[2], "jacket_url": r[3], "tags": []}
        if r[4] is not None:
            charts_map[cid]["tags"].append({"id": r[4], "name": r[5]})
    charts = list(charts_map.values())

    top = max(charts, key=lambda c: c["level"], default=None)
    jacket = (top["jacket_url"] if top else None) or models.FALLBACK_JACKET_URL
    return {
        "id": song_row[0], "title": song_row[1], "artist": song_row[2],
        "jacket_url": jacket, "created_at": song_row[3], "charts": charts,
    }


@app.get("/api/charts/{chart_id}", response_model=schemas.ChartDetail)
@limiter.limit("60/minute")
def get_chart(request: Request, chart_id: int, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=30"

    # Query 1: chart + song (1 round trip)
    base = db.execute(sql_text(
        "SELECT c.id, c.difficulty, c.level, c.jacket_url,"
        " s.id, s.title, s.artist, s.created_at"
        " FROM charts c JOIN songs s ON s.id = c.song_id WHERE c.id = :cid"
    ), {"cid": chart_id}).fetchone()
    if not base:
        raise HTTPException(404, "Chart not found")
    song_id = base[4]

    # Query 2: all sibling charts with tags (1 round trip, LEFT JOIN)
    sibling_rows = db.execute(sql_text(
        "SELECT c.id, c.difficulty, c.level, c.jacket_url, t.id, t.name"
        " FROM charts c"
        " LEFT JOIN chart_tag ct ON ct.chart_id = c.id"
        " LEFT JOIN tags t ON t.id = ct.tag_id"
        " WHERE c.song_id = :sid ORDER BY c.id"
    ), {"sid": song_id}).fetchall()

    charts_map: dict = {}
    for r in sibling_rows:
        cid = r[0]
        if cid not in charts_map:
            charts_map[cid] = {"id": cid, "difficulty": r[1], "level": r[2], "jacket_url": r[3], "tags": []}
        if r[4] is not None:
            charts_map[cid]["tags"].append({"id": r[4], "name": r[5]})
    all_charts = list(charts_map.values())

    # Query 3: images for this chart (1 round trip)
    image_rows = db.execute(sql_text(
        "SELECT id, image_url, order_idx, part FROM chart_images"
        " WHERE chart_id = :cid ORDER BY order_idx"
    ), {"cid": chart_id}).fetchall()

    top = max(all_charts, key=lambda c: c["level"], default=None)
    song_jacket = (top["jacket_url"] if top else None) or models.FALLBACK_JACKET_URL
    this_chart = charts_map.get(chart_id, {})

    return {
        "id": base[0], "difficulty": base[1], "level": base[2],
        "jacket_url": base[3] or models.FALLBACK_JACKET_URL,
        "tags": this_chart.get("tags", []),
        "images": [{"id": r[0], "image_url": r[1], "order_idx": r[2], "part": r[3]} for r in image_rows],
        "song": {
            "id": song_id, "title": base[5], "artist": base[6],
            "jacket_url": song_jacket, "created_at": base[7], "charts": all_charts,
        },
    }
