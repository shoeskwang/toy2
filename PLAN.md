# toy-board 구현 플랜 (rev.2 — 기존 환경 충돌 반영)

> 이 문서는 구현 에이전트를 위한 실행 계획서다. Phase 순서대로 구현하면 된다.
> 작성일: 2026-07-25 · 대상 경로: `/Users/kwang/workspace/claude-toy/toy-board`
> rev.2 변경점: 로컬 MySQL 사용으로 전환(SQLite 폐기), 기존 Go 게시판과의 충돌 회피 규칙 추가

---

## 0. ⚠️ 선행 조사 결과 — 기존 환경과의 충돌

### 이미 존재하는 것들 (건드리지 말 것)

**기존 게시판 프로젝트: `~/workspace/toy`** — Go + React 게시판, 이미 동작 중
- Go 서버 `:8080`, API base `/api/v1`, 프론트 Vite dev `:5173`
- MySQL DB `toy_board`, 접속 계정 `toy` / `toy_password`
- 테이블 `posts`(category 컬럼 있음), `comments` — 실제 데이터 존재 (posts 2건, comments 1건)
- 빌드 산출물 `bin/toy-board`, npm 패키지명 `toy-board-web`
- **이 디렉토리와 `toy_board` DB는 절대 수정/삭제하지 않는다.**

**로컬 MySQL**: Homebrew `mysql@8.4` (8.4.10), `brew services`로 상시 기동 중, `127.0.0.1:3306` LISTEN
- 기존 계정: `root`@localhost (암호 없음), `toy`@localhost / `toy`@127.0.0.1

### 충돌 회피 매핑 (이 표가 이번 작업의 핵심 제약)

| 항목 | 기존 (`~/workspace/toy`) | **신규 (이 프로젝트)** |
|---|---|---|
| DB 스키마 | `toy_board` | **`claude_board`** (신규 생성) |
| DB 계정 | `toy` / `toy_password` | **`toy` / `toy_password` (동일 계정 공용)** |
| 백엔드 포트 | 8080 | **8000** (비어있음 확인) |
| 프론트 dev 포트 | 5173 | **5174** (비어있음 확인) |
| API prefix | `/api/v1` | **`/api`** |
| 앱/패키지 이름 | `toy-board`, `toy-board-web` | **`claude-board`**, **`claude-board-web`** |

> 포트 8080·5173, DB `toy_board`는 **사용 금지**. 기존 서버가 떠 있으면 바인딩 실패하거나 데이터가 섞인다.

> ⚠️ **계정을 공유하므로 격리는 오직 DSN의 스키마명 하나에 달려 있다.**
> `toy` 계정은 `claude_board.*` GRANT를 추가로 받아 **두 스키마 모두에 쓰기 권한**을 갖게 된다.
> DB 계층의 안전망이 없으니, DSN 문자열의 `claude_board`를 반드시 눈으로 확인하고
> `USE toy_board` / 스키마 수식 없는 raw SQL은 작성하지 않는다.

### 환경 선행 조건
- **`uv`가 설치되어 있지 않다.** Phase 1에서 먼저 설치할 것: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Node 24 / npm 11 설치됨 — 추가 작업 불필요.
- Python 시스템 버전은 3.9. 사용하지 말고 uv로 3.12를 받아 쓴다.

---

## 1. 목표

익명 게시판 웹 애플리케이션.

- 게시글 CRUD (제목, 본문, 작성자 닉네임)
- 게시글당 댓글 CRUD (플랫 구조, 대댓글 없음)
- 게시글에 이미지 여러 장 업로드/표시
- 목록 페이지네이션 + 제목/본문 검색
- 로그인/인증은 **범위 밖** (익명 게시판)

기존 Go 게시판과 기능은 유사하나 **이미지 업로드가 추가**된 별개 앱이다. 코드를 재사용하지 않는다.

## 2. 기술 스택 (2026-07 기준, 실제 최신 버전 확인 완료)

### Backend — `toy-board/backend`
| 항목 | 선택 | 비고 |
|---|---|---|
| 런타임 | Python 3.12 | `uv python install 3.12`. asyncmy의 cp312 arm64 wheel 존재 확인함 |
| 패키지 관리 | **uv** (미설치 → 설치 필요) | `uv init` → `uv add`, `pyproject.toml` 기반 |
| 프레임워크 | **FastAPI 0.140** (`fastapi[standard]`) | standard extra에 uvicorn·python-multipart·fastapi-cli 포함 |
| ORM | **SQLAlchemy 2.0.51 (async)** | `AsyncSession` + `Mapped[]`/`mapped_column` 2.0 스타일 필수 |
| DB 드라이버 | **asyncmy 0.2.11** | MySQL용 async 드라이버. aiomysql보다 빠름, arm64 wheel 제공 |
| DB | **MySQL 8.4** (로컬 기동 중) | 스키마 `claude_board`, utf8mb4 |
| 검증 | Pydantic v2 | `model_config = ConfigDict(from_attributes=True)` |
| 이미지 처리 | Pillow | 콘텐츠 검증 + 썸네일 |

