// Arenberg — Cycling Strength Program
// Client-side app. localStorage-backed. See README.

const PASSWORD = 'Arenberg';
const START_WEIGHT = 95.0;
const TARGET_LOW = 82.0;
const TARGET_HIGH = 86.0;

const STORAGE = {
  auth: 'arenberg.auth',
  workouts: 'arenberg.workouts.v1',
  weights: 'arenberg.weights.v1',
};

// Program definition ------------------------------------------------------
const SESSIONS = {
  A: {
    name: 'Strength A — Lower Body Power',
    day: 'Monday',
    exercises: [
      { name: 'Barbell Back Squat',       sets: 4, reps: '5',      note: 'Go heavy. Full depth.' },
      { name: 'Romanian Deadlift',        sets: 3, reps: '8',      note: 'Hamstrings + glutes. Slow eccentric.' },
      { name: 'Bulgarian Split Squat',    sets: 3, reps: '8 /leg', note: 'Hold dumbbells. Rear foot on bench.', perLeg: true },
      { name: 'Single-Leg Leg Press',     sets: 3, reps: '10 /leg', note: 'Push through heel.', perLeg: true },
      { name: 'Calf Raises (standing)',   sets: 3, reps: '15',     note: 'Full range, pause at bottom.' },
      { name: 'Pallof Press',             sets: 3, reps: '12 /side', note: 'Anti-rotation core stability.', perLeg: true },
    ],
  },
  B: {
    name: 'Strength B — Upper Body + Core',
    day: 'Wednesday',
    exercises: [
      { name: 'Barbell Bent-Over Row',    sets: 4, reps: '8',     note: 'Main pull. Strict form.' },
      { name: 'Bench Press',              sets: 3, reps: '8',     note: 'Or dumbbell press.' },
      { name: 'Pull-Ups / Lat Pulldown',  sets: 3, reps: '8–10',  note: 'Add weight when bodyweight is easy.' },
      { name: 'Overhead Press',           sets: 3, reps: '8',     note: 'Standing, strict.' },
      { name: 'Face Pulls',               sets: 3, reps: '15',    note: 'Shoulder health. Light weight.' },
      { name: 'Core Circuit (3 rounds)',  sets: 3, reps: 'circuit', note: 'Dead Bug 10/s · Plank 30–45s · Bird Dog 10/s · Side Plank 20–30s/s', bodyweight: true },
    ],
  },
  C: {
    name: 'Strength C — Power & Plyometrics',
    day: 'Optional',
    exercises: [
      { name: 'Trap Bar Deadlift',        sets: 4, reps: '4',      note: 'Explosive concentric.' },
      { name: 'Box Jumps',                sets: 4, reps: '5',      note: "Step down, don't jump down.", bodyweight: true },
      { name: 'Step-Ups (weighted)',      sets: 3, reps: '8 /leg', note: 'High box. Drive through front foot.', perLeg: true },
      { name: 'Single-Leg Hip Thrust',    sets: 3, reps: '10 /leg', note: 'Glute activation.', perLeg: true },
      { name: 'Kettlebell Swing',         sets: 3, reps: '15',     note: 'Hip hinge power.' },
      { name: 'Hanging Leg Raise',        sets: 3, reps: '10',     note: '', bodyweight: true },
    ],
  },
};

// Weekly plan (simplified). Used for the "Today" card.
const WEEK_PLAN = {
  1: { code: 'A', title: 'Strength A — Lower Body Power', detail: 'Heavy compound lifts. 50–60 min.' }, // Mon
  2: { code: 'ride', title: 'Cycling — Structured intervals', detail: '60–90 min. Pick based on block.' },
  3: { code: 'B', title: 'Strength B — Upper Body + Core', detail: 'Pull, press, core. 45–50 min.' },
  4: { code: 'run', title: 'Run — Easy/moderate', detail: '30–45 min. Conversational pace.' },
  5: { code: 'rest', title: 'Rest', detail: 'Full rest day.' },
  6: { code: 'ride', title: 'Cycling — Long ride or race', detail: '90–180 min.' },
  0: { code: 'rest', title: 'Rest', detail: 'Full rest day.' },
};

// State -------------------------------------------------------------------
let workouts = loadJSON(STORAGE.workouts, []);
let weights  = loadJSON(STORAGE.weights, []);
let currentSession = 'A';
let weightChart = null;
let progressChart = null;

// Boot --------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem(STORAGE.auth) === 'ok') {
    showApp();
  } else {
    document.getElementById('login').style.display = '';
  }
  wireLogin();
});

function wireLogin() {
  const form = document.getElementById('login-form');
  const err = document.getElementById('login-error');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('password').value;
    if (val === PASSWORD) {
      sessionStorage.setItem(STORAGE.auth, 'ok');
      showApp();
    } else {
      err.hidden = false;
      document.getElementById('password').value = '';
      setTimeout(() => { err.hidden = true; }, 2500);
    }
  });
}

function showApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').hidden = false;
  initApp();
}

// App init ----------------------------------------------------------------
function initApp() {
  wireTabs();
  wireToday();
  wireSessionForm();
  wireWeight();
  wireProgress();
  wireData();
  wireLogout();

  renderToday();
  renderSessionForm();
  renderWeight();
  renderProgress();
  renderEntryCount();
}

function wireLogout() {
  document.getElementById('logout').addEventListener('click', () => {
    sessionStorage.removeItem(STORAGE.auth);
    location.reload();
  });
}

function wireTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
      if (tab === 'weight') renderWeightChart();
      if (tab === 'progress') renderProgressChart();
    });
  });
}

// Today tab ---------------------------------------------------------------
function wireToday() {
  document.querySelectorAll('.quick-jump .big').forEach(b => {
    b.addEventListener('click', () => {
      currentSession = b.dataset.session;
      document.querySelector('[data-tab="log"]').click();
      document.querySelectorAll('.session-picker .pill').forEach(p => {
        p.classList.toggle('active', p.dataset.session === currentSession);
      });
      renderSessionForm();
    });
  });
}

function renderToday() {
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('today-date').textContent = dateLabel;

  const plan = WEEK_PLAN[today.getDay()];
  document.getElementById('today-prescription').innerHTML = `
    ${plan.title}
    <span class="meta">${plan.detail}</span>
  `;

  // Week summary
  const start = startOfWeek(today);
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ymd = isoDate(d);
    const plan = WEEK_PLAN[d.getDay()];
    const done = plan.code.length === 1 && workouts.some(w => w.date === ymd && w.session === plan.code);
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    rows.push(`
      <div class="summary-row ${done ? 'done' : ''}">
        <span class="day">${dayLabel} · ${d.getDate()}/${d.getMonth() + 1}</span>
        <span>${plan.title}${done ? ' ✓' : ''}</span>
      </div>
    `);
  }
  document.getElementById('week-summary').innerHTML = rows.join('');
}

// Session form ------------------------------------------------------------
function wireSessionForm() {
  document.querySelectorAll('.session-picker .pill').forEach(p => {
    p.addEventListener('click', () => {
      currentSession = p.dataset.session;
      document.querySelectorAll('.session-picker .pill').forEach(b => b.classList.toggle('active', b === p));
      renderSessionForm();
    });
  });

  const dateInput = document.getElementById('session-date');
  dateInput.value = isoDate(new Date());
  dateInput.addEventListener('change', renderSessionForm);

  document.getElementById('save-session').addEventListener('click', saveSession);
  document.getElementById('clear-session').addEventListener('click', () => {
    if (!confirm('Clear all inputs in this session?')) return;
    renderSessionForm(true);
  });
}

function renderSessionForm(forceBlank = false) {
  const sess = SESSIONS[currentSession];
  const date = document.getElementById('session-date').value || isoDate(new Date());
  const existing = workouts.find(w => w.date === date && w.session === currentSession);
  const source = (!forceBlank && existing) ? existing : null;

  const form = document.getElementById('session-form');
  form.innerHTML = sess.exercises.map((ex, exIdx) => {
    const saved = source?.exercises[exIdx];
    const rowsHtml = [];
    rowsHtml.push(`
      <div class="hd">Set</div>
      <div class="hd">Weight (kg)</div>
      <div class="hd">Reps</div>
    `);
    for (let s = 0; s < ex.sets; s++) {
      const set = saved?.sets?.[s] || {};
      const wVal = set.weight ?? '';
      const rVal = set.reps ?? '';
      const wPh = ex.bodyweight ? 'bw' : '';
      const rPh = extractFirstNumber(ex.reps) ?? '';
      rowsHtml.push(`
        <div class="set-label">${s + 1}</div>
        <input type="number" step="0.5" inputmode="decimal" placeholder="${wPh}" value="${wVal}"
               data-ex="${exIdx}" data-set="${s}" data-field="weight">
        <input type="number" step="1" inputmode="numeric" placeholder="${rPh}" value="${rVal}"
               data-ex="${exIdx}" data-set="${s}" data-field="reps">
      `);
    }
    return `
      <div class="exercise">
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${ex.name}</div>
            ${ex.note ? `<div class="exercise-note">${ex.note}</div>` : ''}
          </div>
          <div class="exercise-pres">${ex.sets} × ${ex.reps}</div>
        </div>
        <div class="sets-grid">${rowsHtml.join('')}</div>
      </div>
    `;
  }).join('');
}

