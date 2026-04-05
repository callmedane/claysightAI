from __future__ import annotations

import json
import random
from datetime import datetime, UTC
from pathlib import Path

from app.core.config import settings
from app.models.schemas import SensorSnapshot, SensorStateUpdate, SensorStatus


class SensorRegistry:
    DEFAULTS = {
        'camera': {
            'label': '8MP RGB Camera',
            'connected': False,
            'ready': False,
            'notes': 'Raspberry Pi Camera Module with 8MP resolution.',
        },
        'thermal': {
            'label': 'Thermal Sensor',
            'connected': False,
            'ready': False,
            'notes': 'Reserved for thermal anomaly reading.',
        },
        'noir': {
            'label': 'NoIR Camera + Laser Grid (No Infrared filter)',
            'connected': False,
            'ready': False,
            'notes': 'Infrared sensitive camera with laser grid for 3D mapping.',
        },
        'spectral': {
            'label': 'Spectral Sensor',
            'connected': False,
            'ready': False,
            'notes': 'Fusion-linked with NoIR camera preview for material detection.',
        },
        'moisture': {
            'label': 'Moisture Sensor',
            'connected': False,
            'ready': False,
            'notes': 'For clay moisture monitoring.',
        },
        'humidity_hw481': {
            'label': 'Humidity Sensor (HW481)',
            'connected': False,
            'ready': False,
            'notes': 'Reserved for humidity monitoring near the clay inspection chamber.',
        },
        'gas': {
            'label': 'Gas / Ambient',
            'connected': False,
            'ready': False,
            'notes': 'For surrounding environment checks.',
        },
    }

    def __init__(self, state_path: str | Path | None = None) -> None:
        self.state_path = Path(state_path or settings.sensor_state_path)
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self._state = self._load_state()

    def _load_state(self) -> dict:
        state = {}
        
        # Load existing state from file if it exists
        if self.state_path.exists():
            try:
                state = json.loads(self.state_path.read_text(encoding='utf-8'))
            except Exception:
                pass

        # Merge with DEFAULTS to ensure all sensors are present
        # This adds any new sensors from DEFAULTS that aren't in the loaded state
        for name, data in self.DEFAULTS.items():
            if name not in state:
                state[name] = {
                    **data,
                    'source': 'mock',
                    'last_reading_at': None,
                }

        # If state was empty or updated, save it
        if not self.state_path.exists() or self._needs_save(state):
            self._save_state(state)

        return state

    def _needs_save(self, loaded_state: dict) -> bool:
        """Check if loaded state is missing any sensors from DEFAULTS"""
        return any(name not in loaded_state for name in self.DEFAULTS.keys())

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
        thermal_avg = round(random.uniform(26.0, 35.0), 2)
        thermal_max = round(thermal_avg + random.uniform(2.0, 8.0), 2)

        self.registry.mark_read([
            'thermal',
            'spectral',
            'noir',
            'moisture',
            'humidity_hw481',
            'gas',
            'camera',
        ])

        return SensorSnapshot(
            thermal_avg=thermal_avg,
            thermal_max=thermal_max,
            moisture=round(random.uniform(18.0, 42.0), 2),
            humidity=round(random.uniform(35.0, 75.0), 2),
            hardness=round(random.uniform(0.3, 0.95), 3),
            vibration_peak=round(random.uniform(0.05, 1.2), 3),
            gas_level=round(random.uniform(10.0, 120.0), 2),
            spectral_signature=spectral,
            metallic_flag=random.choice([False, False, False, True]),
            ambient_temp=round(random.uniform(27.0, 33.0), 2),
            last_updated=datetime.now(UTC),
        )