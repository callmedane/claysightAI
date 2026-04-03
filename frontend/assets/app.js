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
  themeToggle: document.getElementById('themeToggle'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  // Modal elements
  deleteModal: document.getElementById('deleteModal'),
  deleteModalNo: document.getElementById('deleteModalNo'),
  deleteModalConfirm: document.getElementById('deleteModalConfirm'),
  clearModal: document.getElementById('clearModal'),
  clearModalNo: document.getElementById('clearModalNo'),
  clearModalConfirm: document.getElementById('clearModalConfirm'),
  clearSuccessModal: document.getElementById('clearSuccessModal'),
  clearSuccessBtn: document.getElementById('clearSuccessBtn'),
  alreadyClearedModal: document.getElementById('alreadyClearedModal'),
  alreadyClearedCancel: document.getElementById('alreadyClearedCancel'),
  alreadyClearedScan: document.getElementById('alreadyClearedScan'),
};

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

function updateVisualization(defects = []) {
  // Update 3D pot visualization with defects
  if (window.pot3d) {
    // Transform 2D defect coordinates to 3D format for the pot
    const defects3d = defects.map((defect, index) => ({
      id: index + 1,
      x: defect.x || 0,
      y: defect.y || 0,
      z: 0.5,
      depth: defect.depth || 'surface',
      confidence: defect.confidence || 0.5,
      material: defect.material || 'Unknown',
    }));
    window.pot3d.updateDefects(defects3d);
  }
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
  updateVisualization(defects);
}

function renderHistory(history = []) {
  el.historyBody.innerHTML = '';
  if (!history.length) {
    el.historyBody.innerHTML = '<tr><td colspan="5">No data yet.</td></tr>';
    return;
  }
  history.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${String(item.scan_id || '').slice(0, 8)}</td>
      <td>${item.overall_status || '--'}</td>
      <td>${item.debris_count ?? 0}</td>
      <td>${item.created_at ? new Date(item.created_at).toLocaleString() : '--'}</td>
      <td><button class="btn-delete" data-scan-id="${item.scan_id}" title="Delete this record">Delete</button></td>
    `;
    el.historyBody.appendChild(tr);
    
    const deleteBtn = tr.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => deleteHistoryItem(item.scan_id));
  });
}

async function deleteHistoryItem(scanId) {
  let pendingScanId = scanId;
  
  el.deleteModal.classList.add('show');
  
  const handleConfirm = async () => {
    cleanup();
    try {
      await request(`/api/history/${pendingScanId}`, { method: 'DELETE' });
      await refreshAll();
    } catch (error) {
      console.error(error);
      alert('Failed to delete record. Check the backend terminal output.');
    }
  };
  
  const handleCancel = () => {
    cleanup();
  };
  
  const cleanup = () => {
    el.deleteModal.classList.remove('show');
    el.deleteModalConfirm.removeEventListener('click', handleConfirm);
    el.deleteModalNo.removeEventListener('click', handleCancel);
    document.removeEventListener('keydown', handleEscape);
  };
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') handleCancel();
  };
  
  el.deleteModalConfirm.addEventListener('click', handleConfirm);
  el.deleteModalNo.addEventListener('click', handleCancel);
  document.addEventListener('keydown', handleEscape);
}

async function clearAllHistory() {
  el.clearModal.classList.add('show');
  
  const handleConfirm = async () => {
    cleanup();
    try {
      await request('/api/history/clear', { method: 'DELETE' });
      resetStats();
      await refreshAll();
      // Show success modal
      showClearSuccessModal();
    } catch (error) {
      console.error(error);
      alert('Failed to clear history. Check the backend terminal output.');
    }
  };
  
  const handleCancel = () => {
    cleanup();
  };
  
  const cleanup = () => {
    el.clearModal.classList.remove('show');
    el.clearModalConfirm.removeEventListener('click', handleConfirm);
    el.clearModalNo.removeEventListener('click', handleCancel);
    document.removeEventListener('keydown', handleEscape);
  };
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') handleCancel();
  };
  
  el.clearModalConfirm.addEventListener('click', handleConfirm);
  el.clearModalNo.addEventListener('click', handleCancel);
  document.addEventListener('keydown', handleEscape);
}

function showClearSuccessModal() {
  el.clearSuccessModal.classList.add('show');
  
  const handleClose = () => {
    cleanup();
  };
  
  const cleanup = () => {
    el.clearSuccessModal.classList.remove('show');
    el.clearSuccessBtn.removeEventListener('click', handleClose);
    document.removeEventListener('keydown', handleEscape);
  };
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') handleClose();
  };
  
  el.clearSuccessBtn.addEventListener('click', handleClose);
  document.addEventListener('keydown', handleEscape);
}

function showAlreadyClearedModal() {
  el.alreadyClearedModal.classList.add('show');
  
  const handleCancel = () => {
    cleanup();
  };
  
  const handleStartScan = async () => {
    cleanup();
    // Trigger scan
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
  };
  
  const cleanup = () => {
    el.alreadyClearedModal.classList.remove('show');
    el.alreadyClearedCancel.removeEventListener('click', handleCancel);
    el.alreadyClearedScan.removeEventListener('click', handleStartScan);
    document.removeEventListener('keydown', handleEscape);
  };
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') handleCancel();
  };
  
  el.alreadyClearedCancel.addEventListener('click', handleCancel);
  el.alreadyClearedScan.addEventListener('click', handleStartScan);
  document.addEventListener('keydown', handleEscape);
}

function resetStats() {
  el.debrisCount.textContent = '0';
  el.moistureValue.textContent = '--';
  el.dryingValue.textContent = '--';
  el.recommendation.textContent = 'No scan yet.';
  el.surfaceCount.textContent = '0';
  el.subsurfaceCount.textContent = '0';
  el.highestConfidence.textContent = '--';
  el.totalScans.textContent = '0';
  el.passRate.textContent = '--';
  el.avgDefects.textContent = '--';
  pill('idle');
  renderDefects([]);
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
if (el.clearHistoryBtn) el.clearHistoryBtn.addEventListener('click', async () => {
  try {
    // Check if history exists first
    const history = await request('/api/history?limit=1');
    const hasHistory = history && history.length > 0;
    
    if (!hasHistory) {
      // History already empty, show already cleared modal directly
      showAlreadyClearedModal();
    } else {
      // History exists, show confirmation modal
      clearAllHistory();
    }
  } catch (error) {
    console.error(error);
    alert('Failed to check history. Check the backend terminal output.');
  }
});
if (el.themeToggle) {
  el.themeToggle.addEventListener('click', toggleTheme);
}
loadTheme();
refreshAll();
