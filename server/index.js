import express from 'express';
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { CATEGORIES } from './words.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true },
});

const dist = path.join(__dirname, '..', 'dist');
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));
app.use(express.static(dist));
app.get('*', (_req, res, next) => res.sendFile(path.join(dist, 'index.html'), (e) => e && next()));

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */
const COLORS = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#f97316', '#a3e635', '#e879f9'];
const AVATARS = ['🦊', '🐼', '🐸', '🦄', '🐙', '🐯', '🦉', '🐳', '🐲', '🦖'];
const ANSWERS = ['yes', 'no', 'maybe', 'idk'];
const CAT_IDS = CATEGORIES.map((c) => c.id);
const DEFAULTS = {
  rounds: 2, turnSeconds: 120, maxPlayers: 10,
  categories: ['movies', 'cartoons', 'animals'], customIds: [],
  allowSkip: false, showCategory: true,
};

const rooms = new Map();
const err = (error) => ({ ok: false, error });
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const core = (s) => norm(s).replace(/^(the|a|an) /, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function lev(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function isMatch(guess, word) {
  const g = core(guess), w = core(word);
  if (!g) return false;
  if (g === w || g.replace(/ /g, '') === w.replace(/ /g, '')) return true;
  return w.length >= 6 && lev(g, w) <= 1; // tolerate one typo on longer words
}

function genCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 5 }, () => L[Math.floor(Math.random() * L.length)]).join(''); } while (rooms.has(c));
  return c;
}

function newRoom() {
  return {
    code: genCode(), hostId: null, players: [], phase: 'lobby',
    settings: { ...DEFAULTS }, customSets: [], round: 0, queue: [], turn: null, turnEndsAt: null,
    timer: null, nextTimer: null, chat: [], msgSeq: 0, used: new Set(), log: [], history: [], gameNo: 0,
    results: null, lastActive: Date.now(), cursor: 0, turnCount: 0, roundWinner: null,
  };
}

function say(room, kind, text, extra = {}) {
  const m = { id: ++room.msgSeq, t: Date.now(), kind, text, ...extra };
  room.chat.push(m);
  if (room.chat.length > 300) room.chat.shift();
  return m;
}

/* ------------------------------------------------------------------ */
/* Per-viewer state. A player's own word is NEVER included.            */
/* ------------------------------------------------------------------ */
function viewFor(room, vid) {
  const me = room.players.find((p) => p.id === vid);
  const reveal = room.phase === 'roundEnd' || room.phase === 'results';
  const hideOwn = room.phase === 'playing' && me && me.word && !me.solved;
  const re = hideOwn ? new RegExp(esc(me.word), 'gi') : null;
  const showCat = room.settings.showCategory;
  return {
    code: room.code, you: vid, hostId: room.hostId, phase: room.phase, settings: room.settings,
    cats: CATEGORIES.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, count: c.words.length })),
    customSummary: room.customSets.map((s) => ({ id: s.id, name: s.name, count: s.words.length })),
    round: room.round, now: Date.now(),
    players: room.players.map((p) => {
      const o = { id: p.id, name: p.name, color: p.color, avatar: p.avatar, connected: p.connected, score: p.score, solved: p.solved, hasWord: !!p.word };
      if (p.word && (p.id !== vid || p.solved || reveal)) { o.word = p.word; o.cat = p.cat; }
      else if (p.word && showCat) o.cat = p.cat;
      return o;
    }),
    turn: room.turn && { playerId: room.turn.playerId, step: room.turn.step, qId: room.turn.qId, locked: room.turn.locked, endsAt: room.turnEndsAt, number: room.turnCount },
    chat: room.chat.slice(-150).map((m) => (re && m.text ? { ...m, text: m.text.replace(re, '█'.repeat(Math.min(me.word.length, 8))) } : m)),
    history: room.history, results: room.results, roundWinner: room.roundWinner,
  };
}