### Frontend — `toy-board/frontend`
| 항목 | 선택 | 비고 |
|---|---|---|
| 빌드 | **Vite 8.1** + React 19.2 + TypeScript | `npm create vite@latest frontend -- --template react-ts` |
| 서버 상태 | **TanStack Query 5.101** | 캐싱·invalidation·optimistic update |
| 라우팅 | **React Router 8.3** (declarative) | 패키지명 `react-router` |
| 스타일 | **Tailwind CSS 4.3** | `@tailwindcss/vite` 플러그인 + CSS `@import "tailwindcss";`. config 파일 없음 |
| 패키지 매니저 | npm | node 24 / npm 11 |

## 3. 디렉토리 구조

```
toy-board/
├── PLAN.md
├── README.md                  # 실행 방법 (Phase 5)
├── backend/
│   ├── pyproject.toml
│   ├── .env                   # DB 접속정보 (gitignore)
│   ├── .env.example
│   ├── scripts/
│   │   └── bootstrap.sql      # claude_board 스키마 생성 + toy 계정에 권한 부여
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # 환경변수 로딩 (pydantic-settings)
│   │   ├── main.py            # FastAPI 앱, lifespan(create_all), CORS, /uploads 마운트
│   │   ├── database.py        # async engine, async_sessionmaker, get_db
│   │   ├── models.py          # SQLAlchemy 모델 (Post, Comment, Image)
│   │   ├── schemas.py         # Pydantic v2 스키마
│   │   ├── router.py          # /api 집계 지점 (include_router 만)
│   │   ├── endpoints/         # 도메인별 APIRouter — 엔드포인트 선언만
│   │   │   ├── __init__.py
│   │   │   ├── posts.py
│   │   │   ├── comments.py
│   │   │   └── uploads.py
│   │   └── services/          # 도메인 로직 (엔드포인트는 여기로 위임)
│   │       ├── __init__.py
│   │       ├── posts.py
│   │       ├── comments.py
│   │       └── uploads.py
│   └── uploads/               # 업로드 파일 저장 (gitignore)
└── frontend/
    ├── package.json           # name: claude-board-web
    ├── vite.config.ts         # port 5174, /api·/uploads → :8000 프록시
    └── src/
        ├── main.tsx           # QueryClientProvider + BrowserRouter
        ├── index.css          # @import "tailwindcss";
        ├── api/
        │   ├── client.ts      # fetch 래퍼 (BASE = "/api")
        │   └── types.ts
        ├── hooks/
        │   ├── usePosts.ts
        │   └── useComments.ts
        ├── components/
        │   ├── Layout.tsx
        │   ├── CommentSection.tsx
        │   ├── ImageUploader.tsx
        │   └── Pagination.tsx
        └── pages/
            ├── PostListPage.tsx    # /
            ├── PostDetailPage.tsx  # /posts/:id
            └── PostFormPage.tsx    # /write, /posts/:id/edit
```

## 4. DB 설정 및 스키마

### 4-1. 부트스트랩 (`backend/scripts/bootstrap.sql`)

신규 스키마만 만들고, 계정은 기존 `toy`를 그대로 쓴다 (신규 계정 생성 안 함).

```sql
CREATE DATABASE IF NOT EXISTS claude_board
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- 기존 toy 계정에 신규 스키마 권한만 추가 (toy_board 권한은 그대로 유지됨)
GRANT ALL PRIVILEGES ON claude_board.* TO 'toy'@'localhost';
GRANT ALL PRIVILEGES ON claude_board.* TO 'toy'@'127.0.0.1';
FLUSH PRIVILEGES;
```

실행: `mysql -u root < scripts/bootstrap.sql`

- 이 스크립트는 **멱등**하다. `CREATE USER`가 없으므로 기존 계정의 비밀번호를 바꾸지 않는다.
- `GRANT`는 추가만 하고 회수하지 않으므로 기존 Go 앱의 `toy_board` 접근은 영향받지 않는다.
- 실행 후 `toy` 계정은 `toy_board`와 `claude_board` **양쪽 모두** 보인다 — 정상이다.

