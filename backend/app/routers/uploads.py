import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image as PILImage
from PIL import UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..models import Image
from ..schemas import ImageOut

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

settings = get_settings()

# Pillow 가 판별한 실제 포맷만 신뢰한다. 클라이언트가 보낸 content-type 헤더는 믿지 않는다.
ALLOWED_FORMATS = {
    "JPEG": (".jpg", "image/jpeg"),
    "PNG": (".png", "image/png"),
    "GIF": (".gif", "image/gif"),
    "WEBP": (".webp", "image/webp"),
}

CHUNK = 64 * 1024


async def _read_capped(file: UploadFile, limit: int) -> bytes:
    """limit 을 넘으면 즉시 413. 전체를 메모리에 올린 뒤 재는 방식은 쓰지 않는다."""
    buf = BytesIO()
    size = 0
    while chunk := await file.read(CHUNK):
        size += len(chunk)
        if size > limit:
            raise HTTPException(
                status.HTTP_413_CONTENT_TOO_LARGE,
                f"파일이 너무 큽니다. 최대 {settings.max_upload_mb}MB까지 가능합니다.",
            )
        buf.write(chunk)
    if size == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "빈 파일입니다.")
    return buf.getvalue()


def _detect_format(data: bytes) -> tuple[str, str]:
    """실제 이미지인지 검증하고 (확장자, content_type) 을 돌려준다."""
    try:
        probe = PILImage.open(BytesIO(data))
        fmt = probe.format
        probe.verify()  # verify() 후에는 probe 를 재사용할 수 없다.
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "이미지 파일이 아니거나 손상되었습니다."
        ) from None

    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"지원하지 않는 형식입니다: {fmt}. jpeg/png/gif/webp만 가능합니다.",
        )
    return ALLOWED_FORMATS[fmt]


@router.post("", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
) -> ImageOut:
    data = await _read_capped(file, settings.max_upload_bytes)
    ext, content_type = _detect_format(data)

    # 저장 파일명은 uuid 로 새로 만든다. 원본 파일명을 경로에 쓰면 traversal 위험이 있다.
    filename = f"{uuid.uuid4().hex}{ext}"
    (settings.upload_path / filename).write_bytes(data)

    image = Image(
        filename=filename,
        original_name=file.filename or filename,
        content_type=content_type,
        size=len(data),
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return ImageOut.model_validate(image)
