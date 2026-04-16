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
  shift: 'arenberg.shift.v1',
  swaps: 'arenberg.swaps.v1',
  start: 'arenberg.start.v1',
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

// 26-week program anchored to a Monday start.
// Program day 0 = Mon, 1 = Tue, ..., 6 = Sun.
const DEFAULT_PROGRAM_START = '2026-04-13';
const PROGRAM_WEEKS = 26;

function getProgramStart() {
  const saved = loadJSON(STORAGE.start, null);
  return saved || DEFAULT_PROGRAM_START;
}

// Snap any date to the Monday of its week (local time).
function snapToMonday(iso) {
  const d = new Date(iso + 'T00:00:00');
  const shift = getDayToProgramDay(d.getDay()); // 0 if Mon
  d.setDate(d.getDate() - shift);
  return isoDate(d);
}

// Gym prescription codes expanded to display strings.
const GYM_NOTES = {
  'as-written':       'Strength A + B as written',
  'push-pr':          'Strength A + B — push PRs',
  '80%':              'Strength A + B at 80% weight',
  '70%':              'Strength A + B at 70% weight',
  'maint-a-minus-10': 'A (3×5, −10% weight) + B as written',
  'maintenance':      'Maintenance: A (3×5) + B',
  'light-or-rest':    'Light gym or rest',
  'full-plus-c':      'A + B full load + add Strength C on Fri',
  'full-plus-c-pr':   'A + B + C — push for new PRs',
  'ab-80':            'A + B at 80%',
};

