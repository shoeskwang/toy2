"""댓글 도메인 로직."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Comment, Post
from ..schemas import CommentCreate, CommentOut


async def create_comment(
    db: AsyncSession, post_id: int, payload: CommentCreate
) -> CommentOut:
    exists = await db.scalar(select(Post.id).where(Post.id == post_id))
    if exists is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.")

    comment = Comment(post_id=post_id, author=payload.author, content=payload.content)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentOut.model_validate(comment)


async def delete_comment(db: AsyncSession, comment_id: int) -> None:
    comment = await db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "댓글을 찾을 수 없습니다.")
    await db.delete(comment)
    await db.commit()
