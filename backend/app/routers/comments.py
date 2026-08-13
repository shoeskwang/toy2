from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Comment, Post
from ..schemas import CommentCreate, CommentOut

router = APIRouter(prefix="/api", tags=["comments"])


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: int, payload: CommentCreate, db: AsyncSession = Depends(get_db)
) -> CommentOut:
    exists = await db.scalar(select(Post.id).where(Post.id == post_id))
    if exists is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.")

    comment = Comment(post_id=post_id, author=payload.author, content=payload.content)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentOut.model_validate(comment)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: int, db: AsyncSession = Depends(get_db)) -> None:
    comment = await db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "댓글을 찾을 수 없습니다.")
    await db.delete(comment)
    await db.commit()
