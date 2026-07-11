/* ============================================================
   Jeopardy Game — game.js
   ============================================================ */

'use strict';

// ── DEFAULT GAME DATA ──────────────────────────────────────

const DEFAULT_GAME = {
  title: "Sunday School Review",
  teams: ["Team 1", "Team 2", "Team 3"],
  categories: [
    {
      name: "Old Testament",
      clues: [
        { points: 100, answer: "God created the world in this many days before resting on the seventh", question: "What is six?", verse_lookup: true },
        { points: 200, answer: "He was swallowed by a great fish after refusing to go to Nineveh", question: "Who is Jonah?", verse_lookup: true },
        { points: 300, answer: "God tested this man's faith by asking him to sacrifice his son Isaac", question: "Who is Abraham?" },
        { points: 400, answer: "She hid two Israelite spies under stalks of flax on her rooftop in Jericho", question: "Who is Rahab?", verse_lookup: true },
        { points: 500, answer: "This prophet did not die but was taken to heaven in a whirlwind with a chariot of fire", question: "Who is Elijah?" }
      ]
    },
    {
      name: "New Testament",
      clues: [
        { points: 100, answer: "Jesus performed his first miracle by turning water into this at a wedding", question: "What is wine?", verse_lookup: true },
        { points: 200, answer: "This disciple denied knowing Jesus three times before the rooster crowed", question: "Who is Peter?" },
        { points: 300, answer: "Jesus fed a crowd of 5,000 people using this many loaves of bread and fish", question: "What is five loaves and two fish?", verse_lookup: true },
        { points: 400, answer: "Paul wrote that love is patient, love is kind in this book of the Bible", question: "What is 1 Corinthians?" },
        { points: 500, answer: "This man helped Jesus carry his cross on the way to Golgotha", question: "Who is Simon of Cyrene?" }
      ]
    },
    {
      name: "Bible Heroes",
      clues: [
        { points: 100, answer: "He built a huge boat to save his family and the animals from a great flood", question: "Who is Noah?" },
        { points: 200, answer: "She chose to stay with her mother-in-law Naomi, saying 'Where you go, I will go'", question: "Who is Ruth?", verse_lookup: true },
        { points: 300, answer: "He defeated the giant Goliath with a sling and a single stone", question: "Who is David?" },
        { points: 400, answer: "She became Queen of Persia and bravely saved the Jewish people from destruction", question: "Who is Esther?", verse_lookup: true },
        { points: 500, answer: "Sold into slavery by his brothers, he later became second in command of all Egypt", question: "Who is Joseph?" }
      ]
    },
    {
      name: "Parables",
      clues: [
        { points: 100, answer: "In this parable, a shepherd leaves his flock to search for this many missing sheep", question: "What is one?", verse_lookup: true },
        { points: 200, answer: "The father in the Parable of the Prodigal Son ran to meet this person", question: "Who is his returning son?" },
        { points: 300, answer: "The parable of the Good Samaritan was told to answer the question 'Who is my...'", question: "What is neighbor?", verse_lookup: true },
        { points: 400, answer: "In the Parable of the Sower, seed that fell on good soil produced a crop of this amount", question: "What is thirty, sixty, or a hundred times what was sown?" },
        { points: 500, answer: "In the Parable of the Ten Virgins, this many had enough oil for their lamps when the bridegroom arrived", question: "What is five?" }
      ]
    },
    {
      name: "Books of the Bible",
      clues: [
        { points: 100, answer: "The very first book of the Bible", question: "What is Genesis?" },
        { points: 200, answer: "The longest book in the Bible, containing 150 chapters of songs and prayers", question: "What is Psalms?" },
        { points: 300, answer: "The last book of the Bible, also called the Apocalypse", question: "What is Revelation?", verse_lookup: true },
        { points: 400, answer: "This book of the New Testament records the missionary journeys of Paul and the early church", question: "What is Acts?" },
        { points: 500, answer: "Jesus is described as 'the Word' who 'was with God and was God' in the opening of this Gospel", question: "What is John?", verse_lookup: true }
      ]
    },
    {
      name: "Life of Jesus",
      clues: [
        { points: 100, answer: "The town where Jesus was born", question: "What is Bethlehem?" },
        { points: 200, answer: "Jesus walked on the surface of this body of water", question: "What is the Sea of Galilee?", verse_lookup: true },
        { points: 300, answer: "Jesus raised this man from the dead after he had been in the tomb for four days", question: "Who is Lazarus?", verse_lookup: true },
        { points: 400, answer: "The number of days Jesus fasted in the wilderness before being tempted by the devil", question: "What is forty?" },
        { points: 500, answer: "Jesus appeared and spoke to his disciples for this many days after his resurrection before ascending to heaven", question: "What is forty?" }
      ]
    }
  ],
  final_challenge: {
    category: "Final Challenge",
    answer: "Jesus named these two commandments as the greatest: love God with all your heart, and love your...",
    question: "What is neighbor?"
  }
};

// ── STATE ──────────────────────────────────────────────────
const state = {
  game: null,

  // Scores indexed by team index
  scores: [0, 0, 0],

  // usedCells[catIdx][clueIdx] = true
  usedCells: [],

  // Current clue info
  currentClue: null,         // { catIdx, clueIdx, category, clue }

  // Verse lookup
  verseAwardedTeams: new Set(),

  // Buzzer state
  buzzerArmed: false,
  buzzResolved: false,       // true after the randomization window has fired
  buzzEvents: [],            // { teamIdx, timestamp }
  buzzedKeys: new Set(),     // which team keys have buzzed this round
  displayedBuzzOrder: [],    // resolved buzz order (team indices) after window
  currentBuzzerPos: 0,       // which position in displayedBuzzOrder is "active"
  displayDelayTimer: null,
  questionRevealed: false,

  // Timer
  timerRunning: false,
  timerStart: null,
  timerDuration: 15,         // seconds
  timerInterval: null,
  timerExpired: false,

  // Settings
  lastScores: null,   // snapshot for undo
  settings: {
    teamNames: ["Team 1", "Team 2", "Team 3"],
    teamColors: ["#dd2222", "#ddcc00", "#22aa44"],
    teamWeights: [1.0, 1.0, 1.0],
    randomWindow: 300,       // ms
    displayDelay: 500,       // ms
    timerDuration: 15,       // seconds
    finalChallengePoints: 5000,
    versePoints: 1000
  }
};

// ── MINIMAL YAML PARSER ────────────────────────────────────
function parseYAML(text) {
  const lines = text.split('\n');
  return parseBlock(lines, 0, 0).value;
}

