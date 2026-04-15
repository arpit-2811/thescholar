'use strict';

/* ──────────────────────────────────────────────────────────
   The Scholars Academy – Admin Dashboard JS
   ────────────────────────────────────────────────────────── */

// ── Constants ─────────────────────────────────────────────
const API_BASE   = 'https://thescholars-api.onrender.com';
const TOKEN_KEY  = 'tsa_admin_token';
const USER_KEY   = 'tsa_admin_username';

// ── Auth ──────────────────────────────────────────────────
const Auth = {
  getToken   : ()  => sessionStorage.getItem(TOKEN_KEY),
  getUsername: ()  => sessionStorage.getItem(USER_KEY) || 'Admin',
  clear      : ()  => { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY); },
  logout     : ()  => { Auth.clear(); window.location.replace('tsa-admin-portal.html'); },
};

// ── API wrapper ───────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type' : 'application/json',
      'Authorization': `Bearer ${Auth.getToken()}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Check your internet connection.');
  }

  if (res.status === 401) { Auth.logout(); return null; }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Toast Notifications ───────────────────────────────────
const Toast = {
  show(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icons = { success:'✅', error:'❌', info:'ℹ️' };
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 350);
    }, 3500);
  },
};

// ── Modal Manager ─────────────────────────────────────────
const Modal = {
  open(id)  { const el = document.getElementById(id); if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; } },
  close(id) { const el = document.getElementById(id); if (el) { el.classList.remove('active'); document.body.style.overflow = ''; } },
  closeAll() { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); document.body.style.overflow = ''; },
};
window.Modal = Modal; // make accessible from inline HTML onclick

// ── Navigation ────────────────────────────────────────────
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));

  const section = document.getElementById(sectionId);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`[data-section="${sectionId}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    overviewSection  : 'Overview',
    enquiriesSection : 'Enquiries',
    admissionsSection: 'Admissions',
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[sectionId] || 'Dashboard';

  // Close sidebar on mobile after nav
  document.getElementById('sidebar')?.classList.remove('open');

  // Load data
  if (sectionId === 'overviewSection')   loadOverview();
  if (sectionId === 'enquiriesSection')  loadEnquiries();
  if (sectionId === 'admissionsSection') loadAdmissions();
}
window.showSection = showSection;

// ── Skeleton rows ─────────────────────────────────────────
function showSkeletonRows(tbodyId, cols, rows = 5) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = Array(rows).fill(
    `<tr>${Array(cols).fill('<td><div class="skeleton"></div></td>').join('')}</tr>`
  ).join('');
}

// ── Utilities ─────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function statusColor(status) {
  const map = { new: 'info', contacted: 'warning', converted: 'success', rejected: 'danger' };
  return map[status] || 'secondary';
}

function admStatusColor(status) {
  const map = { active: 'success', completed: 'info', dropped: 'danger' };
  return map[status] || 'secondary';
}

// ── Animated counter ──────────────────────────────────────
function animateCount(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  let cur = 0;
  const total = parseInt(target, 10) || 0;
  if (total === 0) { el.textContent = '0'; return; }
  const step = Math.max(1, Math.ceil(total / 40));
  const timer = setInterval(() => {
    cur = Math.min(cur + step, total);
    el.textContent = cur;
    if (cur >= total) clearInterval(timer);
  }, 30);
}

/* ══════════════════════ OVERVIEW ════════════════════════ */
async function loadOverview() {
  try {
    const [enquiries, admissions] = await Promise.all([
      api('GET', '/api/enquiries'),
      api('GET', '/api/admissions'),
    ]);

    const today = new Date().toDateString();
    const newToday  = (enquiries  || []).filter(e => new Date(e.createdAt).toDateString() === today).length;
    const converted = (enquiries  || []).filter(e => e.status === 'converted').length;

    animateCount('statEnquiries',  (enquiries  || []).length);
    animateCount('statAdmissions', (admissions || []).length);
    animateCount('statToday',      newToday);
    animateCount('statConverted',  converted);
  } catch (err) {
    Toast.show('Failed to load overview – ' + err.message, 'error');
  }
}