### 4-2. `.env.example`

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=claude_board
DB_USER=toy
DB_PASSWORD=toy_password
APP_PORT=8000
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=5
CORS_ORIGINS=http://localhost:5174
```

DSN 조립: `mysql+asyncmy://{user}:{pw}@{host}:{port}/{name}?charset=utf8mb4`

### 4-3. 테이블 (SQLAlchemy 2.0 `Mapped` 스타일, `create_all`로 생성)

```
posts
  id            BIGINT UNSIGNED PK AUTO_INCREMENT
  title         VARCHAR(200)  NOT NULL
  content       TEXT          NOT NULL
  author        VARCHAR(50)   NOT NULL
  created_at    DATETIME(3)   NOT NULL  server_default=func.now(3)
  updated_at    DATETIME(3)   NOT NULL  onupdate=func.now(3)
  INDEX idx_posts_created_at (created_at)

comments
  id            BIGINT UNSIGNED PK AUTO_INCREMENT
  post_id       BIGINT UNSIGNED FK -> posts.id ON DELETE CASCADE, INDEX
  author        VARCHAR(50)   NOT NULL
  content       TEXT          NOT NULL
  created_at    DATETIME(3)   NOT NULL

images
  id            BIGINT UNSIGNED PK AUTO_INCREMENT
  post_id       BIGINT UNSIGNED NULL, FK -> posts.id ON DELETE CASCADE, INDEX
                # 업로드 직후엔 NULL(미연결), 게시글 저장 시 연결
  filename      VARCHAR(255)  NOT NULL   # 저장 파일명 (uuid4hex.ext)
  original_name VARCHAR(255)  NOT NULL
  content_type  VARCHAR(100)  NOT NULL
  size          INTEGER       NOT NULL
  created_at    DATETIME(3)   NOT NULL
```

- 테이블 옵션: `__table_args__ = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_0900_ai_ci"}`
- 관계: `Post.comments`, `Post.images` — `relationship(cascade="all, delete-orphan")`, 조회 시 **`selectinload` 필수** (async lazy load 금지).
- MySQL InnoDB는 FK CASCADE를 네이티브 지원 — SQLite처럼 PRAGMA 설정 불필요.

## 5. API 명세 (prefix `/api` — 기존 프로젝트의 `/api/v1`과 구분)

에러 응답은 FastAPI 기본 `{"detail": "..."}` 형식.

### Posts
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/posts?page=1&size=10&q=검색어` | 목록. 응답 `{items: PostSummary[], total, page, size}`. `q`는 title/content LIKE, 최신순. PostSummary에 `comment_count`, `thumbnail`(첫 이미지 URL 또는 null) 포함 |
| POST | `/api/posts` | 생성. body `{title, content, author, image_ids: int[]}` |
| GET | `/api/posts/{id}` | 상세. comments(오래된순) + images 포함 |
| PUT | `/api/posts/{id}` | 수정. body `{title, content, image_ids: int[]}` — 목록에 없는 기존 이미지는 연결 해제 |
| DELETE | `/api/posts/{id}` | 삭제 (댓글·이미지 cascade + 디스크 파일 삭제) → 204 |

### Comments
| Method | Path | 설명 |
|---|---|---|
| POST | `/api/posts/{post_id}/comments` | 생성. body `{author, content}` |
| DELETE | `/api/comments/{id}` | 삭제 → 204 |

### Uploads
| Method | Path | 설명 |
|---|---|---|
| POST | `/api/uploads` | `multipart/form-data`, 필드명 `file`. 응답 `{id, url, original_name, size}` |
| GET | `/uploads/{filename}` | `StaticFiles` 정적 서빙 (API prefix 아님) |

업로드 규칙:
- 허용 jpeg/png/gif/webp. content-type 헤더만 믿지 말고 **Pillow `Image.open` + `verify()`로 실제 이미지 검증**.
- 최대 5MB 초과 시 413.
- 저장 파일명은 `uuid4().hex + 확장자` — 원본 파일명을 경로에 절대 사용하지 않는다 (path traversal 방지).
- 프론트 흐름: 이미지를 먼저 `/api/uploads`에 올려 id 확보 → 게시글 생성/수정 시 `image_ids`로 연결.
- 고아 이미지(post_id NULL로 남은 것) 정리는 이번 범위 밖.

### Pydantic 스키마
`PostCreate`, `PostUpdate`, `PostSummary`, `PostDetail`, `CommentCreate`, `CommentOut`, `ImageOut`, `PageOut[PostSummary]`.
제약: title 1~200자, author 1~50자, content 1자 이상 (`Field(min_length=...)`).

## 6. 프론트엔드 화면

공통: Tailwind 유틸리티로 심플/모던하게. 라이트 테마, `max-w-3xl mx-auto`. 서버 통신은 TanStack Query 훅으로만.

1. **목록 `/`** — 카드 리스트(제목, 작성자, 날짜, 댓글수 뱃지, 썸네일). 상단 검색 인풋(엔터 검색), 우측 상단 "글쓰기", 하단 Pagination.
2. **상세 `/posts/:id`** — 제목/메타, 본문(`whitespace-pre-wrap`), 이미지 그리드(클릭 시 원본 새 탭), 수정/삭제(삭제는 confirm), CommentSection(목록 + 작성 폼 + 삭제).
3. **작성/수정 `/write`, `/posts/:id/edit`** — PostFormPage 재사용. author(수정 시 readonly), title, content, ImageUploader(다중 선택·미리보기·개별 제거). 성공 시 상세로 이동.

TanStack Query 규칙:
- queryKey: `['posts', {page, q}]`, `['post', id]`
- mutation 성공 시 관련 키 `invalidateQueries`
- 댓글 작성은 optimistic update

`vite.config.ts` 필수 설정 (포트 충돌 회피):
```ts
server: {
  port: 5174,
  strictPort: true,          // 5173으로 흘러가지 않도록 반드시 지정
  proxy: {
    "/api":     "http://localhost:8000",
    "/uploads": "http://localhost:8000",
  },
}
```
백엔드 CORS는 `http://localhost:5174` 허용 (이중 안전망).