function broadcast(room) {
  room.lastActive = Date.now();
  for (const p of room.players) if (p.connected && p.socketId) io.to(p.socketId).emit('state', viewFor(room, p.id));
}

/* ------------------------------------------------------------------ */
/* Words & settings                                                    */
/* ------------------------------------------------------------------ */
function buildPool(room) {
  const seen = new Set(); const pool = [];
  const add = (text, cat) => { const k = norm(text); if (k && !seen.has(k)) { seen.add(k); pool.push({ text, cat }); } };
  for (const id of room.settings.categories) { const c = CATEGORIES.find((x) => x.id === id); c?.words.forEach((t) => add(t, c.name)); }
  for (const id of room.settings.customIds) { const s = room.customSets.find((x) => x.id === id); s?.words.forEach((t) => add(t, s.name)); }
  return pool;
}

function applySettings(room, s = {}, sets) {
  if (Array.isArray(sets)) {
    room.customSets = sets.slice(0, 20).map((x) => ({
      id: clean(x?.id, 40) || crypto.randomUUID(),
      name: clean(x?.name, 40) || 'Custom',
      words: [...new Set((Array.isArray(x?.words) ? x.words : []).map((t) => clean(t, 60)).filter(Boolean))].slice(0, 500),
    }));
  }
  const cur = room.settings;
  const rounds = Math.round(Number(s.rounds));
  const ts = Math.round(Number(s.turnSeconds));
  const mp = Math.round(Number(s.maxPlayers));
  room.settings = {
    rounds: rounds >= 1 && rounds <= 10 ? rounds : cur.rounds,
    turnSeconds: ts === 0 || (ts >= 15 && ts <= 600) ? ts : cur.turnSeconds,
    maxPlayers: mp >= Math.max(2, room.players.length) && mp <= 10 ? mp : cur.maxPlayers,
    categories: Array.isArray(s.categories) ? s.categories.filter((c) => CAT_IDS.includes(c)) : cur.categories,
    customIds: (Array.isArray(s.customIds) ? s.customIds : cur.customIds).filter((id) => room.customSets.some((x) => x.id === id)),
    allowSkip: typeof s.allowSkip === 'boolean' ? s.allowSkip : cur.allowSkip,
    showCategory: typeof s.showCategory === 'boolean' ? s.showCategory : cur.showCategory,
  };
}

/* ------------------------------------------------------------------ */
/* Game flow                                                           */
/* ------------------------------------------------------------------ */
function resetGame(room) {
  clearTimeout(room.timer); clearTimeout(room.nextTimer);
  room.turn = null; room.turnEndsAt = null; room.queue = []; room.round = 0; room.log = []; room.cursor = 0; room.turnCount = 0; room.roundWinner = null;
  room.used.clear(); room.results = null; room.chat = [];
  for (const p of room.players) Object.assign(p, { score: 0, word: null, cat: null, solved: false, stats: { solved: 0, questions: 0, wrong: 0, skips: 0 } });
}

const MAX_LOOPS = 15; // safety net: a round with no winner after 15 full loops ends

function startRound(room) {
  const pool = buildPool(room);
  let fresh = pool.filter((w) => !room.used.has(norm(w.text)));
  if (fresh.length < room.players.length) { room.used.clear(); fresh = pool; }
  shuffle(fresh);
  room.players.forEach((p, i) => { const w = fresh[i]; p.word = w.text; p.cat = w.cat; p.solved = false; p.turns = 0; room.used.add(norm(w.text)); });
  room.round++; room.phase = 'playing'; room.roundWinner = null; room.turnCount = 0;
  room.cursor = (room.round - 1) % room.players.length;
  say(room, 'system', `Round ${room.round} of ${room.settings.rounds} — first to guess their own identity wins!`, { fx: 'round' });
  nextTurn(room);
}

