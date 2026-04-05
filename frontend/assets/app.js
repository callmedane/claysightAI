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
  sensorReadings: document.getElementById('sensorReadings'),
  sensorReadingsSummary: document.getElementById('sensorReadingsSummary'),
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
    // Skip humidity & moisture sensors from display (shown only in Sensor Readings)
    if (sensor.name === 'humidity_hw481' || sensor.name === 'moisture') return;
    
    const div = document.createElement('div');
    div.className = 'sensor-item';
    
    // Create live camera preview for 8MP RGB Camera and Thermal Sensor
    if (sensor.name === 'camera') {
      // RGB Camera Preview
      div.innerHTML = `
        <div class="camera-preview">
          <div class="camera-viewfinder">
            <div class="camera-feed">
              <div class="rgb-stream" id="rgb-stream">
                <svg viewBox="0 0 320 240" class="placeholder-svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#888" stroke-width="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="320" height="240" fill="#1a4d2e"/>
                  <rect width="320" height="240" fill="url(#grid)" opacity="0.3"/>
                  <circle cx="160" cy="120" r="50" fill="#2d6a4f" opacity="0.7"/>
                  <circle cx="140" cy="100" r="20" fill="#40916c" opacity="0.5"/>
                  <circle cx="180" cy="140" r="15" fill="#40916c" opacity="0.6"/>
                </svg>
              </div>
            </div>
            <div class="camera-controls">
              <div class="control-icons">
                <span class="icon-focus">◉</span>
                <span class="icon-exposure">⊙</span>
              </div>
            </div>
          </div>
          <div class="camera-info">
            <strong>8MP RGB Camera</strong>
            <div>${sensor.connected ? '🟢 Connected' : '🔴 Not connected'} • ${sensor.ready ? '✓ Ready' : '✗ Not ready'}</div>
            <small>${sensor.notes || ''}</small>
          </div>
        </div>
      `;
    } else if (sensor.name === 'thermal') {
      // Thermal Camera Preview with Heatmap
      div.innerHTML = `
        <div class="camera-preview thermal">
          <div class="thermal-viewfinder">
            <div class="thermal-heatmap" id="thermal-stream">
              <svg viewBox="0 0 320 240" class="placeholder-svg thermal-svg">
                <defs>
                  <linearGradient id="thermalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#000080;stop-opacity:1" />
                    <stop offset="25%" style="stop-color:#0000FF;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#00FF00;stop-opacity:1" />
                    <stop offset="75%" style="stop-color:#FFFF00;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#FF0000;stop-opacity:1" />
                  </linearGradient>
                </defs>
                <rect width="320" height="240" fill="url(#thermalGradient)"/>
                <rect x="80" y="60" width="160" height="120" fill="#FF4400" opacity="0.8"/>
                <circle cx="160" cy="120" r="40" fill="#FF0000" opacity="0.9"/>
                <ellipse cx="140" cy="100" rx="20" ry="25" fill="#FF6600" opacity="0.7"/>
                <ellipse cx="180" cy="130" rx="25" ry="20" fill="#FF3300" opacity="0.8"/>
              </svg>
            </div>
            <div class="thermal-scale">
              <div class="scale-label cold">Cold</div>
              <div class="scale-gradient"></div>
              <div class="scale-label hot">Hot</div>
            </div>
            <div class="thermal-reading">
              <span class="temp-label">Max:</span>
              <span class="temp-value">35.2°C</span>
            </div>
          </div>
          <div class="camera-info thermal-info">
            <strong>Thermal Sensor</strong>
            <div>${sensor.connected ? '🟢 Connected' : '🔴 Not connected'} • ${sensor.ready ? '✓ Ready' : '✗ Not ready'}</div>
            <small>${sensor.notes || ''}</small>
          </div>
        </div>
      `;
          } else if (sensor.name === 'noir' || sensor.name === 'spectral') {
      const isSpectral = sensor.name === 'spectral';
      const title = isSpectral ? 'Spectral Sensor' : 'NoIR Camera + Laser Grid';
      const statusText = isSpectral ? 'Fusion Preview Active' : 'Laser Grid Active';
      const infoClass = isSpectral ? 'spectral-info' : 'noir-info';
      const previewClass = isSpectral ? 'camera-preview noir spectral-preview' : 'camera-preview noir';

      div.innerHTML = `
        <div class="${previewClass}">
          <div class="noir-viewfinder">
            <div class="noir-stream" id="${sensor.name}-stream">
              <svg viewBox="0 0 320 240" class="placeholder-svg noir-svg">
                <defs>
                  <pattern id="${sensor.name}-laserGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="20" y2="0" stroke="#00FF00" stroke-width="0.5" opacity="0.6"/>
                    <line x1="0" y1="0" x2="0" y2="20" stroke="#00FF00" stroke-width="0.5" opacity="0.6"/>
                  </pattern>
                </defs>
                <rect width="320" height="240" fill="#0a0a0a"/>
                <rect width="320" height="240" fill="url(#${sensor.name}-laserGrid)"/>
                <circle cx="160" cy="120" r="45" fill="none" stroke="#00FF00" stroke-width="2" opacity="0.8"/>
                <rect x="100" y="80" width="120" height="80" fill="none" stroke="#00FF00" stroke-width="1.5" opacity="0.6"/>
                <circle cx="140" cy="100" r="15" fill="none" stroke="#00FF00" stroke-width="1" opacity="0.7"/>
                <circle cx="180" cy="140" r="12" fill="none" stroke="#00FF00" stroke-width="1" opacity="0.7"/>
                <line x1="50" y1="120" x2="270" y2="120" stroke="#FF0000" stroke-width="1" opacity="0.5"/>
                <line x1="160" y1="30" x2="160" y2="210" stroke="#FF0000" stroke-width="1" opacity="0.5"/>
              </svg>
            </div>
            <div class="noir-controls">
              <div class="laser-status">
                <span class="laser-indicator">⬤</span>
                <span class="laser-text">${statusText}</span>
              </div>
            </div>
          </div>
          <div class="camera-info ${infoClass}">
            <strong>${title}</strong>
            <div>${sensor.connected ? '🟢 Connected' : '🔴 Not connected'} • ${sensor.ready ? '✓ Ready' : '✗ Not ready'}</div>
            <small>${sensor.notes || ''}</small>
          </div>
        </div>
      `;
    } else {
      // Standard sensor display
      div.innerHTML = `
        <strong>${sensor.label}</strong>
        <div>${sensor.connected ? 'Connected' : 'Not connected'} • ${sensor.ready ? 'Ready' : 'Not ready'}</div>
        <small>${sensor.notes || ''}</small>
      `;
    }
    
    el.sensorGrid.appendChild(div);
  });
}

