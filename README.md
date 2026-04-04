<<<<<<< HEAD
# claysightAI
=======
# Greenware Inspection System - Local Offline Ready

This revised version is split into a real **frontend** and **backend**, but it is also easy to run in VS Code because the backend can serve the frontend directly.

## What changed
- separated UI into `frontend/`
- kept backend API in `backend/`
- switched to **local SQLite database only** by default
- removed cloud dependency from the default install path
- added **sensor status registry** so the app is ready for real Raspberry Pi sensor integration
- added **model status endpoint** so you can later swap the mock model with your real local model
- fixed file paths so the project works even after moving folders
- removed the broken `.venv` from the project package

## Recommended Python version
Use **Python 3.11, 3.12, or 3.13**.
Do **not** use Python 3.14 for this project yet.

## Project structure
- `backend/app/main.py` - FastAPI app
- `backend/app/api/routes.py` - API routes
- `backend/app/services/sensors.py` - sensor registry and mock sensor service
- `backend/app/services/inference.py` - mock model service
- `backend/app/services/storage.py` - local SQLite storage
- `backend/data/greenware_local.db` - local database file
- `backend/runtime/sensor_state.json` - local sensor status file
- `frontend/index.html` - frontend page
- `frontend/assets/app.js` - frontend logic
- `frontend/assets/styles.css` - frontend style
- `frontend/config.js` - frontend API base URL

## Easiest way to run in VS Code
Open a terminal in the project root, then run:

### 1) Backend + frontend in one server
```powershell
cd backend
py -3.12 -m venv .venv (depending on the Python version you have)
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open:
`http://127.0.0.1:8000`

## Run frontend separately only if you want
Backend:
```powershell
cd backend
.venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend:
```powershell
cd frontend
python -m http.server 5500
```

Then edit `frontend/config.js` to:
```js
window.APP_CONFIG = {
  API_BASE_URL: 'http://127.0.0.1:8000'
};
```

Open:
`http://127.0.0.1:5500`

## Raspberry Pi note
When you move this to Raspberry Pi, keep the same backend and frontend folders. The default setup already uses local SQLite, so internet is not required.

## Sensor integration plan
For real hardware later, replace the mock logic inside:
- `backend/app/services/sensors.py`
- `backend/app/services/inference.py`

The frontend already reads:
- `/api/system/status`
- `/api/sensors`
- `/api/scan/start`
- `/api/scan/latest`
- `/api/history`
- `/api/reports/summary`

## If VS Code shows broken venv again
Delete `.venv` and recreate it. Never reuse a `.venv` after moving the project folder.
>>>>>>> 796e630 (Initial commit: Greenware system project)
