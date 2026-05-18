"""
FastAPI entrypoint.

Run:
    cd backend
    uvicorn app.main:app --reload --port 8000
"""

from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .database import engine, Base, get_db
from . import models, schemas
from .admin import router as admin_router, UPLOAD_DIR

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SDVX Megamix Chart Viewer API")

# GZip 압축 — JSON 응답 크기를 60-80% 감소
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


# /api/meta ───────────────────────────────────────────────────────────────────
@app.get("/api/meta", response_model=schemas.FilterMeta)
def get_meta(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60"
    diffs = ["NOV", "ADV", "EXH", "MXM", "INF", "GRV", "HVN", "VVD", "XCD", "ULT", "NBL"]
    tags = [r[0] for r in db.execute(select(models.Tag.name).order_by(models.Tag.name)).all()]
    return schemas.FilterMeta(difficulties=diffs, tags=tags, level_min=1, level_max=20)


# /api/songs ──────────────────────────────────────────────────────────────────
@app.get("/api/songs", response_model=List[schemas.SongListItem])
def list_songs(
    db: Session = Depends(get_db),
    level_min: float = Query(1.0, ge=1.0, le=20.0),
    level_max: float = Query(20.0, ge=1.0, le=20.0),
    difficulties: Optional[List[str]] = Query(None),
    tags: Optional[List[str]] = Query(None),
    quick_level: Optional[int] = Query(None, ge=1, le=20),
    sort: str = Query("new", regex="^(new|level_asc|level_desc)$"),
    q: Optional[str] = Query(None),
):
    # ── 1단계: 필요한 컬럼만 SELECT (full ORM object 로드 없이) ────────────────
    stmt = select(models.Chart.id, models.Chart.song_id).where(
        models.Chart.level >= level_min,
        models.Chart.level <= level_max,
    )
    if difficulties:
        stmt = stmt.where(models.Chart.difficulty.in_(difficulties))
    if quick_level is not None:
        # func.floor() 사용 시 인덱스 미사용 → 범위 쿼리로 대체
        stmt = stmt.where(
            models.Chart.level >= float(quick_level),
            models.Chart.level <  float(quick_level) + 1.0,
        )
    if tags:
        for tag_name in tags:
            stmt = stmt.where(models.Chart.tags.any(models.Tag.name == tag_name))

    rows = db.execute(stmt).all()
    if not rows:
        return []

    matching_chart_ids = {r.id       for r in rows}
    matching_song_ids  = {r.song_id  for r in rows}

    # ── 2단계: 곡 조회 + selectinload로 N+1 완전 제거 ────────────────────────
    song_q = (
        db.query(models.Song)
          .options(selectinload(models.Song.charts).selectinload(models.Chart.tags))
          .filter(models.Song.id.in_(matching_song_ids))
    )
    if q:
        like = f"%{q}%"
        song_q = song_q.filter(
            (models.Song.title.ilike(like)) | (models.Song.artist.ilike(like))
        )

    # 신곡순은 DB에서 정렬 — Python 정렬 불필요
    if sort == "new":
        song_q = song_q.order_by(models.Song.created_at.desc())
        songs = song_q.all()
    else:
        songs = song_q.all()
        def _level_key(s: models.Song) -> float:
            lvs = [c.level for c in s.charts if c.id in matching_chart_ids]
            return max(lvs) if lvs else 0.0
        songs.sort(key=_level_key, reverse=(sort == "level_desc"))

    # ── 3단계: 응답 조립 ──────────────────────────────────────────────────────
    out: List[schemas.SongListItem] = []
    for s in songs:
        visible = [c for c in s.charts if c.id in matching_chart_ids]
        # 곡 자켓 없으면 매칭된 첫 패턴의 자켓으로 대체
        effective_jacket = s.jacket_url or next(
            (c.jacket_url for c in visible if c.jacket_url), None
        )
        out.append(schemas.SongListItem(
            id=s.id, title=s.title, artist=s.artist,
            jacket_url=effective_jacket, created_at=s.created_at,
            charts=[schemas.ChartOut.model_validate(c) for c in visible],
        ))
    return out


# /api/songs/{id} ─────────────────────────────────────────────────────────────
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
    return s


# /api/charts/{id} ────────────────────────────────────────────────────────────
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
        song=schemas.SongDetail.model_validate(c.song),
        images=[schemas.ChartImageOut.model_validate(i) for i in c.images],
        tags=[schemas.TagOut.model_validate(t) for t in c.tags],
    )
