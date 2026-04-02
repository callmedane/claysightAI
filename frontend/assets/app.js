const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || window.location.origin;

const el = {
  scanBtn: document.getElementById('scanBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  overallStatus: document.getElementById('overallStatus'),
  decisionLabel: document.getElementById('decisionLabel'),
  backendState: document.getElementById('backendState'),
  databaseState: document.getElementById('databaseState'),
  modelState: document.getElementById('modelState'),
  debrisCount: document.getElementById('debrisCount'),
  moistureValue: document.getElementById('moistureValue'),
  dryingValue: document.getElementById('dryingValue'),
  recommendation: document.getElementById('recommendation'),
  sensorGrid: document.getElementById('sensorGrid'),
  defectList: document.getElementById('defectList'),
  historyBody: document.getElementById('historyBody'),
  surfaceCount: document.getElementById('surfaceCount'),
  subsurfaceCount: document.getElementById('subsurfaceCount'),
  highestConfidence: document.getElementById('highestConfidence'),
  totalScans: document.getElementById('totalScans'),
  passRate: document.getElementById('passRate'),
  avgDefects: document.getElementById('avgDefects'),
  mapCanvas: document.getElementById('mapCanvas'),
  themeToggle: document.getElementById('themeToggle'),
};

const ctx = el.mapCanvas ? el.mapCanvas.getContext('2d') : null;

function pill(status) {
  el.overallStatus.textContent = String(status || 'idle').toUpperCase();
  el.overallStatus.className = `pill ${status || 'idle'}`;
  el.decisionLabel.textContent = status === 'pass' ? 'Proceed' : status === 'fail' ? 'Rework Needed' : status === 'review' ? 'Manual Review' : 'Awaiting Scan';
}

function updateThemeButton(theme) {
  if (!el.themeToggle) return;
  const isDark = theme === 'dark';
  el.themeToggle.textContent = isDark ? '☀️' : '🌙';
  el.themeToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  el.themeToggle.classList.toggle('active', isDark);
}

function setTheme(theme) {
  if (!theme || (theme !== 'light' && theme !== 'dark')) theme = 'light';
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${theme}`);
  localStorage.setItem('claysight-theme', theme);
  updateThemeButton(theme);
}

function toggleTheme() {
  const activeTheme = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
  const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
}

function loadTheme() {
  const saved = localStorage.getItem('claysight-theme');
  if (saved === 'dark' || saved === 'light') {
    setTheme(saved);
    return;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(prefersDark ? 'dark' : 'light');
}

function drawMap(defects = []) {
  if (!ctx || !el.mapCanvas) return;
  const w = el.mapCanvas.width;
  const h = el.mapCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#edf5ee';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#7aa585';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, 180, 110, 0, 0, Math.PI * 2);
  ctx.stroke();
  defects.forEach((defect, index) => {
    const x = w / 2 + defect.x * 125;
    const y = h / 2 + defect.y * 85;
    ctx.beginPath();
    ctx.fillStyle = defect.depth === 'subsurface' ? '#b44343' : '#2f8f5b';
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(String(index + 1), x - 3, y + 4);
  });
}

function renderSensors(sensors = []) {
  el.sensorGrid.innerHTML = '';
  sensors.forEach((sensor) => {
    const div = document.createElement('div');
    div.className = 'sensor-item';
    div.innerHTML = `
      <strong>${sensor.label}</strong>
      <div>${sensor.connected ? 'Connected' : 'Not connected'} • ${sensor.ready ? 'Ready' : 'Not ready'}</div>
      <small>${sensor.notes || ''}</small>
    `;
    el.sensorGrid.appendChild(div);
  });
}

function renderDefects(defects = []) {
  el.defectList.innerHTML = '';
  let surface = 0;
  let subsurface = 0;
  let highest = 0;
  if (!defects.length) {
    el.defectList.innerHTML = '<li>No major defects found.</li>';
  }
  defects.forEach((d, index) => {
    const li = document.createElement('li');
    li.textContent = `#${index + 1} ${d.material} • ${d.depth} • confidence ${(Number(d.confidence) * 100).toFixed(0)}%`;
    el.defectList.appendChild(li);
    if (d.depth === 'surface') surface += 1;
    if (d.depth === 'subsurface') subsurface += 1;
    highest = Math.max(highest, Number(d.confidence || 0));
  });
  el.surfaceCount.textContent = surface;
  el.subsurfaceCount.textContent = subsurface;
  el.highestConfidence.textContent = highest ? `${(highest * 100).toFixed(0)}%` : '--';
  drawMap(defects);
}

function renderHistory(history = []) {
  el.historyBody.innerHTML = '';
  if (!history.length) {
    el.historyBody.innerHTML = '<tr><td colspan="4">No data yet.</td></tr>';
    return;
  }
  history.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${String(item.scan_id || '').slice(0, 8)}</td>
      <td>${item.overall_status || '--'}</td>
      <td>${item.debris_count ?? 0}</td>
      <td>${item.created_at ? new Date(item.created_at).toLocaleString() : '--'}</td>
    `;
    el.historyBody.appendChild(tr);
  });
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

async function refreshAll() {
  if (!el.backendState || !el.historyBody) {
    return; // non-dashboard pages provide only theme and static content
  }

  try {
    const [system, history, summary] = await Promise.all([
      request('/api/system/status'),
      request('/api/history?limit=10'),
      request('/api/reports/summary'),
    ]);
    el.backendState.textContent = system.backend;
    el.databaseState.textContent = system.database;
    el.modelState.textContent = system.model.loaded ? `${system.model.name} ready` : 'Not loaded';
    renderSensors(system.sensors || []);
    renderHistory(history || []);
    el.totalScans.textContent = summary.total_scans ?? 0;
    el.passRate.textContent = `${summary.pass_rate ?? 0}%`;
    el.avgDefects.textContent = summary.avg_defects ?? 0;

    try {
      const latest = await request('/api/scan/latest');
      pill(latest.overall_status);
      el.debrisCount.textContent = latest.debris_count ?? 0;
      el.moistureValue.textContent = `${latest.moisture_estimate ?? '--'}%`;
      el.dryingValue.textContent = `${latest.drying_time_hours ?? '--'} h`;
      el.recommendation.textContent = latest.recommendation || 'No recommendation available.';
      renderDefects(latest.defects || []);
    } catch (_) {
      pill('idle');
      renderDefects([]);
    }
  } catch (error) {
    console.error(error);
    el.backendState.textContent = 'offline';
    el.databaseState.textContent = 'unknown';
    el.modelState.textContent = 'unknown';
  }
}

if (el.scanBtn) {
  el.scanBtn.addEventListener('click', async () => {
    try {
      el.scanBtn.disabled = true;
      el.scanBtn.textContent = 'Scanning...';
      await request('/api/scan/start', { method: 'POST' });
      await refreshAll();
    } catch (error) {
      console.error(error);
      alert('Scan failed. Check the backend terminal output.');
    } finally {
      el.scanBtn.disabled = false;
      el.scanBtn.textContent = 'Start Scan';
    }
  });
}

if (el.refreshBtn) el.refreshBtn.addEventListener('click', refreshAll);
if (el.themeToggle) {
  el.themeToggle.addEventListener('click', toggleTheme);
}
loadTheme();
refreshAll();
