/* ── SmartCase System — app.js ── */

// Resolve API path relative to this script file so it works in any subfolder
const _base = document.currentScript
  ? document.currentScript.src.replace(/assets\/app\.js.*$/, '')
  : (window.location.pathname.replace(/\/[^\/]*$/, '/'));
const API = _base + 'api';

// ─── NAVIGATION ───────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + page).classList.add('active');
    closeSidebar();
    if (page === 'dashboard') loadDashboard();
    if (page === 'clients')   loadClients();
    if (page === 'cases')     loadCases();
    if (page === 'hearings')  loadHearings();
  });
});

// Mobile sidebar
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
hamburger?.addEventListener('click', () => sidebar.classList.toggle('open'));
function closeSidebar() { sidebar.classList.remove('open'); }

// ─── API HELPERS ──────────────────────────────────────────────
async function api(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, options);
    const data = await res.json();
    return data;
  } catch (e) {
    return { error: e.message };
  }
}

// ─── TOAST ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

// ─── DB STATUS ────────────────────────────────────────────────
async function checkDB() {
  const el = document.getElementById('dbStatus');
  const dot = el.querySelector('.status-dot');
  const data = await api(`${API}/clients.php?action=stats`);
  if (!data.error) {
    el.innerHTML = '<span class="status-dot online"></span> DB Connected';
  } else {
    el.innerHTML = '<span class="status-dot offline"></span> DB Offline';
  }
}

// ─── MODALS ───────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modal-add-case') populateCaseClients();
  if (id === 'modal-add-hearing') { populateHearingCases(); populateJudges(); }
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ─── BADGES ───────────────────────────────────────────────────
function priorityBadge(p) {
  const cls = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
  return `<span class="badge ${cls[p] || ''}">${p || '—'}</span>`;
}
function statusBadge(s) {
  const cls = { Active:'badge-active', Scheduled:'badge-scheduled', Completed:'badge-completed', 'In Progress':'badge-inprogress' };
  return `<span class="badge ${cls[s] || 'badge-active'}">${s || '—'}</span>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function emptyRow(cols, msg = 'No records found') {
  return `<tr><td colspan="${cols}" class="empty-state"><div class="empty-icon">◎</div><p>${msg}</p></td></tr>`;
}

// ─── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  const [clients, stats, hearings, dashboard] = await Promise.all([
    api(`${API}/clients.php?action=stats`),
    api(`${API}/cases.php?action=stats`),
    api(`${API}/hearings.php?action=stats`),
    api(`${API}/cases.php?action=dashboard`)
  ]);

  document.getElementById('stat-clients').textContent = clients.TotalClients ?? '—';
  document.getElementById('stat-hearings').textContent = hearings.TotalHearings ?? '—';

  let total = 0, highCount = 0;
  if (Array.isArray(stats)) {
    stats.forEach(r => {
      total += parseInt(r.TotalCases);
      if (r.Priority === 'High') highCount = r.TotalCases;
    });
  }
  document.getElementById('stat-cases').textContent = total || '—';
  document.getElementById('stat-high').textContent = highCount || '0';

  // Priority chart
  const chart = document.getElementById('priority-chart');
  if (Array.isArray(stats) && stats.length) {
    const max = Math.max(...stats.map(r => parseInt(r.TotalCases)));
    chart.innerHTML = stats.map(r => {
      const pct = max > 0 ? (parseInt(r.TotalCases) / max * 100).toFixed(0) : 0;
      const cls = r.Priority?.toLowerCase() || 'low';
      return `<div class="p-bar-wrap">
        <div class="p-bar-label"><span>${r.Priority}</span><span>${r.TotalCases}</span></div>
        <div class="p-bar-track"><div class="p-bar-fill ${cls}" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  } else {
    chart.innerHTML = '<p style="color:var(--muted);font-size:.85rem">No data available</p>';
  }

  // Dashboard table
  const tbody = document.getElementById('dashboard-tbody');
  if (Array.isArray(dashboard) && dashboard.length) {
    tbody.innerHTML = dashboard.map(r => `<tr>
      <td><code style="font-family:'DM Mono',monospace;font-size:.8rem">${r.CaseRef}</code></td>
      <td>${r.Title}</td>
      <td>${statusBadge(r.Status)}</td>
      <td>${r.Client}</td>
    </tr>`).join('');
  } else {
    tbody.innerHTML = emptyRow(4);
  }
}

