from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

MaterialType = Literal['mineral', 'organic', 'metallic', 'void', 'unknown']
DepthType = Literal['surface', 'subsurface', 'unknown']
SeverityType = Literal['low', 'medium', 'high']


class SensorSnapshot(BaseModel):
    thermal_avg: float = 0.0
    moisture: float = 0.0
    hardness: float = 0.0
    vibration_peak: float = 0.0
    gas_level: float = 0.0
    spectral_signature: list[float] = Field(default_factory=list)
    metallic_flag: bool = False
    ambient_temp: float = 0.0


class SensorStatus(BaseModel):
    name: str
    label: str
    connected: bool = False
    ready: bool = False
    last_reading_at: datetime | None = None
    source: Literal['mock', 'hardware'] = 'mock'
    notes: str = ''


class ModelStatus(BaseModel):
    loaded: bool = False
    source: Literal['mock', 'local_model'] = 'mock'
    name: str = 'Mock Detector'
    version: str = '0.1'
    notes: str = 'Ready for future local model integration.'


class SystemStatus(BaseModel):
    backend: str = 'online'
    database: str = 'online'
    frontend: str = 'available'
    mode: str = 'local-offline-ready'
    sensors: list[SensorStatus] = Field(default_factory=list)
    model: ModelStatus = Field(default_factory=ModelStatus)


class DefectPoint(BaseModel):
    id: str
    x: float
    y: float
    z: float = 0.0
    material: MaterialType = 'unknown'
    depth: DepthType = 'unknown'
    confidence: float = 0.0
    severity: SeverityType = 'low'
    note: str = ''


class ScanResult(BaseModel):
    scan_id: str
    created_at: datetime
    overall_status: Literal['pass', 'fail', 'review']
    debris_count: int
    moisture_estimate: float
    drying_time_hours: float
    recommendation: str
    defects: list[DefectPoint]
    sensor_snapshot: SensorSnapshot
    mesh_points: list[list[float]] = Field(default_factory=list)


class ScanStartResponse(BaseModel):
    scan_id: str
    message: str


class SensorStateUpdate(BaseModel):
    connected: bool | None = None
    ready: bool | None = None
    notes: str | None = None
    source: Literal['mock', 'hardware'] | None = None
