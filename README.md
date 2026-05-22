# SDVX Megamix Chart Viewer

사운드볼텍스 메가믹스의 채보 조회 사이트 + 관리자 페이지.

```
sdvx-chart-viewer/
├── backend/      FastAPI
└── frontend/     React 18
```

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

| 경로 | 내용 |
|---|---|
| `/` | 곡 목록 — 좌측 필터(레벨/난이도/태그), 상단 1~20 퀵필터, 우측 정렬(Lv↓/Lv↑/신곡) |
| `/songs/:id` | 곡 단건 진입점 (해당 곡의 최고 난이도 패턴으로 자동 리다이렉트) |
| `/charts/:id` | 패턴 상세 — 자켓+난이도 배지 행, 좌우 스크롤 패턴 이미지, 하단 태그 |

### 관리자
| 경로 | 내용 |
|---|---|
| `/admin` | 로그인 (토큰) → 곡 목록 + 검색 + 추가/편집/삭제 |
| `/admin/songs/new` | 새 곡 추가 (제목/아티스트/자켓 업로드/태그 선택) |
| `/admin/songs/:id` | 곡 편집 — 기본정보, 난이도 CRUD, 난이도별 패턴 이미지 업로드(다중), 위험구역(삭제) |
| `/admin/tags` | 태그 추가/삭제 |