// ─── CLIENTS ──────────────────────────────────────────────────
async function loadClients() {
  const data = await api(`${API}/clients.php?action=list`);
  const tbody = document.getElementById('clients-tbody');
  if (Array.isArray(data) && data.length) {
    tbody.innerHTML = data.map(r => `<tr>
      <td><span style="font-family:'DM Mono',monospace;font-size:.8rem">${r.ClientID}</span></td>
      <td><strong>${r.Name}</strong></td>
      <td>${r.Email || '—'}</td>
      <td>${r.Phone}</td>
      <td><span class="badge badge-active">${r.DocID}</span></td>
      <td>
        <button class="btn-icon" onclick="deleteClient(${r.ClientID})" title="Delete">🗑</button>
      </td>
    </tr>`).join('');
  } else {
    tbody.innerHTML = emptyRow(6, data.error || 'No clients found');
  }
}

async function addClient() {
  const name = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const docid = document.getElementById('c-doc').value.trim();
  if (!name || !phone || !docid) { toast('Name, Phone and Doc ID are required', 'error'); return; }

  const res = await api(`${API}/clients.php?action=add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, docid })
  });

  if (res.success) {
    toast('Client added successfully ✓');
    closeModal('modal-add-client');
    clearForm(['c-name','c-email','c-phone','c-doc']);
    loadClients();
  } else {
    toast(res.error || 'Failed to add client', 'error');
  }
}

async function deleteClient(id) {
  if (!confirm('Delete this client? This may affect related cases.')) return;
  const res = await api(`${API}/clients.php?id=${id}`, { method: 'DELETE' });
  if (res.success) { toast('Client deleted'); loadClients(); }
  else toast(res.error || 'Delete failed', 'error');
}

async function populateCaseClients() {
  const data = await api(`${API}/clients.php?action=list`);
  const sel = document.getElementById('case-client');
  sel.innerHTML = Array.isArray(data)
    ? data.map(c => `<option value="${c.ClientID}">${c.Name} (${c.ClientID})</option>`).join('')
    : '<option>No clients</option>';
}

// ─── CASES ────────────────────────────────────────────────────
async function loadCases() {
  const data = await api(`${API}/cases.php?action=list`);
  const tbody = document.getElementById('cases-tbody');
  if (Array.isArray(data) && data.length) {
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-family:'DM Mono',monospace;font-size:.8rem">${r.CaseRef}</code></td>
      <td><strong>${r.Title}</strong></td>
      <td>${r.Type}</td>
      <td>${priorityBadge(r.Priority)}</td>
      <td>${r.ClientName}</td>
      <td>${fmtDate(r.FilingDate)}</td>
      <td>${statusBadge(r.Status)}</td>
      <td>
        <button class="btn-icon" onclick="deleteCase(${r.CaseID})" title="Delete">🗑</button>
      </td>
    </tr>`).join('');
  } else {
    tbody.innerHTML = emptyRow(8, data.error || 'No cases found');
  }
}

async function addCase() {
  const caseref  = document.getElementById('case-ref').value.trim();
  const title    = document.getElementById('case-title').value.trim();
  const type     = document.getElementById('case-type').value;
  const priority = document.getElementById('case-priority').value;
  const clientid = document.getElementById('case-client').value;
  if (!caseref || !title) { toast('Case Ref and Title are required', 'error'); return; }

  const res = await api(`${API}/cases.php?action=add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseref, title, type, priority, clientid })
  });

  if (res.success) {
    toast('Case added successfully ✓');
    closeModal('modal-add-case');
    clearForm(['case-ref','case-title']);
    loadCases();
  } else {
    toast(res.error || 'Failed to add case', 'error');
  }
}

async function deleteCase(id) {
  if (!confirm('Delete this case?')) return;
  const res = await api(`${API}/cases.php?id=${id}`, { method: 'DELETE' });
  if (res.success) { toast('Case deleted'); loadCases(); }
  else toast(res.error || 'Delete failed', 'error');
}

// ─── HEARINGS ─────────────────────────────────────────────────
async function loadHearings() {
  const data = await api(`${API}/hearings.php?action=list`);
  const tbody = document.getElementById('hearings-tbody');
  if (Array.isArray(data) && data.length) {
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-family:'DM Mono',monospace;font-size:.8rem">${r.HearingRef}</code></td>
      <td><strong>${r.CaseTitle}</strong><br><span style="font-size:.75rem;color:var(--muted)">${r.CaseRef}</span></td>
      <td>${r.JudgeName}</td>
      <td>${fmtDate(r.HearingDate)}</td>
      <td><span class="badge ${r.Mode === 'Online' ? 'badge-scheduled' : 'badge-active'}">${r.Mode}</span></td>
      <td>${r.Room}</td>
      <td>${statusBadge(r.Status)}</td>
      <td>
        <button class="btn-icon" onclick="deleteHearing(${r.HearingID})" title="Delete">🗑</button>
      </td>
    </tr>`).join('');
  } else {
    tbody.innerHTML = emptyRow(8, data.error || 'No hearings found');
  }
}

