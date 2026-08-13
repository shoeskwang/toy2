"""이미지 업로드 엔드포인트. 검증·저장은 services.uploads 가 맡는다."""

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import ImageOut
from ..services import uploads as upload_service

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
) -> ImageOut:
    return await upload_service.upload_image(db, file)
