from collections.abc import Iterable

from .config import get_settings
from .models import Image

settings = get_settings()


def remove_image_files(images: Iterable[Image]) -> None:
    """이미지 레코드에 대응하는 디스크 파일을 지운다.

    파일이 이미 없어도 조용히 넘어간다 — DB 레코드 삭제를 막을 이유가 없다.
    filename 은 업로드 시 uuid4 로 생성한 값이므로 경로 조작 위험이 없지만,
    방어적으로 파일명만 취해 업로드 디렉토리 안으로 고정한다.
    """
    base = settings.upload_path.resolve()
    for image in images:
        target = (base / image.filename).resolve()
        if target.parent != base:
            continue
        target.unlink(missing_ok=True)