/* One turn = ask (1 question) -> answer (everyone else) -> guess (1 guess). */
function setStepTimer(room) {
  clearTimeout(room.timer); room.turnEndsAt = null;
  const s = room.settings.turnSeconds, t = room.turn;
  if (!t || s <= 0) return;
  room.turnEndsAt = Date.now() + s * 1000;
  room.timer = setTimeout(() => onTimeout(room, t), s * 1000);
}

function onTimeout(room, t) {
  if (room.turn !== t || t.locked) return;
  if (t.step === 'answer') return toGuess(room); // missing answers just count as nothing
  const p = room.players.find((x) => x.id === t.playerId);
  finishTurn(room, `⏰ Time's up for ${p?.name} — turn passes`, 'wrong', 1500);
}

function nextTurn(room) {
  clearTimeout(room.timer); clearTimeout(room.nextTimer);
  room.turn = null; room.turnEndsAt = null;
  if (room.phase !== 'playing') return;
  const n = room.players.length;
  if (room.turnCount >= n * MAX_LOOPS) return endRound(room, null);
  let p = null;
  for (let k = 0; k < n; k++) {
    const idx = (room.cursor + k) % n;
    if (room.players[idx].connected) { p = room.players[idx]; room.cursor = (idx + 1) % n; break; }
  }
  if (!p) return endRound(room, null);
  room.turnCount++; p.turns++;
  room.turn = { playerId: p.id, step: 'ask', qId: null, locked: false };
  setStepTimer(room);
  say(room, 'system', `${p.name}'s turn — ask ONE question`, { fx: 'turn', playerId: p.id });
  broadcast(room);
}

function toGuess(room) {
  const t = room.turn;
  if (!t || t.locked || t.step === 'guess') return;
  t.step = 'guess'; setStepTimer(room);
  const p = room.players.find((x) => x.id === t.playerId);
  say(room, 'system', `🎯 ${p?.name}, make your ONE guess!`, { fx: 'turn', playerId: t.playerId });
  broadcast(room);
}

function checkAnswers(room) { // everyone else answered (or left) -> guessing phase
  const t = room.turn;
  if (!t || t.locked || t.step !== 'answer') return;
  const m = room.chat.find((x) => x.id === t.qId);
  const others = room.players.filter((p) => p.connected && p.id !== t.playerId);
  if (!m || others.every((o) => m.answers[o.id])) toGuess(room);
}

function finishTurn(room, text, fx, delay) {
  if (!room.turn || room.turn.locked) return;
  room.turn.locked = true;
  clearTimeout(room.timer); room.turnEndsAt = null;
  if (text) say(room, 'system', text, { fx, playerId: room.turn.playerId });
  broadcast(room);
  clearTimeout(room.nextTimer);
  room.nextTimer = setTimeout(() => nextTurn(room), delay);
}

function winRound(room, p) {
  clearTimeout(room.timer);
  const pts = Math.max(1, 11 - p.turns); // fewer turns taken = more points
  p.score += pts; p.solved = true; p.stats.solved++;
  room.roundWinner = { id: p.id, name: p.name, word: p.word, pts };
  say(room, 'system', `🎉 ${p.name} guessed it: ${p.word} (+${pts})`, { fx: 'correct', playerId: p.id });
  endRound(room, p);
}

function endRound(room, winner) {
  clearTimeout(room.timer); clearTimeout(room.nextTimer);
  room.phase = 'roundEnd'; room.turn = null; room.turnEndsAt = null;
  for (const p of room.players) room.log.push({ round: room.round, name: p.name, avatar: p.avatar, word: p.word, solved: p.solved });
  const others = room.players.filter((p) => !p.solved).map((p) => `${p.name} = ${p.word}`).join(' · ');
  say(room, 'system', winner ? `🏆 ${winner.name} wins round ${room.round}! The others were: ${others}` : `Round ${room.round} ended with no winner. ${others}`, winner ? {} : { fx: 'roundend' });
  broadcast(room);
  const last = room.round >= room.settings.rounds;
  room.nextTimer = setTimeout(() => (last ? endGame(room) : startRound(room)), 8000);
}

