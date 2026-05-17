/* ============================================================
   Jeopardy Game — game.js
   ============================================================ */

'use strict';

// ── DEFAULT GAME DATA ──────────────────────────────────────
const DEFAULT_GAME = {
  title: "Sunday School Quizardy!",
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
  settings: {
    teamNames: ["Team 1", "Team 2", "Team 3"],
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
};

// Settings inputs (dynamically looked up)
function getSettingsInputs() {
  return {
    teamNames:   [
      $('setting-team-name-0'),
      $('setting-team-name-1'),
      $('setting-team-name-2')
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
  loadGameData(DEFAULT_GAME);
  bindEvents();
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
      <div class="team-points" id="team-points-${i}">${formatScore(state.scores[i])}</div>
    `;
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

function updateScoreboard() {
  state.settings.teamNames.forEach((name, i) => {
    const nameEl = document.getElementById(`team-score-${i}`)?.querySelector('.team-name');
    const pointsEl = document.getElementById(`team-points-${i}`);
    if (nameEl) nameEl.textContent = name;
    if (pointsEl) pointsEl.textContent = formatScore(state.scores[i]);
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
  if (state.verseAwardedTeams.has(teamIdx)) {
    // Un-award
    state.verseAwardedTeams.delete(teamIdx);
    state.scores[teamIdx] -= state.settings.versePoints;
    btn.classList.remove('awarded');
  } else {
    // Award
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
    state.usedCells[catIdx][clueIdx] = true;
    // Dim the cell on the board
    const cells = document.querySelectorAll('.clue-cell');
    cells.forEach(cell => {
      if (Number(cell.dataset.cat) === catIdx && Number(cell.dataset.clue) === clueIdx) {
        cell.classList.add('used');
      }
    });
  }

  stopTimer();
  resetBuzzerState();
  state.currentClue = null;
  state.isFinalChallenge = false;
  state.verseAwardedTeams = new Set();
  dom.versePanel().classList.add('hidden');
  dom.verseIcon().classList.add('hidden');
  dom.clueScreen().classList.remove('final-challenge');
  dom.clueScreen().classList.add('hidden');
  updateScoreboard();
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
}

function disarmBuzzers() {
  state.buzzerArmed = false;
  dom.openBuzzersBtn().textContent = 'OPEN BUZZERS';
  dom.openBuzzersBtn().classList.remove('armed');
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
    const entry = document.createElement('div');
    entry.className = 'buzz-entry' + (pos === state.currentBuzzerPos ? ' leader' : '');
    entry.id = `buzz-entry-${pos}`;
    entry.innerHTML = `
      <span class="buzz-rank">${pos + 1}.</span>
      <span class="buzz-team-name">${escHtml(name)}</span>
      ${pos === state.currentBuzzerPos ? '<span class="buzz-badge">Buzzed In!</span>' : ''}
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

  // Keyboard
  document.addEventListener('keydown', onKeyDown, true);
}

// ── KEYBOARD HANDLER ───────────────────────────────────────
function onKeyDown(e) {
  const clueOpen = !dom.clueScreen().classList.contains('hidden');

  // Escape — close clue screen
  if (e.key === 'Escape') {
    if (!$('confirm-overlay').classList.contains('hidden')) {
      hideConfirm();
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

// ── BOOTSTRAP ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
