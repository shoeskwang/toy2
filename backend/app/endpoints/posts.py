"""게시글 엔드포인트. 로직은 services.posts 가 맡는다."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import PageOut, PostCreate, PostDetail, PostSummary, PostUpdate
from ..services import posts as post_service

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=PageOut[PostSummary])
async def list_posts(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    q: str | None = Query(None),
) -> PageOut[PostSummary]:
    return await post_service.list_posts(db, page=page, size=size, q=q)


@router.post("", response_model=PostDetail, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate, db: AsyncSession = Depends(get_db)
) -> PostDetail:
    return await post_service.create_post(db, payload)


@router.get("/{post_id}", response_model=PostDetail)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)) -> PostDetail:
    return await post_service.get_post(db, post_id)


@router.put("/{post_id}", response_model=PostDetail)
async def update_post(
    post_id: int, payload: PostUpdate, db: AsyncSession = Depends(get_db)
) -> PostDetail:
    return await post_service.update_post(db, post_id, payload)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: int, db: AsyncSession = Depends(get_db)) -> None:
    await post_service.delete_post(db, post_id)
