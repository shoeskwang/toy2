from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import REQUIRED_DB_NAME, get_settings
from .database import Base, engine
from .router import router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # toy 계정은 기존 toy_board 에도 쓰기 권한이 있다. 스키마명이 틀린 채로
    # create_all 이 돌면 남의 테이블을 건드리게 되므로 여기서 한 번 더 못을 박는다.
    target = engine.url.database
    if target != REQUIRED_DB_NAME:
        raise RuntimeError(f"refusing to start: engine points at {target!r}")
    print(f"[claude-board] schema={target} port={settings.app_port}")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="claude-board", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# 업로드된 원본 이미지는 /api 가 아닌 /uploads 로 서빙한다.
app.mount("/uploads", StaticFiles(directory=settings.upload_path), name="uploads")


@app.get("/healthz", tags=["meta"])
async def healthz() -> dict[str, str]:
    return {"status": "ok", "schema": REQUIRED_DB_NAME}