function endGame(room) {
  clearTimeout(room.timer); clearTimeout(room.nextTimer);
  room.phase = 'results'; room.turn = null;
  const standings = [...room.players].sort((a, b) => b.score - a.score).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, score: p.score, solved: p.stats.solved }));
  const top = (key, title, emoji, desc) => {
    const best = [...room.players].sort((a, b) => b.stats[key] - a.stats[key])[0];
    return best && best.stats[key] > 0 ? { title, emoji, desc, name: best.name, avatar: best.avatar, value: best.stats[key] } : null;
  };
  const awards = [
    top('solved', 'Mind Reader', '🔮', 'identities guessed'),
    top('questions', 'Curious Cat', '🐱', 'questions asked'),
    top('wrong', 'Wild Guesser', '🎯', 'wrong guesses'),
    room.settings.allowSkip ? top('skips', 'Skip Master', '⏭️', 'skips') : null,
  ].filter(Boolean);
  room.results = { standings, awards, log: room.log };
  room.history.push({ n: room.gameNo, at: Date.now(), winner: standings[0]?.name, standings: standings.map((s) => ({ name: s.name, score: s.score })) });
  if (room.history.length > 10) room.history.shift();
  say(room, 'system', 'Game over!', { fx: 'round' });
  broadcast(room);
}

/* ------------------------------------------------------------------ */
/* Players / membership                                                */
/* ------------------------------------------------------------------ */
function removePlayer(room, id) {
  const i = room.players.findIndex((p) => p.id === id);
  if (i < 0) return;
  const [p] = room.players.splice(i, 1);
  clearTimeout(p.cleanup);
  if (p.socketId) { const s = io.sockets.sockets.get(p.socketId); if (s) { s.leave(room.code); if (s.data.pid === id) s.data = {}; } }
  if (i < room.cursor) room.cursor--;
  if (!room.players.length) { clearTimeout(room.timer); clearTimeout(room.nextTimer); rooms.delete(room.code); return; }
  if (room.hostId === id) room.hostId = (room.players.find((x) => x.connected) || room.players[0]).id;
  say(room, 'system', `${p.name} left the game`);
  if (room.phase === 'playing' || room.phase === 'roundEnd') {
    if (room.players.length < 2) return endGame(room);
    if (room.phase === 'playing' && room.turn?.playerId === id) { nextTurn(room); return; }
    checkAnswers(room);
  }
  broadcast(room);
}

function attach(socket, room, p) {
  clearTimeout(p.cleanup);
  p.socketId = socket.id; p.connected = true;
  socket.data = { code: room.code, pid: p.id };
  socket.join(room.code);
}

function leaveCurrent(socket) {
  const room = rooms.get(socket.data?.code);
  if (room) removePlayer(room, socket.data.pid);
  socket.data = {};
}

function addPlayer(room, name, id) {
  let base = name, n = 2;
  while (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) name = `${base} ${n++}`;
  const ci = COLORS.findIndex((c) => !room.players.some((p) => p.color === c));
  const p = {
    id, name, color: COLORS[ci < 0 ? room.players.length % 10 : ci], avatar: AVATARS[ci < 0 ? room.players.length % 10 : ci],
    socketId: null, connected: false, score: 0, word: null, cat: null, solved: false, stats: { solved: 0, questions: 0, wrong: 0, skips: 0 },
  };
  room.players.push(p);
  return p;
}