## 7. 구현 Phase

### Phase 0 — 환경 준비
1. uv 설치: `curl -LsSf https://astral.sh/uv/install.sh | sh` (설치 후 `uv --version` 확인)
2. MySQL 기동 확인: `mysqladmin -u root ping` → 안 뜨면 `brew services start mysql@8.4`
3. `mysql -u root < backend/scripts/bootstrap.sql` 로 `claude_board` 스키마 생성 + `toy` 계정에 권한 부여
4. 검증: `mysql -u toy -ptoy_password -e "SHOW DATABASES;"` → `claude_board`와 `toy_board`가 **둘 다** 보이면 정상
   (계정을 공유하므로 둘 다 보이는 게 맞다. 격리는 애플리케이션 DSN이 담당한다.)

### Phase 1 — Backend 골격
5. `cd toy-board/backend && uv init --python 3.12`
6. `uv add "fastapi[standard]" "sqlalchemy[asyncio]" asyncmy pillow pydantic-settings`
7. `config.py`(.env 로딩) → `database.py`(async engine/session) → `models.py` → `schemas.py`
8. `main.py`: lifespan에서 `create_all`, CORS(5174), `app.mount("/uploads", StaticFiles(...))`, 라우터 등록

### Phase 2 — Backend API
9. `services/posts.py` (목록·페이지네이션·검색·comment_count 서브쿼리, CRUD)
10. `services/comments.py`
11. `services/uploads.py` (검증·저장·레코드 생성) + 게시글 삭제 시 디스크 파일 정리
    → `endpoints/*.py` 에 엔드포인트 선언, `router.py` 가 `/api` 로 집계
12. 검증: `uv run fastapi dev app/main.py --port 8000` 후 curl 스모크 테스트
    (업로드 → 글 생성 with image_ids → 상세 → 댓글 → 삭제)
13. **격리 확인 (계정 공유이므로 특히 중요)**:
    - `mysql -u root -e "SHOW TABLES FROM claude_board;"` → posts/comments/images 3개 생성 확인
    - `mysql -u root -e "SELECT COUNT(*) FROM toy_board.posts; SELECT COUNT(*) FROM toy_board.comments;"`
      → 각각 **2건, 1건 그대로**여야 한다 (Phase 0 이전 기준값). 늘었다면 DSN이 잘못된 것

### Phase 3 — Frontend 골격
14. `npm create vite@latest frontend -- --template react-ts`
15. `npm i @tanstack/react-query react-router` + `npm i -D @tailwindcss/vite tailwindcss`
16. `package.json` name을 `claude-board-web`으로 변경
17. vite 프록시·포트 설정, `index.css`에 tailwind import, `main.tsx`에 Provider/Router, `api/client.ts`·`types.ts`

### Phase 4 — Frontend 화면
18. hooks → Layout/Pagination → PostListPage → PostDetailPage(+CommentSection) → PostFormPage(+ImageUploader)

