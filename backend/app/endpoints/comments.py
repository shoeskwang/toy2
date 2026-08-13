"""댓글 엔드포인트.

생성은 게시글 하위 경로(/posts/{post_id}/comments), 삭제는 댓글 단독 경로
(/comments/{comment_id})라 공통 prefix 를 잡을 수 없다. 경로를 그대로 적는다.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import CommentCreate, CommentOut
from ..services import comments as comment_service

router = APIRouter(tags=["comments"])


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: int, payload: CommentCreate, db: AsyncSession = Depends(get_db)
) -> CommentOut:
    return await comment_service.create_comment(db, post_id, payload)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: int, db: AsyncSession = Depends(get_db)) -> None:
    await comment_service.delete_comment(db, comment_id)