const PROGRAM = [
  // Block 1 — Base + Strength (W1-4)
  { block: 1, blockName: 'Base + Strength', recovery: false,
    tue: { title: 'Endurance — Zone 2', detail: 'Steady 60–75 min, conversational' },
    sat: { title: 'Easy endurance', detail: '90–120 min, group or solo' },
    gym: 'as-written', run: { title: 'Easy', detail: '30 min, conversational' } },
  { block: 1, blockName: 'Base + Strength', recovery: false,
    tue: { title: 'Tempo', detail: '2 × 15 min sweet spot / 5 min easy' },
    sat: { title: 'Endurance + sprints', detail: '90–120 min + 2 town-sign sprints' },
    gym: 'as-written', run: { title: 'Easy', detail: '30 min' } },
  { block: 1, blockName: 'Base + Strength', recovery: false,
    tue: { title: 'Tempo', detail: '2 × 20 min sweet spot / 5 min easy' },
    sat: { title: 'Endurance + sprints', detail: '90–120 min + 3 town-sign sprints' },
    gym: 'as-written', run: { title: 'Easy', detail: '35 min' } },
  { block: 1, blockName: 'Base + Strength', recovery: true,
    tue: { title: 'Easy spin', detail: 'Recovery week — keep it light' },
    sat: { title: 'Easy', detail: '60–75 min, no structure' },
    gym: '80%', run: { title: 'Easy', detail: '25 min or rest' } },
  // Block 2 — Threshold Build (W5-8)
  { block: 2, blockName: 'Threshold Build', recovery: false,
    tue: { title: 'Threshold', detail: '3 × 8 min at FTP / 2 min easy' },
    sat: { title: 'Endurance + tempo', detail: '+ 2 × 10 min tempo effort' },
    gym: 'push-pr', run: { title: 'Easy', detail: '35 min' } },
  { block: 2, blockName: 'Threshold Build', recovery: false,
    tue: { title: 'Threshold', detail: '3 × 10 min at FTP / 3 min easy' },
    sat: { title: 'Long endurance', detail: '2–2.5 hrs steady' },
    gym: 'push-pr', run: { title: 'Easy', detail: '35 min' } },
  { block: 2, blockName: 'Threshold Build', recovery: false,
    tue: { title: 'Threshold', detail: '4 × 8 min at FTP / 2 min easy' },
    sat: { title: 'Endurance + tempo', detail: '+ 3 × 8 min tempo' },
    gym: 'push-pr', run: { title: 'Easy', detail: '40 min' } },
  { block: 2, blockName: 'Threshold Build', recovery: true,
    tue: { title: 'Easy spin', detail: 'Recovery week' },
    sat: { title: 'Easy', detail: '75 min' },
    gym: '80%', run: { title: 'Easy', detail: '25 min or rest' } },
  // Block 3 — VO2max + Race Prep (W9-12)
  { block: 3, blockName: 'VO2max + Race Prep', recovery: false,
    tue: { title: 'VO2max', detail: '5 × 3 min hard / 3 min easy' },
    sat: { title: 'Race or group ride', detail: '' },
    gym: 'maint-a-minus-10', run: { title: 'Easy', detail: '30 min' } },
  { block: 3, blockName: 'VO2max + Race Prep', recovery: false,
    tue: { title: 'VO2max', detail: '6 × 3 min hard / 3 min easy' },
    sat: { title: 'Race or long ride with surges', detail: '' },
    gym: 'maint-a-minus-10', run: { title: 'Easy', detail: '30 min' } },
  { block: 3, blockName: 'VO2max + Race Prep', recovery: false,
    tue: { title: 'Sprint intervals', detail: '8 × 30s max / 4 min easy' },
    sat: { title: 'Race or group ride', detail: '' },
    gym: 'maint-a-minus-10', run: { title: 'Easy', detail: '35 min' } },
  { block: 3, blockName: 'VO2max + Race Prep', recovery: true,
    tue: { title: 'Easy spin', detail: 'Recovery week' },
    sat: { title: 'Easy ride or rest', detail: '' },
    gym: '70%', run: { title: 'Rest', detail: '' } },
  // Block 4 — Peak Road Season (W13-17)
  { block: 4, blockName: 'Peak Road Season', recovery: false,
    tue: { title: 'Race-specific', detail: '6 × 1 min hard / 2 min easy + 2 × 5 min threshold' },
    sat: { title: 'Race', detail: '' },
    gym: 'maintenance', run: { title: 'Easy', detail: '30 min' } },
  { block: 4, blockName: 'Peak Road Season', recovery: false,
    tue: { title: 'Sprint intervals', detail: '10 × 30s / 4 min easy' },
    sat: { title: 'Race or fast group ride', detail: '' },
    gym: 'maintenance', run: { title: 'Easy', detail: '30 min' } },
  { block: 4, blockName: 'Peak Road Season', recovery: false,
    tue: { title: 'CX simulation', detail: '8 × 40s max / 20s easy · 5 min rest · × 2 blocks' },
    sat: { title: 'Race', detail: '' },
    gym: 'maintenance', run: { title: 'Easy', detail: '30 min' } },
  { block: 4, blockName: 'Peak Road Season', recovery: false,
    tue: { title: 'Threshold', detail: '3 × 10 min / 3 min easy' },
    sat: { title: 'Race or long ride', detail: '' },
    gym: 'maintenance', run: { title: 'Easy', detail: '30 min' } },
  { block: 4, blockName: 'Peak Road Season', recovery: true,
    tue: { title: 'Easy spin', detail: 'Recovery week' },
    sat: { title: 'Easy ride', detail: '' },
    gym: 'light-or-rest', run: { title: 'Rest', detail: '' } },
  // Block 5 — CX Transition (W18-21)
  { block: 5, blockName: 'CX Transition', recovery: false,
    tue: { title: 'CX simulation', detail: '8 × 40s / 20s · × 2 blocks' },
    sat: { title: 'Endurance + CX skills', detail: 'Practice CX skills if possible' },
    gym: 'full-plus-c', run: { title: 'Easy', detail: '35 min' } },
  { block: 5, blockName: 'CX Transition', recovery: false,
    tue: { title: 'CX simulation', detail: '10 × 40s / 20s · × 3 blocks' },
    sat: { title: 'Endurance with surges', detail: '4–5 hard surges' },
    gym: 'full-plus-c', run: { title: 'Intervals', detail: '6 × 30s hard / 90s jog' } },
  { block: 5, blockName: 'CX Transition', recovery: false,
    tue: { title: 'Sprint intervals', detail: '10 × 30s / 3 min easy' },
    sat: { title: 'CX practice or hard group ride', detail: '' },
    gym: 'full-plus-c-pr', run: { title: 'Intervals', detail: '8 × 30s hard / 90s jog' } },
  { block: 5, blockName: 'CX Transition', recovery: true,
    tue: { title: 'Easy spin', detail: 'Recovery week' },
    sat: { title: 'Easy ride', detail: '' },
    gym: 'ab-80', run: { title: 'Easy', detail: '30 min' } },
  // Block 6 — CX Race Season (W22-26)
  { block: 6, blockName: 'CX Race Season', recovery: false,
    tue: { title: 'CX simulation', detail: '6 × 40s / 20s · × 3 blocks' },
    sat: { title: 'CX Race', detail: '' },
    gym: 'maintenance', run: { title: 'CX intervals', detail: '8 × 30s hard / 60s jog' } },
  { block: 6, blockName: 'CX Race Season', recovery: false,
    tue: { title: 'Sprint intervals or CX sim', detail: 'Choose based on race needs' },
    sat: { title: 'CX Race', detail: '' },
    gym: 'maintenance', run: { title: 'CX intervals', detail: '' } },
  { block: 6, blockName: 'CX Race Season', recovery: false,
    tue: { title: 'Threshold', detail: '3 × 8 min' },
    sat: { title: 'CX Race', detail: '' },
    gym: 'maintenance', run: { title: 'CX intervals', detail: '' } },
  { block: 6, blockName: 'CX Race Season', recovery: false,
    tue: { title: 'CX sim or sprint intervals', detail: '' },
    sat: { title: 'CX Race', detail: '' },
    gym: 'maintenance', run: { title: 'Easy', detail: '30 min' } },
  { block: 6, blockName: 'CX Race Season', recovery: false,
    tue: { title: 'Easy spin', detail: 'End of program' },
    sat: { title: 'CX Race or fun ride', detail: '' },
    gym: 'light-or-rest', run: { title: 'Easy jog or rest', detail: '' } },
];

