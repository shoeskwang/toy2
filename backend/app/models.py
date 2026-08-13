from datetime import datetime

from sqlalchemy import ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.mysql import BIGINT, DATETIME
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

TABLE_ARGS = {
    "mysql_engine": "InnoDB",
    "mysql_charset": "utf8mb4",
    "mysql_collate": "utf8mb4_0900_ai_ci",
}

# BIGINT UNSIGNED — 기존 게시판 스키마와 같은 컬럼 타입을 쓴다.
PK = BIGINT(unsigned=True)
# DATETIME(3) — 밀리초까지 보존해야 같은 초에 쓴 글의 정렬이 흔들리지 않는다.
TS = DATETIME(fsp=3)


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (Index("idx_posts_created_at", "created_at"), TABLE_ARGS)

    id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TS, nullable=False, server_default=func.now(3)
    )
    updated_at: Mapped[datetime] = mapped_column(
        TS,
        nullable=False,
        server_default=func.now(3),
        onupdate=func.now(3),
    )

    comments: Mapped[list["Comment"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="Comment.created_at",
    )
    images: Mapped[list["Image"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="Image.id",
    )


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = TABLE_ARGS

    id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(
        PK, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TS, nullable=False, server_default=func.now(3)
    )

    post: Mapped[Post] = relationship(back_populates="comments")


class Image(Base):
    __tablename__ = "images"
    __table_args__ = TABLE_ARGS

    id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    # 업로드 직후에는 NULL. 게시글 저장 시점에 연결된다.
    post_id: Mapped[int | None] = mapped_column(
        PK, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TS, nullable=False, server_default=func.now(3)
    )

    post: Mapped[Post | None] = relationship(back_populates="images")

    @property
    def url(self) -> str:
        return f"/uploads/{self.filename}"