function renderSensorReadings(sensors = [], snapshot = {}) {
  el.sensorReadings.innerHTML = '';
  
  // Helper to format timestamp
  const formatTime = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Map sensor names to reading display info
  const sensorReadingMap = {
    'camera': {
      label: '8MP RGB Camera',
      getValue: () => 'Stream Ready',
      unit: '',
      icon: '📷',
    },
    'thermal': {
      label: 'Thermal Sensor',
      getValue: () => `${snapshot.thermal_avg || '--'}°C`,
      unit: '(max: ' + (snapshot.thermal_max || '--') + '°C)',
      icon: '🌡️',
    },
    'noir': {
      label: 'NoIR + Laser Grid',
      getValue: () => 'Grid Active',
      unit: '',
      icon: '🟢',
    },
    'spectral': {
      label: 'Spectral Sensor',
      getValue: () => 'Fusion Ready',
      unit: '',
      icon: '📊',
    },
    'moisture': {
      label: 'Moisture Sensor',
      getValue: () => `${snapshot.moisture || '--'}%`,
      unit: '',
      icon: '💧',
    },
    'humidity_hw481': {
      label: 'Humidity (HW481)',
      getValue: () => `${snapshot.humidity || '--'}%`,
      unit: '',
      icon: '💨',
    },
    'gas': {
      label: 'Gas / Ambient',
      getValue: () => `${snapshot.ambient_temp || '--'}°C`,
      unit: `(gas: ${snapshot.gas_level || '--'} ppm)`,
      icon: '🌬️',
    },
  };

  // Render each sensor reading
  sensors.forEach((sensor) => {
    const readingInfo = sensorReadingMap[sensor.name];
    if (!readingInfo) return;

    const readingDiv = document.createElement('div');
    readingDiv.className = 'reading-row';
    readingDiv.innerHTML = `
      <div class="reading-icon">${readingInfo.icon}</div>
      <div class="reading-content">
        <div class="reading-label">${readingInfo.label}</div>
        <div class="reading-status">${sensor.connected ? '🟢' : '🔴'} ${sensor.ready ? 'Ready' : 'Not Ready'}</div>
      </div>
      <div class="reading-value">
        <div class="reading-primary">${readingInfo.getValue()}</div>
        ${readingInfo.unit ? `<div class="reading-unit">${readingInfo.unit}</div>` : ''}
      </div>
    `;
    el.sensorReadings.appendChild(readingDiv);
  });

  // Render summary section
  const readyCount = sensors.filter(s => s.ready).length;
  const totalCount = sensors.length;
  const offlineCount = totalCount - readyCount;
  const lastUpdated = snapshot.last_updated ? formatTime(snapshot.last_updated) : 'Never';

  el.sensorReadingsSummary.innerHTML = `
    <div class="readings-summary-content">
      <div class="summary-stat">
        <span class="summary-label">Sensors Ready</span>
        <strong>${readyCount}/${totalCount}</strong>
      </div>
      <div class="summary-stat">
        <span class="summary-label">Offline</span>
        <strong>${offlineCount}</strong>
      </div>
      <div class="summary-stat">
        <span class="summary-label">Last Update</span>
        <strong>${lastUpdated}</strong>
      </div>
      <div class="summary-health">
        <span class="health-indicator ${offlineCount === 0 ? 'healthy' : 'warning'}">⬤</span>
        <span>Mock sensor pipeline ${offlineCount === 0 ? 'active' : 'partial'}</span>
      </div>
    </div>
  `;
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
      // Render sensor readings with latest sensor snapshot data
      renderSensorReadings(system.sensors || [], latest.sensor_snapshot || {});
    } catch (_) {
      pill('idle');
      renderDefects([]);
      // Render sensor readings even without latest scan (use mock snapshot from latest refresh)
      renderSensorReadings(system.sensors || [], {});
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

// Navbar shrinking effect on scroll
const topbar = document.querySelector('.topbar');
if (topbar) {
  window.addEventListener('scroll', function() {
    if (window.scrollY > 0) {
      topbar.classList.add('shrunk');
    } else {
      topbar.classList.remove('shrunk');
    }
  });
}

loadTheme();
refreshAll();
