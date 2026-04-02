from __future__ import annotations

from app.models.schemas import ScanResult


class FusionService:
    def enrich(self, result: ScanResult) -> ScanResult:
        # Placeholder for future fusion logic.
        # Later, combine:
        # - RT-DETR / YOLO segmentation
        # - thermal anomalies
        # - capacitive moisture
        # - force / vibration
        # - spectral / gas / inductive / color
        return result