// Maps getDay() (0=Sun..6=Sat) → program day index (0=Mon..6=Sun).
function getDayToProgramDay(cal) {
  return (cal + 6) % 7;
}

// State -------------------------------------------------------------------
let workouts = loadJSON(STORAGE.workouts, []);
let weights  = loadJSON(STORAGE.weights, []);
let scheduleShift = loadJSON(STORAGE.shift, 0);
let scheduleSwaps = loadJSON(STORAGE.swaps, {});
let currentSession = 'A';
let weightChart = null;
let progressChart = null;
let swapSelection = null; // { weekStart, calDay } — first tapped row during a swap
let viewedWeekOffset = 0; // 0 = current calendar week; +N = N weeks ahead

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
  renderDataCount();
  renderStartInfo();
}

function wireLogout() {
  document.getElementById('logout').addEventListener('click', () => {
    sessionStorage.removeItem(STORAGE.auth);
    location.reload();
  });
}

function wireTabs() {
  document.querySelectorAll('.tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tabs .tab').forEach(b => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
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
        const active = p.dataset.session === currentSession;
        p.classList.toggle('active', active);
        p.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      renderSessionForm();
    });
  });

  document.getElementById('shift-plus').addEventListener('click', () => {
    scheduleShift += 1;
    saveJSON(STORAGE.shift, scheduleShift);
    renderToday();
  });
  document.getElementById('shift-minus').addEventListener('click', () => {
    scheduleShift -= 1;
    saveJSON(STORAGE.shift, scheduleShift);
    renderToday();
  });
  document.getElementById('shift-reset').addEventListener('click', (e) => {
    if (scheduleShift === 0 && Object.keys(scheduleSwaps).length === 0) return;
    armConfirm(e.currentTarget, 'Tap again', () => {
      scheduleShift = 0;
      scheduleSwaps = {};
      swapSelection = null;
      saveJSON(STORAGE.shift, scheduleShift);
      saveJSON(STORAGE.swaps, scheduleSwaps);
      renderToday();
    });
  });

  document.getElementById('week-prev').addEventListener('click', () => {
    viewedWeekOffset -= 1;
    swapSelection = null;
    renderToday();
  });
  document.getElementById('week-next').addEventListener('click', () => {
    viewedWeekOffset += 1;
    swapSelection = null;
    renderToday();
  });
  document.getElementById('week-today').addEventListener('click', () => {
    if (viewedWeekOffset === 0) return;
    viewedWeekOffset = 0;
    swapSelection = null;
    renderToday();
  });
}

// Resolve calendar date (after swap override) back to a date,
// then compute which program (weekIdx, dayIdx) applies after shift.
function resolvedDateFor(date) {
  const weekStart = startOfWeek(date);
  const cal = date.getDay();
  const swap = scheduleSwaps[isoDate(weekStart)];
  const resolvedCal = swap && swap[cal] !== undefined ? swap[cal] : cal;
  const resolved = new Date(weekStart);
  resolved.setDate(weekStart.getDate() + getDayToProgramDay(resolvedCal));
  return resolved;
}

function programPositionFor(date) {
  const start = new Date(getProgramStart() + 'T00:00:00');
  const d = new Date(isoDate(date) + 'T00:00:00');
  const days = Math.round((d - start) / 86400000) - scheduleShift;
  if (days < 0) return { status: 'pre', daysUntil: -days };
  const weekIdx = Math.floor(days / 7);
  const dayIdx = days % 7;
  if (weekIdx >= PROGRAM_WEEKS) return { status: 'post' };
  return { status: 'in', weekIdx, dayIdx, program: PROGRAM[weekIdx] };
}

function planForDate(date) {
  const resolved = resolvedDateFor(date);
  const pos = programPositionFor(resolved);
  if (pos.status !== 'in') {
    // Out-of-program fallback: generic weekly template using the calendar weekday.
    return { ...genericPlan(resolved.getDay()), status: pos.status, daysUntil: pos.daysUntil };
  }
  return { ...buildDailyPlan(pos), status: 'in', weekIdx: pos.weekIdx, dayIdx: pos.dayIdx, program: pos.program };
}

