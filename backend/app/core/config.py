from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BASE_DIR.parent
FRONTEND_DIR = PROJECT_DIR / 'frontend'
DATA_DIR = PROJECT_DIR / 'backend' / 'data'
RUNTIME_DIR = PROJECT_DIR / 'backend' / 'runtime'


class Settings(BaseSettings):
    app_name: str = 'Greenware Inspection System'
    debug: bool = True
    host: str = '127.0.0.1'
    port: int = 8000
    allowed_origins: str = '*'

    sqlite_path: str = str(DATA_DIR / 'greenware_local.db')
    sensor_state_path: str = str(RUNTIME_DIR / 'sensor_state.json')
    use_mock_data: bool = True
    serve_frontend_from_backend: bool = True

    firebase_enabled: bool = False
    firebase_credentials: str = ''
    firebase_project_id: str = ''

    model_config = SettingsConfigDict(env_file=str(BASE_DIR / '.env'), env_file_encoding='utf-8', extra='ignore')

    @property
    def allowed_origins_list(self) -> list[str]:
        value = (self.allowed_origins or '*').strip()
        if value == '*':
            return ['*']
        return [item.strip() for item in value.split(',') if item.strip()]


settings = Settings()
DATA_DIR.mkdir(parents=True, exist_ok=True)
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
