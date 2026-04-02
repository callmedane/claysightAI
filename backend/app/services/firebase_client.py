from __future__ import annotations

from pathlib import Path
from typing import Any

from app.core.config import settings


class FirebaseClient:
    def __init__(self) -> None:
        self.enabled = settings.firebase_enabled
        self.db = None
        if not self.enabled:
            return

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError('Firebase is enabled but firebase-admin is not installed.') from exc

        if not settings.firebase_credentials:
            raise RuntimeError('FIREBASE_ENABLED is true but FIREBASE_CREDENTIALS is empty.')

        cred_path = Path(settings.firebase_credentials)
        if not cred_path.exists():
            raise FileNotFoundError(f'Firebase credentials file not found: {cred_path}')

        self._firestore = firestore
        if not firebase_admin._apps:
            cred = credentials.Certificate(str(cred_path))
            firebase_admin.initialize_app(cred, {'projectId': settings.firebase_project_id or None})

        self.db = firestore.client()

    def save_scan(self, payload: dict[str, Any]) -> None:
        if not self.enabled or self.db is None:
            return
        self.db.collection('scans').document(payload['scan_id']).set(payload)

    def list_scans(self, limit: int = 20) -> list[dict[str, Any]]:
        if not self.enabled or self.db is None:
            return []
        docs = self.db.collection('scans').order_by('created_at', direction=self._firestore.Query.DESCENDING).limit(limit).stream()
        return [doc.to_dict() for doc in docs]
