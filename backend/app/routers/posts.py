from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Comment, Image, Post
from ..schemas import PageOut, PostCreate, PostDetail, PostSummary, PostUpdate
from ..storage import remove_image_files

router = APIRouter(prefix="/api/posts", tags=["posts"])


async def _get_post_or_404(db: AsyncSession, post_id: int) -> Post:
    """관계까지 미리 로드해서 가져온다. async 에서 lazy load 는 MissingGreenlet 을 낸다.

    populate_existing 이 없으면, 같은 세션에서 이미 로드된 인스턴스의 컬렉션을
    SQLAlchemy 가 재사용해버린다. 생성·수정 직후 재조회할 때 방금 붙인 이미지가
    빠진 채로 응답되는 원인이었다 (expire_on_commit=False 라 더 오래 남는다).
    """
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.comments), selectinload(Post.images))
        .where(Post.id == post_id)
        .execution_options(populate_existing=True)
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.")
    return post


async def _claim_images(db: AsyncSession, post: Post, image_ids: list[int]) -> None:
    """image_ids 를 이 게시글에 연결하고, 빠진 기존 이미지는 레코드·파일까지 삭제한다.

    아직 어느 글에도 안 붙은 이미지(post_id IS NULL)이거나 이미 이 글의 것이어야
    연결할 수 있다 — 남의 글에 붙은 이미지를 가로채지 못하게 막는다.
    """
    current = {img.id: img for img in post.images}

    if image_ids:
        result = await db.execute(
            select(Image).where(
                Image.id.in_(image_ids),
                or_(Image.post_id.is_(None), Image.post_id == post.id),
            )
        )
        claimable = result.scalars().all()
        found = {img.id for img in claimable}
        missing = [i for i in image_ids if i not in found]
        if missing:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"연결할 수 없는 이미지입니다: {missing}",
            )
        for img in claimable:
            img.post_id = post.id

    # 이번 요청에서 빠진 이미지는 더 이상 어디서도 닿을 수 없으므로 완전히 지운다.
    # (업로드만 하고 글을 저장하지 않아 생기는 고아 이미지는 이번 범위 밖이다.)
    keep = set(image_ids)
    stale = [img for img_id, img in current.items() if img_id not in keep]
    if stale:
        remove_image_files(stale)
        for img in stale:
            await db.delete(img)


@router.get("", response_model=PageOut[PostSummary])
async def list_posts(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    q: str | None = Query(None),
) -> PageOut[PostSummary]:
    filters = []
    if q:
        pattern = f"%{q}%"
        filters.append(or_(Post.title.like(pattern), Post.content.like(pattern)))

    total = await db.scalar(select(func.count()).select_from(Post).where(*filters)) or 0

    comment_count = (
        select(func.count(Comment.id))
        .where(Comment.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    result = await db.execute(
        select(Post, comment_count.label("comment_count"))
        .options(selectinload(Post.images))
        .where(*filters)
        # 같은 밀리초에 들어온 글끼리 순서가 흔들리지 않도록 id 를 tie-breaker 로 둔다.
        .order_by(Post.created_at.desc(), Post.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    )

    items = [
        PostSummary(
            id=post.id,
            title=post.title,
            author=post.author,
            created_at=post.created_at,
            updated_at=post.updated_at,
            comment_count=count,
            thumbnail=post.images[0].url if post.images else None,
        )
        for post, count in result.all()
    ]
    return PageOut(items=items, total=total, page=page, size=size)


@router.post("", response_model=PostDetail, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate, db: AsyncSession = Depends(get_db)
) -> PostDetail:
    post = Post(title=payload.title, content=payload.content, author=payload.author)
    db.add(post)
    await db.flush()  # id 를 확보해야 이미지를 붙일 수 있다.

    await db.refresh(post, ["comments", "images"])
    await _claim_images(db, post, payload.image_ids)

    await db.commit()
    return PostDetail.model_validate(await _get_post_or_404(db, post.id))


@router.get("/{post_id}", response_model=PostDetail)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)) -> PostDetail:
    return PostDetail.model_validate(await _get_post_or_404(db, post_id))


@router.put("/{post_id}", response_model=PostDetail)
async def update_post(
    post_id: int, payload: PostUpdate, db: AsyncSession = Depends(get_db)
) -> PostDetail:
    post = await _get_post_or_404(db, post_id)
    post.title = payload.title
    post.content = payload.content
    await _claim_images(db, post, payload.image_ids)

    await db.commit()
    return PostDetail.model_validate(await _get_post_or_404(db, post_id))


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: int, db: AsyncSession = Depends(get_db)) -> None:
    post = await _get_post_or_404(db, post_id)
    # 레코드는 cascade 로 지워지지만 디스크 파일은 직접 치워야 한다.
    remove_image_files(post.images)
    await db.delete(post)
    await db.commit()
