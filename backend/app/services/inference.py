from __future__ import annotations

import random
import uuid
from datetime import UTC, datetime

from app.models.schemas import DefectPoint, ModelStatus, ScanResult, SensorSnapshot


class MockInferenceService:
    def model_status(self) -> ModelStatus:
        return ModelStatus(
            loaded=True,
            source='mock',
            name='Mock Greenware Defect Detector',
            version='1.0',
            notes='Use this interface to replace the mock detector with your local model on Raspberry Pi.',
        )

    def run(self, sensor_snapshot: SensorSnapshot) -> ScanResult:
        defect_count = random.randint(0, 4)
        defects: list[DefectPoint] = []

        for _ in range(defect_count):
            material = random.choice(['mineral', 'organic', 'metallic', 'void'])
            depth = random.choice(['surface', 'subsurface'])
            confidence = round(random.uniform(0.62, 0.97), 2)
            severity = 'high' if confidence > 0.9 else 'medium' if confidence > 0.75 else 'low'
            defects.append(
                DefectPoint(
                    id=str(uuid.uuid4())[:8],
                    x=round(random.uniform(-1.0, 1.0), 3),
                    y=round(random.uniform(-1.0, 1.0), 3),
                    z=round(random.uniform(-0.2, 0.4), 3),
                    material=material,
                    depth=depth,
                    confidence=confidence,
                    severity=severity,
                    note=f'{material.title()} anomaly candidate',
                )
            )

        if defect_count == 0:
            status = 'pass'
            recommendation = 'No critical debris detected. Continue drying and proceed to the next inspection stage.'
        elif any(d.severity == 'high' for d in defects):
            status = 'fail'
            recommendation = 'High-severity anomaly detected. Remove debris and remold or reprocess the clay.'
        else:
            status = 'review'
            recommendation = 'Suspicious defects found. Perform manual review and selective rework before drying.'

        mesh_points = []
        for x in range(-10, 11):
            for y in range(-10, 11):
                z = round(0.15 * (1 - ((x / 10) ** 2 + (y / 10) ** 2)), 3)
                mesh_points.append([x / 10, y / 10, max(z, 0)])

        drying_time = max(4.0, round(sensor_snapshot.moisture * 0.8, 1))

        return ScanResult(
            scan_id=str(uuid.uuid4()),
            created_at=datetime.now(UTC),
            overall_status=status,
            debris_count=defect_count,
            moisture_estimate=sensor_snapshot.moisture,
            drying_time_hours=drying_time,
            recommendation=recommendation,
            defects=defects,
            sensor_snapshot=sensor_snapshot,
            mesh_points=mesh_points,
        )
