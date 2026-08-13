from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    original_name: str
    size: int


class CommentCreate(BaseModel):
    author: str = Field(min_length=1, max_length=50)
    content: str = Field(min_length=1)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    author: str
    content: str
    created_at: datetime


class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    author: str = Field(min_length=1, max_length=50)
    image_ids: list[int] = Field(default_factory=list)


class PostUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    image_ids: list[int] = Field(default_factory=list)


class PostSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    created_at: datetime
    updated_at: datetime
    comment_count: int
    thumbnail: str | None = None


class PostDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    author: str
    created_at: datetime
    updated_at: datetime
    comments: list[CommentOut] = Field(default_factory=list)
    images: list[ImageOut] = Field(default_factory=list)


class PageOut(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
