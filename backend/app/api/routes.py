from __future__ import annotations

from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException

from app.models.schemas import ScanStartResponse, SensorStateUpdate, SystemStatus
from app.services.fusion import FusionService
from app.services.inference import MockInferenceService
from app.services.sensors import MockSensorService, SensorRegistry
from app.services.storage import StorageService

router = APIRouter(prefix='/api')

sensor_registry = SensorRegistry()
sensor_service = MockSensorService(sensor_registry)
inference_service = MockInferenceService()
fusion_service = FusionService()
storage_service = StorageService()
APP_STARTED_AT = datetime.now(UTC)


@router.get('/health')
def health():
    return {'ok': True}


@router.get('/system/status', response_model=SystemStatus)
def system_status():
    return SystemStatus(
        backend='online',
        database='online',
        frontend='available',
        mode='local-offline-ready',
        sensors=sensor_registry.list_status(),
        model=inference_service.model_status(),
    )


@router.get('/sensors')
def list_sensors():
    return sensor_registry.list_status()


@router.patch('/sensors/{sensor_name}')
def patch_sensor(sensor_name: str, patch: SensorStateUpdate):
    try:
        return sensor_registry.update_sensor(sensor_name, patch)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail='Sensor not found.') from exc


@router.post('/scan/start', response_model=ScanStartResponse)
def start_scan():
    snapshot = sensor_service.read_all()
    result = inference_service.run(snapshot)
    result = fusion_service.enrich(result)
    payload = result.model_dump(mode='json')
    storage_service.save_scan(payload)
    return ScanStartResponse(scan_id=result.scan_id, message='Mock scan completed successfully.')


@router.get('/scan/latest')
def latest_scan():
    scans = storage_service.list_scans(limit=1)
    if not scans:
        raise HTTPException(status_code=404, detail='No scans found.')
    return scans[0]


@router.get('/scan/{scan_id}')
def get_scan(scan_id: str):
    scan = storage_service.get_scan(scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail='Scan not found.')
    return scan


@router.get('/history')
def history(limit: int = 20):
    return storage_service.list_scans(limit=limit)


@router.delete('/history/clear')
def clear_all_history():
    count = storage_service.clear_all_scans()
    return {'message': f'Cleared {count} scan records.', 'deleted_count': count}


@router.delete('/history/{scan_id}')
def delete_history_item(scan_id: str):
    if storage_service.delete_scan(scan_id):
        return {'message': f'Scan {scan_id} deleted successfully.'}
    raise HTTPException(status_code=404, detail='Scan not found.')


@router.get('/reports/summary')
def report_summary():
    summary = storage_service.stats()
    uptime_seconds = int((datetime.now(UTC) - APP_STARTED_AT).total_seconds())
    summary['uptime_seconds'] = uptime_seconds
    return summary