function genericPlan(cal) {
  // cal is getDay() (0=Sun..6=Sat)
  const map = {
    1: { code: 'A',    title: 'Strength A — Lower Body Power', detail: '' },
    2: { code: 'ride', title: 'Cycling — Structured intervals', detail: '60–90 min' },
    3: { code: 'B',    title: 'Strength B — Upper Body + Core', detail: '' },
    4: { code: 'run',  title: 'Run — Easy', detail: '30–45 min' },
    5: { code: 'rest', title: 'Rest', detail: '' },
    6: { code: 'ride', title: 'Cycling — Long ride', detail: '90–180 min' },
    0: { code: 'rest', title: 'Rest', detail: '' },
  };
  return map[cal];
}

function buildDailyPlan({ dayIdx, program }) {
  const gym = GYM_NOTES[program.gym] || '';
  switch (dayIdx) {
    case 0: return { code: 'A',    title: 'Strength A — Lower Body Power', detail: gym };
    case 1: return { code: 'ride', title: `Cycling — ${program.tue.title}`, detail: program.tue.detail };
    case 2: return { code: 'B',    title: 'Strength B — Upper Body + Core', detail: gym };
    case 3: return { code: 'run',  title: `Run — ${program.run.title}`, detail: program.run.detail };
    case 4: return { code: 'rest', title: 'Rest', detail: '' };
    case 5: return { code: 'ride', title: `Cycling — ${program.sat.title}`, detail: program.sat.detail };
    case 6: return { code: 'rest', title: 'Rest', detail: '' };
  }
}