function stripComment(line) {
  // Remove inline YAML comments (naive but sufficient for our format)
  let inSingle = false, inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

function getIndent(line) {
  return line.match(/^(\s*)/)[1].length;
}

function parseBlock(lines, startLine, baseIndent) {
  // Skip blank/comment-only lines
  let i = startLine;
  while (i < lines.length) {
    const stripped = stripComment(lines[i]).trimEnd();
    if (stripped.trim() !== '') break;
    i++;
  }
  if (i >= lines.length) return { value: null, nextLine: i };

  const firstLine = stripComment(lines[i]).trimEnd();
  const indent = getIndent(firstLine);
  const trimmed = firstLine.trim();

  // Detect list block
  if (trimmed.startsWith('- ') || trimmed === '-') {
    return parseList(lines, i, indent);
  }

  // Detect mapping block
  if (trimmed.includes(':') && !trimmed.startsWith('"') && !trimmed.startsWith("'")) {
    return parseMapping(lines, i, indent);
  }

  return { value: parseScalar(trimmed), nextLine: i + 1 };
}

function parseMapping(lines, startLine, baseIndent) {
  const obj = {};
  let i = startLine;

  while (i < lines.length) {
    const raw = stripComment(lines[i]).trimEnd();
    if (raw.trim() === '') { i++; continue; }
    const indent = getIndent(raw);
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; } // shouldn't happen in well-formed YAML

    const trimmed = raw.trim();

    // Handle list item at same level — shouldn't be in a mapping but be safe
    if (trimmed.startsWith('- ')) break;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key = trimmed.slice(0, colonIdx).trim();
    const rest = trimmed.slice(colonIdx + 1).trim();

    if (rest !== '') {
      // Inline value
      obj[key] = parseScalar(rest);
      i++;
    } else {
      // Value is on the next lines
      i++;
      // Peek at next non-blank line
      let nextReal = i;
      while (nextReal < lines.length && stripComment(lines[nextReal]).trim() === '') nextReal++;
      if (nextReal >= lines.length) {
        obj[key] = null;
      } else {
        const result = parseBlock(lines, nextReal, indent + 1);
        obj[key] = result.value;
        i = result.nextLine;
      }
    }
  }
  return { value: obj, nextLine: i };
}

function parseList(lines, startLine, baseIndent) {
  const arr = [];
  let i = startLine;

  while (i < lines.length) {
    const raw = stripComment(lines[i]).trimEnd();
    if (raw.trim() === '') { i++; continue; }
    const indent = getIndent(raw);
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }

    const trimmed = raw.trim();
    if (!trimmed.startsWith('- ') && trimmed !== '-') break;

    const rest = trimmed.startsWith('- ') ? trimmed.slice(2).trim() : '';

    if (rest === '') {
      // Next line(s) are the value
      i++;
      let nextReal = i;
      while (nextReal < lines.length && stripComment(lines[nextReal]).trim() === '') nextReal++;
      if (nextReal < lines.length) {
        const childIndent = getIndent(stripComment(lines[nextReal]));
        const result = parseBlock(lines, nextReal, childIndent);
        arr.push(result.value);
        i = result.nextLine;
      } else {
        arr.push(null);
      }
    } else if (rest.includes(':') && !rest.startsWith('"') && !rest.startsWith("'")) {
      // Inline mapping start within list item — e.g. "- name: Science"
      // Build a sub-mapping starting from rest on this line, then continuation lines at higher indent
      const subLines = [' '.repeat(baseIndent + 2) + rest];
      i++;
      // Collect continuation lines
      while (i < lines.length) {
        const subRaw = stripComment(lines[i]).trimEnd();
        if (subRaw.trim() === '') { subLines.push(''); i++; continue; }
        const subIndent = getIndent(subRaw);
        if (subIndent <= baseIndent) break;
        subLines.push(subRaw);
        i++;
      }
      const result = parseMapping(subLines, 0, baseIndent + 2);
      arr.push(result.value);
    } else {
      arr.push(parseScalar(rest));
      i++;
    }
  }
  return { value: arr, nextLine: i };
}

function parseScalar(s) {
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  // Strip surrounding quotes
  if ((s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ── AUDIO ──────────────────────────────────────────────────
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playBuzzIn() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 175;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    // Chop the gain on/off at ~38 Hz for 0.55s — gives the classic rapid-buzz rattle
    const chopHz = 38;
    const chopPeriod = 1 / chopHz;
    const totalDur = 0.55;
    for (let t = 0; t < totalDur; t += chopPeriod) {
      gain.gain.setValueAtTime(0.45, now + t);
      gain.gain.setValueAtTime(0, now + t + chopPeriod * 0.5);
    }
    // Mild overall decay so it doesn't cut off abruptly
    const master = ctx.createGain();
    master.gain.setValueAtTime(1, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + totalDur + 0.05);

    osc.connect(gain);
    gain.connect(master);
    master.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + totalDur + 0.1);
  } catch (e) {}
}

function playCorrect() {
  try {
    const ctx = getAudioContext();
    // Quick ascending three-note chime
    [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + offset);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.4);
    });
  } catch (e) {}
}

function playTimerExpired() {
  try {
    const ctx = getAudioContext();
    // Three descending "wah-wah-wah" tones
    [[380, 0], [300, 0.28], [230, 0.56]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, ctx.currentTime + offset + 0.22);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.28);
    });
  } catch (e) {}
}

function playBuzzersOpen() {
  try {
    const ctx = getAudioContext();
    // Two quick ascending tones — a friendly "ready!" cue
    [[520, 0], [780, 0.13]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
  } catch (e) {}
}

function showBuzzersOpenBanner() {
  const el = $('buzzers-open-banner');
  if (!el) return;
  el.classList.remove('hidden');
  // Restart animation
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(state._bannerTimer);
  state._bannerTimer = setTimeout(() => el.classList.add('hidden'), 1100);
}

// ── DOM REFS ───────────────────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
  boardScreen:       () => $('board-screen'),
  clueScreen:        () => $('clue-screen'),
  gameTitle:         () => $('game-title'),
  gameBoard:         () => $('game-board'),
  scoreboard:        () => $('scoreboard'),
  settingsBtn:       () => $('settings-btn'),
  modalOverlay:      () => $('modal-overlay'),
  closeSettingsBtn:  () => $('close-settings-btn'),
  loadGameBtn:       () => $('load-game-btn'),
  fileInput:         () => $('file-input'),
  resetScoresBtn:    () => $('reset-scores-btn'),
  clueCategory:      () => $('clue-category'),
  cluePointsBadge:   () => $('clue-points-badge'),
  clueAnswerText:    () => $('clue-answer-text'),
  showQuestionBtn:   () => $('show-question-btn'),
  questionReveal:    () => $('question-reveal'),
  openBuzzersBtn:    () => $('open-buzzers-btn'),
  buzzOrderList:     () => $('buzz-order-list'),
  timerBtn:          () => $('timer-btn'),
  timerCount:        () => $('timer-count'),
  timerBar:          () => $('timer-bar'),
  correctBtn:        () => $('correct-btn'),
  wrongBtn:          () => $('wrong-btn'),
  returnBtn:         () => $('return-btn'),
  finalChallengeBtn: () => $('final-challenge-btn'),
  versePanel:        () => $('verse-panel'),
  verseTeamBtns:     () => $('verse-team-btns'),
  verseIcon:         () => $('verse-icon'),
  confirmOverlay:    () => $('confirm-overlay'),
  confirmYes:        () => $('confirm-yes'),
  confirmNo:         () => $('confirm-no'),
  editorScreen:      () => $('editor-screen'),
  editorBody:        () => $('editor-body'),
  editorDownloadBtn:       () => $('editor-download-btn'),
  editorSaveDefaultBtn:    () => $('editor-save-default-btn'),
  editorDoneBtn:           () => $('editor-done-btn'),
  editGameBtn:       () => $('edit-game-btn'),
  undoBtn:           () => $('undo-btn'),
  gameoverScreen:    () => $('gameover-screen'),
  gameoverWinnerName:() => $('gameover-winner-name'),
  gameoverScores:    () => $('gameover-scores'),
};

