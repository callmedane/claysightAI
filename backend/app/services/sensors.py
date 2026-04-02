from __future__ import annotations

import json
import random
from datetime import datetime, UTC
from pathlib import Path

from app.core.config import settings
from app.models.schemas import SensorSnapshot, SensorStateUpdate, SensorStatus


class SensorRegistry:
    DEFAULTS = {
        'camera': {'label': 'Camera / Vision', 'connected': False, 'ready': False, 'notes': 'Connect Pi Camera or USB camera.'},
        'thermal': {'label': 'Thermal Sensor', 'connected': False, 'ready': False, 'notes': 'Reserved for thermal anomaly reading.'},
        'spectral': {'label': 'Spectral / NIR Proxy', 'connected': False, 'ready': False, 'notes': 'For low-cost spectral approximation.'},
        'moisture': {'label': 'Moisture Sensor', 'connected': False, 'ready': False, 'notes': 'For clay moisture monitoring.'},
        'vibration': {'label': 'Acoustic / Vibration', 'connected': False, 'ready': False, 'notes': 'For knock or vibration feedback.'},
        'inductive': {'label': 'Inductive / Metallic', 'connected': False, 'ready': False, 'notes': 'For metallic contamination.'},
        'gas': {'label': 'Gas / Ambient', 'connected': False, 'ready': False, 'notes': 'For surrounding environment checks.'},
    }

    def __init__(self, state_path: str | Path | None = None) -> None:
        self.state_path = Path(state_path or settings.sensor_state_path)
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self._state = self._load_state()

    def _load_state(self) -> dict:
        if self.state_path.exists():
            try:
                return json.loads(self.state_path.read_text(encoding='utf-8'))
            except Exception:
                pass
        state = {
            name: {
                **data,
                'source': 'mock',
                'last_reading_at': None,
            }
            for name, data in self.DEFAULTS.items()
        }
        self._save_state(state)
        return state

    def _save_state(self, state: dict) -> None:
        self.state_path.write_text(json.dumps(state, indent=2), encoding='utf-8')

    def list_status(self) -> list[SensorStatus]:
        return [SensorStatus(name=name, **payload) for name, payload in self._state.items()]

    def update_sensor(self, name: str, patch: SensorStateUpdate) -> SensorStatus:
        if name not in self._state:
            raise KeyError(name)
        current = self._state[name]
        for field, value in patch.model_dump(exclude_none=True).items():
            current[field] = value
        current['last_reading_at'] = datetime.now(UTC).isoformat()
        self._save_state(self._state)
        return SensorStatus(name=name, **current)

    def mark_read(self, names: list[str]) -> None:
        now = datetime.now(UTC).isoformat()
        changed = False
        for name in names:
            if name in self._state:
                self._state[name]['last_reading_at'] = now
                changed = True
        if changed:
            self._save_state(self._state)


class MockSensorService:
    def __init__(self, registry: SensorRegistry) -> None:
        self.registry = registry

    def read_all(self) -> SensorSnapshot:
        spectral = [round(random.uniform(0.1, 1.0), 3) for _ in range(8)]
        self.registry.mark_read(['thermal', 'spectral', 'moisture', 'vibration', 'inductive', 'gas'])
        return SensorSnapshot(
            thermal_avg=round(random.uniform(26.0, 35.0), 2),
            moisture=round(random.uniform(18.0, 42.0), 2),
            hardness=round(random.uniform(0.3, 0.95), 3),
            vibration_peak=round(random.uniform(0.05, 1.2), 3),
            gas_level=round(random.uniform(10.0, 120.0), 2),
            spectral_signature=spectral,
            metallic_flag=random.choice([False, False, False, True]),
            ambient_temp=round(random.uniform(27.0, 33.0), 2),
        )