function renderToday() {
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('today-date').textContent = dateLabel;

  const pos = programPositionFor(resolvedDateFor(today));
  const presc = document.getElementById('today-prescription');

  if (pos.status === 'pre') {
    const startIso = getProgramStart();
    const startDate = new Date(startIso + 'T00:00:00');
    const startLabel = startDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const firstProgram = PROGRAM[0];
    const firstPlan = buildDailyPlan({ dayIdx: 0, program: firstProgram });
    const days = pos.daysUntil;
    presc.innerHTML = `
      <div class="prog-kicker">Starts in ${days} day${days === 1 ? '' : 's'}</div>
      <div class="prog-title">${startLabel}</div>
      <div class="meta">Week 1 · Block 1 — ${firstProgram.blockName}. First session: ${firstPlan.title}.</div>
    `;
  } else if (pos.status === 'post') {
    presc.innerHTML = `
      <div class="prog-kicker">Program complete</div>
      <div class="prog-title">${PROGRAM_WEEKS} weeks done</div>
      <div class="meta">Keep training freely — log any session to continue tracking.</div>
    `;
  } else {
    const plan = planForDate(today);
    const weekNum = pos.weekIdx + 1;
    const recovery = pos.program.recovery ? ' · recovery' : '';
    presc.innerHTML = `
      <div class="prog-kicker">Week ${weekNum} of ${PROGRAM_WEEKS} · Block ${pos.program.block} — ${pos.program.blockName}${recovery}</div>
      <div class="prog-title">${plan.title}</div>
      ${plan.detail ? `<div class="meta">${plan.detail}</div>` : ''}
    `;
  }

  // Week being browsed (offset from calendar "this week")
  const viewedMonday = new Date(startOfWeek(today));
  viewedMonday.setDate(viewedMonday.getDate() + viewedWeekOffset * 7);
  const weekStart = isoDate(viewedMonday);
  const viewedSunday = new Date(viewedMonday); viewedSunday.setDate(viewedMonday.getDate() + 6);
  const rangeFmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  // Heading + range label
  const heading = document.getElementById('week-heading');
  if (viewedWeekOffset === 0) heading.textContent = 'This week';
  else if (viewedWeekOffset === 1) heading.textContent = 'Next week';
  else if (viewedWeekOffset === -1) heading.textContent = 'Last week';
  else if (viewedWeekOffset > 0) heading.textContent = `${viewedWeekOffset} weeks ahead`;
  else heading.textContent = `${-viewedWeekOffset} weeks back`;
  document.getElementById('week-range').textContent = `${rangeFmt(viewedMonday)} – ${rangeFmt(viewedSunday)}`;
  document.getElementById('week-today').disabled = (viewedWeekOffset === 0);

  // Week subtitle — program context for the viewed week
  const weekStates = { in: 0, pre: 0, post: 0 };
  let firstInDay = null;
  for (let i = 0; i < 7; i++) {
    const d = new Date(viewedMonday); d.setDate(viewedMonday.getDate() + i);
    const dayPos = programPositionFor(resolvedDateFor(d));
    weekStates[dayPos.status]++;
    if (!firstInDay && dayPos.status === 'in') firstInDay = { pos: dayPos, calDay: d };
  }
  const subtitle = document.getElementById('week-subtitle');
  if (weekStates.in === 7 && firstInDay) {
    const w = firstInDay.pos.weekIdx + 1;
    const p = firstInDay.pos.program;
    subtitle.textContent = `Week ${w} of ${PROGRAM_WEEKS} · Block ${p.block} — ${p.blockName}${p.recovery ? ' · recovery' : ''}`;
  } else if (weekStates.in > 0 && firstInDay) {
    const dow = firstInDay.calDay.toLocaleDateString(undefined, { weekday: 'long' });
    const w = firstInDay.pos.weekIdx + 1;
    const p = firstInDay.pos.program;
    subtitle.textContent = `Week ${w} begins ${dow} · Block ${p.block} — ${p.blockName}`;
  } else if (weekStates.pre === 7) {
    const startIso = getProgramStart();
    const start = new Date(startIso + 'T00:00:00');
    const diff = Math.round((start - viewedMonday) / 86400000);
    subtitle.textContent = diff <= 13
      ? `Not started yet · begins ${start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`
      : `Not started yet`;
  } else {
    subtitle.textContent = `Past the program · free week`;
  }

  // Shift / swap chips
  const hasSwapViewedWeek = !!scheduleSwaps[weekStart];
  const shiftInfo = document.getElementById('shift-info');
  const shiftHtml = [];
  if (scheduleShift > 0) {
    shiftHtml.push(`<span class="chip">Program paused ${scheduleShift} day${scheduleShift === 1 ? '' : 's'}</span>`);
  } else if (scheduleShift < 0) {
    shiftHtml.push(`<span class="chip">Program advanced ${-scheduleShift} day${scheduleShift === -1 ? '' : 's'}</span>`);
  }
  if (hasSwapViewedWeek) {
    shiftHtml.push(`<span class="chip">Days swapped</span>`);
  }
  shiftInfo.innerHTML = shiftHtml.join('');

  // Week summary (buttons for keyboard access)
  const rows = [];
  const todayIso = isoDate(today);
  for (let i = 0; i < 7; i++) {
    const d = new Date(viewedMonday); d.setDate(viewedMonday.getDate() + i);
    const ymd = isoDate(d);
    const p = planForDate(d);
    const inactive = p.status !== 'in';
    const title = inactive ? 'No plan yet' : p.title;
    const done = !inactive && p.code && p.code.length === 1 && workouts.some(w => w.date === ymd && w.session === p.code);
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    const dateShort = `${d.getDate()}/${d.getMonth() + 1}`;
    const isToday = ymd === todayIso;
    const isSelected = swapSelection && swapSelection.weekStart === weekStart && swapSelection.calDay === d.getDay();
    const cls = ['summary-row'];
    if (done) cls.push('done');
    if (isToday) cls.push('today');
    if (isSelected) cls.push('selected');
    if (inactive) cls.push('inactive');
    rows.push(`
      <button type="button" class="${cls.join(' ')}"
              data-calday="${d.getDay()}"
              ${inactive ? 'disabled' : ''}
              aria-label="${escapeHtml(dayLabel)} ${dateShort} — ${escapeHtml(title)}${done ? ' (done)' : ''}${inactive ? '' : '. Tap to swap.'}">
        <span class="day">${dayLabel} · ${dateShort}</span>
        <span class="title">${escapeHtml(title)}</span>
        <span class="mark">${done ? '✓' : ''}</span>
      </button>
    `);
  }
  document.getElementById('week-summary').innerHTML = rows.join('');

  document.querySelectorAll('#week-summary .summary-row').forEach(row => {
    if (row.disabled) return;
    row.addEventListener('click', () => {
      const calDay = parseInt(row.dataset.calday, 10);
      handleSwapTap(weekStart, calDay);
    });
  });
}

function handleSwapTap(weekStart, calDay) {
  if (!swapSelection) {
    swapSelection = { weekStart, calDay };
    renderToday();
    return;
  }
  if (swapSelection.weekStart !== weekStart) {
    swapSelection = { weekStart, calDay };
    renderToday();
    return;
  }
  if (swapSelection.calDay === calDay) {
    swapSelection = null;
    renderToday();
    return;
  }
  // Perform swap. We store "which calendar day's plan should this slot show".
  const a = swapSelection.calDay;
  const b = calDay;
  const existing = scheduleSwaps[weekStart] || {};
  const resolve = (cd) => existing[cd] !== undefined ? existing[cd] : cd;
  const next = { ...existing, [a]: resolve(b), [b]: resolve(a) };
  Object.keys(next).forEach(k => {
    if (next[k] === parseInt(k, 10)) delete next[k];
  });
  if (Object.keys(next).length === 0) {
    delete scheduleSwaps[weekStart];
  } else {
    scheduleSwaps[weekStart] = next;
  }
  saveJSON(STORAGE.swaps, scheduleSwaps);
  swapSelection = null;
  renderToday();
}