// Settings inputs (dynamically looked up)
function getSettingsInputs() {
  return {
    teamNames:   [
      $('setting-team-name-0'),
      $('setting-team-name-1'),
      $('setting-team-name-2')
    ],
    teamColors: [
      $('setting-team-color-0'),
      $('setting-team-color-1'),
      $('setting-team-color-2')
    ],
    teamWeights: [
      $('setting-weight-0'),
      $('setting-weight-1'),
      $('setting-weight-2')
    ],
    weightVals: [
      $('setting-weight-val-0'),
      $('setting-weight-val-1'),
      $('setting-weight-val-2')
    ],
    randomWindow:    $('setting-random-window'),
    randomWindowVal: $('setting-random-window-val'),
    displayDelay:    $('setting-display-delay'),
    displayDelayVal: $('setting-display-delay-val'),
    timerDuration:   $('setting-timer-duration'),
    timerDurationVal:$('setting-timer-duration-val'),
  };
}

// ── INIT ───────────────────────────────────────────────────
function init() {
  loadInitialGame();
  bindEvents();
}

const STORAGE_KEY = 'ssreview.defaultGame';

function loadInitialGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.categories) {
        loadGameData(parsed);
        return;
      }
    }
  } catch (e) {}
  loadGameData(DEFAULT_GAME);
}

function saveAsDefault() {
  applyEditorChanges();
  state.game.teams = [...state.settings.teamNames];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.game));
  const btn = dom.editorSaveDefaultBtn();
  const orig = btn.textContent;
  btn.textContent = '✓ Saved!';
  setTimeout(() => { btn.textContent = orig; }, 1500);
}


function loadGameData(gameData) {
  state.game = gameData;

  // Apply team names from game file, but respect any existing settings overrides
  // On first load, sync team names from game data
  state.settings.teamNames = (gameData.teams || ['Team 1', 'Team 2', 'Team 3'])
    .slice(0, 3)
    .map((n, i) => n || `Team ${i + 1}`);

  // Reset used cells
  state.usedCells = gameData.categories.map(cat => cat.clues.map(() => false));

  // Reset scores
  state.scores = [0, 0, 0];

  renderBoard();
}

// ── RENDER BOARD ───────────────────────────────────────────
function renderBoard() {
  const { game, settings } = state;
  if (!game) return;

  dom.gameTitle().textContent = game.title || 'Jeopardy';

  // Scoreboard
  const sb = dom.scoreboard();
  sb.innerHTML = '';

  settings.teamNames.forEach((name, i) => {
    if (i > 0) {
      const div = document.createElement('div');
      div.className = 'score-divider';
      sb.appendChild(div);
    }
    const teamEl = document.createElement('div');
    teamEl.className = 'team-score';
    teamEl.id = `team-score-${i}`;
    teamEl.innerHTML = `
      <div class="team-name">${escHtml(name)}</div>
      <div class="team-points" id="team-points-${i}" title="Click to edit score">${formatScore(state.scores[i])}</div>
    `;
    teamEl.querySelector('.team-points').addEventListener('click', () => editScore(i));
    sb.appendChild(teamEl);
  });

  // Game board
  const board = dom.gameBoard();
  board.innerHTML = '';

  // Category headers
  game.categories.forEach((cat, catIdx) => {
    const header = document.createElement('div');
    header.className = `category-header cat-${catIdx}`;
    header.textContent = cat.name;
    board.appendChild(header);
  });

  // Clue cells — row by row (5 rows × 6 cols)
  for (let row = 0; row < 5; row++) {
    game.categories.forEach((cat, catIdx) => {
      const clue = cat.clues[row];
      if (!clue) {
        board.appendChild(document.createElement('div'));
        return;
      }
      const cell = document.createElement('div');
      const usedClass = state.usedCells[catIdx][row] ? ' used' : '';
      cell.className = `clue-cell cat-${catIdx}${usedClass}`;
      cell.dataset.cat = catIdx;
      cell.dataset.clue = row;
      cell.innerHTML = `<span>${clue.points}</span>`;
      // Stagger entrance animation
      cell.style.animationDelay = `${(catIdx * 5 + row) * 35}ms`;
      cell.addEventListener('click', () => onClueClick(catIdx, row));
      board.appendChild(cell);
    });
  }
}

function saveScoreSnapshot() {
  state.lastScores = [...state.scores];
  const btn = dom.undoBtn();
  if (btn) btn.disabled = false;
}

function undoScores() {
  if (!state.lastScores) return;
  state.scores = [...state.lastScores];
  state.lastScores = null;
  const btn = dom.undoBtn();
  if (btn) btn.disabled = true;
  updateScoreboard();
}

function editScore(teamIdx) {
  const el = document.getElementById(`team-points-${teamIdx}`);
  if (!el || el.querySelector('input')) return; // already editing

  const current = state.scores[teamIdx];
  el.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'number';
  input.value = current;
  input.className = 'score-edit-input';
  el.appendChild(input);
  input.focus();
  input.select();

  function commit() {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val !== current) {
      saveScoreSnapshot();
      state.scores[teamIdx] = val;
    }
    updateScoreboard();
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { updateScoreboard(); } // cancel
  });
  input.addEventListener('blur', commit);
}

function updateScoreboard() {
  state.settings.teamNames.forEach((name, i) => {
    const nameEl = document.getElementById(`team-score-${i}`)?.querySelector('.team-name');
    const pointsEl = document.getElementById(`team-points-${i}`);
    if (nameEl) nameEl.textContent = name;
    if (pointsEl && !pointsEl.querySelector('input')) {
      pointsEl.textContent = formatScore(state.scores[i]);
    }
  });
}

function popScore(teamIdx) {
  const el = document.getElementById(`team-points-${teamIdx}`);
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth; // force reflow to restart animation
  el.classList.add('pop');
  el.addEventListener('animationend', () => el.classList.remove('pop'), { once: true });
}

