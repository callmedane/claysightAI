from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import FRONTEND_DIR, settings

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(router)

frontend_assets = FRONTEND_DIR / 'assets'
if frontend_assets.exists():
    app.mount('/assets', StaticFiles(directory=str(frontend_assets)), name='assets')


@app.get('/health')
async def health_check():
    return JSONResponse({'status': 'ok', 'app_name': settings.app_name, 'debug': settings.debug})


@app.get('/')
async def root():
    index_path = FRONTEND_DIR / 'index.html'
    if settings.serve_frontend_from_backend and index_path.exists():
        return FileResponse(index_path)
    return JSONResponse({'message': 'Greenware backend is running successfully'})


@app.get('/{full_path:path}')
async def frontend_fallback(full_path: str):
    if not settings.serve_frontend_from_backend:
        return JSONResponse({'detail': 'Not found'}, status_code=404)
    candidate = FRONTEND_DIR / full_path
    if candidate.is_file() and candidate.suffix in {'.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.svg'}:
        return FileResponse(candidate)
    index_path = FRONTEND_DIR / 'index.html'
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse({'detail': 'Not found'}, status_code=404)