// Session form ------------------------------------------------------------
function wireSessionForm() {
  document.querySelectorAll('.session-picker .pill').forEach(p => {
    p.addEventListener('click', () => {
      currentSession = p.dataset.session;
      document.querySelectorAll('.session-picker .pill').forEach(b => {
        const active = b === p;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      renderSessionForm();
    });
  });

  const dateInput = document.getElementById('session-date');
  dateInput.value = isoDate(new Date());
  dateInput.addEventListener('change', renderSessionForm);

  document.getElementById('save-session').addEventListener('click', saveSession);
  document.getElementById('clear-session').addEventListener('click', (e) => {
    armConfirm(e.currentTarget, 'Tap again to clear', () => renderSessionForm(true));
  });

  document.getElementById('date-prev').addEventListener('click', () => stepDate(-1));
  document.getElementById('date-next').addEventListener('click', () => stepDate(1));
}

function stepDate(delta) {
  const input = document.getElementById('session-date');
  if (!input.value) input.value = isoDate(new Date());
  const [y, m, d] = input.value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  input.value = isoDate(dt);
  renderSessionForm();
}

function renderSessionForm(forceBlank = false) {
  const sess = SESSIONS[currentSession];
  const date = document.getElementById('session-date').value || isoDate(new Date());
  const existing = workouts.find(w => w.date === date && w.session === currentSession);
  const source = (!forceBlank && existing) ? existing : null;
  const previous = findPreviousSession(currentSession, date);

  const form = document.getElementById('session-form');
  form.innerHTML = sess.exercises.map((ex, exIdx) => {
    const saved = source?.exercises[exIdx];
    const last = lastSetsFor(ex.name, previous);
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
      const exLabel = escapeHtml(ex.name);
      rowsHtml.push(`
        <div class="set-label" aria-hidden="true">${s + 1}</div>
        <input type="number" step="0.5" inputmode="decimal" placeholder="${wPh}" value="${wVal}"
               aria-label="${exLabel}, set ${s + 1}, weight in kilograms"
               data-ex="${exIdx}" data-set="${s}" data-field="weight">
        <input type="number" step="1" inputmode="numeric" placeholder="${rPh}" value="${rVal}"
               aria-label="${exLabel}, set ${s + 1}, reps"
               data-ex="${exIdx}" data-set="${s}" data-field="reps">
      `);
    }
    const lastHtml = last ? `
      <div class="exercise-last" data-ex="${exIdx}" title="Tap to copy into inputs">
        <span class="last-label">Last · ${formatDate(last.date)}</span>
        <span class="last-sets">${formatSets(last.sets)}</span>
      </div>
    ` : `<div class="exercise-last muted-last">No prior log for this exercise</div>`;
    return `
      <div class="exercise">
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${ex.name}</div>
            ${ex.note ? `<div class="exercise-note">${ex.note}</div>` : ''}
          </div>
          <div class="exercise-pres">${ex.sets} × ${ex.reps}</div>
        </div>
        ${lastHtml}
        <div class="sets-grid">${rowsHtml.join('')}</div>
      </div>
    `;
  }).join('');

  // Auto-fill later empty sets from the most recently edited set.
  form.querySelectorAll('input[data-set]').forEach(el => {
    el.addEventListener('input', () => {
      const val = el.value;
      if (val === '') return;
      const exIdx = el.dataset.ex;
      const field = el.dataset.field;
      const fromSet = parseInt(el.dataset.set, 10);
      const later = form.querySelectorAll(
        `input[data-ex="${exIdx}"][data-field="${field}"]`
      );
      later.forEach(other => {
        const s = parseInt(other.dataset.set, 10);
        if (s > fromSet && other.value === '') other.value = val;
      });
    });
  });

  // Tap "Last" to prefill inputs with last time's numbers.
  form.querySelectorAll('.exercise-last[data-ex]').forEach(el => {
    el.addEventListener('click', () => {
      const exIdx = parseInt(el.dataset.ex, 10);
      const ex = sess.exercises[exIdx];
      const last = lastSetsFor(ex.name, previous);
      if (!last) return;
      for (let s = 0; s < ex.sets; s++) {
        const set = last.sets[s];
        if (!set) continue;
        const wEl = form.querySelector(`input[data-ex="${exIdx}"][data-set="${s}"][data-field="weight"]`);
        const rEl = form.querySelector(`input[data-ex="${exIdx}"][data-set="${s}"][data-field="reps"]`);
        if (wEl && wEl.value === '' && set.weight != null) wEl.value = set.weight;
        if (rEl && rEl.value === '' && set.reps != null) rEl.value = set.reps;
      }
    });
  });
}

function findPreviousSession(session, excludeDate) {
  return workouts
    .filter(w => w.session === session && w.date !== excludeDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function lastSetsFor(exerciseName, prevSession) {
  if (!prevSession) return null;
  const ex = prevSession.exercises.find(e => e.name === exerciseName);
  if (!ex) return null;
  const any = ex.sets.some(s => s.weight != null || s.reps != null);
  if (!any) return null;
  return { date: prevSession.date, sets: ex.sets };
}

function formatSets(sets) {
  return sets.map(s => {
    if (s.weight == null && s.reps == null) return '—';
    const w = s.weight != null ? s.weight : '–';
    const r = s.reps != null ? s.reps : '–';
    return `${w}×${r}`;
  }).join('  ·  ');
}

function saveSession() {
  const date = document.getElementById('session-date').value;
  if (!date) { showToast('Pick a date', 'err'); return; }
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
  if (!anyData) { showToast('Log at least one set', 'err'); return; }

  const idx = workouts.findIndex(w => w.date === date && w.session === currentSession);
  const entry = { date, session: currentSession, exercises, savedAt: new Date().toISOString() };
  if (idx >= 0) workouts[idx] = entry; else workouts.push(entry);
  saveJSON(STORAGE.workouts, workouts);

  showToast('Saved');
  renderToday();
  renderProgress();
  renderDataCount();
}

function showToast(msg, variant = '') {
  const t = document.getElementById('save-toast');
  t.textContent = msg;
  t.className = 'toast' + (variant ? ` ${variant}` : '');
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, 1800);
}

// Two-tap confirm for destructive buttons. Saves us a native confirm().
function armConfirm(btn, promptText, action, timeout = 3000) {
  if (btn._armed) {
    clearTimeout(btn._armTimer);
    btn._armed = false;
    btn.textContent = btn._originalText;
    btn.classList.remove('confirming');
    action();
    return;
  }
  btn._armed = true;
  btn._originalText = btn.textContent;
  btn.textContent = promptText;
  btn.classList.add('confirming');
  btn._armTimer = setTimeout(() => {
    btn._armed = false;
    btn.textContent = btn._originalText;
    btn.classList.remove('confirming');
  }, timeout);
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
  renderWeightHeadline();
  renderWeightChart();
  renderWeightHistory();
}

function renderWeightHeadline() {
  const el = document.getElementById('weight-headline');
  if (!weights.length) {
    el.innerHTML = `Start weight <span class="h-accent">${START_WEIGHT.toFixed(0)} kg</span>. Race-weight range <span class="h-dim">${TARGET_LOW}–${TARGET_HIGH} kg</span>. Log an entry to start tracking.`;
    return;
  }
  const current = weights[weights.length - 1].weight;
  const delta = current - START_WEIGHT;
  const toTarget = current - TARGET_HIGH;
  const direction = delta < 0 ? 'Down' : (delta > 0 ? 'Up' : 'At');
  const deltaAbs = Math.abs(delta).toFixed(1);
  const toTargetStr = toTarget > 0
    ? `${toTarget.toFixed(1)} kg to the top of the race-weight range.`
    : `In the race-weight range.`;
  el.innerHTML = `
    <span class="h-accent">${direction} ${deltaAbs} kg</span> since start.
    <span class="h-dim">Now ${current.toFixed(1)} kg. ${toTargetStr}</span>
  `;
}

function renderWeightChart() {
  if (!window.Chart) return; // Chart.js loads via defer before app.js; panel re-render covers late cases.
  const canvas = document.getElementById('weight-chart');
  const ctx = canvas.getContext('2d');
  const theme = themeColors();
  const labels = weights.map(w => w.date);
  const data = weights.map(w => w.weight);
  if (weightChart) weightChart.destroy();
  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Weight', data,
          borderColor: theme.accent,
          backgroundColor: theme.accentSoft,
          borderWidth: 2, tension: 0.3, pointRadius: 3, pointHoverRadius: 5, fill: true },
      ],
    },
    options: chartOpts(theme, {
      y: {
        suggestedMin: Math.min(TARGET_LOW - 1, ...(data.length ? data : [START_WEIGHT])),
        suggestedMax: Math.max(START_WEIGHT + 1, ...(data.length ? data : [START_WEIGHT])),
      },
    }),
  });

  // Dynamic accessible label summarising the trend.
  if (!data.length) {
    canvas.setAttribute('aria-label', 'Weight chart — no entries yet');
  } else {
    const first = data[0], last = data[data.length - 1];
    const diff = (last - first).toFixed(1);
    canvas.setAttribute('aria-label',
      `Weight chart: ${data.length} entries, from ${first.toFixed(1)} to ${last.toFixed(1)} kg (${diff >= 0 ? '+' : ''}${diff}).`);
  }
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
  if (!window.Chart) return;
  const name = document.getElementById('progress-exercise').value;
  const hist = exerciseHistory(name);
  const canvas = document.getElementById('progress-chart');
  const ctx = canvas.getContext('2d');
  const theme = themeColors();
  if (progressChart) progressChart.destroy();
  progressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hist.map(h => h.date),
      datasets: [{
        label: 'Top weight (kg)',
        data: hist.map(h => h.topWeight),
        borderColor: theme.accent,
        backgroundColor: theme.accentSoft,
        borderWidth: 2, tension: 0.3, pointRadius: 3, fill: true,
      }],
    },
    options: chartOpts(theme, {}),
  });

  if (!hist.length) {
    canvas.setAttribute('aria-label', `Progress for ${name}: no entries`);
  } else {
    const first = hist[0].topWeight, last = hist[hist.length - 1].topWeight;
    canvas.setAttribute('aria-label',
      `Progress for ${name}: ${hist.length} entries, top weight from ${first} to ${last} kg.`);
  }
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
  document.getElementById('start-form').addEventListener('submit', saveStartDate);
  document.getElementById('export-json').addEventListener('click', exportJSON);
  document.getElementById('import-json').addEventListener('change', importJSON);
  document.getElementById('reset-all').addEventListener('click', (e) => {
    armConfirm(e.currentTarget, 'Tap again to wipe everything', () => {
      workouts = []; weights = [];
      saveJSON(STORAGE.workouts, workouts);
      saveJSON(STORAGE.weights, weights);
      renderToday(); renderSessionForm(); renderWeight(); renderProgress(); renderDataCount();
      showToast('All data cleared');
    }, 4000);
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
  a.download = `strength-backup-${isoDate(new Date())}.json`;
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
        throw new Error('Invalid file format');
      }
      if (!confirm(`Import ${data.workouts.length} workouts and ${data.weights.length} weight entries? This replaces current data.`)) return;
      workouts = data.workouts;
      weights = data.weights;
      saveJSON(STORAGE.workouts, workouts);
      saveJSON(STORAGE.weights, weights);
      renderToday(); renderSessionForm(); renderWeight(); renderProgress(); renderDataCount();
      showToast('Import complete');
    } catch (err) {
      showToast('Import failed: ' + err.message, 'err');
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

function renderDataCount() {
  const el = document.getElementById('data-count');
  if (!el) return;
  const wCount = workouts.length;
  const kCount = weights.length;
  el.textContent =
    `Backup will include ${wCount} workout${wCount === 1 ? '' : 's'} and ${kCount} weight entr${kCount === 1 ? 'y' : 'ies'}.`;
}

function renderStartInfo() {
  const input = document.getElementById('start-date');
  const info = document.getElementById('start-info');
  if (!input || !info) return;
  const start = getProgramStart();
  input.value = start;
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(start + 'T00:00:00');
  endDate.setDate(endDate.getDate() + PROGRAM_WEEKS * 7 - 1);
  const fmt = d => d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const customized = start !== DEFAULT_PROGRAM_START;
  info.textContent = `Week 1 begins Monday, ${fmt(startDate)}. Program ends ${fmt(endDate)}.` +
    (customized ? ' Custom start date set.' : '');
}

function saveStartDate(e) {
  e.preventDefault();
  const raw = document.getElementById('start-date').value;
  if (!raw) { showToast('Pick a date', 'err'); return; }
  const monday = snapToMonday(raw);
  saveJSON(STORAGE.start, monday);
  // Shift is independent of start date — clearing it avoids surprises.
  scheduleShift = 0;
  saveJSON(STORAGE.shift, scheduleShift);
  renderStartInfo();
  renderToday();
  const snapped = monday !== raw;
  showToast(snapped ? `Snapped to Monday, ${formatDate(monday)}` : 'Start date saved');
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

function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const get = (name) => style.getPropertyValue(name).trim();
  return {
    accent:     get('--accent')     || '#d4834b',
    accentSoft: get('--accent-soft') || 'rgba(212,131,75,0.14)',
    bgElev:     get('--bg-elev')    || '#1c1a17',
    border:     get('--border')     || '#2e2b27',
    text:       get('--text')       || '#ece6dc',
    textDim:    get('--text-dim')   || '#b6ad9f',
  };
}

function chartOpts(theme, { y = {} } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.bgElev,
        borderColor: theme.border,
        borderWidth: 1,
        titleColor: theme.text,
        bodyColor: theme.text,
      },
    },
    scales: {
      x: {
        grid: { color: theme.border },
        ticks: { color: theme.textDim, maxRotation: 0, autoSkipPadding: 12 },
      },
      y: {
        grid: { color: theme.border },
        ticks: { color: theme.textDim },
        ...y,
      },
    },
  };
}