/* ══════════════════════ ENQUIRIES ═══════════════════════ */
let _allEnquiries = [];

async function loadEnquiries() {
  showSkeletonRows('enquiriesTableBody', 8, 6);
  try {
    const data = await api('GET', '/api/enquiries');
    _allEnquiries = data || [];
    renderEnquiriesTable(_allEnquiries);
  } catch (err) {
    Toast.show('Failed to load enquiries – ' + err.message, 'error');
  }
}

function renderEnquiriesTable(enquiries) {
  const tbody = document.getElementById('enquiriesTableBody');
  if (!tbody) return;

  if (!enquiries.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No enquiries found. Click "+ Add Enquiry" to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = enquiries.map(e => `
    <tr>
      <td>
        <div class="student-name">${escHtml(e.studentName)}</div>
        <div class="student-sub">${escHtml(e.parentName || '')}</div>
      </td>
      <td>${escHtml(e.phone)}</td>
      <td>${escHtml(e.classApplied || '—')}</td>
      <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(e.course || '—')}</td>
      <td style="white-space:nowrap;">${fmtDate(e.createdAt)}</td>
      <td>
        <span class="badge badge-${e.source_type === 'website' ? 'info' : 'secondary'}">
          ${e.source_type === 'website' ? '🌐 Website' : '✏️ Manual'}
        </span>
      </td>
      <td>
        <span class="badge badge-${statusColor(e.status)}">${capitalize(e.status)}</span>
      </td>
      <td>
        <div class="action-btns">
          ${e.status !== 'converted'
            ? `<button class="btn-action btn-convert" onclick="handleConvert('${e.id}')" title="Convert to Admission">🎓</button>`
            : `<span class="badge badge-success badge-sm">✅ Done</span>`
          }
          <button class="btn-action btn-delete" onclick="handleDeleteEnquiry('${e.id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterEnquiries() {
  const search = (document.getElementById('enquirySearch')?.value || '').toLowerCase();
  const status = document.getElementById('statusFilter')?.value || '';

  const filtered = _allEnquiries.filter(e => {
    const matchSearch = !search ||
      (e.studentName || '').toLowerCase().includes(search) ||
      (e.phone || '').includes(search) ||
      (e.parentName || '').toLowerCase().includes(search);
    const matchStatus = !status || e.status === status;
    return matchSearch && matchStatus;
  });
  renderEnquiriesTable(filtered);
}

async function handleConvert(id) {
  if (!confirm('Convert this enquiry to an admission record?')) return;
  try {
    const result = await api('POST', `/api/enquiries/${id}/convert`);
    Toast.show(`🎓 Converted! Roll number: ${result?.rollNumber || 'assigned'}`);
    loadEnquiries();
  } catch (err) {
    Toast.show(err.message || 'Conversion failed', 'error');
  }
}
window.handleConvert = handleConvert;

async function handleDeleteEnquiry(id) {
  if (!confirm('Delete this enquiry permanently?')) return;
  try {
    await api('DELETE', `/api/enquiries/${id}`);
    Toast.show('Enquiry deleted');
    loadEnquiries();
  } catch (err) {
    Toast.show('Failed to delete – ' + err.message, 'error');
  }
}
window.handleDeleteEnquiry = handleDeleteEnquiry;

async function handleAddEnquiry(e) {
  e.preventDefault();
  const form = document.getElementById('addEnquiryForm');
  const data = Object.fromEntries(new FormData(form));
  const btn  = document.getElementById('addEnquirySubmitBtn');

  try {
    btn.disabled    = true;
    btn.textContent = 'Adding…';
    await api('POST', '/api/enquiries/manual', data);
    Toast.show('Enquiry added successfully!');
    Modal.close('addEnquiryModal');
    form.reset();
    loadEnquiries();
  } catch (err) {
    Toast.show(err.message || 'Failed to add enquiry', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Add Enquiry';
  }
}

/* ══════════════════════ ADMISSIONS ══════════════════════ */
let _allAdmissions = [];
let _activeNoteId  = null;

async function loadAdmissions() {
  const grid = document.getElementById('admissionsGrid');
  if (grid) grid.innerHTML = '<div class="empty-state-card">Loading admissions…</div>';
  try {
    const data = await api('GET', '/api/admissions');
    _allAdmissions = data || [];
    renderAdmissions(_allAdmissions);
  } catch (err) {
    Toast.show('Failed to load admissions – ' + err.message, 'error');
  }
}

function filterAdmissions() {
  const search = (document.getElementById('admissionSearch')?.value || '').toLowerCase();
  const filtered = _allAdmissions.filter(a =>
    !search ||
    (a.studentName || '').toLowerCase().includes(search) ||
    (a.phone || '').includes(search) ||
    (a.rollNumber || '').toLowerCase().includes(search)
  );
  renderAdmissions(filtered);
}

function renderAdmissions(admissions) {
  const grid = document.getElementById('admissionsGrid');
  if (!grid) return;

  if (!admissions.length) {
    grid.innerHTML = `
      <div class="empty-state-card">
        No admissions yet.<br/>
        Convert an enquiry using the 🎓 button in the Enquiries tab.
      </div>`;
    return;
  }

  grid.innerHTML = admissions.map(a => `
    <div class="admission-card" id="acard-${a.id}">
      <div class="admission-card-header" onclick="toggleCard('${a.id}')">
        <div class="admission-info">
          <div class="admission-avatar">${(a.studentName || 'S').charAt(0).toUpperCase()}</div>
          <div>
            <div class="admission-name">${escHtml(a.studentName)}</div>
            <div class="admission-meta">${escHtml(a.classApplied || '')} &bull; ${escHtml(a.phone || '')}</div>
          </div>
        </div>
        <div class="admission-right">
          <span class="badge badge-${admStatusColor(a.status)}">${capitalize(a.status)}</span>
          <span class="admission-roll">${escHtml(a.rollNumber || '')}</span>
          <span class="card-chevron">▼</span>
        </div>
      </div>

      <div class="admission-card-body" id="abody-${a.id}">

        <div class="admission-details">
          <div class="detail-item">
            <span class="detail-label">Course</span>
            <span>${escHtml(a.course || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Total Fee</span>
            <span>₹${a.totalFee || '0'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Admission Date</span>
            <span>${fmtDate(a.admissionDate)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email</span>
            <span>${escHtml(a.email || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">City</span>
            <span>${escHtml(a.city || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Board</span>
            <span>${escHtml(a.board || 'N/A')}</span>
          </div>
        </div>

        <div class="notes-section">
          <div class="notes-header">
            <h4>💰 Payment Notes</h4>
            <button class="btn-add-note" onclick="openAddNote('${a.id}')">+ Add Note</button>
          </div>
          <div class="notes-timeline">
            ${renderNotes(a.notes || [], a.id)}
          </div>
        </div>

        <div class="admission-actions">
          <button class="btn-action btn-delete" style="width:auto;padding:0.45rem 0.9rem;font-size:0.78rem;border-radius:6px;" onclick="handleDeleteAdmission('${a.id}')">
            🗑️ Delete Record
          </button>
        </div>

      </div><!-- /.admission-card-body -->
    </div>
  `).join('');
}

function renderNotes(notes, admissionId) {
  if (!notes.length) return '<p class="no-notes">No notes yet. Use "+ Add Note" to track payments.</p>';
  return notes.map(n => `
    <div class="note-item note-${n.type || 'general'}">
      <div class="note-dot"></div>
      <div class="note-content">
        <div class="note-text">${escHtml(n.text)}</div>
        <div class="note-meta">
          <span class="note-date">${fmtDate(n.date)}</span>
          <span class="badge badge-${n.type === 'payment' ? 'success' : n.type === 'reminder' ? 'warning' : 'info'} badge-sm">
            ${n.type === 'payment' ? '💰' : n.type === 'reminder' ? '🔔' : '📌'} ${capitalize(n.type || 'general')}
          </span>
          <button class="btn-icon-delete" onclick="handleDeleteNote('${admissionId}','${n.id}')" title="Delete note">×</button>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleCard(id) {
  const body = document.getElementById(`abody-${id}`);
  const card = document.getElementById(`acard-${id}`);
  if (body) {
    body.classList.toggle('expanded');
    card.classList.toggle('open');
  }
}
window.toggleCard = toggleCard;

function openAddNote(admissionId) {
  _activeNoteId = admissionId;
  // Set today's date as default
  const dateInput = document.getElementById('noteDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  Modal.open('addNoteModal');
}
window.openAddNote = openAddNote;

async function handleDeleteAdmission(id) {
  if (!confirm('Delete this admission record? This cannot be undone.')) return;
  try {
    await api('DELETE', `/api/admissions/${id}`);
    Toast.show('Admission record deleted');
    loadAdmissions();
  } catch (err) {
    Toast.show('Failed to delete – ' + err.message, 'error');
  }
}
window.handleDeleteAdmission = handleDeleteAdmission;

async function handleAddNote(e) {
  e.preventDefault();
  if (!_activeNoteId) return;
  const form = document.getElementById('addNoteForm');
  const data = Object.fromEntries(new FormData(form));
  const btn  = document.getElementById('addNoteSubmitBtn');

  try {
    btn.disabled    = true;
    btn.textContent = 'Adding…';
    await api('POST', `/api/admissions/${_activeNoteId}/notes`, data);
    Toast.show('Note added!');
    Modal.close('addNoteModal');
    form.reset();
    loadAdmissions();
  } catch (err) {
    Toast.show(err.message || 'Failed to add note', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Add Note';
  }
}

async function handleDeleteNote(admissionId, noteId) {
  if (!confirm('Delete this note?')) return;
  try {
    await api('DELETE', `/api/admissions/${admissionId}/notes/${noteId}`);
    Toast.show('Note deleted');
    loadAdmissions();
  } catch (err) {
    Toast.show('Failed to delete note – ' + err.message, 'error');
  }
}
window.handleDeleteNote = handleDeleteNote;

/* ══════════════════════ INIT ════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth guard ─────────────────────────────────────────
  const token = Auth.getToken();
  if (!token) { Auth.logout(); return; }

  try {
    const res = await fetch(`${API_BASE}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Expired');
    const data = await res.json();

    // Update UI with admin username
    const usernameEl = document.getElementById('adminUsername');
    if (usernameEl) usernameEl.textContent = data.username || Auth.getUsername();

    const avatarEl = document.getElementById('adminAvatarInitial');
    if (avatarEl) avatarEl.textContent = (data.username || 'A').charAt(0).toUpperCase();

  } catch {
    Auth.logout();
    return;
  }

  // ── Sidebar nav ────────────────────────────────────────
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => showSection(item.dataset.section));
  });

  // ── Mobile sidebar toggle ──────────────────────────────
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  // ── Logout ─────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('Log out of admin panel?')) Auth.logout();
  });

  // ── Enquiry search & filter ────────────────────────────
  document.getElementById('enquirySearch')?.addEventListener('input', filterEnquiries);
  document.getElementById('statusFilter')?.addEventListener('change', filterEnquiries);

  // ── Admission search ───────────────────────────────────
  document.getElementById('admissionSearch')?.addEventListener('input', filterAdmissions);

  // ── Add Enquiry buttons ────────────────────────────────
  document.getElementById('addEnquiryBtn')?.addEventListener('click', () => Modal.open('addEnquiryModal'));
  document.getElementById('addEnquiryBtnOverview')?.addEventListener('click', () => Modal.open('addEnquiryModal'));

  // ── Add Enquiry form ───────────────────────────────────
  document.getElementById('addEnquiryForm')?.addEventListener('submit', handleAddEnquiry);

  // ── Add Note form ──────────────────────────────────────
  document.getElementById('addNoteForm')?.addEventListener('submit', handleAddNote);

  // ── Close modals on backdrop ───────────────────────────
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) Modal.close(overlay.id); });
  });

  // ── Escape key ─────────────────────────────────────────
  document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.closeAll(); });

  // ── Load initial section ───────────────────────────────
  showSection('overviewSection');
});