/* ------------------------------------------------------------------ */
/* Socket handlers                                                     */
/* ------------------------------------------------------------------ */
io.on('connection', (socket) => {
  socket.data = {};
  const ctx = () => {
    const room = rooms.get(socket.data.code);
    const player = room?.players.find((p) => p.id === socket.data.pid);
    return room && player ? { room, player } : {};
  };
  const handle = (ev, fn) => socket.on(ev, (data, ack) => {
    const done = typeof ack === 'function' ? ack : () => {};
    try { done(fn(data || {}) ?? { ok: true }); } catch (e) { console.error(ev, e); done(err('Server error')); }
  });
  const hostCtx = () => { const c = ctx(); return c.room && c.room.hostId === c.player.id ? c : {}; };

  handle('room:create', ({ name, playerId }) => {
    name = clean(name, 16);
    if (!name) return err('Please enter a nickname');
    leaveCurrent(socket);
    const room = newRoom(); rooms.set(room.code, room);
    const p = addPlayer(room, name, clean(playerId, 64) || crypto.randomUUID());
    room.hostId = p.id;
    attach(socket, room, p);
    say(room, 'system', `${p.name} created the room`);
    broadcast(room);
    return { ok: true, code: room.code };
  });

  handle('room:join', ({ code, name, playerId }) => {
    const room = rooms.get(String(code || '').toUpperCase().trim());
    if (!room) return err('Room not found — check the code');
    const pid = clean(playerId, 64) || crypto.randomUUID();
    const existing = room.players.find((p) => p.id === pid);
    if (socket.data.code && (socket.data.code !== room.code || socket.data.pid !== pid)) leaveCurrent(socket);
    if (existing) { attach(socket, room, existing); broadcast(room); return { ok: true, code: room.code }; }
    name = clean(name, 16);
    if (!name) return err('Please enter a nickname');
    if (room.phase !== 'lobby') return err('That game has already started');
    if (room.players.length >= room.settings.maxPlayers) return err('Room is full');
    const p = addPlayer(room, name, pid);
    attach(socket, room, p);
    say(room, 'system', `${p.name} joined`, { fx: 'join' });
    broadcast(room);
    return { ok: true, code: room.code };
  });

  handle('room:leave', () => { leaveCurrent(socket); });

  handle('room:kick', ({ id }) => {
    const { room, player } = hostCtx();
    if (!room) return err('Only the host can do that');
    const target = room.players.find((p) => p.id === id);
    if (!target || target.id === player.id) return err('Cannot remove that player');
    if (target.socketId) io.to(target.socketId).emit('kicked');
    removePlayer(room, id);
  });

  handle('settings:update', ({ settings, customSets }) => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'lobby') return err('Not allowed');
    applySettings(room, settings, customSets);
    broadcast(room);
  });

  handle('game:start', () => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'lobby') return err('Not allowed');
    for (const p of [...room.players]) if (!p.connected) removePlayer(room, p.id);
    if (room.players.length < 2) return err('You need at least 2 players');
    const pool = buildPool(room);
    if (pool.length < room.players.length) return err(`Select more words — need at least ${room.players.length}, have ${pool.length}`);
    resetGame(room); room.gameNo++;
    startRound(room);
  });

  const mineTurn = (room, player, step) => room?.phase === 'playing' && room.turn && !room.turn.locked && room.turn.playerId === player.id && room.turn.step === step;
  const whyNot = (room, player) => (room.phase !== 'playing' || !room.turn || room.turn.locked ? 'Wait for the next turn'
    : room.turn.playerId !== player.id ? "It's not your turn" : 'That step is already done for this turn');

  handle('chat:send', ({ text }) => {
    const { room, player } = ctx();
    text = clean(text, 200);
    if (!room || !text) return err('Empty');
    if (room.phase === 'playing' && room.turn?.playerId === player.id) return err('You can only ask your one question on your turn');
    say(room, 'chat', text, { playerId: player.id });
    broadcast(room);
  });

  handle('game:ask', ({ text }) => {
    const { room, player } = ctx();
    if (!room) return err('Not in a room');
    if (!mineTurn(room, player, 'ask')) return err(whyNot(room, player));
    text = clean(text, 200);
    if (!text) return err('Type a question first');
    const m = say(room, 'question', text, { playerId: player.id, answers: {} });
    room.turn.step = 'answer'; room.turn.qId = m.id; player.stats.questions++;
    setStepTimer(room);
    broadcast(room);
    checkAnswers(room); // moves on immediately if nobody else is connected
  });

  handle('game:answer', ({ msgId, answer }) => {
    const { room, player } = ctx();
    const t = room?.turn;
    if (!room || room.phase !== 'playing' || !t || t.locked || t.step !== 'answer' || t.qId !== msgId) return err('Not the time to answer');
    if (t.playerId === player.id) return err("You can't answer your own question");
    if (!ANSWERS.includes(answer)) return err('Invalid answer');
    const m = room.chat.find((x) => x.id === msgId);
    if (!m) return err('Question not found');
    m.answers[player.id] = answer;
    broadcast(room);
    checkAnswers(room); // last answer in -> guessing phase starts automatically
  });

  handle('game:guess', ({ text }) => {
    const { room, player } = ctx();
    if (!room) return err('Not in a room');
    if (!mineTurn(room, player, 'guess')) return err(room.turn?.playerId === player.id && room.turn.step !== 'guess' ? 'Ask your question and wait for answers first' : whyNot(room, player));
    text = clean(text, 80);
    if (!text) return err('Type your guess first');
    if (isMatch(text, player.word)) { winRound(room, player); return { ok: true, correct: true }; }
    player.stats.wrong++;
    say(room, 'guess', text, { playerId: player.id, fx: 'wrong' });
    finishTurn(room, null, '', 1200); // one guess only: wrong = next player
    return { ok: true, correct: false };
  });

  handle('game:skip', () => {
    const { room, player } = ctx();
    if (!room) return err('Not in a room');
    if (!room.settings.allowSkip) return err('Skipping is disabled in this game');
    const t = room.turn;
    if (room.phase !== 'playing' || !t || t.locked || t.playerId !== player.id) return err("It's not your turn");
    player.stats.skips++;
    if (t.step === 'ask') { say(room, 'system', `⏭️ ${player.name} skipped their question`); toGuess(room); }
    else if (t.step === 'guess') finishTurn(room, `⏭️ ${player.name} skipped their guess — next player!`, '', 1200);
    else return err('Wait for the answers first');
  });

  handle('game:next', () => { // host moderation only, e.g. an AFK player
    const { room, player } = hostCtx();
    if (!room || room.phase !== 'playing' || !room.turn || room.turn.locked) return err('Not allowed');
    if (room.turn.playerId === player.id) return err("You can't pass your own turn");
    finishTurn(room, 'The host passed the turn', '', 600);
  });

  handle('game:continue', () => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'roundEnd') return err('Not allowed');
    clearTimeout(room.nextTimer);
    room.round >= room.settings.rounds ? endGame(room) : startRound(room);
  });

  handle('game:rematch', () => {
    const { room } = hostCtx();
    if (!room || room.phase !== 'results') return err('Not allowed');
    resetGame(room); room.phase = 'lobby';
    broadcast(room);
  });

  socket.on('disconnect', () => {
    const { room, player } = ctx();
    if (!room || player.socketId !== socket.id) return;
    player.connected = false; player.socketId = null;
    if (room.phase === 'playing' && room.turn?.playerId === player.id && !room.turn.locked) finishTurn(room, `${player.name} disconnected — turn skipped`, '', 800);
    else checkAnswers(room);
    setTimeout(() => { // migrate host if they stay away
      if (!player.connected && room.hostId === player.id && rooms.has(room.code)) {
        const n = room.players.find((x) => x.connected);
        if (n) { room.hostId = n.id; broadcast(room); }
      }
    }, 15000);
    player.cleanup = setTimeout(() => removePlayer(room, player.id), 60000);
    broadcast(room);
  });
});

setInterval(() => { // drop abandoned rooms
  for (const [code, r] of rooms) if (Date.now() - r.lastActive > 30 * 60 * 1000 && !r.players.some((p) => p.connected)) rooms.delete(code);
}, 5 * 60 * 1000);

server.listen(PORT, () => console.log(`Who Am I? server on http://localhost:${PORT}`));