function launchConfetti() {
  const colors = ['#f0c040','#e74c3c','#2ecc71','#9b59b6','#1abc9c','#e91e8c','#ffffff','#e67e22'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const size = 7 + Math.random() * 9;
    el.style.cssText = [
      `left:${Math.random() * 100}vw`,
      `width:${size}px`,
      `height:${size * (0.4 + Math.random() * 0.8)}px`,
      `background:${colors[Math.floor(Math.random() * colors.length)]}`,
      `animation-delay:${Math.random() * 0.4}s`,
      `animation-duration:${0.9 + Math.random() * 0.8}s`,
      `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
    ].join(';');
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function formatScore(n) {
  if (n < 0) return `-${Math.abs(n).toLocaleString()} pts`;
  return `${n.toLocaleString()} pts`;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── CLUE FLOW ──────────────────────────────────────────────
function onClueClick(catIdx, clueIdx) {
  if (state.usedCells[catIdx][clueIdx]) return;

  const cat = state.game.categories[catIdx];
  const clue = cat.clues[clueIdx];

  state.currentClue = { catIdx, clueIdx, category: cat, clue };
  openClueScreen();
}

function openClueScreen() {
  const { currentClue } = state;
  if (!currentClue) return;

  // Reset clue-screen state
  resetBuzzerState();
  stopTimer();
  state.timerExpired = false;
  state.questionRevealed = false;

  // Populate UI
  dom.clueCategory().textContent = currentClue.category.name;
  dom.cluePointsBadge().textContent = `${currentClue.clue.points} pts`;
  dom.clueAnswerText().textContent = currentClue.clue.answer;
  dom.questionReveal().textContent = currentClue.clue.question;
  dom.questionReveal().classList.remove('visible');
  dom.showQuestionBtn().textContent = 'Show Answer';

  dom.timerCount().textContent = state.settings.timerDuration + 's';
  dom.timerCount().classList.remove('expired');
  dom.timerBar().style.width = '100%';
  dom.timerBar().classList.remove('low');
  dom.timerBtn().textContent = 'START TIMER';

  dom.buzzOrderList().innerHTML = '';

  // Verse lookup panel
  state.verseAwardedTeams = new Set();
  setupVersePanel(currentClue.clue.verse_lookup);

  dom.clueScreen().classList.remove('hidden');
}

function setupVersePanel(hasVerse) {
  const panel = dom.versePanel();
  const icon  = dom.verseIcon();
  if (!hasVerse) {
    panel.classList.add('hidden');
    icon.classList.add('hidden');
    return;
  }
  icon.classList.remove('hidden');
  panel.classList.remove('hidden');
  const btns = dom.verseTeamBtns();
  btns.innerHTML = '';
  state.settings.teamNames.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'verse-team-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => toggleVerseAward(i, btn));
    btns.appendChild(btn);
  });
}

function toggleVerseAward(teamIdx, btn) {
  saveScoreSnapshot();
  if (state.verseAwardedTeams.has(teamIdx)) {
    state.verseAwardedTeams.delete(teamIdx);
    state.scores[teamIdx] -= state.settings.versePoints;
    btn.classList.remove('awarded');
  } else {
    state.verseAwardedTeams.add(teamIdx);
    state.scores[teamIdx] += state.settings.versePoints;
    btn.classList.add('awarded');
    popScore(teamIdx);
  }
  updateScoreboard();
}

function closeClueScreen(markUsed = true) {
  if (markUsed && state.currentClue) {
    const { catIdx, clueIdx } = state.currentClue;
    if (catIdx >= 0) {
      state.usedCells[catIdx][clueIdx] = true;
      const cells = document.querySelectorAll('.clue-cell');
      cells.forEach(cell => {
        if (Number(cell.dataset.cat) === catIdx && Number(cell.dataset.clue) === clueIdx) {
          cell.classList.add('used');
        }
      });
    }
  }

  stopTimer();
  resetBuzzerState();
  const wasFinalChallenge = state.isFinalChallenge;
  state.currentClue = null;
  state.isFinalChallenge = false;
  state.verseAwardedTeams = new Set();
  dom.versePanel().classList.add('hidden');
  dom.verseIcon().classList.add('hidden');
  dom.clueScreen().classList.remove('final-challenge');
  dom.clueScreen().classList.add('hidden');
  updateScoreboard();
  if (wasFinalChallenge) showGameOver();
}

function openFinalChallenge() {
  const fc = state.game?.final_challenge;
  if (!fc) { alert('No Final Challenge defined in this game file.'); return; }

  const points = state.settings.finalChallengePoints;
  state.currentClue = {
    catIdx: -1, clueIdx: -1,
    category: { name: fc.category },
    clue: { points, answer: fc.answer, question: fc.question }
  };
  state.isFinalChallenge = true;

  resetBuzzerState();
  stopTimer();
  state.timerExpired = false;
  state.questionRevealed = false;

  dom.clueCategory().textContent = fc.category;
  dom.cluePointsBadge().textContent = `${points.toLocaleString()} pts`;
  dom.clueAnswerText().textContent = fc.answer;
  dom.questionReveal().textContent = fc.question;
  dom.questionReveal().classList.remove('visible');
  dom.showQuestionBtn().textContent = 'Show Answer';

  dom.timerCount().textContent = state.settings.timerDuration + 's';
  dom.timerCount().classList.remove('expired');
  dom.timerBar().style.width = '100%';
  dom.timerBar().classList.remove('low');
  dom.timerBtn().textContent = 'START TIMER';
  dom.buzzOrderList().innerHTML = '';

  dom.clueScreen().classList.add('final-challenge');
  dom.clueScreen().classList.remove('hidden');
}

function showGameOver() {
  const names = state.game.teams || state.settings.teamNames;
  const maxScore = Math.max(...state.scores);
  const winners = state.scores
    .map((s, i) => ({ name: names[i] || `Team ${i + 1}`, score: s, idx: i }))
    .filter(t => t.score === maxScore);

  const winnerText = winners.map(t => t.name).join(' & ');
  dom.gameoverWinnerName().textContent = winnerText;

  const scoresEl = dom.gameoverScores();
  scoresEl.innerHTML = '';
  state.scores.forEach((score, i) => {
    const isWinner = score === maxScore;
    const card = document.createElement('div');
    card.className = 'gameover-score-card' + (isWinner ? ' winner' : '');
    card.innerHTML = `<span class="gs-name">${names[i] || `Team ${i + 1}`}</span>
                      <span class="gs-pts">${score.toLocaleString()}</span>`;
    scoresEl.appendChild(card);
  });

  dom.gameoverScreen().classList.remove('hidden');
  launchConfetti();
}

function closeGameOver() {
  dom.gameoverScreen().classList.add('hidden');
  state.scores = state.scores.map(() => 0);
  updateScoreboard();
}

// ── BUZZER LOGIC ───────────────────────────────────────────
function resetBuzzerState() {
  state.buzzerArmed = false;
  state.buzzResolved = false;
  state.buzzEvents = [];
  state.buzzedKeys = new Set();
  state.displayedBuzzOrder = [];
  state.currentBuzzerPos = 0;
  if (state.displayDelayTimer) {
    clearTimeout(state.displayDelayTimer);
    state.displayDelayTimer = null;
  }
  dom.openBuzzersBtn().textContent = 'OPEN BUZZERS';
  dom.openBuzzersBtn().classList.remove('armed');
  dom.buzzOrderList().innerHTML = '';
}

function toggleBuzzers() {
  if (state.buzzerArmed) {
    disarmBuzzers();
  } else {
    armBuzzers();
  }
}

function armBuzzers() {
  state.buzzerArmed = true;
  state.buzzResolved = false;
  state.buzzEvents = [];
  state.buzzedKeys = new Set();
  state.displayedBuzzOrder = [];
  state.currentBuzzerPos = 0;
  dom.buzzOrderList().innerHTML = '';
  dom.openBuzzersBtn().textContent = 'CLOSE BUZZERS';
  dom.openBuzzersBtn().classList.add('armed');
  playBuzzersOpen();
  showBuzzersOpenBanner();
}

function disarmBuzzers() {
  state.buzzerArmed = false;
  dom.openBuzzersBtn().textContent = 'OPEN BUZZERS';
  dom.openBuzzersBtn().classList.remove('armed');
}

function flashTeamColor(teamIdx) {
  const color = state.settings.teamColors[teamIdx] || '#ffffff';
  const el = $('buzz-flash');
  if (!el) return;
  el.style.background = color;
  el.classList.remove('active');
  void el.offsetWidth; // force reflow to restart animation
  el.classList.add('active');
}

/**
 * Called when a team key is pressed (keys 1, 2, 3 → team indices 0, 1, 2).
 * Records the timestamp. After the randomization window, resolves order.
 */
function handleBuzzIn(teamIdx) {
  if (!state.buzzerArmed) return;
  if (state.buzzedKeys.has(teamIdx)) return; // already buzzed this round

  state.buzzedKeys.add(teamIdx);
  const ts = performance.now();
  state.buzzEvents.push({ teamIdx, timestamp: ts });

  playBuzzIn();
  flashTeamColor(teamIdx);

  if (state.buzzResolved) {
    // Window already resolved — append this late buzz directly to the displayed order
    state.displayedBuzzOrder.push(teamIdx);
    renderBuzzOrder();
  } else if (state.buzzEvents.length === 1) {
    // First buzz: schedule resolution after the randomization window
    setTimeout(() => resolveAndDisplayBuzzOrder(), state.settings.randomWindow);
  }
}

/**
 * Resolves which teams are "simultaneous" (within the window of the first buzz),
 * picks a winner among them by weighted random, then builds the final order.
 */
function resolveAndDisplayBuzzOrder() {
  if (state.buzzEvents.length === 0) return;

  const events = [...state.buzzEvents];
  const firstTs = events[0].timestamp;
  const window = state.settings.randomWindow;

  // Partition into simultaneous and late
  const simultaneous = events.filter(e => e.timestamp - firstTs <= window);
  const late = events.filter(e => e.timestamp - firstTs > window);

  // Sort late by timestamp
  late.sort((a, b) => a.timestamp - b.timestamp);

  // Weighted random among simultaneous
  const winner = weightedRandom(simultaneous);

  // Remaining simultaneous (excluding winner), sorted by ts
  const remainingSimul = simultaneous
    .filter(e => e !== winner)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Final order: winner → remainingSimul → late
  const order = [winner, ...remainingSimul, ...late];
  state.displayedBuzzOrder = order.map(e => e.teamIdx);
  state.currentBuzzerPos = 0;
  state.buzzResolved = true;
  // Buzzer stays armed so late buzz-ins from remaining teams can still be recorded

  // Display with delay
  const delay = state.settings.displayDelay;
  state.displayDelayTimer = setTimeout(() => {
    renderBuzzOrder();
  }, delay);
}

function weightedRandom(events) {
  if (events.length === 1) return events[0];
  const weights = events.map(e => state.settings.teamWeights[e.teamIdx] ?? 1.0);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < events.length; i++) {
    r -= weights[i];
    if (r <= 0) return events[i];
  }
  return events[events.length - 1];
}

function renderBuzzOrder() {
  const list = dom.buzzOrderList();
  list.innerHTML = '';

  state.displayedBuzzOrder.forEach((teamIdx, pos) => {
    const name = state.settings.teamNames[teamIdx];
    const color = state.settings.teamColors[teamIdx] || '#ffffff';
    const isLeader = pos === state.currentBuzzerPos;
    const entry = document.createElement('div');
    entry.className = 'buzz-entry' + (isLeader ? ' leader' : '');
    entry.id = `buzz-entry-${pos}`;
    entry.style.setProperty('--team-color', color);
    entry.innerHTML = `
      <span class="buzz-rank">${pos + 1}.</span>
      <span class="buzz-team-name">${escHtml(name)}</span>
      ${isLeader ? '<span class="buzz-badge">Buzzed In!</span>' : ''}
    `;
    list.appendChild(entry);

    // Stagger visibility for dramatic effect
    setTimeout(() => entry.classList.add('visible'), pos * 80);
  });
}

// ── CORRECT / WRONG ────────────────────────────────────────
function handleCorrect() {
  if (!state.currentClue) return;

  const activeTeam = state.displayedBuzzOrder[state.currentBuzzerPos];
  if (activeTeam === undefined) {
    // No one buzzed — just close
    closeClueScreen(true);
    return;
  }

  saveScoreSnapshot();
  state.scores[activeTeam] += state.currentClue.clue.points;
  playCorrect();
  launchConfetti();
  popScore(activeTeam);
  closeClueScreen(true);
}

function handleWrong() {
  if (!state.currentClue) return;

  // Optionally deduct points
  const activeTeam = state.displayedBuzzOrder[state.currentBuzzerPos];
  if (activeTeam !== undefined) {
    // No deduction by default — just advance
    state.currentBuzzerPos++;
  }

  if (state.currentBuzzerPos >= state.displayedBuzzOrder.length) {
    // No more teams — close clue
    closeClueScreen(true);
  } else {
    // Show next team as leader
    renderBuzzOrder();
  }
}

// ── TIMER ──────────────────────────────────────────────────
function startTimer() {
  if (state.timerRunning) {
    stopTimer();
    dom.timerBtn().textContent = 'START TIMER';
    dom.timerCount().textContent = state.settings.timerDuration + 's';
    dom.timerCount().classList.remove('expired');
    dom.timerBar().style.width = '100%';
    dom.timerBar().classList.remove('low');
    state.timerExpired = false;
    return;
  }

  state.timerRunning = true;
  state.timerStart = performance.now();
  state.timerExpired = false;
  dom.timerBtn().textContent = 'RESET TIMER';

  const durationMs = state.settings.timerDuration * 1000;

  state.timerInterval = setInterval(() => {
    const elapsed = performance.now() - state.timerStart;
    const remaining = Math.max(0, durationMs - elapsed);
    const secs = Math.ceil(remaining / 1000);
    const pct = (remaining / durationMs) * 100;

    dom.timerCount().textContent = secs + 's';
    dom.timerBar().style.width = pct + '%';

    if (pct < 33) {
      dom.timerBar().classList.add('low');
    }

    if (remaining <= 0) {
      stopTimer();
      state.timerExpired = true;
      dom.timerCount().textContent = '0s';
      dom.timerCount().classList.add('expired');
      dom.timerBar().style.width = '0%';
      dom.timerBtn().textContent = 'START TIMER';
      playTimerExpired();
    }
  }, 50);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.timerRunning = false;
}

// ── SETTINGS ───────────────────────────────────────────────
function openSettings() {
  const inputs = getSettingsInputs();
  const s = state.settings;

  inputs.teamNames.forEach((el, i) => {
    if (el) el.value = s.teamNames[i];
  });

  inputs.teamColors.forEach((el, i) => {
    if (el) el.value = s.teamColors[i];
  });

  inputs.teamWeights.forEach((el, i) => {
    if (el) {
      el.value = s.teamWeights[i];
      inputs.weightVals[i].textContent = s.teamWeights[i].toFixed(1);
    }
  });

  if (inputs.randomWindow) {
    inputs.randomWindow.value = s.randomWindow;
    inputs.randomWindowVal.textContent = s.randomWindow + 'ms';
  }
  if (inputs.displayDelay) {
    inputs.displayDelay.value = s.displayDelay;
    inputs.displayDelayVal.textContent = s.displayDelay + 'ms';
  }
  if (inputs.timerDuration) {
    inputs.timerDuration.value = s.timerDuration;
    inputs.timerDurationVal.textContent = s.timerDuration + 's';
  }
  const vpEl = $('setting-verse-points');
  if (vpEl) vpEl.value = s.versePoints;
  const fcEl = $('setting-final-points');
  if (fcEl) fcEl.value = s.finalChallengePoints;

  dom.modalOverlay().classList.remove('hidden');
}

function saveSettings() {
  const inputs = getSettingsInputs();

  inputs.teamNames.forEach((el, i) => {
    if (el) state.settings.teamNames[i] = el.value.trim() || `Team ${i + 1}`;
  });

  inputs.teamColors.forEach((el, i) => {
    if (el) state.settings.teamColors[i] = el.value;
  });

  inputs.teamWeights.forEach((el, i) => {
    if (el) state.settings.teamWeights[i] = parseFloat(el.value);
  });

  if (inputs.randomWindow) state.settings.randomWindow = parseInt(inputs.randomWindow.value);
  if (inputs.displayDelay) state.settings.displayDelay = parseInt(inputs.displayDelay.value);
  if (inputs.timerDuration) {
    state.settings.timerDuration = parseInt(inputs.timerDuration.value);
    state.timerDuration = state.settings.timerDuration;
  }
  const vpEl = $('setting-verse-points');
  if (vpEl) state.settings.versePoints = parseInt(vpEl.value) || 1000;
  const fcEl = $('setting-final-points');
  if (fcEl) state.settings.finalChallengePoints = parseInt(fcEl.value) || 5000;

  dom.modalOverlay().classList.add('hidden');
  renderBoard();
}

function closeSettings() {
  saveSettings();
}

function resetScores() {
  state.scores = [0, 0, 0];
  updateScoreboard();
}

// ── YAML FILE LOADING ──────────────────────────────────────
function onFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = parseYAML(ev.target.result);
      if (!parsed || !parsed.categories) throw new Error('Invalid game file');
      loadGameData(parsed);
    } catch (err) {
      alert('Failed to load game file: ' + err.message);
    }
  };
  reader.readAsText(file);
  // Reset file input so same file can be re-loaded
  e.target.value = '';
}

// ── CONFIRMATION DIALOG ────────────────────────────────────
let confirmCallback = null;

function showConfirm(message, onYes) {
  document.querySelector('#confirm-box p').textContent = message;
  confirmCallback = onYes;
  dom.confirmOverlay().classList.remove('hidden');
}

function hideConfirm() {
  dom.confirmOverlay().classList.add('hidden');
  confirmCallback = null;
}

// ── EVENT BINDING ──────────────────────────────────────────
function bindEvents() {
  // Settings gear
  dom.settingsBtn().addEventListener('click', openSettings);
  dom.closeSettingsBtn().addEventListener('click', closeSettings);

  // Modal overlay click-outside to close
  dom.modalOverlay().addEventListener('click', e => {
    if (e.target === dom.modalOverlay()) closeSettings();
  });

  // File loading
  dom.loadGameBtn().addEventListener('click', () => dom.fileInput().click());
  dom.fileInput().addEventListener('change', onFileSelected);

  // Reset scores
  dom.resetScoresBtn().addEventListener('click', resetScores);

  // Final Challenge
  dom.finalChallengeBtn().addEventListener('click', openFinalChallenge);

  // Live settings sliders
  const bindSlider = (inputId, valId, suffix, float = false) => {
    const input = $(inputId);
    const valEl = $(valId);
    if (!input || !valEl) return;
    input.addEventListener('input', () => {
      const v = float ? parseFloat(input.value).toFixed(1) : parseInt(input.value);
      valEl.textContent = v + suffix;
    });
  };

  bindSlider('setting-weight-0', 'setting-weight-val-0', '', true);
  bindSlider('setting-weight-1', 'setting-weight-val-1', '', true);
  bindSlider('setting-weight-2', 'setting-weight-val-2', '', true);
  bindSlider('setting-random-window', 'setting-random-window-val', 'ms');
  bindSlider('setting-display-delay', 'setting-display-delay-val', 'ms');
  bindSlider('setting-timer-duration', 'setting-timer-duration-val', 's');

  // Clue screen
  dom.openBuzzersBtn().addEventListener('click', toggleBuzzers);
  dom.timerBtn().addEventListener('click', startTimer);
  dom.correctBtn().addEventListener('click', handleCorrect);
  dom.wrongBtn().addEventListener('click', handleWrong);
  dom.returnBtn().addEventListener('click', () => {
    showConfirm('Return to board without awarding points?', () => {
      hideConfirm();
      closeClueScreen(true);
    });
  });

  // Show question button
  dom.showQuestionBtn().addEventListener('click', () => {
    if (!state.currentClue) return;
    state.questionRevealed = !state.questionRevealed;
    if (state.questionRevealed) {
      dom.questionReveal().classList.add('visible');
      dom.showQuestionBtn().textContent = 'Hide Answer';
    } else {
      dom.questionReveal().classList.remove('visible');
      dom.showQuestionBtn().textContent = 'Show Answer';
    }
  });

  // Confirm dialog
  dom.confirmYes().addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
  });
  dom.confirmNo().addEventListener('click', hideConfirm);

  // Editor
  dom.editGameBtn().addEventListener('click', openEditor);
  dom.undoBtn().addEventListener('click', undoScores);
  $('gameover-play-again').addEventListener('click', closeGameOver);
  dom.editorDoneBtn().addEventListener('click', () => {
    applyEditorChanges();
    renderBoard();
    closeEditor();
  });
  dom.editorDownloadBtn().addEventListener('click', downloadYAML);
  dom.editorSaveDefaultBtn().addEventListener('click', saveAsDefault);

  // Keyboard
  document.addEventListener('keydown', onKeyDown, true);
}

// ── KEYBOARD HANDLER ───────────────────────────────────────
function onKeyDown(e) {
  const clueOpen = !dom.clueScreen().classList.contains('hidden');

  // Escape — close clue screen / editor / dialogs
  if (e.key === 'Escape') {
    if (!$('confirm-overlay').classList.contains('hidden')) {
      hideConfirm();
      e.preventDefault();
      return;
    }
    if (!$('editor-screen').classList.contains('hidden')) {
      applyEditorChanges();
      renderBoard();
      closeEditor();
      e.preventDefault();
      return;
    }
    if (!$('modal-overlay').classList.contains('hidden')) {
      closeSettings();
      e.preventDefault();
      return;
    }
    if (clueOpen) {
      showConfirm('Return to board without awarding points?', () => {
        hideConfirm();
        closeClueScreen(true);
      });
      e.preventDefault();
      return;
    }
  }

  // Space — toggle buzzers
  if (clueOpen && e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) toggleBuzzers();
    return;
  }

  // Buzz-in keys 1, 2, 3
  if (clueOpen && (e.key === '1' || e.key === '2' || e.key === '3')) {
    e.preventDefault(); // always prevent default for these keys when clue is open
    if (e.repeat) return; // ignore key repeat events

    if (!state.buzzerArmed) return; // don't act when not armed

    const teamIdx = parseInt(e.key) - 1;
    handleBuzzIn(teamIdx);
    return;
  }
}

// ── EDITOR ────────────────────────────────────────────────
function openEditor() {
  renderEditor();
  dom.editorScreen().classList.remove('hidden');
}

function closeEditor() {
  dom.editorScreen().classList.add('hidden');
}

function renderEditor() {
  const body = dom.editorBody();
  body.innerHTML = '';

  const game = state.game;

  // ── Top fields: title + team names ──
  const topSection = document.createElement('div');
  topSection.className = 'editor-top-fields';

  // Title
  const titleGroup = document.createElement('div');
  titleGroup.className = 'editor-field-group editor-title-field';
  titleGroup.innerHTML = `<label>Game Title</label>`;
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'editor-input';
  titleInput.value = game.title || '';
  titleInput.placeholder = 'Game title…';
  titleInput.dataset.field = 'title';
  titleGroup.appendChild(titleInput);
  topSection.appendChild(titleGroup);

  // Team names
  for (let t = 0; t < 3; t++) {
    const tGroup = document.createElement('div');
    tGroup.className = 'editor-field-group';
    tGroup.innerHTML = `<label>Team ${t + 1} Name</label>`;
    const tInput = document.createElement('input');
    tInput.type = 'text';
    tInput.className = 'editor-input';
    tInput.value = state.settings.teamNames[t] || '';
    tInput.placeholder = `Team ${t + 1}`;
    tInput.dataset.teamIdx = t;
    tGroup.appendChild(tInput);
    topSection.appendChild(tGroup);
  }

  body.appendChild(topSection);

  // ── Categories ──
  const catTitle = document.createElement('h3');
  catTitle.className = 'editor-section-title';
  catTitle.textContent = 'Categories';
  body.appendChild(catTitle);

  game.categories.forEach((cat, catIdx) => {
    body.appendChild(buildCategoryCard(cat, catIdx));
  });

  // Add Category button
  const addCatBtn = document.createElement('button');
  addCatBtn.className = 'editor-add-category-btn';
  addCatBtn.textContent = '＋ Add Category';
  addCatBtn.disabled = game.categories.length >= 6;
  addCatBtn.addEventListener('click', () => {
    game.categories.push({ name: 'New Category', clues: [{ points: 100, answer: '', question: '' }] });
    renderEditor();
    // scroll to bottom to reveal new category
    dom.editorBody().scrollTop = dom.editorBody().scrollHeight;
  });
  body.appendChild(addCatBtn);

  // ── Final Challenge ──
  const fcTitle = document.createElement('h3');
  fcTitle.className = 'editor-section-title';
  fcTitle.textContent = 'Final Challenge';
  body.appendChild(fcTitle);

  const fc = game.final_challenge || {};
  const fcSection = document.createElement('div');
  fcSection.className = 'editor-final-section';

  fcSection.appendChild(buildFieldGroup('Category Name', 'text', fc.category || '', 'fc-category', 'e.g. Final Challenge'));
  fcSection.appendChild(buildFieldGroup('Answer (the clue shown to players)', 'textarea', fc.answer || '', 'fc-answer'));
  fcSection.appendChild(buildFieldGroup('Question (the correct response)', 'textarea', fc.question || '', 'fc-question'));

  body.appendChild(fcSection);
}

function buildFieldGroup(labelText, type, value, dataKey, placeholder) {
  const group = document.createElement('div');
  group.className = 'editor-field-group';
  group.innerHTML = `<label>${labelText}</label>`;
  let el;
  if (type === 'textarea') {
    el = document.createElement('textarea');
    el.className = 'editor-input editor-textarea';
    el.rows = 2;
    el.textContent = value;
  } else {
    el = document.createElement('input');
    el.type = type;
    el.className = 'editor-input';
    el.value = value;
    if (placeholder) el.placeholder = placeholder;
  }
  el.dataset.key = dataKey;
  group.appendChild(el);
  return group;
}

function buildCategoryCard(cat, catIdx) {
  const card = document.createElement('div');
  card.className = 'editor-category-card';
  card.dataset.catIdx = catIdx;

  // Category header row: name input + remove button
  const headerRow = document.createElement('div');
  headerRow.className = 'editor-category-header';

  const catLabel = document.createElement('span');
  catLabel.style.cssText = 'font-family:Bangers,cursive;color:var(--gold);font-size:15px;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;';
  catLabel.textContent = `Cat ${catIdx + 1}`;
  headerRow.appendChild(catLabel);

  const catNameInput = document.createElement('input');
  catNameInput.type = 'text';
  catNameInput.className = 'editor-input';
  catNameInput.value = cat.name || '';
  catNameInput.placeholder = 'Category name…';
  catNameInput.dataset.catName = catIdx;
  headerRow.appendChild(catNameInput);

  const removeCatBtn = document.createElement('button');
  removeCatBtn.className = 'editor-remove-cat-btn';
  removeCatBtn.textContent = '✕ Remove';
  removeCatBtn.disabled = state.game.categories.length <= 1;
  removeCatBtn.addEventListener('click', () => {
    state.game.categories.splice(catIdx, 1);
    renderEditor();
  });
  headerRow.appendChild(removeCatBtn);
  card.appendChild(headerRow);

  // Column headers for clue rows
  const clueHeaders = document.createElement('div');
  clueHeaders.className = 'editor-clue-headers';
  clueHeaders.innerHTML = `
    <span>Points</span>
    <span>Answer (shown to players)</span>
    <span>Question (correct response)</span>
    <span style="text-align:center">Verse</span>
    <span></span>
  `;
  card.appendChild(clueHeaders);

  // Clue rows
  cat.clues.forEach((clue, clueIdx) => {
    card.appendChild(buildClueRow(clue, catIdx, clueIdx));
  });

  // Add clue button
  const addClueBtn = document.createElement('button');
  addClueBtn.className = 'editor-add-clue-btn';
  addClueBtn.textContent = '＋ Add Clue';
  addClueBtn.disabled = cat.clues.length >= 5;
  addClueBtn.addEventListener('click', () => {
    // Pick next logical points value
    const used = cat.clues.map(c => c.points);
    const next = [100,200,300,400,500].find(p => !used.includes(p)) || 100;
    cat.clues.push({ points: next, answer: '', question: '' });
    renderEditor();
  });
  card.appendChild(addClueBtn);

  return card;
}

function buildClueRow(clue, catIdx, clueIdx) {
  const row = document.createElement('div');
  row.className = 'editor-clue-row';

  // Points selector
  const pointsSel = document.createElement('select');
  [100, 200, 300, 400, 500].forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (p === clue.points) opt.selected = true;
    pointsSel.appendChild(opt);
  });
  pointsSel.dataset.catIdx = catIdx;
  pointsSel.dataset.clueIdx = clueIdx;
  pointsSel.dataset.field = 'points';
  row.appendChild(pointsSel);

  // Answer textarea
  const answerTA = document.createElement('textarea');
  answerTA.className = 'editor-input editor-textarea';
  answerTA.rows = 2;
  answerTA.value = clue.answer || '';
  answerTA.placeholder = 'Answer text shown to players…';
  answerTA.dataset.catIdx = catIdx;
  answerTA.dataset.clueIdx = clueIdx;
  answerTA.dataset.field = 'answer';
  row.appendChild(answerTA);

  // Question textarea
  const questionTA = document.createElement('textarea');
  questionTA.className = 'editor-input editor-textarea';
  questionTA.rows = 2;
  questionTA.value = clue.question || '';
  questionTA.placeholder = 'Correct question response…';
  questionTA.dataset.catIdx = catIdx;
  questionTA.dataset.clueIdx = clueIdx;
  questionTA.dataset.field = 'question';
  row.appendChild(questionTA);

  // Verse lookup checkbox
  const verseWrap = document.createElement('div');
  verseWrap.className = 'editor-clue-verse';
  const verseCb = document.createElement('input');
  verseCb.type = 'checkbox';
  verseCb.checked = !!clue.verse_lookup;
  verseCb.dataset.catIdx = catIdx;
  verseCb.dataset.clueIdx = clueIdx;
  verseCb.dataset.field = 'verse_lookup';
  const verseLabel = document.createElement('label');
  verseLabel.textContent = 'Verse';
  verseWrap.appendChild(verseCb);
  verseWrap.appendChild(verseLabel);
  row.appendChild(verseWrap);

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'editor-delete-clue-btn';
  delBtn.title = 'Remove this clue';
  delBtn.textContent = '✕';
  delBtn.disabled = state.game.categories[catIdx].clues.length <= 1;
  delBtn.addEventListener('click', () => {
    state.game.categories[catIdx].clues.splice(clueIdx, 1);
    renderEditor();
  });
  row.appendChild(delBtn);

  return row;
}

function applyEditorChanges() {
  const body = dom.editorBody();
  const game = state.game;

  // Title
  const titleInput = body.querySelector('[data-field="title"]');
  if (titleInput) game.title = titleInput.value.trim() || game.title;

  // Team names
  body.querySelectorAll('[data-team-idx]').forEach(el => {
    const i = parseInt(el.dataset.teamIdx);
    state.settings.teamNames[i] = el.value.trim() || `Team ${i + 1}`;
  });

  // Categories — name inputs
  body.querySelectorAll('[data-cat-name]').forEach(el => {
    const i = parseInt(el.dataset.catName);
    if (game.categories[i]) game.categories[i].name = el.value.trim() || game.categories[i].name;
  });

  // Clue fields
  body.querySelectorAll('[data-cat-idx][data-clue-idx][data-field]').forEach(el => {
    const ci = parseInt(el.dataset.catIdx);
    const qi = parseInt(el.dataset.clueIdx);
    const field = el.dataset.field;
    if (!game.categories[ci] || !game.categories[ci].clues[qi]) return;
    const clue = game.categories[ci].clues[qi];
    if (field === 'points') {
      clue.points = parseInt(el.value);
    } else if (field === 'answer') {
      clue.answer = el.value.trim();
    } else if (field === 'question') {
      clue.question = el.value.trim();
    } else if (field === 'verse_lookup') {
      if (el.checked) clue.verse_lookup = true;
      else delete clue.verse_lookup;
    }
  });

  // Final challenge fields
  if (!game.final_challenge) game.final_challenge = {};
  const fcCat = body.querySelector('[data-key="fc-category"]');
  const fcAns = body.querySelector('[data-key="fc-answer"]');
  const fcQst = body.querySelector('[data-key="fc-question"]');
  if (fcCat) game.final_challenge.category = fcCat.value.trim();
  if (fcAns) game.final_challenge.answer = fcAns.value.trim();
  if (fcQst) game.final_challenge.question = fcQst.value.trim();

  // Reset used cells and scores to reflect possibly-changed structure
  state.usedCells = game.categories.map(cat => cat.clues.map(() => false));
  state.scores = [0, 0, 0];
}

function generateYAML(game) {
  const q = s => {
    if (!s) return '""';
    if (/[:#\[\]{},&*?|<>=!%@`]/.test(s) || s.includes('"') || s.startsWith(' ')) {
      return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return s;
  };
  const lines = [];
  lines.push(`title: ${q(game.title)}`);
  lines.push(`teams:`);
  (game.teams || state.settings.teamNames).forEach(t => lines.push(`  - ${q(t)}`));
  lines.push(`categories:`);
  game.categories.forEach(cat => {
    lines.push(`  - name: ${q(cat.name)}`);
    lines.push(`    clues:`);
    cat.clues.forEach(clue => {
      lines.push(`      - points: ${clue.points}`);
      lines.push(`        answer: ${q(clue.answer || '')}`);
      lines.push(`        question: ${q(clue.question || '')}`);
      if (clue.verse_lookup) lines.push(`        verse_lookup: true`);
    });
  });
  if (game.final_challenge) {
    const fc = game.final_challenge;
    lines.push(`final_challenge:`);
    lines.push(`  category: ${q(fc.category || '')}`);
    lines.push(`  answer: ${q(fc.answer || '')}`);
    lines.push(`  question: ${q(fc.question || '')}`);
  }
  return lines.join('\n') + '\n';
}

function downloadYAML() {
  applyEditorChanges(); // sync form → state first
  // Update teams array in game to match current team names
  state.game.teams = [...state.settings.teamNames];
  const text = generateYAML(state.game);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/yaml' }));
  a.download = (state.game.title || 'game').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.yaml';
  a.click();
  URL.revokeObjectURL(a.href);
}


// ── BOOTSTRAP ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