async function populateHearingCases() {
  const data = await api(`${API}/cases.php?action=list`);
  const sel = document.getElementById('h-case');
  sel.innerHTML = Array.isArray(data)
    ? data.map(c => `<option value="${c.CaseID}">${c.CaseRef} – ${c.Title}</option>`).join('')
    : '<option>No cases</option>';
}

async function populateJudges() {
  const data = await api(`${API}/hearings.php?action=judges`);
  const sel = document.getElementById('h-judge');
  sel.innerHTML = Array.isArray(data)
    ? data.map(j => `<option value="${j.JudgeID}">${j.Name} (${j.Court})</option>`).join('')
    : '<option>No judges</option>';
}

async function addHearing() {
  const ref    = document.getElementById('h-ref').value.trim();
  const caseid = document.getElementById('h-case').value;
  const judgeid = document.getElementById('h-judge').value;
  const date   = document.getElementById('h-date').value;
  const mode   = document.getElementById('h-mode').value;
  const room   = document.getElementById('h-room').value.trim();
  const status = document.getElementById('h-status').value;
  if (!ref || !date || !room) { toast('Ref, Date and Room are required', 'error'); return; }

  const res = await api(`${API}/hearings.php?action=add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, caseid, judgeid, date, mode, room, status })
  });

  if (res.success) {
    toast('Hearing scheduled successfully ✓');
    closeModal('modal-add-hearing');
    clearForm(['h-ref','h-date','h-room']);
    loadHearings();
  } else {
    toast(res.error || 'Failed to schedule hearing', 'error');
  }
}

async function deleteHearing(id) {
  if (!confirm('Delete this hearing?')) return;
  const res = await api(`${API}/hearings.php?id=${id}`, { method: 'DELETE' });
  if (res.success) { toast('Hearing removed'); loadHearings(); }
  else toast(res.error || 'Delete failed', 'error');
}

// ─── SEARCH ───────────────────────────────────────────────────
async function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) { toast('Enter a search term', 'error'); return; }
  const data = await api(`${API}/cases.php?action=search&q=${encodeURIComponent(q)}`);
  const tbody = document.getElementById('search-tbody');
  if (Array.isArray(data) && data.length) {
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-family:'DM Mono',monospace;font-size:.8rem">${r.CaseRef}</code></td>
      <td><strong>${r.Title}</strong></td>
      <td>${r.Client}</td>
      <td>${r.Judge || '—'}</td>
      <td>${fmtDate(r.HearingDate)}</td>
    </tr>`).join('');
  } else {
    tbody.innerHTML = emptyRow(5, 'No results found');
  }
}

document.getElementById('search-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

// ─── FILTER ───────────────────────────────────────────────────
async function doFilter() {
  const status   = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  const sort     = document.getElementById('filter-sort').value;
  const params = new URLSearchParams({ action:'filter' });
  if (status)   params.set('status', status);
  if (priority) params.set('priority', priority);
  if (sort)     params.set('sort', sort);

  const data = await api(`${API}/cases.php?${params}`);
  const tbody = document.getElementById('filter-tbody');
  if (Array.isArray(data) && data.length) {
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-family:'DM Mono',monospace;font-size:.8rem">${r.CaseRef}</code></td>
      <td><strong>${r.Title}</strong></td>
      <td>${r.Client}</td>
      <td>${r.Judge || '—'}</td>
      <td>${fmtDate(r.HearingDate)}</td>
      <td>${statusBadge(r.Status)}</td>
      <td>${priorityBadge(r.Priority)}</td>
    </tr>`).join('');
  } else {
    tbody.innerHTML = emptyRow(7, 'No results found');
  }
}

// ─── UTILS ────────────────────────────────────────────────────
function clearForm(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ─── INIT ─────────────────────────────────────────────────────
checkDB();
loadDashboard();
