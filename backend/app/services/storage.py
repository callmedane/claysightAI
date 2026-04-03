from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.firebase_client import FirebaseClient


class StorageService:
    def __init__(self) -> None:
        self.db_path = Path(settings.sqlite_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.firebase = FirebaseClient()
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with closing(self._connect()) as conn:
            conn.execute(
                '''
                CREATE TABLE IF NOT EXISTS scans (
                    scan_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    overall_status TEXT NOT NULL,
                    recommendation TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                '''
            )
            conn.commit()

    def save_scan(self, payload: dict[str, Any]) -> None:
        with closing(self._connect()) as conn:
            conn.execute(
                '''
                INSERT OR REPLACE INTO scans (scan_id, created_at, overall_status, recommendation, payload_json)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (
                    payload['scan_id'],
                    payload['created_at'],
                    payload['overall_status'],
                    payload['recommendation'],
                    json.dumps(payload),
                ),
            )
            conn.commit()
        self.firebase.save_scan(payload)

    def get_scan(self, scan_id: str) -> dict[str, Any] | None:
        with closing(self._connect()) as conn:
            row = conn.execute('SELECT payload_json FROM scans WHERE scan_id = ?', (scan_id,)).fetchone()
        if not row:
            return None
        return json.loads(row['payload_json'])

    def list_scans(self, limit: int = 20) -> list[dict[str, Any]]:
        with closing(self._connect()) as conn:
            rows = conn.execute('SELECT payload_json FROM scans ORDER BY created_at DESC LIMIT ?', (limit,)).fetchall()
        return [json.loads(row['payload_json']) for row in rows]

    def stats(self) -> dict[str, Any]:
        scans = self.list_scans(limit=1000)
        total = len(scans)
        if total == 0:
            return {'total_scans': 0, 'pass_rate': 0, 'avg_defects': 0}
        passed = sum(1 for item in scans if item.get('overall_status') == 'pass')
        defects = [item.get('debris_count', 0) for item in scans]
        return {
            'total_scans': total,
            'pass_rate': round((passed / total) * 100, 1),
            'avg_defects': round(sum(defects) / total, 2),
        }

    def delete_scan(self, scan_id: str) -> bool:
        """Delete a specific scan record. Returns True if deleted, False if not found."""
        with closing(self._connect()) as conn:
            cursor = conn.execute('DELETE FROM scans WHERE scan_id = ?', (scan_id,))
            conn.commit()
            return cursor.rowcount > 0

    def clear_all_scans(self) -> int:
        """Delete all scan records. Returns the number of deleted records."""
        with closing(self._connect()) as conn:
            cursor = conn.execute('DELETE FROM scans')
            conn.commit()
            return cursor.rowcount