### Phase 5 — 마무리
19. `.gitignore` (backend: `.venv/ .env uploads/ __pycache__/`, frontend: `node_modules/ dist/`)
20. `README.md`: 실행 방법 + **기존 `~/workspace/toy` 프로젝트와의 포트/DB 구분표**
    - backend: `cd backend && uv run fastapi dev app/main.py --port 8000`
    - frontend: `cd frontend && npm run dev` (:5174)
21. E2E 수동 검증 체크리스트 수행

## 8. 완료 기준 (Acceptance Criteria)

기능:
- [ ] 글 작성(이미지 2장 첨부) → 목록에 썸네일·댓글수 표시 → 상세에서 이미지 렌더
- [ ] 글 수정에서 기존 이미지 1장 제거 + 새 이미지 추가 가능
- [ ] 댓글 작성/삭제 즉시 반영 (새로고침 불필요)
- [ ] 검색어 필터링, 11건 이상일 때 페이지네이션 동작
- [ ] 글 삭제 시 댓글/이미지 레코드 + 디스크 파일 함께 삭제
- [ ] 6MB 파일·텍스트 파일 업로드 거부 (4xx)
- [ ] 백엔드 재시작 후에도 데이터 유지 (MySQL)
- [ ] `http://localhost:8000/docs` OpenAPI 문서 노출
- [ ] 한글 제목·본문·댓글 정상 저장/표시 (utf8mb4 확인)

**충돌 격리 (필수 검증):**
- [ ] 신규 백엔드는 `claude_board` 스키마에만 쓴다 — `toy_board.posts` 2건 / `toy_board.comments` 1건 불변
- [ ] `toy` 계정이 `claude_board`에 접속·DDL·DML 모두 성공 (GRANT 정상 적용)
- [ ] 기존 Go 앱이 `toy_board`에 계속 정상 접속 (GRANT 추가가 기존 권한을 깨지 않음)
- [ ] 기존 Go 서버(:8080)와 신규 백엔드(:8000)를 **동시에 띄워도** 양쪽 모두 정상 동작
- [ ] 기존 프론트(:5173)와 신규 프론트(:5174) 동시 기동 가능
- [ ] `~/workspace/toy` 디렉토리는 단 한 파일도 수정되지 않음

## 9. 주의사항 (구현 에이전트용)

**충돌 관련 (가장 중요)**
- `~/workspace/toy`는 **읽기 전용**으로만 참고. 파일 생성·수정·삭제 금지.
- DB `toy_board`, 포트 8080/5173은 사용 금지. (계정 `toy`는 공용이므로 사용 O)
- **계정을 공유하는 탓에 DB 권한 계층의 방어선이 없다.** `toy` 계정은 `toy_board`에도 쓸 수 있으므로,
  DSN이 잘못되면 에러 없이 조용히 기존 데이터를 오염시킨다. 다음 3가지를 지킬 것:
  1. `create_all` 호출 전 `print(engine.url.database)` 등으로 `claude_board`인지 1회 확인
  2. raw SQL에 `USE ...` 금지, 테이블명에 스키마 수식(`toy_board.posts`) 금지
  3. Phase 2-13의 행 수 검증을 반드시 통과시킨 뒤 다음 단계로 진행
- Vite는 포트가 점유되면 자동으로 다음 포트로 넘어간다 → `strictPort: true`로 5173 흘러들어감을 차단.

**MySQL / SQLAlchemy async**
- 관계 접근은 반드시 `selectinload` — lazy load 시 `MissingGreenlet` 에러.
- DSN에 `?charset=utf8mb4` 필수. 빠뜨리면 한글이 깨진다.
- 시간 컬럼은 `DATETIME(3)`으로 밀리초 보존 (`mysql_DATETIME(fsp=3)` 또는 `DateTime(timezone=False)` + server_default `func.now(3)`).
- MySQL은 SQLite와 달리 트랜잭션 DDL이 없다 — `create_all`은 앱 기동 시 1회만.
- 연결 풀: `pool_pre_ping=True` 설정 (MySQL의 유휴 연결 끊김 대비).

**기타**
- `python-multipart`는 `fastapi[standard]`에 포함 — 별도 설치 불필요.
- Tailwind v4는 v3와 설정 방식이 다름: `tailwind.config.js`·`postcss.config.js` 만들지 말 것. vite 플러그인 + CSS `@import "tailwindcss";`가 전부.
- React Router v8 패키지명은 `react-router` (`react-router-dom` 아님).
- 날짜는 백엔드에서 ISO8601로 내려주고 프론트에서 `toLocaleString()` 변환.