function saveSession() {
  const date = document.getElementById('session-date').value;
  if (!date) { alert('Pick a date.'); return; }
  const sess = SESSIONS[currentSession];

  const exercises = sess.exercises.map((ex, exIdx) => {
    const sets = [];
    for (let s = 0; s < ex.sets; s++) {
      const w = document.querySelector(`input[data-ex="${exIdx}"][data-set="${s}"][data-field="weight"]`).value;
      const r = document.querySelector(`input[data-ex="${exIdx}"][data-set="${s}"][data-field="reps"]`).value;
      sets.push({
        weight: w === '' ? null : parseFloat(w),
        reps:   r === '' ? null : parseInt(r, 10),
      });
    }
    return { name: ex.name, sets };
  });

  const anyData = exercises.some(e => e.sets.some(s => s.weight != null || s.reps != null));
  if (!anyData) { alert('Log at least one set before saving.'); return; }

  const idx = workouts.findIndex(w => w.date === date && w.session === currentSession);
  const entry = { date, session: currentSession, exercises, savedAt: new Date().toISOString() };
  if (idx >= 0) workouts[idx] = entry; else workouts.push(entry);
  saveJSON(STORAGE.workouts, workouts);

  showToast('Saved');
  renderToday();
  renderProgress();
  renderEntryCount();
}

function showToast(msg) {
  const t = document.getElementById('save-toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, 1600);
}

// Weight tab --------------------------------------------------------------
function wireWeight() {
  const dateInput = document.getElementById('wt-date');
  dateInput.value = isoDate(new Date());
  document.getElementById('weight-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = dateInput.value;
    const v = parseFloat(document.getElementById('wt-value').value);
    if (!date || isNaN(v)) return;
    const idx = weights.findIndex(w => w.date === date);
    if (idx >= 0) weights[idx].weight = v;
    else weights.push({ date, weight: v });
    weights.sort((a, b) => a.date.localeCompare(b.date));
    saveJSON(STORAGE.weights, weights);
    document.getElementById('wt-value').value = '';
    renderWeight();
  });
}

function renderWeight() {
  const current = weights.length ? weights[weights.length - 1].weight : null;
  document.getElementById('wt-current').textContent = current != null ? `${current.toFixed(1)} kg` : '—';
  renderWeightChart();
  renderWeightHistory();
}

function renderWeightChart() {
  if (!window.Chart) { setTimeout(renderWeightChart, 80); return; }
  const ctx = document.getElementById('weight-chart').getContext('2d');
  const labels = weights.map(w => w.date);
  const data = weights.map(w => w.weight);
  if (weightChart) weightChart.destroy();
  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Weight', data, borderColor: '#ff5c2b', backgroundColor: 'rgba(255,92,43,0.12)',
          borderWidth: 2, tension: 0.3, pointRadius: 3, pointHoverRadius: 5, fill: true },
      ],
    },
    options: chartOpts({
      y: {
        suggestedMin: Math.min(TARGET_LOW - 1, ...(data.length ? data : [START_WEIGHT])),
        suggestedMax: Math.max(START_WEIGHT + 1, ...(data.length ? data : [START_WEIGHT])),
      },
      annotations: [TARGET_LOW, TARGET_HIGH],
    }),
  });
}

function renderWeightHistory() {
  const container = document.getElementById('weight-history');
  if (!weights.length) {
    container.innerHTML = '<div class="muted">No entries yet.</div>';
    return;
  }
  container.innerHTML = [...weights].reverse().map(w => `
    <div class="history-row">
      <span class="hd-date">${formatDate(w.date)}</span>
      <span class="hd-val">${w.weight.toFixed(1)} kg</span>
      <button class="hd-del" data-date="${w.date}">Remove</button>
    </div>
  `).join('');
  container.querySelectorAll('.hd-del').forEach(btn => {
    btn.addEventListener('click', () => {
      weights = weights.filter(w => w.date !== btn.dataset.date);
      saveJSON(STORAGE.weights, weights);
      renderWeight();
    });
  });
}

// Progress tab ------------------------------------------------------------
function wireProgress() {
  document.getElementById('progress-exercise').addEventListener('change', renderProgress);
}

function allExerciseNames() {
  const names = new Set();
  Object.values(SESSIONS).forEach(s => s.exercises.forEach(e => names.add(e.name)));
  workouts.forEach(w => w.exercises.forEach(e => names.add(e.name)));
  return [...names];
}

function renderProgress() {
  const select = document.getElementById('progress-exercise');
  const names = allExerciseNames();
  const prev = select.value;
  select.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  if (names.includes(prev)) select.value = prev;
  renderProgressChart();
  renderProgressHistory();
}

