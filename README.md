# SDVX Megamix Chart Viewer

사운드볼텍스 메가믹스의 채보 조회 사이트 + 관리자 페이지.

```
sdvx-chart-viewer/
├── backend/      FastAPI + SQLAlchemy (SQLite → Supabase 호환)
└── frontend/     React 18 + Vite + TypeScript + react-router-dom
```

## 1. 백엔드 (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt

# 환경변수: ADMIN_TOKEN 은 관리자 페이지 인증에 사용
copy .env.example .env            # Windows  (또는 cp on *nix)
# .env 파일을 열고 ADMIN_TOKEN 값을 강력한 임의 문자열로 변경

# Mock 데이터 시드 (최초 1회)
python -m app.seed

# 서버 실행 → http://localhost:8000
uvicorn app.main:app --reload --port 8000
```

OpenAPI 문서: `http://localhost:8000/docs`

### 공개 API
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/meta` | 난이도/태그/레벨 범위 메타 |
| GET | `/api/songs` | 곡 목록 (필터/정렬) |
| GET | `/api/songs/{id}` | 곡 단건 |
| GET | `/api/charts/{id}` | 패턴 상세 |

### 관리자 API (모두 `X-Admin-Token` 헤더 필요)
| Method | Path | 설명 |
|---|---|---|
| POST | `/api/admin/login` | 토큰 검증 |
| POST | `/api/admin/upload` | 이미지 업로드 (multipart, 최대 8MB) |
| GET / POST / PUT / DELETE | `/api/admin/songs[/{id}]` | 곡 CRUD |
| POST / PUT / DELETE | `/api/admin/charts[/{id}]` | 패턴 CRUD |
| POST / DELETE | `/api/admin/chart-images[/{id}]` | 패턴 이미지 CRUD |
| GET / POST / DELETE | `/api/admin/tags[/{id}]` | 태그 CRUD |
| GET | `/uploads/{filename}` | 업로드된 이미지 정적 서빙 |

### Supabase로 갈아끼우기
`backend/.env`에 한 줄만 변경:
```
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres
```
ORM 레이어가 추상화돼있어 코드 변경은 없습니다. (업로드 파일은 추후 Supabase Storage로 옮길 때 `admin.upload` 함수만 교체하면 됩니다.)

## 2. 프론트엔드 (Vite + React)

```bash
cd frontend
npm install
npm run dev             # → http://localhost:5173
# (vite proxy가 /api 와 /uploads 를 :8000 으로 자동 포워딩)
```

프로덕션 빌드:
```bash
npm run build           # dist/ 생성
```

## 3. 화면 구성

### 공개 사이트
| 경로 | 내용 |
|---|---|
| `/` | 곡 목록 — 좌측 필터(레벨/난이도/태그), 상단 1~20 퀵필터, 우측 정렬(Lv↓/Lv↑/신곡) |
| `/songs/:id` | 곡 단건 진입점 (해당 곡의 최고 난이도 패턴으로 자동 리다이렉트) |
| `/charts/:id` | 패턴 상세 — 자켓+난이도 배지 행, 좌우 스크롤 패턴 이미지, 하단 태그 |

**분기 라우팅 규약**
- 목록의 **곡 제목** 클릭 → 현재 필터에서 보이는 가장 높은 레벨 패턴의 `/charts/:id`
- 목록의 **난이도 셀** 클릭 → 해당 패턴의 `/charts/:id`
- 상세 페이지의 다른 난이도 배지 클릭 → 즉시 그 패턴으로 전환

### 관리자
| 경로 | 내용 |
|---|---|
| `/admin` | 로그인 (토큰) → 곡 목록 + 검색 + 추가/편집/삭제 |
| `/admin/songs/new` | 새 곡 추가 (제목/아티스트/자켓 업로드/태그 선택) |
| `/admin/songs/:id` | 곡 편집 — 기본정보, 난이도 CRUD, 난이도별 패턴 이미지 업로드(다중), 위험구역(삭제) |
| `/admin/tags` | 태그 추가/삭제 |

**관리자 기능 요약**
- 토큰 기반 로그인 (브라우저 localStorage 보관, 401 시 자동 로그아웃)
- 자켓 이미지 업로드 (또는 외부 URL 직접 입력)
- 곡당 11개 난이도(NOV~NBL) 자유 등록/수정/삭제 — 동일 난이도 중복 방지
- 난이도별 채보 이미지 다중 업로드 + 순서/삭제 관리
- 태그 다중 선택 + 새 태그 즉시 생성
- 곡 단위 일괄 삭제(연관 패턴/이미지/태그링크 자동 정리)

## 4. 데이터 모델

```
Song (1) ──< Chart (N)  ──< ChartImage (N)
Song (M) >── song_tag ──< Tag (N)
```

- `Chart.level`은 `Float` (18.5 같은 값 허용)
- `quick_level=N` 필터는 `FLOOR(level) == N` 으로 매칭 (18.0~18.9 → 18)
- 목록 응답의 `charts` 배열은 **필터를 통과한 패턴만** 포함

## 5. 보안 메모

- `ADMIN_TOKEN`은 절대 코드/저장소에 커밋하지 말 것. `.env`만 사용.
- 토큰 비교는 `secrets.compare_digest` 로 타이밍 안전.
- 업로드는 확장자(.png/.jpg/.jpeg/.webp/.gif)와 8MB 제한.
- 파일명은 서버에서 랜덤 prefix를 붙여 사용자가 경로를 제어할 수 없게 함.
- 운영 배포 시 HTTPS 필수, CORS 도메인 화이트리스트로 좁힐 것 (`app.main`의 `allow_origins`).

## 6. 이후 확장 메모

- 다중 관리자/역할 분리 (현재는 단일 공유 토큰)
- 패턴 이미지 드래그-앤-드롭 순서 변경
- 일괄 import (CSV → 곡/패턴 한꺼번에)
- Supabase Auth 기반 일반 사용자 로그인/북마크/플레이 기록
