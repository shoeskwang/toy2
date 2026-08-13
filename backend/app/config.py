from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

# 이 앱이 쓰도록 허용된 유일한 스키마. toy 계정은 기존 toy_board 에도 쓰기 권한이
# 있어서, DB_NAME 오타가 조용히 남의 데이터를 오염시킬 수 있다. 그래서 하드 가드를 둔다.
REQUIRED_DB_NAME = "claude_board"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_name: str = REQUIRED_DB_NAME
    db_user: str = "toy"
    db_password: str = "toy_password"

    app_port: int = 8000
    upload_dir: str = "uploads"
    max_upload_mb: int = 5
    cors_origins: str = "http://localhost:5174"

    @property
    def database_url(self) -> str:
        # charset 을 빼면 한글이 깨진다.
        return (
            f"mysql+asyncmy://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        path = BASE_DIR / self.upload_dir
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.db_name != REQUIRED_DB_NAME:
        raise RuntimeError(
            f"DB_NAME must be {REQUIRED_DB_NAME!r}, got {settings.db_name!r}. "
            "Writing to another schema would corrupt the pre-existing board."
        )
    return settings