function exerciseHistory(name) {
  const rows = [];
  workouts.forEach(w => {
    const ex = w.exercises.find(e => e.name === name);
    if (!ex) return;
    const valid = ex.sets.filter(s => s.weight != null || s.reps != null);
    if (!valid.length) return;
    const topWeight = Math.max(...valid.map(s => s.weight ?? 0));
    const totalReps = valid.reduce((a, s) => a + (s.reps || 0), 0);
    const volume = valid.reduce((a, s) => a + ((s.weight || 0) * (s.reps || 0)), 0);
    rows.push({ date: w.date, session: w.session, sets: ex.sets, topWeight, totalReps, volume });
  });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

function renderProgressChart() {
  if (!window.Chart) { setTimeout(renderProgressChart, 80); return; }
  const name = document.getElementById('progress-exercise').value;
  const hist = exerciseHistory(name);
  const ctx = document.getElementById('progress-chart').getContext('2d');
  if (progressChart) progressChart.destroy();
  progressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hist.map(h => h.date),
      datasets: [{
        label: 'Top weight (kg)',
        data: hist.map(h => h.topWeight),
        borderColor: '#ff5c2b',
        backgroundColor: 'rgba(255,92,43,0.12)',
        borderWidth: 2, tension: 0.3, pointRadius: 3, fill: true,
      }],
    },
    options: chartOpts({}),
  });
}

function renderProgressHistory() {
  const name = document.getElementById('progress-exercise').value;
  const hist = exerciseHistory(name);
  const container = document.getElementById('progress-history');
  if (!hist.length) {
    container.innerHTML = '<div class="muted">No entries yet for this exercise.</div>';
    return;
  }
  let pr = -Infinity;
  const reversed = [...hist].reverse();
  // Compute PR markers forward, then reverse for display
  const prByIdx = new Set();
  let running = -Infinity;
  hist.forEach((h, i) => {
    if (h.topWeight > running) { prByIdx.add(i); running = h.topWeight; }
  });
  container.innerHTML = hist.map((h, i) => {
    const isPR = prByIdx.has(i);
    const setsStr = h.sets.map(s => {
      if (s.weight == null && s.reps == null) return '—';
      const w = s.weight != null ? s.weight : '–';
      const r = s.reps != null ? s.reps : '–';
      return `${w}×${r}`;
    }).join('  ·  ');
    return `
      <div class="history-detail">
        <div class="history-row" style="border-bottom:none; padding:0;">
          <span class="hd-date">${formatDate(h.date)} · ${h.session}</span>
          <span class="hd-val">${h.topWeight ? h.topWeight.toFixed(1) + ' kg' : '—'}${isPR ? '<span class="pr-badge">PR</span>' : ''}</span>
        </div>
        <div class="sets">${setsStr}</div>
      </div>
    `;
  }).reverse().join('');
}

// Data tab ----------------------------------------------------------------
function wireData() {
  document.getElementById('export-json').addEventListener('click', exportJSON);
  document.getElementById('import-json').addEventListener('change', importJSON);
  document.getElementById('reset-all').addEventListener('click', () => {
    if (!confirm('Delete ALL workouts and weight entries? This cannot be undone.')) return;
    if (!confirm('Really? This wipes everything.')) return;
    workouts = []; weights = [];
    saveJSON(STORAGE.workouts, workouts);
    saveJSON(STORAGE.weights, weights);
    renderToday(); renderSessionForm(); renderWeight(); renderProgress(); renderEntryCount();
  });
}

function exportJSON() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts,
    weights,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arenberg-backup-${isoDate(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.weights)) {
        throw new Error('Invalid file format.');
      }
      if (!confirm(`Import ${data.workouts.length} workouts and ${data.weights.length} weight entries? This replaces current data.`)) return;
      workouts = data.workouts;
      weights = data.weights;
      saveJSON(STORAGE.workouts, workouts);
      saveJSON(STORAGE.weights, weights);
      renderToday(); renderSessionForm(); renderWeight(); renderProgress(); renderEntryCount();
      alert('Import complete.');
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

function renderEntryCount() {
  document.getElementById('entry-count').textContent =
    `${workouts.length} workout${workouts.length === 1 ? '' : 's'} · ${weights.length} weight entr${weights.length === 1 ? 'y' : 'ies'} logged.`;
}

// Helpers -----------------------------------------------------------------
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function isoDate(d) {
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function startOfWeek(d) {
  const out = new Date(d);
  const day = out.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // Monday-start
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}
function extractFirstNumber(s) {
  const m = String(s).match(/\d+/);
  return m ? m[0] : null;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function chartOpts({ y = {}, annotations = [] } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1d222b',
        borderColor: '#262c37',
        borderWidth: 1,
        titleColor: '#e7ecf3',
        bodyColor: '#e7ecf3',
      },
    },
    scales: {
      x: {
        grid: { color: '#1d222b' },
        ticks: { color: '#8a94a6', maxRotation: 0, autoSkipPadding: 12 },
      },
      y: {
        grid: { color: '#1d222b' },
        ticks: { color: '#8a94a6' },
        ...y,
      },
    },
  };
}
