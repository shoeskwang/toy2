"""도메인별 라우터를 /api 아래로 모으는 집계 지점."""

from fastapi import APIRouter

from .endpoints import comments, posts, uploads

router = APIRouter(prefix="/api")

router.include_router(posts.router)
router.include_router(comments.router)
router.include_router(uploads.router)
