'use strict';
(() => {
// ============================================================ helpers
const $ = id => document.getElementById(id);
const R = Math.random;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const wrapA = a => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const pick = (a, r = R) => a[Math.floor(r() * a.length)];
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fmt = n => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const shadeCache = {};
function shade(hex, f) {
  const k = hex + f; if (shadeCache[k]) return shadeCache[k];
  const n = parseInt(hex.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  if (f < 1) { r *= f; g *= f; b *= f; } else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
  return shadeCache[k] = `rgb(${r | 0},${g | 0},${b | 0})`;
}

// ============================================================ constants
const T = 64, P = 10, NB = 8, MW = NB * P + 2, NN = NB + 1;
const ROAD = 0, WALK = 1, BLD = 2, GRASS = 3, WATER = 4, RAMP = 5, PLAZA = 6, OBBY = 7, BLOCKG = 8, CHECK = 9;
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
const RX = d => DX[(d + 1) % 4], RY = d => DY[(d + 1) % 4];

const CT = {
  sedan:   { w: 46, h: 22, max: 330, acc: 300, turn: 2.7, name: 'Familiebil' },
  sport:   { w: 48, h: 22, max: 470, acc: 440, turn: 3.1, name: 'Sportsbil' },
  van:     { w: 56, h: 26, max: 270, acc: 230, turn: 2.2, name: 'Varebil' },
  taxi:    { w: 46, h: 22, max: 340, acc: 310, turn: 2.7, name: 'Taxi' },
  police:  { w: 48, h: 23, max: 390, acc: 380, turn: 2.9, name: 'Politibil' },
  monster: { w: 54, h: 34, max: 410, acc: 400, turn: 2.8, name: 'Monstertruck' },
  rocket:  { w: 52, h: 22, max: 620, acc: 600, turn: 3.3, name: 'Rakettbil' },
  gold:    { w: 50, h: 23, max: 560, acc: 540, turn: 3.2, name: 'Gullbilen' },
  bandit:  { w: 46, h: 22, max: 300, acc: 300, turn: 2.7, name: 'Bananabil' },
};
const NPC_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#8d99ae', '#f1f1f1', '#222831', '#6a4c93', '#06d6a0', '#ef476f', '#118ab2', '#c0c0c0'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR = ['#2b1d0e', '#5a3825', '#d6b370', '#1a1a1a', '#a0522d', '#e8d18a'];
const PANTS = ['#2d3a4a', '#3b3b3b', '#5b4636', '#1d3557'];

const GREET = ['Hei Markus! 👋', 'Er ikke det Markus?!', 'Markus! Du er jo kjempegod i Fortnite!', 'Kan du lære meg å bygge i Minecraft?', 'Jeg så deg på Roblox i går! 🔥', 'Kul caps, Markus!', 'GTA 7 er MYE bedre enn GTA 6!', 'Markus for ordfører! 🎩', 'Wow, ekte Markus! Autograf?', 'Markus, du er en legende!', 'Jeg har hørt du er pro gamer!', 'Fin dag i Markus City, ikke sant?', 'Mamma, se! Det er Markus!'];
const CHEER = ['Wow, for en dans! 🕺', 'Sykt bra moves, Markus!', 'Lær meg den dansen!', 'Haha, du er så kul!', 'Legendarisk dans! 🔥'];
const LEND = ['Hæ?! Ok da, lån den, Markus!', 'Ta godt vare på bilen min!', 'Bare lån den! Du kjører sikkert bra.', 'Kjør pent, da!'];
const BUMP = ['TUUUT! 📯', 'Hei! Kjør pent!', 'Bilen min! 😩', 'Oi oi oi!', 'Se deg for, Markus!'];
const DODGE = ['Hoppsann!', 'Oi!', 'Se deg for!', 'Huff da!', 'Wæ!'];
const SIGNS = ['MARKUS ER PRO', 'PRO GAMER', 'BLOKK & BYGG', 'MARKUS FM', 'GTA 7', 'OBBY-BUTIKKEN', 'SPILL-BUTIKKEN', 'BYGGMESTER MARKUS', 'HOTELL MARKUS', 'KJEMPE-BURGER', 'DIAMANT-BANKEN', 'MARKUS TOWER', 'PIXEL-KINO', 'LEVEL UP GYM', 'GAMER-CAFÉ'];
const PAL = [['#c9a27e', '#e8c9a0'], ['#9fb3c8', '#cfdce9'], ['#d98e73', '#f0b49a'], ['#a3b18a', '#c8d5b0'], ['#b8a9c9', '#ddd0ec'], ['#e0c068', '#f3dc94'], ['#8fa3a8', '#bcd0d4'], ['#c46a6a', '#e39a9a'], ['#7c9cbf', '#a9c4e0'], ['#d6d6d6', '#f0f0f0']];

// ============================================================ save
const SAVE_KEY = 'gta7-markus-v1';
const DEFAULT_SAVE = { money: 100, done: {}, owned: ['sedan'], coins: [], intro: false, music: true, sound: true };
let save = JSON.parse(JSON.stringify(DEFAULT_SAVE));
let hasSave = false;
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) { save = Object.assign(save, s); hasSave = true; } } catch (e) { /* no storage */ }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* no storage */ } }

// ============================================================ world generation
const map = new Uint8Array(MW * MW), tvar = new Uint8Array(MW * MW);
const wr = mulberry32(1911);
for (let i = 0; i < tvar.length; i++) tvar[i] = wr() * 256 | 0;
function getT(x, y) { return (x < 0 || y < 0 || x >= MW || y >= MW) ? WATER : map[y * MW + x]; }
function setT(x, y, v) { if (x >= 0 && y >= 0 && x < MW && y < MW) map[y * MW + x] = v; }
function fillT(x, y, w, h, v) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setT(i, j, v); }
const solidT = t => t === BLD || t === WATER;
const solidAt = (px, py) => solidT(getT(Math.floor(px / T), Math.floor(py / T)));
const tileAt = (px, py) => getT(Math.floor(px / T), Math.floor(py / T));

for (let y = 0; y < MW; y++) for (let x = 0; x < MW; x++) {
  let t;
  if (x % P < 2 || y % P < 2) t = ROAD;
  else if (x % P === 2 || x % P === 9 || y % P === 2 || y % P === 9) t = WALK;
  else t = GRASS;
  map[y * MW + x] = t;
}

const blds = [], trees = [], places = {};
function addBld(tx, ty, tw, th, k, wall, roof, sign, signColor, extra) {
  fillT(tx, ty, tw, th, BLD);
  const b = Object.assign({ x: tx * T, y: ty * T, w: tw * T, h: th * T, k, wall, roof, sign: sign || null, signColor: signColor || '#fff', det: [] }, extra || {});
  if (!sign) { const n = 1 + Math.floor(wr() * 3); for (let i = 0; i < n; i++) b.det.push([0.1 + wr() * 0.6, 0.1 + wr() * 0.6, 0.08 + wr() * 0.1]); }
  b.wN = shade(wall, 0.62); b.wS = shade(wall, 0.95); b.wW = shade(wall, 0.75); b.wE = shade(wall, 0.85);
  b.edge = shade(roof, 0.8); b.detC = shade(roof, 0.88);
  blds.push(b); return b;
}
function addTree(x, y, r) { trees.push({ x, y, r: r || 18 + wr() * 10, k: 0.12 + wr() * 0.06, c: pick(['#2e7d32', '#388e3c', '#43a047', '#1b5e20'], wr) }); }
function sb(ox, oy, name, sign, wall, roof, k, ground, signColor, bh = 3) {
  fillT(ox, oy, 6, 6, ground);
  const b = addBld(ox, oy, 6, bh, k, wall, roof, sign, signColor);
  places[name] = { x: (ox + 3) * T, y: (oy + bh + 1.6) * T };
  return b;
}
const SPECIAL = {
  '3,3': (ox, oy) => { // Markus' hus
    fillT(ox, oy, 6, 6, GRASS);
    addBld(ox, oy, 4, 3, 0.12, '#e9c46a', '#c1440e', "MARKUS' HUS", '#fff');
    fillT(ox + 4, oy, 2, 6, PLAZA);
    places.home = { x: (ox + 2) * T, y: (oy + 4.4) * T };
    places.homeCar = { x: (ox + 5) * T, y: (oy + 1.5) * T, a: Math.PI / 2 };
    places.start = { x: (ox + 2) * T, y: (oy + 3.5) * T };
    addTree((ox + 0.6) * T, (oy + 5.4) * T); addTree((ox + 3.5) * T, (oy + 5.5) * T);
  },
  '4,3': (ox, oy) => { sb(ox, oy, 'cityhall', 'RÅDHUS', '#e8e8e8', '#b0bec5', 0.32, PLAZA, '#c9a227'); addTree((ox + 0.5) * T, (oy + 5.5) * T); addTree((ox + 5.5) * T, (oy + 5.5) * T); },
  '1,2': (ox, oy) => sb(ox, oy, 'pizza', "MARKUS' PIZZA", '#c0392b', '#e74c3c', 0.14, PLAZA, '#ffe66d'),
  '2,2': (ox, oy) => { sb(ox, oy, 'school', 'SKOLEN', '#d35400', '#e67e22', 0.16, GRASS, '#fff', 4); addTree((ox + 1) * T, (oy + 5.3) * T); addTree((ox + 5) * T, (oy + 5.3) * T); },
  '5,2': (ox, oy) => sb(ox, oy, 'taxi', 'TAXI', '#f1c40f', '#f7dc6f', 0.18, PLAZA, '#222'),
  '3,5': (ox, oy) => {
    sb(ox, oy, 'garage', "MARKUS' GARASJE", '#34495e', '#5d6d7e', 0.12, PLAZA, '#00e5ff');
    places.lakk = { x: (ox + 1.3) * T, y: (oy + 4.4) * T };
    places.shop = { x: (ox + 4.7) * T, y: (oy + 4.4) * T };
    places.shopCar = { x: (ox + 3) * T, y: (oy + 5.5) * T, a: 0 };
  },
  '5,5': (ox, oy) => { sb(ox, oy, 'police', 'POLITI', '#1e3a8a', '#3b5bdb', 0.2, PLAZA, '#fff'); places.policeCar = { x: (ox + 1.2) * T, y: (oy + 4.6) * T, a: 0 }; },
  '1,4': (ox, oy) => sb(ox, oy, 'icecream', 'IS-KIOSK', '#f78fb3', '#f8a5c2', 0.1, PLAZA, '#fff'),
  '6,1': (ox, oy) => {
    fillT(ox, oy, 6, 6, CHECK); addBld(ox, oy, 6, 2, 0.1, '#222222', '#444444', 'RACERBANE', '#ff3b3b');
    places.race = { x: (ox + 3) * T, y: (oy + 4) * T }; places.raceCar = { x: (ox + 1) * T, y: (oy + 5.3) * T, a: 0 };
  },
  '6,6': (ox, oy) => {
    fillT(ox, oy, 6, 6, OBBY);
    [[1, 1], [4, 1], [1, 4], [4, 4], [2, 0], [0, 3], [5, 2], [3, 5]].forEach(([x, y]) => setT(ox + x, oy + y, RAMP));
    places.obby = { x: (ox + 3) * T, y: (oy + 3) * T };
  },
  '1,6': (ox, oy) => {
    fillT(ox, oy, 6, 6, BLOCKG);
    addBld(ox, oy, 2, 2, 0.08, '#7b5230', '#5fa83a', null, null, { pix: true });
    addBld(ox + 4, oy, 2, 2, 0.12, '#7a7a7a', '#9e9e9e', null, null, { pix: true });
    addBld(ox + 4, oy + 4, 2, 2, 0.09, '#7b5230', '#5fa83a', null, null, { pix: true });
    addBld(ox + 2, oy + 2, 1, 1, 0.06, '#8a5a2b', '#c4a35a', null, null, { pix: true });
    places.mine = { x: (ox + 1.5) * T, y: (oy + 4.5) * T };
  },
  '6,4': (ox, oy) => { fillT(ox, oy, 6, 6, PLAZA); addBld(ox, oy, 6, 4, 0.2, '#2d6a4f', '#52b788', 'MARKUS ARENA', '#fff'); },
};
const downtown = (bx, by) => bx >= 2 && bx <= 5 && by >= 2 && by <= 5;
const parkRamps = [];
for (let by = 0; by < NB; by++) for (let bx = 0; bx < NB; bx++) {
  const ox = bx * P + 3, oy = by * P + 3, key = bx + ',' + by;
  if (SPECIAL[key]) { SPECIAL[key](ox, oy); continue; }
  const down = downtown(bx, by), r = wr();
  if (!down && r < 0.18) { // park
    fillT(ox, oy, 6, 6, GRASS);
    const pond = wr() < 0.5; if (pond) fillT(ox + 2, oy + 2, 2, 2, WATER);
    for (let i = 0; i < 9; i++) {
      const x = ox + wr() * 6, y = oy + wr() * 6;
      if (pond && x > ox + 1.6 && x < ox + 4.4 && y > oy + 1.6 && y < oy + 4.4) continue;
      addTree(x * T, y * T);
    }
    if (wr() < 0.6) { const rx = ox + (wr() < 0.5 ? 0 : 5), ry = oy + 1 + Math.floor(wr() * 4); setT(rx, ry, RAMP); parkRamps.push([rx, ry]); }
    continue;
  }
  fillT(ox, oy, 6, 6, down ? PLAZA : GRASS);
  if (r < (down ? 0.38 : 0.22)) {
    const inset = wr() < 0.5 ? 0 : 1, pal = pick(PAL, wr);
    addBld(ox + inset, oy + inset, 6 - 2 * inset, 6 - 2 * inset, down ? 0.36 + wr() * 0.18 : 0.15 + wr() * 0.1, pal[0], pal[1], wr() < 0.5 ? pick(SIGNS, wr) : null, pick(['#fff', '#ffd60a', '#7dff6a', '#4cc9f0'], wr), { heli: down && wr() < 0.5 });
    continue;
  }
  for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) {
    const qx0 = ox + qx * 3, qy0 = oy + qy * 3;
    if (wr() < 0.13) { addTree((qx0 + 1.5) * T, (qy0 + 1.5) * T, 26); continue; }
    const w = wr() < 0.65 ? 3 : 2, h = wr() < 0.65 ? 3 : 2;
    const x = qx === 0 ? qx0 : qx0 + 3 - w, y = qy === 0 ? qy0 : qy0 + 3 - h;
    const pal = pick(PAL, wr);
    addBld(x, y, w, h, down ? 0.2 + wr() * 0.25 : 0.08 + wr() * 0.14, pal[0], pal[1], (w * h >= 6 && wr() < 0.3) ? pick(SIGNS, wr) : null, pick(['#fff', '#ffd60a', '#7dff6a', '#4cc9f0'], wr));
  }
}

// gold coins hidden around the city
const COINS = [];
for (let tries = 0; COINS.length < 25 && tries < 20000; tries++) {
  const x = 2 + Math.floor(wr() * (MW - 4)), y = 2 + Math.floor(wr() * (MW - 4));
  const t = getT(x, y);
  if (t !== GRASS && t !== PLAZA && t !== WALK && t !== OBBY && t !== BLOCKG) continue;
  const px = (x + 0.5) * T, py = (y + 0.5) * T;
  if (COINS.some(c => dist(c.x, c.y, px, py) < 600)) continue;
  COINS.push({ x: px, y: py });
}

// road graph
const validNode = (i, j) => i >= 0 && j >= 0 && i < NN && j < NN;
const nodePos = (i, j) => ({ x: (i * P + 1) * T, y: (j * P + 1) * T });
const nearestNode = (x, y) => ({ i: clamp(Math.round((x / T - 1) / P), 0, NB), j: clamp(Math.round((y / T - 1) / P), 0, NB) });

// sidewalk ring around block
function ringPt(bx, by, p) {
  const L = (bx * P + 2.5) * T, Tp = (by * P + 2.5) * T, S = 7 * T, Q = 4 * S;
  p = ((p % Q) + Q) % Q;
  if (p < S) return [L + p, Tp, 0];
  if (p < 2 * S) return [L + S, Tp + (p - S), 1];
  if (p < 3 * S) return [L + S - (p - 2 * S), Tp + S, 2];
  return [L, Tp + S - (p - 3 * S), 3];
}
function ringProj(bx, by, x, y) {
  const L = (bx * P + 2.5) * T, Tp = (by * P + 2.5) * T, S = 7 * T;
  const cx = clamp(x, L, L + S), cy = clamp(y, Tp, Tp + S);
  const d = [Math.abs(y - Tp), Math.abs(x - (L + S)), Math.abs(y - (Tp + S)), Math.abs(x - L)];
  const m = d.indexOf(Math.min(...d));
  if (m === 0) return cx - L;
  if (m === 1) return S + (cy - Tp);
  if (m === 2) return 2 * S + (L + S - cx);
  return 3 * S + (Tp + S - cy);
}
const blockOf = (x, y) => ({ bx: clamp(Math.floor((x / T - 2) / P), 0, NB - 1), by: clamp(Math.floor((y / T - 2) / P), 0, NB - 1) });

function randomFree(cx, cy, rad) {
  for (let i = 0; i < 200; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * rad;
    const tx = Math.floor((cx + Math.cos(a) * r) / T), ty = Math.floor((cy + Math.sin(a) * r) / T);
    if (tx < 1 || ty < 1 || tx >= MW - 1 || ty >= MW - 1) continue;
    const t = getT(tx, ty); if (solidT(t) || t === RAMP) continue;
    return { x: (tx + 0.5) * T, y: (ty + 0.5) * T };
  }
  return { x: cx, y: cy };
}
function randomDrop(minD, maxD) {
  const p = pp(); let last = null;
  for (let i = 0; i < 300; i++) {
    const bx = Math.floor(R() * NB), by = Math.floor(R() * NB);
    const [x, y] = ringPt(bx, by, R() * 28 * T);
    last = { x, y };
    const d = dist(x, y, p.x, p.y);
    if (d >= minD && d <= maxD) return last;
  }
  return last;
}

// minimap base
const mmBase = document.createElement('canvas');
const MMS = 3;
mmBase.width = MW * MMS; mmBase.height = MW * MMS;
{
  const g = mmBase.getContext('2d');
  const col = { [ROAD]: '#3d3d44', [WALK]: '#8f8f8f', [BLD]: '#c7b8a4', [GRASS]: '#5aa845', [WATER]: '#2f7fd1', [RAMP]: '#f1c40f', [PLAZA]: '#b5ad9c', [OBBY]: '#e74c3c', [BLOCKG]: '#7b5230', [CHECK]: '#ddd' };
  for (let y = 0; y < MW; y++) for (let x = 0; x < MW; x++) { g.fillStyle = col[map[y * MW + x]]; g.fillRect(x * MMS, y * MMS, MMS, MMS); }
}

// ============================================================ DOM / canvas
const cv = $('game'), ctx = cv.getContext('2d');
const radar = $('radar'), rctx = radar.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.floor(VW * DPR); cv.height = Math.floor(VH * DPR);
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
}
window.addEventListener('resize', resize);
resize();

// ============================================================ audio
const AU = {
  c: null, m: null, eng: null, engG: null, engF: null, sir: null, sirG: null, nextNote: 0, step: 0,
  init() {
    if (this.c) { if (this.c.state === 'suspended') this.c.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; this.c = new C();
      this.m = this.c.createGain(); this.m.gain.value = save.sound ? 0.6 : 0; this.m.connect(this.c.destination);
      const o = this.c.createOscillator(); o.type = 'sawtooth';
      const f = this.c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = this.c.createGain(); g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(this.m); o.start();
      this.eng = o; this.engG = g; this.engF = f;
      const s = this.c.createOscillator(); s.type = 'square';
      const sg = this.c.createGain(); sg.gain.value = 0; s.connect(sg); sg.connect(this.m); s.start();
      this.sir = s; this.sirG = sg;
      this.nextNote = this.c.currentTime;
    } catch (e) { this.c = null; }
  },
  setSound(on) { save.sound = on; if (this.m) this.m.gain.value = on ? 0.6 : 0; writeSave(); },
  tone(freq, dur, type = 'square', vol = 0.12, slide = 0, at = 0) {
    if (!this.c) return;
    const t = at || this.c.currentTime;
    const o = this.c.createOscillator(), g = this.c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.m); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.3, freq = 1200) {
    if (!this.c) return;
    const len = Math.floor(this.c.sampleRate * dur), buf = this.c.createBuffer(1, len, this.c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (R() * 2 - 1) * (1 - i / len);
    const s = this.c.createBufferSource(); s.buffer = buf;
    const f = this.c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.m); s.start();
  },
  coin() { this.tone(988, 0.08, 'square', 0.1); this.tone(1319, 0.25, 'square', 0.1, 0, this.c ? this.c.currentTime + 0.08 : 0); },
  crash(v = 0.3) { this.noise(0.35, v, 900); },
  horn() { this.tone(392, 0.35, 'square', 0.1); this.tone(494, 0.35, 'square', 0.08); },
  win() { if (!this.c) return; [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'square', 0.1, 0, this.c.currentTime + i * 0.12)); },
  fail() { if (!this.c) return; [392, 330, 262].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.15, 0, this.c.currentTime + i * 0.18)); },
  jump() { this.tone(250, 0.45, 'sine', 0.15, 900); },
  blip() { this.tone(660, 0.06, 'square', 0.07); },
  update(dt) {
    if (!this.c) return;
    const now = this.c.currentTime, c = player.car;
    const on = state === 'play' && c && !isPaused();
    const sp = c ? Math.abs(c.speed) : 0;
    this.engG.gain.setTargetAtTime(on ? 0.035 + sp / 9000 : 0, now, 0.05);
    this.eng.frequency.setTargetAtTime(40 + sp * 0.2 + (c && c.turbo ? 40 : 0), now, 0.05);
    this.engF.frequency.setTargetAtTime(300 + sp * 2, now, 0.05);
    let nd = 1e9;
    for (const p of cars) if (p.ai === 'police') nd = Math.min(nd, dist(p.x, p.y, cam.x, cam.y));
    const sv = state === 'play' && !isPaused() && nd < 1000 ? 0.03 * (1 - nd / 1000) : 0;
    this.sirG.gain.setTargetAtTime(sv, now, 0.05);
    this.sir.frequency.setTargetAtTime((time % 1) < 0.5 ? 700 : 900, now, 0.02);
    // car radio: "Markus FM"
    if (on && save.music) {
      if (this.nextNote < now) this.nextNote = now + 0.05;
      while (this.nextNote < now + 0.15) { this.playStep(this.nextNote); this.nextNote += 0.14; this.step++; }
    }
  },
  playStep(t) {
    const PROG = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const s = this.step % 16, ch = PROG[Math.floor(this.step / 16) % 4];
    if (s % 4 === 0) this.tone(mtof(ch[0] - 12), 0.25, 'triangle', 0.09, 0, t);
    if (s % 2 === 0) this.tone(mtof(ch[(s / 2) % 3] + 12), 0.09, 'square', 0.025, 0, t);
    if (s === 6 || s === 14) this.tone(mtof(ch[2] + 24), 0.12, 'square', 0.02, 0, t);
  },
};

// ============================================================ game state
let state = 'title', paused = false, menuOpen = false, dialogOpen = false;
let time = 0, heat = 0, calmT = 0, bustT = 0, greetCool = 0, uid = 0;
let cars = [], peds = [], parts = [], bubbles = [], skids = [];
const cam = { x: places.start.x, y: places.start.y, zoom: 1, shake: 0 };
const player = { x: places.start.x, y: places.start.y, vx: 0, vy: 0, angle: -Math.PI / 2, car: null, anim: 0, dance: 0, stun: 0, turboFuel: 1, isPlayer: true };
const pp = () => player.car || player;
const isPaused = () => paused || menuOpen || dialogOpen;
const stars = () => Math.min(5, Math.floor(heat));

function colorFor(type) {
  return { police: '#f4f4f4', taxi: '#ffd60a', rocket: '#7b2ff7', gold: '#ffc300', bandit: '#ffe135', monster: '#2ecc71' }[type] || pick(NPC_COLORS);
}
function makeCar(type, x, y, angle, color) {
  return { id: ++uid, type, x, y, angle: angle || 0, speed: 0, vx: 0, vy: 0, color: color || colorFor(type), ai: null, air: 0, airMax: 1, z: 0, knock: 0, spin: 0, slip: 0, revT: 0, stuckT: 0, honkT: 0 };
}
function makePed(bx, by, p) {
  const [x, y] = ringPt(bx, by, p);
  return { bx, by, p, x, y, dir: R() < 0.5 ? 1 : -1, spd: 35 + R() * 30, off: (R() - 0.5) * 24, angle: 0, anim: R() * 6, state: 'walk', t: 0, vx: 0, vy: 0, skin: pick(SKIN), hair: pick(HAIR), shirt: pick(NPC_COLORS), pants: pick(PANTS), talkT: R() * 5, hitT: 0 };
}
function makePedAt(x, y) {
  const b = blockOf(x, y), ped = makePed(b.bx, b.by, ringProj(b.bx, b.by, x, y));
  ped.x = x; ped.y = y; ped.state = 'scared'; ped.t = 1.2; return ped;
}

function initWorld() {
  cars = []; peds = []; parts = []; bubbles = []; skids = [];
  heat = 0; mission = null;
  player.car = null; player.x = places.start.x; player.y = places.start.y; player.angle = -Math.PI / 2;
  const hc = places.homeCar;
  const mine = makeCar('sedan', hc.x, hc.y, hc.a, '#ff6b35'); mine.fixed = true; mine.owned = true; cars.push(mine);
  const fixed = [['van', places.pizza.x - 120, places.pizza.y + 20, 0, '#ffffff'], ['taxi', places.taxi.x + 120, places.taxi.y + 20, Math.PI], ['police', places.policeCar.x, places.policeCar.y, 0], ['sport', places.raceCar.x, places.raceCar.y, 0, '#e63946']];
  for (const [t, x, y, a, c] of fixed) { const car = makeCar(t, x, y, a, c); car.fixed = true; cars.push(car); }
  cam.x = player.x; cam.y = player.y;
  for (let i = 0; i < 26; i++) spawnPed(true);
  for (let i = 0; i < 14; i++) spawnNpcCar(250, 1300);
}

// ============================================================ input
const keys = {};
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const btn = { turbo: false };
window.addEventListener('keydown', e => {
  if (state !== 'play') return;
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (dialogOpen) { if (['Space', 'Enter', 'KeyE'].includes(e.code)) nextDialog(); return; }
  if (menuOpen) { if (e.code === 'Escape') closeMenu(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') openPause();
  else if (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter') pressCar();
  else if (e.code === 'KeyH') pressHorn(true);
  else if (e.code === 'KeyQ') pressHorn(false);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

const touchEl = $('touch'), joyEl = $('joy'), knobEl = $('knob');
touchEl.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  if (dialogOpen) { nextDialog(); return; }
  if (joy.id === null && e.clientX < VW * 0.6) {
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
    joyEl.style.display = 'block'; joyEl.style.left = joy.ox + 'px'; joyEl.style.top = joy.oy + 'px';
    knobEl.style.transform = 'translate(0px,0px)';
    try { touchEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
});
touchEl.addEventListener('pointermove', e => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const l = Math.hypot(dx, dy), M = 55;
  if (l > M) { dx *= M / l; dy *= M / l; }
  joy.x = dx / M; joy.y = dy / M;
  knobEl.style.transform = `translate(${dx}px,${dy}px)`;
});
const joyEnd = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = 0; joy.y = 0; joyEl.style.display = 'none'; };
touchEl.addEventListener('pointerup', joyEnd);
touchEl.addEventListener('pointercancel', joyEnd);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

function bindBtn(el, down, up) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('pressed'); AU.init(); if (dialogOpen) { nextDialog(); return; } down && down(); });
  const end = e => { el.classList.remove('pressed'); up && up(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('pointerleave', end);
}
const bCar = $('bCar'), bTurbo = $('bTurbo'), bHorn = $('bHorn');
bindBtn(bCar, () => pressCar());
bindBtn(bTurbo, () => { btn.turbo = true; }, () => { btn.turbo = false; });
bindBtn(bHorn, () => pressHorn(!!player.car));
bindBtn($('bPause'), () => openPause());

function readInput() {
  const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  const mag = Math.min(1, Math.hypot(joy.x, joy.y));
  return { kx, ky, kb: kx !== 0 || ky !== 0, jx: joy.x, jy: joy.y, mag, turbo: btn.turbo || keys.ShiftLeft || keys.ShiftRight || keys.Space };
}

function pressCar() {
  if (isPaused()) return;
  if (player.car) { exitCar(); return; }
  let best = null, bd = 75;
  for (const c of cars) { if (c.ai === 'bandit' || c.z > 0.05) continue; const d = dist(c.x, c.y, player.x, player.y); if (d < bd) { bd = d; best = c; } }
  if (!best) { toast('Ingen bil i nærheten 🚗 Gå helt bort til en bil.'); return; }
  enterCar(best);
}
function pressHorn(horn) {
  if (isPaused()) return;
  if (horn && player.car) {
    AU.horn(); bubble(player.car, pick(['TUUT TUUT! 📯', 'BIIIP!', 'Markus kommer! 📯']));
    for (const p of peds) if (dist(p.x, p.y, player.car.x, player.car.y) < 140 && p.state === 'walk') { p.state = 'scared'; p.t = 0.8; }
  } else if (!player.car) {
    player.dance = 3;
    AU.tone(523, 0.15, 'square', 0.08); AU.tone(659, 0.15, 'square', 0.08, 0, AU.c ? AU.c.currentTime + 0.15 : 0);
    let n = 0;
    for (const p of peds) if (dist(p.x, p.y, player.x, player.y) < 180 && n < 2) { n++; p.state = 'watch'; p.t = 3; bubble(p, pick(CHEER)); }
  }
}

function enterCar(c) {
  if (c.ai === 'npc' || c.ai === 'police' || c.ai === 'policeIdle') {
    const ped = makePedAt(c.x + Math.cos(c.angle - Math.PI / 2) * 30, c.y + Math.sin(c.angle - Math.PI / 2) * 30);
    if (c.type === 'police') { ped.shirt = '#1e3a8a'; ped.pants = '#1e3a8a'; }
    peds.push(ped);
    bubble(ped, c.type === 'police' ? 'HEI! Det er MIN bil! 😠' : pick(LEND));
  }
  if (c.type === 'police') { heat = Math.max(heat, 2.01); toast('Du lånte en politibil! 🚨 Politiet liker ikke det...'); }
  c.ai = 'player'; c.keep = true; c.reverse = false; c.knock = 0;
  player.car = c; player.dance = 0;
  AU.blip(); updateButtons();
}
function exitCar() {
  const c = player.car; if (c.z > 0.05) return;
  for (const a of [-Math.PI / 2, Math.PI / 2, Math.PI, 0]) {
    const x = c.x + Math.cos(c.angle + a) * 34, y = c.y + Math.sin(c.angle + a) * 34;
    if (!solidAt(x, y)) { player.x = x; player.y = y; break; }
  }
  c.ai = null; c.turbo = false;
  player.car = null; player.angle = c.angle; player.vx = 0; player.vy = 0;
  AU.blip(); updateButtons();
}

// ============================================================ physics
function collideWorld(e, r) {
  let px = 0, py = 0;
  const x0 = Math.floor((e.x - r) / T), x1 = Math.floor((e.x + r) / T), y0 = Math.floor((e.y - r) / T), y1 = Math.floor((e.y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidT(getT(tx, ty))) continue;
    const cx = clamp(e.x, tx * T, tx * T + T), cy = clamp(e.y, ty * T, ty * T + T);
    const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let mx = 0, my = 0;
    if (d2 > 0.0001) { const d = Math.sqrt(d2); mx = dx / d * (r - d); my = dy / d * (r - d); }
    else {
      const l = e.x - tx * T, rr = tx * T + T - e.x, u = e.y - ty * T, b = ty * T + T - e.y, m = Math.min(l, rr, u, b);
      if (m === l) mx = -(l + r); else if (m === rr) mx = rr + r; else if (m === u) my = -(u + r); else my = b + r;
    }
    e.x += mx; e.y += my; px += mx; py += my;
  }
  return (px || py) ? [px, py] : null;
}
function bounce(c, push) {
  const l = Math.hypot(push[0], push[1]) || 1, nx = push[0] / l, ny = push[1] / l;
  const vn = c.vx * nx + c.vy * ny;
  if (vn < 0) { c.vx -= nx * vn * 1.4; c.vy -= ny * vn * 1.4; }
  c.speed = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
  return Math.max(0, -vn);
}
function physCar(c, thr, st, turbo, dt) {
  const ty = CT[c.type];
  if (c.air > 0) { c.x += c.vx * dt; c.y += c.vy * dt; return; }
  const max = ty.max * (turbo ? 1.45 : 1), acc = ty.acc * (turbo ? 1.8 : 1);
  if (thr > 0) c.speed += (c.speed < 0 ? ty.acc * 2.2 : acc) * thr * dt;
  else if (thr < 0) c.speed += (c.speed > 0 ? ty.acc * 2.2 : acc * 0.6) * thr * dt;
  else { const f = 220 * dt; c.speed = Math.abs(c.speed) < f ? 0 : c.speed - Math.sign(c.speed) * f; }
  if (c.speed > max) c.speed = Math.max(max, c.speed - 500 * dt);
  if (c.speed < -ty.max * 0.45) c.speed = -ty.max * 0.45;
  c.angle += st * ty.turn * dt * clamp(c.speed / 140, -1, 1);
  const dx = Math.cos(c.angle) * c.speed, dy = Math.sin(c.angle) * c.speed;
  const grip = Math.min(1, 7.5 * dt);
  c.vx += (dx - c.vx) * grip; c.vy += (dy - c.vy) * grip;
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.slip = Math.hypot(dx - c.vx, dy - c.vy);
}

// ============================================================ player
function updatePlayerCar(inp, dt) {
  const c = player.car;
  let thr = 0, st = 0;
  if (inp.kb) { thr = -inp.ky; st = inp.kx; c.reverse = false; }
  else if (inp.mag > 0.15) {
    const ta = Math.atan2(inp.jy, inp.jx), diff = wrapA(ta - c.angle);
    if (c.reverse) { if (Math.abs(diff) < 1.9) c.reverse = false; }
    else if (Math.abs(diff) > 2.5 && c.speed < 60) c.reverse = true;
    if (c.reverse) { const rd = wrapA(ta - (c.angle + Math.PI)); thr = -inp.mag; st = clamp(-rd * 2.5, -1, 1); }
    else { thr = inp.mag * (Math.abs(diff) > 1.3 ? 0.45 : 1); st = clamp(diff * 2.5, -1, 1); }
  } else c.reverse = false;
  c.turbo = inp.turbo && player.turboFuel > 0.02 && thr > 0;
  if (c.turbo) player.turboFuel = Math.max(0, player.turboFuel - dt * 0.45);
  else player.turboFuel = Math.min(1, player.turboFuel + dt * 0.12);
  physCar(c, thr, st, c.turbo, dt);
  if (c.air > 0) {
    c.air -= dt; c.z = Math.sin(Math.PI * (1 - Math.max(0, c.air) / c.airMax));
    if (c.air <= 0) {
      c.z = 0; c.air = 0; cam.shake = 8; AU.crash(0.2);
      addMoney(10, 'STUNT! 🦘');
      for (let i = 0; i < 12; i++) part(c.x, c.y, (R() - 0.5) * 200, (R() - 0.5) * 200, 0.6, 8, '#bbb');
      if (mission && mission.def.id === 'obby') { mission.data.jumps++; mission.text = `Gjør 3 hopp på rampene 🦘 ${mission.data.jumps}/3`; }
    }
  } else {
    const push = collideWorld(c, 18);
    if (push) { const imp = bounce(c, push); if (imp > 180) crashFx(c.x, c.y, imp); }
    if (tileAt(c.x, c.y) === RAMP && c.speed > 170) {
      c.airMax = c.air = 0.45 + c.speed / 900; AU.jump();
    }
  }
  if (c.slip > 110 && Math.abs(c.speed) > 120 && c.z === 0) addSkid(c);
  if (c.turbo && R() < 0.8) {
    const bx = c.x - Math.cos(c.angle) * 26, by = c.y - Math.sin(c.angle) * 26;
    part(bx, by, -Math.cos(c.angle) * 120 + (R() - 0.5) * 60, -Math.sin(c.angle) * 120 + (R() - 0.5) * 60, 0.35, 7, pick(['#ff6b00', '#ffd60a', '#ff3b3b']));
  }
}
function updateFoot(inp, dt) {
  const p = player;
  if (p.stun > 0) { p.stun -= dt; p.angle += dt * 12; return; }
  let mx = 0, my = 0, mag = 0;
  if (inp.kb) { const l = Math.hypot(inp.kx, inp.ky); mx = inp.kx / l; my = inp.ky / l; mag = 1; }
  else if (inp.mag > 0.12) { mx = inp.jx / inp.mag; my = inp.jy / inp.mag; mag = inp.mag; }
  if (mag > 0) p.dance = 0;
  const sp = (inp.turbo ? 240 : 140) * mag;
  p.vx = mx * sp; p.vy = my * sp;
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (mag > 0) p.angle = Math.atan2(my, mx);
  p.anim += sp * dt * 0.09;
  collideWorld(p, 10);
  if (p.dance > 0) { p.dance -= dt; if (R() < dt * 5) txtPart(p.x + (R() - 0.5) * 30, p.y - 20, pick(['♪', '♫', '★']), '#ffd60a'); }
}

// ============================================================ traffic
function chooseDir(i, j, d, c) {
  const opts = [];
  for (let k = 0; k < 4; k++) { if (k === (d + 2) % 4) continue; if (validNode(i + DX[k], j + DY[k])) opts.push(k); }
  if (!opts.length) return (d + 2) % 4;
  if (c && c.ai === 'bandit' && R() < 0.75) {
    const p = pp(); let best = opts[0], bd = -1;
    for (const k of opts) { const n = nodePos(i + DX[k], j + DY[k]); const dd = dist(n.x, n.y, p.x, p.y); if (dd > bd) { bd = dd; best = k; } }
    return best;
  }
  if (opts.includes(d) && R() < 0.5) return d;
  return pick(opts);
}
function setWp(c) {
  const n = nodePos(c.ni, c.nj);
  if (c.nd === c.d) { c.wx = n.x + RX(c.d) * T / 2; c.wy = n.y + RY(c.d) * T / 2; }
  else { c.wx = n.x + RX(c.d) * T / 2 + RX(c.nd) * T / 2; c.wy = n.y + RY(c.d) * T / 2 + RY(c.nd) * T / 2; }
}
function spawnNpcCar(minD, maxD, type, ai = 'npc', near) {
  const ref = near || cam;
  for (let tries = 0; tries < 40; tries++) {
    const i = Math.floor(R() * NN), j = Math.floor(R() * NN);
    const ok = [0, 1, 2, 3].filter(k => validNode(i + DX[k], j + DY[k]));
    const d = pick(ok), n = nodePos(i, j), f = 1.6 + R() * 6;
    const x = n.x + DX[d] * f * T + RX(d) * T / 2, y = n.y + DY[d] * f * T + RY(d) * T / 2;
    const dd = dist(x, y, ref.x, ref.y);
    if (dd < minD || dd > maxD) continue;
    if (cars.some(c => dist(c.x, c.y, x, y) < 100)) continue;
    const c = makeCar(type || pick(['sedan', 'sedan', 'sedan', 'van', 'taxi', 'sport']), x, y, Math.atan2(DY[d], DX[d]));
    c.ai = ai; c.d = d; c.ni = i + DX[d]; c.nj = j + DY[d]; c.nd = chooseDir(c.ni, c.nj, d, c); setWp(c);
    c.cruise = ai === 'bandit' ? 270 : 120 + R() * 60; c.speed = c.cruise * 0.5;
    cars.push(c); return c;
  }
  return null;
}
function blockedAhead(c) {
  const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
  const check = o => {
    const rx = o.x - c.x, ry = o.y - c.y, al = rx * fx + ry * fy;
    if (al <= 0 || al > 80) return false;
    return Math.abs(rx * fy - ry * fx) < 26;
  };
  for (const o of cars) if (o !== c && o.z < 0.3 && check(o)) return o;
  if (!player.car && check(player)) return player;
  return null;
}
function updateNpc(c, dt) {
  if (c.knock > 0) {
    c.knock -= dt;
    const f = Math.max(0, 1 - 3 * dt); c.vx *= f; c.vy *= f;
    c.x += c.vx * dt; c.y += c.vy * dt; c.angle += c.spin * dt; c.spin *= f;
    const push = collideWorld(c, 18); if (push) bounce(c, push);
    c.speed = 0; return;
  }
  const dx = c.wx - c.x, dy = c.wy - c.y, d = Math.hypot(dx, dy);
  if (d < 26) { c.d = c.nd; c.ni += DX[c.d]; c.nj += DY[c.d]; c.nd = chooseDir(c.ni, c.nj, c.d, c); setWp(c); }
  const diff = wrapA(Math.atan2(dy, dx) - c.angle);
  c.angle += clamp(diff, -3.2 * dt, 3.2 * dt);
  let target = c.cruise * (Math.abs(diff) > 0.5 ? 0.45 : 1);
  if (c.ai === 'bandit') {
    if (mission && mission.data.hits >= 5) target = 0;
  } else {
    const b = c.ignoreT > 0 ? null : blockedAhead(c);
    if (c.ignoreT > 0) c.ignoreT -= dt;
    if (b) {
      target = 0; c.honkT += dt;
      if (c.honkT > 2.5) { c.honkT = 0; if (b === player || b === player.car) { bubble(c, pick(['TUUT! 📯', 'Flytt deg, Markus! 😄', 'Hallo?!'])); AU.tone(330, 0.25, 'square', 0.05); } else c.ignoreT = 1.5; }
    } else c.honkT = 0;
  }
  c.speed = c.speed < target ? Math.min(target, c.speed + 220 * dt) : Math.max(target, c.speed - 500 * dt);
  c.vx = Math.cos(c.angle) * c.speed; c.vy = Math.sin(c.angle) * c.speed;
  c.x += c.vx * dt; c.y += c.vy * dt;
}
function aiDrive(c, tx, ty, maxThr, turbo, dt) {
  const diff = wrapA(Math.atan2(ty - c.y, tx - c.x) - c.angle);
  let thr = maxThr, st = clamp(diff * 2.5, -1, 1);
  if (Math.abs(diff) > 1.2) thr *= 0.5;
  if (c.revT > 0) { c.revT -= dt; thr = -1; st = -st; }
  else if (Math.abs(c.speed) < 30) { c.stuckT += dt; if (c.stuckT > 1.2) { c.revT = 0.9; c.stuckT = 0; } }
  else c.stuckT = 0;
  c.turbo = turbo;
  physCar(c, thr, st, turbo, dt);
  const push = collideWorld(c, 18); if (push) bounce(c, push);
}
function updatePolice(c, dt) {
  if (c.ai === 'policeIdle') { physCar(c, 0, 0, false, dt); const push = collideWorld(c, 18); if (push) bounce(c, push); return; }
  const t = pp(), d = dist(c.x, c.y, t.x, t.y);
  let tx, ty;
  if (d < 320) { tx = t.x + (t.vx || 0) * 0.25; ty = t.y + (t.vy || 0) * 0.25; c.wp = null; }
  else {
    if (!c.wp || dist(c.x, c.y, c.wp.x, c.wp.y) < 80) {
      const cur = nearestNode(c.x, c.y), tn = nearestNode(t.x, t.y), cp = nodePos(cur.i, cur.j);
      if (!c.wp && dist(c.x, c.y, cp.x, cp.y) > 90) c.wp = cp;
      else if (cur.i === tn.i && cur.j === tn.j) c.wp = { x: t.x, y: t.y };
      else {
        let best = null, bd = 1e9;
        for (let k = 0; k < 4; k++) {
          const ni = cur.i + DX[k], nj = cur.j + DY[k]; if (!validNode(ni, nj)) continue;
          const md = Math.abs(ni - tn.i) + Math.abs(nj - tn.j) + R() * 0.5;
          if (md < bd) { bd = md; best = nodePos(ni, nj); }
        }
        c.wp = best;
      }
    }
    tx = c.wp.x; ty = c.wp.y;
  }
  aiDrive(c, tx, ty, 1, stars() >= 3 && d > 200, dt);
}
function updateParked(c, dt) {
  physCar(c, 0, 0, false, dt);
  const push = collideWorld(c, 18); if (push) bounce(c, push);
}

function carCollisions() {
  const n = cars.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = cars[i], b = cars[j];
    if (a.z > 0.1 || b.z > 0.1) continue;
    if (a.ai === 'npc' && b.ai === 'npc') continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 40 || d === 0) continue;
    const nx = dx / d, ny = dy / d, ov = 40 - d;
    const ma = a.type === 'monster' ? 2 : 1, mb = b.type === 'monster' ? 2 : 1;
    a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb);
    b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv >= 0) continue;
    const jj = -1.5 * rv / (1 / ma + 1 / mb);
    a.vx -= jj * nx / ma; a.vy -= jj * ny / ma; b.vx += jj * nx / mb; b.vy += jj * ny / mb;
    for (const c of [a, b]) {
      if (c.ai === 'npc' || c.ai === 'bandit') { c.knock = 0.6; c.spin = (R() - 0.5) * 5 * Math.min(1, -rv / 300); }
      else c.speed = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
    }
    onCarHit(a, b, -rv);
  }
  // cars vs Markus on foot
  if (!player.car) for (const c of cars) {
    const dx = player.x - c.x, dy = player.y - c.y, d = Math.hypot(dx, dy);
    if (d >= 30 || d === 0) continue;
    player.x += dx / d * (30 - d); player.y += dy / d * (30 - d);
    if (Math.hypot(c.vx, c.vy) > 140 && player.stun <= 0) { player.stun = 0.9; bubble(player, 'Au! 😵'); AU.crash(0.15); if (c.ai === 'npc') bubble(c, 'Unnskyld, Markus!'); }
  }
}
function onCarHit(a, b, imp) {
  const pc = player.car;
  const o = a === pc ? b : b === pc ? a : null;
  if (!o) return;
  if (imp > 60) crashFx((a.x + b.x) / 2, (a.y + b.y) / 2, imp);
  if (o.ai === 'bandit') {
    if (mission && mission.def.id === 'bandit' && imp > 50 && time - (o.lastHit || 0) > 0.6) {
      o.lastHit = time; mission.data.hits++;
      bubble(o, mission.data.hits >= 5 ? 'OK OK! Du får isen tilbake! 🍦' : pick(['Au! Isen min!', 'Nei! Ikke dytt!', 'Du tar meg aldri! 🍌', 'Grr!']));
      mission.text = `Dytt Bananabanditten! 🍌 ${Math.min(5, mission.data.hits)}/5`;
      AU.tone(880, 0.12, 'square', 0.1);
    }
    return;
  }
  if (imp < 110) return;
  if (o.ai === 'police' || o.ai === 'policeIdle') { heat = Math.max(heat + 0.8, 1.01); o.ai = 'police'; bubble(o, 'Stopp! Politi! 🚨'); }
  else if (o.ai === 'npc') { heat += 0.3; if (R() < 0.6) bubble(o, pick(BUMP)); }
}
function crashFx(x, y, imp) {
  AU.crash(Math.min(0.4, imp / 900)); cam.shake = Math.min(12, imp / 35);
  for (let i = 0; i < 10; i++) part(x, y, (R() - 0.5) * 300, (R() - 0.5) * 300, 0.35, 4, pick(['#ffd60a', '#ff9f1c', '#fff']));
}

// ============================================================ peds
function spawnPed(anywhere) {
  const ref = pp();
  for (let tries = 0; tries < 20; tries++) {
    const b = blockOf(ref.x, ref.y);
    const bx = clamp(b.bx + Math.floor(R() * 5) - 2, 0, NB - 1), by = clamp(b.by + Math.floor(R() * 5) - 2, 0, NB - 1);
    const ped = makePed(bx, by, R() * 28 * T);
    const d = dist(ped.x, ped.y, cam.x, cam.y);
    if (d > 1300) continue;
    if (!anywhere && d < 550) continue;
    if (solidAt(ped.x, ped.y)) continue;
    peds.push(ped); return ped;
  }
  return null;
}
function updatePed(p, dt) {
  p.talkT -= dt; p.hitT -= dt;
  if (p.state === 'walk') {
    if (R() < dt * 0.04) p.dir *= -1;
    p.p += p.dir * p.spd * dt;
    const [x, y, s] = ringPt(p.bx, p.by, p.p);
    const tx = x + (s % 2 === 0 ? 0 : p.off), ty = y + (s % 2 === 0 ? p.off : 0);
    const k = Math.min(1, 8 * dt);
    p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
    p.angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][s] + (p.dir < 0 ? Math.PI : 0);
    p.anim += p.spd * dt * 0.09;
    // greet Markus
    if (!player.car && p.talkT <= 0 && greetCool <= 0 && dist(p.x, p.y, player.x, player.y) < 90) {
      p.talkT = 15; greetCool = 3; bubble(p, pick(GREET));
    }
  } else if (p.state === 'flee' || p.state === 'stun') {
    p.t -= dt;
    const f = Math.max(0, 1 - 4 * dt); p.vx *= f; p.vy *= f;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.state === 'stun') p.angle += dt * 14;
    collideWorld(p, 8);
    if (p.t <= 0) { p.state = 'scared'; p.t = 0.8; }
  } else if (p.state === 'scared' || p.state === 'watch') {
    p.t -= dt;
    if (p.state === 'watch' && !player.car) p.angle = Math.atan2(player.y - p.y, player.x - p.x);
    if (p.t <= 0) { const b = blockOf(p.x, p.y); p.bx = b.bx; p.by = b.by; p.p = ringProj(b.bx, b.by, p.x, p.y); p.state = 'walk'; }
  } else if (p.state === 'wait') {
    p.anim += dt * 6;
  }
  // danger from Markus' car
  const c = player.car;
  if (c && c.z < 0.3 && (p.state === 'walk' || p.state === 'scared' || p.state === 'watch') && Math.abs(c.speed) > 100) {
    const fx = Math.cos(c.angle) * Math.sign(c.speed), fy = Math.sin(c.angle) * Math.sign(c.speed);
    const rx = p.x - c.x, ry = p.y - c.y, al = rx * fx + ry * fy, lat = rx * fy - ry * fx;
    if (al > -10 && al < 110 && Math.abs(lat) < 28) {
      const side = lat >= 0 ? 1 : -1;
      p.state = 'flee'; p.t = 0.5; p.vx = fy * side * 300; p.vy = -fx * side * 300;
      if (R() < 0.35) bubble(p, pick(DODGE));
      heat += 0.08;
    }
  }
  if (c && c.z < 0.3 && p.state !== 'stun' && p.state !== 'wait' && p.hitT <= 0 && dist(p.x, p.y, c.x, c.y) < 24 && Math.abs(c.speed) > 60) {
    p.state = 'stun'; p.t = 1.1; p.vx = c.vx * 0.7; p.vy = c.vy * 0.7; p.hitT = 3;
    bubble(p, pick(['Au! 😵', 'Oi! Jeg er ok!', 'Auda!'])); heat += 0.45; AU.tone(200, 0.15, 'square', 0.08, 100);
  }
}

// ============================================================ fx
function part(x, y, vx, vy, life, size, color) { if (parts.length < 400) parts.push({ x, y, vx, vy, life, max: life, size, color }); }
function txtPart(x, y, text, color) { if (parts.length < 400) parts.push({ x, y, vx: 0, vy: -40, life: 1.2, max: 1.2, size: 18, color, text }); }
function confetti(x, y) { for (let i = 0; i < 90; i++) { const a = R() * Math.PI * 2, s = 100 + R() * 350; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.5 + R(), max: 2.5, size: 6, color: pick(['#ff4d6d', '#4cc9f0', '#7dff6a', '#ffd60a', '#b388ff']), conf: true, rot: R() * 6 }); } }
function bubble(ent, text) { bubbles = bubbles.filter(b => b.ent !== ent); bubbles.push({ ent, text, t: 2.8 }); if (bubbles.length > 6) bubbles.shift(); }
function addSkid(c) {
  const ca = Math.cos(c.angle), sa = Math.sin(c.angle), w = CT[c.type].w, h = CT[c.type].h;
  for (const s of [-1, 1]) {
    const x = c.x - ca * w * 0.35 - sa * s * h * 0.4, y = c.y - sa * w * 0.35 + ca * s * h * 0.4;
    const key = s < 0 ? 'skA' : 'skB', last = c[key];
    if (last && time - last.t < 0.1) skids.push([last.x, last.y, x, y]);
    c[key] = { x, y, t: time };
  }
  if (skids.length > 600) skids.splice(0, skids.length - 600);
  if (R() < 0.3) part(c.x - ca * 20, c.y - sa * 20, (R() - 0.5) * 40, (R() - 0.5) * 40, 0.6, 10, 'rgba(220,220,220,0.6)');
}
function addMoney(n, label) {
  save.money = Math.max(0, save.money + n); writeSave();
  const p = pp(); txtPart(p.x, p.y - 30, (n >= 0 ? '+' : '') + n + ' kr' + (label ? ' ' + label : ''), n >= 0 ? '#7dff6a' : '#ff4d4d');
}

// ============================================================ UI helpers
let toastT = 0, bigT = 0;
function toast(t, dur = 3) { const el = $('toast'); el.textContent = t; el.classList.remove('hidden'); toastT = dur; }
function showBig(title, sub, color, dur = 3) {
  const el = $('big'); $('bigTitle').textContent = title; $('bigTitle').style.color = color || '#ffd60a'; $('bigSub').textContent = sub || '';
  el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; bigT = dur;
}
let dialogQ = null, dialogCb = null;
function showDialog(lines, cb) { dialogQ = lines.slice(); dialogCb = cb; dialogOpen = true; joy.id = null; joy.x = joy.y = 0; $('joy').style.display = 'none'; nextDialog(true); }
function nextDialog(first) {
  if (!dialogQ) return;
  if (!first) AU.blip();
  if (!dialogQ.length) {
    $('dialog').classList.add('hidden'); const cb = dialogCb; dialogQ = null; dialogCb = null;
    setTimeout(() => { dialogOpen = false; cb && cb(); }, 50); return;
  }
  const [face, name, text] = dialogQ.shift();
  $('dFace').textContent = face; $('dName').textContent = name; $('dText').textContent = text;
  $('dialog').classList.remove('hidden');
}
$('dialog').addEventListener('pointerdown', e => { e.stopPropagation(); nextDialog(); });

function openMenu(title, sub, items) {
  menuOpen = true; joy.id = null; joy.x = joy.y = 0; $('joy').style.display = 'none';
  const panel = $('menuPanel'); panel.innerHTML = '';
  const h = document.createElement('h2'); h.textContent = title; panel.appendChild(h);
  if (sub) { const p = document.createElement('p'); p.textContent = sub; panel.appendChild(p); }
  for (const it of items) {
    const b = document.createElement('button'); b.className = 'mitem' + (it.close ? ' close' : '');
    if (it.disabled) b.disabled = true;
    b.innerHTML = (it.icon ? `<span class="ic">${it.icon}</span>` : '') + `<span class="tx">${it.label}${it.sub ? `<span class="sub">${it.sub}</span>` : ''}</span>` + (it.price ? `<span class="pr">${it.price}</span>` : '');
    b.addEventListener('click', () => { AU.blip(); it.onClick ? it.onClick() : closeMenu(); });
    panel.appendChild(b);
  }
  $('menu').classList.remove('hidden');
}
function closeMenu() { menuOpen = false; $('menu').classList.add('hidden'); }

function updateButtons() {
  if (player.car) {
    bCar.innerHTML = '<span>🚪</span><small>UT</small>';
    bTurbo.innerHTML = '<span>🔥</span><small>TURBO</small>';
    bHorn.innerHTML = '<span>📯</span><small>TUT</small>';
  } else {
    bCar.innerHTML = '<span>🚗</span><small>INN</small>';
    bTurbo.innerHTML = '<span>🏃</span><small>LØP</small>';
    bHorn.innerHTML = '<span>🕺</span><small>DANS</small>';
  }
}

function openPause() {
  if (state !== 'play') return;
  const doneN = MISSION_ORDER.filter(id => save.done[id]).length + (save.done.mayor ? 1 : 0);
  const items = [
    { icon: '▶️', label: 'Fortsett', onClick: closeMenu },
    { icon: save.sound ? '🔊' : '🔇', label: 'Lyd: ' + (save.sound ? 'PÅ' : 'AV'), onClick: () => { AU.setSound(!save.sound); openPause(); } },
    { icon: '📻', label: 'Markus FM i bilen: ' + (save.music ? 'PÅ' : 'AV'), onClick: () => { save.music = !save.music; writeSave(); openPause(); } },
  ];
  if (mission) items.push({ icon: '❌', label: 'Avbryt oppdraget', onClick: () => { closeMenu(); failMission('Du avbrøt oppdraget.'); } });
  if (document.fullscreenEnabled) items.push({ icon: '⛶', label: 'Fullskjerm', onClick: () => { goFullscreen(); closeMenu(); } });
  items.push({ icon: '🗑️', label: 'Start helt på nytt', sub: 'Sletter penger og oppdrag', onClick: () => openMenu('Sikker?', 'Alt blir slettet og du starter på nytt.', [
    { icon: '✅', label: 'Ja, start på nytt', onClick: () => { save = JSON.parse(JSON.stringify(DEFAULT_SAVE)); writeSave(); location.reload(); } },
    { label: 'Nei, tilbake', close: true, onClick: openPause }]) });
  openMenu('PAUSE', `Oppdrag: ${doneN}/7 · Gullmynter: ${save.coins.length}/25 · ${fmt(save.money)} kr`, items);
}
function goFullscreen() {
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
    if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } }).catch(() => {});
  } catch (e) { /* ignore */ }
}

// ============================================================ missions
let mission = null;
const MISSION_ORDER = ['pizza', 'taxi', 'diamonds', 'race', 'obby', 'bandit'];
const allDone = () => MISSION_ORDER.every(id => save.done[id]);
const reached = (t, r) => { const p = pp(); return t && dist(p.x, p.y, t.x, t.y) < r; };

const PASSENGER_LINES = ['Er du ikke han Markus som er så god i Fortnite?!', 'Kjør fort! Jeg skal rekke Minecraft-kurset!', 'Wow, du kjører bedre enn mormoren min!', 'Jeg har hørt at du har GTA 7. Så kult!', 'Kan du kjøre meg til Roblox-treffet?', 'Er dette en taxi eller en racerbil?! 😄'];

const MDEF = {
  pizza: {
    name: 'Pizzabudet', icon: '🍕', color: '#ff6b35', place: 'pizza', needCar: true, reward: 150,
    intro: [['🧑‍🍳', 'Pizza-Per', 'Markus! Endelig! Jeg har tre pizzaer som må leveres NÅ.'], ['🧑‍🍳', 'Pizza-Per', 'Følg den gule pilen. Lever før tiden går ut, ellers blir pizzaen kald!']],
    start(m) { m.data.n = 0; this.next(m); },
    next(m) { m.target = randomDrop(700, 1800); const p = pp(); m.timer = dist(p.x, p.y, m.target.x, m.target.y) / 210 + 15; m.text = `Lever pizza ${m.data.n + 1}/3 🍕`; },
    update(m) {
      if (reached(m.target, 75)) {
        m.data.n++; AU.coin(); addMoney(25, 'tips');
        txtPart(m.target.x, m.target.y - 20, pick(['Nam nam! 🍕', 'Takk Markus!', 'Rask levering!']), '#fff');
        if (m.data.n >= 3) return completeMission();
        this.next(m);
      } else if (m.timer <= 0) failMission('Pizzaen ble kald! 🥶');
    },
  },
  taxi: {
    name: 'Taxi-Markus', icon: '🚕', color: '#ffd60a', place: 'taxi', needCar: true, reward: 200,
    intro: [['🧔', 'Taxi-Tor', 'Hei Markus! Jeg er syk i dag, så kan du kjøre taxi for meg?'], ['🧔', 'Taxi-Tor', 'Hent tre passasjerer og kjør dem dit de skal. Ikke kjør for vilt!']],
    start(m) { m.data.n = 0; this.pickup(m); },
    pickup(m) {
      m.stage = 'pickup'; m.timer = null; m.target = randomDrop(400, 1200);
      const ped = makePedAt(m.target.x, m.target.y); ped.state = 'wait'; ped.keep = true; peds.push(ped); m.data.ped = ped;
      m.text = `Hent passasjer ${m.data.n + 1}/3 🙋`;
    },
    update(m) {
      if (m.stage === 'pickup') {
        if (m.data.ped) { m.target.x = m.data.ped.x; m.target.y = m.data.ped.y; }
        if (reached(m.target, 85) && player.car) {
          const ped = m.data.ped; peds = peds.filter(p => p !== ped); m.data.ped = null;
          bubble(player.car, pick(PASSENGER_LINES)); AU.blip();
          m.stage = 'drop'; m.target = randomDrop(1000, 2200); const p = pp();
          m.timer = dist(p.x, p.y, m.target.x, m.target.y) / 220 + 16; m.text = `Kjør passasjeren til målet 🏁 (${m.data.n + 1}/3)`;
        }
      } else {
        if (reached(m.target, 85)) {
          m.data.n++; AU.coin(); addMoney(40, 'tips');
          const ped = makePedAt(m.target.x, m.target.y); peds.push(ped); bubble(ped, pick(['Takk for turen! ⭐⭐⭐⭐⭐', 'Beste taxi ever!', 'Wow, så fort!']));
          if (m.data.n >= 3) return completeMission();
          this.pickup(m);
        } else if (m.timer <= 0) failMission('Passasjeren gikk lei og gikk av 😤');
      }
    },
    cleanup(m) { if (m.data.ped) peds = peds.filter(p => p !== m.data.ped); },
  },
  diamonds: {
    name: 'Diamantjakten', icon: '💎', color: '#4cc9f0', place: 'mine', needCar: false, reward: 250,
    intro: [['⛏️', 'Gruve-Gunnar', 'Hei Markus! Noen har mistet 8 diamanter rundt Blokkland.'], ['⛏️', 'Gruve-Gunnar', 'Du er jo proff i Minecraft, så du finner dem sikkert på null komma niks!']],
    start(m) {
      const c = places.mine; m.data.items = [];
      for (let tries = 0; m.data.items.length < 8 && tries < 2000; tries++) {
        const p = randomFree(c.x, c.y, 1150);
        if (dist(p.x, p.y, c.x, c.y) < 150 || m.data.items.some(q => dist(q.x, q.y, p.x, p.y) < 180)) continue;
        m.data.items.push(p);
      }
      m.data.need = m.data.items.length; m.data.got = 0; m.timer = 150; m.text = `Finn diamantene 💎 0/${m.data.need}`;
    },
    update(m) {
      const p = pp(); let best = null, bd = 1e9;
      for (const it of m.data.items) {
        if (it.taken) continue;
        const d = dist(p.x, p.y, it.x, it.y);
        if (d < 45) { it.taken = true; m.data.got++; AU.coin(); txtPart(it.x, it.y, '💎', '#4cc9f0'); m.text = `Finn diamantene 💎 ${m.data.got}/${m.data.need}`; continue; }
        if (d < bd) { bd = d; best = it; }
      }
      m.target = best;
      if (m.data.got >= m.data.need) completeMission(); else if (m.timer <= 0) failMission('Tiden gikk ut! Diamantene forsvant ⛏️');
    },
  },
  race: {
    name: 'Gateløpet', icon: '🏁', color: '#e63946', place: 'race', needCar: true, reward: 300,
    intro: [['🏎️', 'Racer-Rita', 'Så du er Markus? Alle snakker om deg.'], ['🏎️', 'Racer-Rita', 'La oss se om du er like rask på veien som i Fortnite. Kjør gjennom alle sjekkpunktene før tiden går ut!'], ['🏎️', 'Racer-Rita', 'Tips: Hold inne 🔥 for turbo!']],
    start(m) {
      m.data.cps = [[6, 2], [8, 2], [8, 0], [4, 0], [4, 3], [6, 3], [6, 2]].map(([i, j]) => nodePos(i, j));
      m.data.k = 0; let len = 0, prev = pp();
      for (const c of m.data.cps) { len += dist(prev.x, prev.y, c.x, c.y); prev = c; }
      m.timer = len / 235 + 10; this.set(m);
    },
    set(m) { m.target = m.data.cps[m.data.k]; m.text = m.data.k === m.data.cps.length - 1 ? 'Kjør i mål! 🏁' : `Sjekkpunkt ${m.data.k + 1}/${m.data.cps.length - 1} 🏁`; },
    update(m) {
      if (reached(m.target, 95)) {
        m.data.k++; AU.tone(1046, 0.15, 'square', 0.1);
        if (m.data.k >= m.data.cps.length) return completeMission();
        this.set(m);
      } else if (m.timer <= 0) failMission('Racer-Rita vant denne gangen! Prøv igjen 🏎️');
    },
  },
  obby: {
    name: 'Obby-mesteren', icon: '🧱', color: '#2ecc71', place: 'obby', needCar: true, reward: 200,
    intro: [['🧱', 'Obby-Ola', 'Yo Markus! Dette er Obby-parken. Litt som Roblox, bare med biler!'], ['🧱', 'Obby-Ola', 'Kjør fort over de gule rampene og gjør 3 hopp på ett minutt. Klarer du det?']],
    start(m) { m.data.jumps = 0; m.timer = 60; m.target = null; m.text = 'Gjør 3 hopp på rampene 🦘 0/3'; },
    update(m) { if (m.data.jumps >= 3) completeMission(); else if (m.timer <= 0) failMission('Tiden gikk ut! Mer fart på rampene!'); },
  },
  bandit: {
    name: 'Bananabanditten', icon: '🍌', color: '#ffe135', place: 'icecream', needCar: true, reward: 500,
    intro: [['🍦', 'Iskrem-Ida', 'HJELP! Bananabanditten har stjålet all isen min!'], ['🍦', 'Iskrem-Ida', 'Han kjører en gul bananabil. Dytt bilen hans 5 ganger, så gir han seg!'], ['🍦', 'Iskrem-Ida', 'Og politiet blir ikke sure på deg denne gangen. Lover!']],
    start(m) {
      m.data.hits = 0; m.timer = 120;
      const c = spawnNpcCar(350, 900, 'bandit', 'bandit', pp()) || spawnNpcCar(200, 2000, 'bandit', 'bandit', pp());
      m.data.car = c; m.text = 'Dytt Bananabanditten! 🍌 0/5';
      if (c) bubble(c, 'Hehe! Du tar meg aldri! 🍌');
    },
    update(m) {
      const c = m.data.car; if (!c) return completeMission();
      m.target = { x: c.x, y: c.y };
      if (m.data.hits >= 5) { if (!m.data.doneT) m.data.doneT = 1.2; m.data.doneT -= 1 / 60; if (m.data.doneT <= 0) completeMission(); }
      else if (m.timer <= 0) failMission('Bananabanditten slapp unna! 🍌');
    },
    cleanup(m) { const c = m.data.car; if (c) setTimeout(() => { cars = cars.filter(x => x !== c); }, 2500); },
  },
  mayor: {
    name: 'Ordføreren', icon: '🎩', color: '#c9a227', place: 'cityhall', needCar: false, reward: 1000,
    intro: [['🎩', 'Ordføreren', 'Markus! Hele byen snakker om deg.'], ['🎩', 'Ordføreren', 'Du har levert pizza, kjørt taxi, funnet diamanter, vunnet gateløpet, mestret obbyen og tatt Bananabanditten!'], ['🎩', 'Ordføreren', 'Derfor utnevner jeg deg til ÆRESBORGER av Markus City! Og du får nøkkelen til... GULLBILEN! 🏆']],
    start(m) {
      if (!save.owned.includes('gold')) save.owned.push('gold');
      const p = places.cityhall; const c = makeCar('gold', p.x + 90, p.y + 30, 0); c.owned = true; c.keep = true; cars.push(c);
      completeMission();
      setTimeout(() => showBig('DU HAR KLART GTA 7!', 'Markus er sjefen i Markus City! 👑', '#ffd60a', 5), 3200);
    },
  },
};
for (const id in MDEF) MDEF[id].id = id;

function startMission(def) {
  mission = { def, stage: null, timer: null, target: null, text: '', data: {} };
  AU.tone(660, 0.12, 'square', 0.1);
  showBig(def.name.toUpperCase(), 'Oppdrag startet!', def.color, 2);
  def.start(mission);
}
function completeMission() {
  if (!mission) return;
  const def = mission.def; const m = mission; mission = null;
  def.cleanup && def.cleanup(m);
  const first = !save.done[def.id];
  save.done[def.id] = true; writeSave();
  addMoney(def.reward, '');
  showBig('OPPDRAG FULLFØRT!', `+${def.reward} kr · ${pick(['Markus er PRO! 🔥', 'Sykt bra, Markus!', 'Legendarisk! ⭐', 'Ingen er bedre enn Markus!'])}`, '#7dff6a', 3.5);
  AU.win(); const p = pp(); confetti(p.x, p.y);
  heat = 0; for (const c of cars) if (c.ai === 'police') c.ai = 'policeIdle';
  for (const mk of markers) mk.cool = true;
  if (first && def.id !== 'mayor' && allDone()) setTimeout(() => toast('Ordføreren vil snakke med deg! Dra til Rådhuset 🎩', 6), 3800);
}
function failMission(reason) {
  if (!mission) return;
  const m = mission; mission = null;
  m.def.cleanup && m.def.cleanup(m);
  showBig('OPPDRAG FEILET', reason + ' Prøv igjen!', '#ff4d4d', 3.5); AU.fail();
  for (const mk of markers) mk.cool = true;
}

// markers
const markers = [];
for (const id of [...MISSION_ORDER, 'mayor']) {
  const def = MDEF[id], p = places[def.place];
  markers.push({ kind: 'mission', id, x: p.x, y: p.y, icon: def.icon, color: def.color, cool: false, label: () => def.name + (save.done[id] ? ' ✔' : ''), vis: () => !mission && (id !== 'mayor' || (allDone() && !save.done.mayor)) });
}
markers.push({ kind: 'lakk', x: places.lakk.x, y: places.lakk.y, icon: '🎨', color: '#00e5ff', cool: false, label: () => 'Lakkering', vis: () => true });
markers.push({ kind: 'shop', x: places.shop.x, y: places.shop.y, icon: '🛒', color: '#b388ff', cool: false, label: () => 'Bilbutikk', vis: () => true });
markers.push({ kind: 'home', x: places.home.x, y: places.home.y, icon: '🏠', color: '#ff9f1c', cool: false, label: () => 'Hjem', vis: () => true });

function updateMarkers() {
  const p = pp();
  for (const m of markers) {
    if (!m.vis()) continue;
    const d = dist(p.x, p.y, m.x, m.y);
    if (d > 110) m.cool = false;
    if (d < 46 && !m.cool) { m.cool = true; triggerMarker(m); break; }
  }
}
function stopCar() { const c = player.car; if (c) { c.speed = 0; c.vx = 0; c.vy = 0; } }
function triggerMarker(m) {
  if (m.kind === 'mission') {
    const def = MDEF[m.id];
    if (def.needCar && !player.car) { toast(`${def.icon} ${def.name}: Du trenger en bil! 🚗`); return; }
    stopCar(); showDialog(def.intro, () => startMission(def));
  } else if (m.kind === 'lakk') {
    if (!player.car) { toast('🎨 Kjør hit med en bil for å lakkere den.'); return; }
    if (heat < 1) { toast('🎨 Lakkering: Kom hit når politiet jager deg (50 kr)'); return; }
    if (save.money < 50) { toast('🎨 Du har ikke råd (50 kr). Gjør et oppdrag!'); return; }
    stopCar(); addMoney(-50, '🎨'); heat = 0; player.car.color = pick(NPC_COLORS.concat(['#ff4d6d', '#00e5ff', '#b388ff']));
    for (const c of cars) if (c.ai === 'police') c.ai = 'policeIdle';
    showBig('NY FARGE!', 'Politiet kjenner ikke igjen bilen din 😎', '#00e5ff');
    AU.win();
  } else if (m.kind === 'shop') { stopCar(); openShop(); }
  else if (m.kind === 'home') { stopCar(); openHome(); }
}
const SHOP = [
  { type: 'van', price: 100, desc: 'Stor og trygg' },
  { type: 'sport', price: 300, desc: 'Rask og kul 🏎️' },
  { type: 'monster', price: 600, desc: 'Kjempestore hjul! Dytter alt' },
  { type: 'rocket', price: 1000, desc: 'Raskeste bilen i byen 🚀' },
];
function spawnOwned(type, at) {
  const old = cars.filter(c => c.owned && c !== player.car && c.ai === null && !c.fixed);
  if (old.length >= 3) cars = cars.filter(c => c !== old[0]);
  const c = makeCar(type, at.x, at.y, at.a || 0, type === 'sedan' ? '#ff6b35' : undefined);
  c.owned = true; c.keep = true; cars.push(c);
  txtPart(at.x, at.y - 20, '✨ ' + CT[type].name, '#fff');
  return c;
}
function openShop() {
  const items = SHOP.map(s => {
    const owned = save.owned.includes(s.type);
    return {
      icon: { van: '🚐', sport: '🏎️', monster: '🛻', rocket: '🚀' }[s.type], label: CT[s.type].name, sub: owned ? 'Du eier denne. Trykk for å hente!' : s.desc,
      price: owned ? 'EIER' : s.price + ' kr', disabled: !owned && save.money < s.price,
      onClick: () => {
        if (!owned) { save.money -= s.price; save.owned.push(s.type); writeSave(); AU.win(); }
        spawnOwned(s.type, places.shopCar); closeMenu(); toast(`${CT[s.type].name} står klar utenfor! 🔑`);
      },
    };
  });
  items.push({ label: 'Lukk', close: true });
  openMenu('BILBUTIKKEN', `Du har ${fmt(save.money)} kr. Tjen mer på oppdrag!`, items);
}
function openHome() {
  save.money = Math.max(0, save.money); writeSave();
  const items = save.owned.map(t => ({ icon: { sedan: '🚗', van: '🚐', sport: '🏎️', monster: '🛻', rocket: '🚀', gold: '🏆' }[t] || '🚗', label: 'Hent ' + CT[t].name, onClick: () => { spawnOwned(t, places.homeCar); closeMenu(); } }));
  items.push({ label: 'Lukk', close: true });
  openMenu("MARKUS' HUS", 'Spillet er lagret 💾 Hent en av bilene dine:', items);
}

function updateMission(dt) {
  if (!mission) return;
  if (mission.timer !== null) mission.timer -= dt;
  mission.def.update(mission, dt);
}

// ============================================================ heat & police
function updateHeat(dt) {
  heat = Math.min(heat, 5.99);
  const s = stars();
  let near = false;
  for (const c of cars) if (c.ai === 'police' && dist(c.x, c.y, pp().x, pp().y) < 550) near = true;
  if (near) calmT = 0; else calmT += dt;
  if (heat > 0 && calmT > (s >= 1 ? 9 : 4)) { heat = heat - 1 < 1 ? 0 : heat - 1; calmT = 0; }
  if (mission && mission.def.id === 'bandit') { heat = 0; }
  const want = s === 0 ? 0 : Math.min(4, s);
  const active = cars.filter(c => c.ai === 'police');
  if (active.length < want && R() < dt * 1.5) {
    const c = spawnNpcCar(600, 1100, 'police', 'police', pp());
    if (c) { c.wp = null; c.speed = 0; }
  }
  if (want === 0) for (const c of active) c.ai = 'policeIdle';
  // busted
  const p = pp(), spd = player.car ? Math.abs(player.car.speed) : Math.hypot(player.vx, player.vy) * 0.3;
  let close = false;
  for (const c of cars) if (c.ai === 'police' && dist(c.x, c.y, p.x, p.y) < 62) close = true;
  if (close && spd < 45 && s >= 1) bustT += dt; else bustT = Math.max(0, bustT - dt);
  if (bustT > 1.5) busted();
}
function busted() {
  bustT = 0; const fine = Math.min(save.money, 100);
  save.money -= fine; writeSave(); heat = 0;
  for (const c of cars) if (c.ai === 'police') c.ai = 'policeIdle';
  if (mission) { const m = mission; mission = null; m.def.cleanup && m.def.cleanup(m); }
  for (const mk of markers) mk.cool = true;
  showBig('TATT!', `Politiet ga deg en bot på ${fine} kr. Kjør pent, Markus! 👮`, '#4da3ff', 4);
  AU.fail();
}

// ============================================================ main update
function update(dt) {
  time += dt; greetCool -= dt;
  const inp = readInput();
  if (player.car) updatePlayerCar(inp, dt); else updateFoot(inp, dt);
  for (const c of cars) {
    if (c === player.car) continue;
    if (c.ai === 'npc' || c.ai === 'bandit') updateNpc(c, dt);
    else if (c.ai === 'police' || c.ai === 'policeIdle') updatePolice(c, dt);
    else updateParked(c, dt);
  }
  carCollisions();
  for (const p of peds) updatePed(p, dt);
  updateMission(dt);
  updateMarkers();
  // coins
  const p = pp();
  for (let i = 0; i < COINS.length; i++) {
    if (save.coins.includes(i)) continue;
    const c = COINS[i];
    if (dist(p.x, p.y, c.x, c.y) < 38) {
      save.coins.push(i); addMoney(25, '🪙'); AU.coin();
      toast(`Gullmynt funnet! ${save.coins.length}/25 🪙`);
      if (save.coins.length === 25) { addMoney(500, 'BONUS'); showBig('ALLE MYNTENE!', 'Markus fant alle 25 gullmyntene! +500 kr', '#ffd60a'); }
    }
  }
  updateHeat(dt);
  // particles
  for (const q of parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.conf) { q.vx *= 0.97; q.vy *= 0.97; q.rot += dt * 8; } else if (!q.text) { q.vx *= 0.95; q.vy *= 0.95; } }
  parts = parts.filter(q => q.life > 0);
}
function populate() {
  // traffic & pedestrians around the camera
  cars = cars.filter(c => {
    if (c === player.car || c.fixed || c.owned) return true;
    if (mission && mission.data && c === mission.data.car) return true;
    const d = dist(c.x, c.y, cam.x, cam.y);
    if (c.ai === 'npc' || c.ai === 'bandit') return d < 1700;
    if (c.ai === 'policeIdle') return d < 950;
    if (c.ai === 'police') return d < 2200;
    if (c.keep) return d < 3500;
    return d < 1700;
  });
  const npcN = cars.filter(c => c.ai === 'npc').length;
  if (npcN < 15) spawnNpcCar(800, 1400);
  peds = peds.filter(p => p.keep || dist(p.x, p.y, cam.x, cam.y) < 1400);
  if (peds.length < 28) spawnPed(false);
}
function updateCamera(dt) {
  const p = pp();
  const lookX = player.car ? player.car.vx * 0.35 : 0, lookY = player.car ? player.car.vy * 0.35 : 0;
  const k = 1 - Math.exp(-5 * dt);
  cam.x += (p.x + lookX - cam.x) * k; cam.y += (p.y + lookY - cam.y) * k;
  const base = Math.min(VW, VH) / (player.car ? 560 : 470);
  const sp = player.car ? Math.abs(player.car.speed) : 0;
  const zt = clamp(base * (1 - Math.min(sp / 700, 1) * 0.28), 0.45, 2.2);
  cam.zoom += (zt - cam.zoom) * (1 - Math.exp(-2 * dt));
  cam.shake = Math.max(0, cam.shake - dt * 30);
}

// ============================================================ rendering
let view = { x0: 0, y0: 0, x1: 0, y1: 0 };
const inView = (x, y, m = 100) => x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m;
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const OBBYC = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const BLOCKC = ['#5fa83a', '#4e9330', '#7b5230', '#6a4526', '#8a8a8a', '#7a7a7a', '#5fa83a', '#6bb544'];

function drawGround() {
  const tx0 = Math.max(0, Math.floor(view.x0 / T)), tx1 = Math.min(MW - 1, Math.floor(view.x1 / T));
  const ty0 = Math.max(0, Math.floor(view.y0 / T)), ty1 = Math.min(MW - 1, Math.floor(view.y1 / T));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const i = ty * MW + tx, t = map[i], v = tvar[i], X = tx * T, Y = ty * T;
    switch (t) {
      case ROAD: ctx.fillStyle = '#4a4d52'; ctx.fillRect(X, Y, T + 0.5, T + 0.5); break;
      case WALK:
        ctx.fillStyle = '#c2c0b6'; ctx.fillRect(X, Y, T + 0.5, T + 0.5);
        ctx.fillStyle = '#adaba1'; ctx.fillRect(X, Y, T, 2); ctx.fillRect(X, Y, 2, T); ctx.fillRect(X + T / 2, Y, 1, T); ctx.fillRect(X, Y + T / 2, T, 1);
        break;
      case GRASS:
        ctx.fillStyle = '#5fae4a'; ctx.fillRect(X, Y, T + 0.5, T + 0.5);
        ctx.fillStyle = '#54a040'; ctx.fillRect(X + (v % 40) + 6, Y + ((v >> 2) % 40) + 6, 9, 6); ctx.fillRect(X + ((v * 7) % 44) + 4, Y + ((v * 3) % 44) + 10, 6, 5);
        if (v % 9 === 0) { ctx.fillStyle = pick(['#fff', '#ffd60a', '#ff4d6d'], () => (v % 3) / 3); ctx.fillRect(X + (v % 50) + 5, Y + ((v * 5) % 50) + 5, 4, 4); }
        break;
      case PLAZA:
        ctx.fillStyle = '#d9d2c3'; ctx.fillRect(X, Y, T + 0.5, T + 0.5);
        ctx.fillStyle = '#ccc4b3'; ctx.fillRect(X, Y, T, 1.5); ctx.fillRect(X, Y, 1.5, T);
        break;
      case WATER:
        ctx.fillStyle = '#2f7fd1'; ctx.fillRect(X, Y, T + 0.5, T + 0.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
        { const o = Math.sin(time * 2 + v) * 6; ctx.moveTo(X + 10 + o, Y + 20); ctx.lineTo(X + 26 + o, Y + 20); ctx.moveTo(X + 34 - o, Y + 44); ctx.lineTo(X + 52 - o, Y + 44); }
        ctx.stroke(); break;
      case OBBY: {
        ctx.fillStyle = OBBYC[(tx + ty) % 4]; ctx.fillRect(X, Y, T + 0.5, T + 0.5);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { ctx.beginPath(); ctx.arc(X + 16 + a * 32, Y + 16 + b * 32, 8, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case BLOCKG:
        for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { ctx.fillStyle = BLOCKC[(v + a * 7 + b * 13) % BLOCKC.length]; ctx.fillRect(X + a * 16, Y + b * 16, 16.5, 16.5); }
        break;
      case CHECK:
        for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { ctx.fillStyle = (a + b) % 2 ? '#222' : '#eee'; ctx.fillRect(X + a * 16, Y + b * 16, 16.5, 16.5); }
        break;
      case RAMP: {
        const under = getT(tx, ty - 1) === OBBY || getT(tx - 1, ty) === OBBY;
        ctx.fillStyle = under ? OBBYC[(tx + ty) % 4] : '#5fae4a'; ctx.fillRect(X, Y, T + 0.5, T + 0.5);
        ctx.fillStyle = '#f1c40f'; rrect(X + 6, Y + 6, T - 12, T - 12, 6); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.rect(X + 6, Y + 6, T - 12, T - 12); ctx.clip();
        ctx.fillStyle = '#222';
        for (let s = -T; s < T; s += 16) { ctx.beginPath(); ctx.moveTo(X + s, Y + T); ctx.lineTo(X + s + 8, Y + T); ctx.lineTo(X + s + 8 + T, Y); ctx.lineTo(X + s + T, Y); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⤴', X + T / 2, Y + T / 2);
        break;
      }
      default: ctx.fillStyle = '#555'; ctx.fillRect(X, Y, T + 0.5, T + 0.5);
    }
  }
  // quay edge
  ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 6; ctx.strokeRect(-3, -3, MW * T + 6, MW * T + 6);
}
function drawMarkings() {
  ctx.strokeStyle = 'rgba(240,240,240,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([22, 22]); ctx.beginPath();
  for (let i = 0; i < NN; i++) {
    const x = (i * P + 1) * T;
    for (let j = 0; j < NB; j++) {
      const y0 = (j * P + 2) * T, y1 = (j * P + 10) * T;
      if (x > view.x0 - T && x < view.x1 + T && y1 > view.y0 && y0 < view.y1) { ctx.moveTo(x, y0 + 10); ctx.lineTo(x, y1 - 10); }
      const hx0 = (j * P + 2) * T, hx1 = (j * P + 10) * T, hy = x;
      if (hy > view.y0 - T && hy < view.y1 + T && hx1 > view.x0 && hx0 < view.x1) { ctx.moveTo(hx0 + 10, hy); ctx.lineTo(hx1 - 10, hy); }
    }
  }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < NN; i++) for (let j = 0; j < NB; j++) {
    const rx = i * P * T, sy = (j * P + 2) * T, ey = (j * P + 10) * T;
    if (rx + 2 * T > view.x0 && rx < view.x1) for (const yy of [sy + 4, ey - 22]) if (yy > view.y0 - 30 && yy < view.y1) for (let k = 0; k < 8; k++) ctx.fillRect(rx + 6 + k * 15.5, yy, 8, 18);
    const ry = i * P * T, sx = (j * P + 2) * T, ex = (j * P + 10) * T;
    if (ry + 2 * T > view.y0 && ry < view.y1) for (const xx of [sx + 4, ex - 22]) if (xx > view.x0 - 30 && xx < view.x1) for (let k = 0; k < 8; k++) ctx.fillRect(xx, ry + 6 + k * 15.5, 18, 8);
  }
}
function drawSkids() {
  ctx.strokeStyle = 'rgba(20,20,20,0.35)'; ctx.lineWidth = 4; ctx.beginPath();
  for (const s of skids) { if (!inView(s[0], s[1], 20)) continue; ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
  ctx.stroke();
}
function label(text, x, y, size = 13, color = '#fff') {
  ctx.font = `bold ${size}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function drawMarkers() {
  for (const m of markers) {
    if (!m.vis() || !inView(m.x, m.y)) continue;
    const pulse = Math.sin(time * 4) * 4;
    ctx.fillStyle = m.color + '55'; ctx.beginPath(); ctx.arc(m.x, m.y, 38 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = m.color; ctx.stroke();
    ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(m.icon, m.x, m.y - 8 + Math.sin(time * 3) * 5);
    label(m.label(), m.x, m.y + 30, 13);
  }
}
function drawCoins() {
  for (let i = 0; i < COINS.length; i++) {
    if (save.coins.includes(i)) continue;
    const c = COINS[i]; if (!inView(c.x, c.y)) continue;
    const sx = Math.cos(time * 3 + i);
    ctx.save(); ctx.translate(c.x, c.y + Math.sin(time * 2 + i) * 3); ctx.scale(Math.max(0.15, Math.abs(sx)), 1);
    ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8860b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', 0, 1);
    ctx.restore();
  }
}
function drawMissionWorld() {
  if (!mission) return;
  const m = mission;
  if (m.def.id === 'diamonds') for (const it of m.data.items) {
    if (it.taken || !inView(it.x, it.y)) continue;
    ctx.save(); ctx.translate(it.x, it.y + Math.sin(time * 3) * 4); ctx.rotate(Math.sin(time * 2) * 0.2);
    ctx.fillStyle = 'rgba(76,201,240,0.3)'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4cc9f0'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(12, -3); ctx.lineTo(0, 15); ctx.lineTo(-12, -3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#bdf0ff'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(6, -3); ctx.lineTo(0, 4); ctx.lineTo(-6, -3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  if (m.def.id === 'race') for (let k = m.data.k + 1; k < m.data.cps.length; k++) {
    const c = m.data.cps[k]; if (!inView(c.x, c.y)) continue;
    ctx.strokeStyle = 'rgba(255,214,10,0.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, 60, 0, Math.PI * 2); ctx.stroke();
  }
  const t = m.target;
  if (t && inView(t.x, t.y) && !(m.def.id === 'bandit')) {
    const r = m.def.id === 'race' ? 70 : 50;
    ctx.fillStyle = 'rgba(255,214,10,0.25)'; ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 5; ctx.stroke();
    if (m.def.id === 'race' && m.data.k === m.data.cps.length - 1) label('🏁 MÅL', t.x, t.y, 20);
  }
}
function drawPerson(x, y, angle, o, isMarkus) {
  ctx.save(); ctx.translate(x, y);
  let a = angle, sc = 1;
  if (isMarkus && player.dance > 0) { a += Math.sin(time * 12) * 0.9; sc = 1 + Math.abs(Math.sin(time * 12)) * 0.12; }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(3, 4, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(a); ctx.scale(sc, sc);
  const s = Math.sin(o.anim) * 5;
  ctx.fillStyle = o.pants; ctx.fillRect(-3 + s, -7, 8, 5); ctx.fillRect(-3 - s, 2, 8, 5);
  ctx.fillStyle = o.shirt; ctx.beginPath(); ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2); ctx.fill();
  const armOut = isMarkus && player.dance > 0 ? 6 : 0;
  ctx.fillStyle = o.skin; ctx.beginPath(); ctx.arc(-s * 0.7 + armOut, -11 - armOut * 0.5, 3, 0, Math.PI * 2); ctx.arc(s * 0.7 + armOut, 11 + armOut * 0.5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.fill();
  if (isMarkus) {
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-1, 0, 6.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(3, -5, 7, 10);
    ctx.fillStyle = '#ffd60a'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.save(); ctx.rotate(Math.PI / 2); ctx.fillText('M', 0, 1); ctx.restore();
  } else {
    ctx.fillStyle = o.hair; ctx.beginPath(); ctx.arc(0, 0, 6.8, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  }
  ctx.restore();
}
const MARKUS_LOOK = { shirt: '#1d4ed8', pants: '#222', skin: '#f1c27d', hair: '#5a3825', anim: 0 };
function drawCar(c) {
  const ty = CT[c.type], w = ty.w, h = ty.h, z = c.z || 0, sc = 1 + z * 0.6;
  ctx.save(); ctx.translate(c.x + 5 + z * 30, c.y + 6 + z * 30); ctx.rotate(c.angle);
  ctx.fillStyle = `rgba(0,0,0,${0.3 - z * 0.12})`; rrect(-w / 2, -h / 2, w, h, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle); ctx.scale(sc, sc);
  // wheels
  ctx.fillStyle = '#111';
  if (c.type === 'monster') { for (const sx of [-1, 1]) for (const sy of [-1, 1]) { rrect(sx * w * 0.3 - 9, sy * (h / 2 + 2) - 6, 18, 12, 4); ctx.fill(); } }
  else for (const sx of [-1, 1]) for (const sy of [-1, 1]) ctx.fillRect(sx * w * 0.3 - 6, sy * h / 2 - 2, 12, 4);
  // body
  ctx.fillStyle = c.color; rrect(-w / 2, -h / 2, w, h, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  if (c.type === 'police') {
    ctx.fillStyle = '#1d3557'; ctx.fillRect(-w / 2 + 4, -h / 2, w - 8, 4); ctx.fillRect(-w / 2 + 4, h / 2 - 4, w - 8, 4);
    ctx.fillStyle = '#ffd60a'; for (let k = 0; k < 5; k++) { ctx.fillRect(-w / 2 + 6 + k * 8, -h / 2, 4, 4); ctx.fillRect(-w / 2 + 6 + k * 8, h / 2 - 4, 4, 4); }
  }
  if (c.type === 'bandit') { ctx.fillStyle = '#7a5a1a'; for (const [a, b] of [[-14, -5], [-4, 6], [10, -4], [16, 5]]) { ctx.beginPath(); ctx.arc(a, b, 2.5, 0, Math.PI * 2); ctx.fill(); } }
  if (c.type === 'rocket') { ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2 - 8, -h / 2 - 6); ctx.lineTo(-w / 2 + 10, -h / 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2 - 8, h / 2 + 6); ctx.lineTo(-w / 2 + 10, h / 2); ctx.fill(); }
  if (c.type === 'gold') { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-w / 2 + 4 + ((time * 40) % (w - 10)), -h / 2 + 2, 4, h - 4); }
  // windows + roof
  ctx.fillStyle = '#1d2b3a'; ctx.fillRect(w * 0.04, -h / 2 + 3, w * 0.18, h - 6); ctx.fillRect(-w * 0.34, -h / 2 + 3, w * 0.1, h - 6);
  ctx.fillStyle = c.type === 'police' ? '#fff' : shade(c.color, 1.15); ctx.fillRect(-w * 0.24, -h / 2 + 3, w * 0.28, h - 6);
  if (c.type === 'van') { ctx.fillStyle = shade(c.color, 0.9); ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w * 0.62, h - 6); }
  if (c.type === 'taxi') { ctx.fillStyle = '#222'; ctx.fillRect(-w * 0.12, -5, 10, 10); ctx.fillStyle = '#ffd60a'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('T', -w * 0.12 + 5, 0.5); }
  if (c.type === 'police') {
    const f = Math.floor(time * 8) % 2;
    ctx.fillStyle = f ? '#ff2d2d' : '#2d6bff'; ctx.fillRect(-w * 0.14, -h / 2 + 3, 6, (h - 6) / 2);
    ctx.fillStyle = f ? '#2d6bff' : '#ff2d2d'; ctx.fillRect(-w * 0.14, 0, 6, (h - 6) / 2);
    if (c.ai === 'police') { ctx.fillStyle = f ? 'rgba(255,45,45,0.25)' : 'rgba(45,107,255,0.25)'; ctx.beginPath(); ctx.arc(-w * 0.1, 0, 34, 0, Math.PI * 2); ctx.fill(); }
  }
  if (c.type === 'bandit') { ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍌', -w * 0.1, 0); }
  // lights
  ctx.fillStyle = '#fff6a0'; ctx.fillRect(w / 2 - 4, -h / 2 + 2, 4, 5); ctx.fillRect(w / 2 - 4, h / 2 - 7, 4, 5);
  ctx.fillStyle = c.speed < -5 ? '#fff' : '#ff3030'; ctx.fillRect(-w / 2, -h / 2 + 2, 3, 5); ctx.fillRect(-w / 2, h / 2 - 7, 3, 5);
  ctx.restore();
}
function drawBuilding(b) {
  const k = b.k, cx = view.cx, cy = view.cy;
  const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
  const rx0 = x0 + (x0 - cx) * k, ry0 = y0 + (y0 - cy) * k, rx1 = x1 + (x1 - cx) * k, ry1 = y1 + (y1 - cy) * k;
  const quad = (ax, ay, bx, by, cx2, cy2, dx, dy, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.lineTo(dx, dy); ctx.closePath(); ctx.fill(); };
  const floors = (ax, ay, bx, by, cx2, cy2, dx, dy) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.beginPath();
    const n = Math.max(1, Math.round(k * 10));
    for (let i = 1; i <= n; i++) { const t = i / (n + 1); ctx.moveTo(lerp(ax, dx, t), lerp(ay, dy, t)); ctx.lineTo(lerp(bx, cx2, t), lerp(by, cy2, t)); }
    ctx.stroke();
  };
  if (cy < y0) { quad(x0, y0, x1, y0, rx1, ry0, rx0, ry0, b.wN); floors(x0, y0, x1, y0, rx1, ry0, rx0, ry0); }
  if (cy > y1) { quad(x0, y1, x1, y1, rx1, ry1, rx0, ry1, b.wS); floors(x0, y1, x1, y1, rx1, ry1, rx0, ry1); }
  if (cx < x0) { quad(x0, y0, x0, y1, rx0, ry1, rx0, ry0, b.wW); floors(x0, y0, x0, y1, rx0, ry1, rx0, ry0); }
  if (cx > x1) { quad(x1, y0, x1, y1, rx1, ry1, rx1, ry0, b.wE); floors(x1, y0, x1, y1, rx1, ry1, rx1, ry0); }
  const rw = rx1 - rx0, rh = ry1 - ry0;
  if (b.pix) {
    const n = Math.round(b.w / 16);
    for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) { ctx.fillStyle = shade(b.roof, 0.85 + ((a * 7 + c * 13) % 5) * 0.07); ctx.fillRect(rx0 + a * rw / n, ry0 + c * rh / n, rw / n + 0.5, rh / n + 0.5); }
  } else {
    ctx.fillStyle = b.roof; ctx.fillRect(rx0, ry0, rw, rh);
    ctx.strokeStyle = b.edge; ctx.lineWidth = 5; ctx.strokeRect(rx0 + 2.5, ry0 + 2.5, rw - 5, rh - 5);
    ctx.fillStyle = b.detC;
    for (const d of b.det) { const s = d[2] * Math.min(rw, rh); ctx.fillRect(rx0 + d[0] * rw, ry0 + d[1] * rh, s, s); }
  }
  if (b.heli) {
    const hx = rx0 + rw / 2, hy = ry0 + rh / 2, r = Math.min(rw, rh) * 0.28;
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd60a'; ctx.font = `bold ${r * 1.1}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', hx, hy + 2);
  }
  if (b.sign) {
    const fs = Math.min(rh * 0.32, rw / (b.sign.length * 0.62), 44);
    ctx.font = `900 ${fs}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, fs / 7); ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(b.sign, rx0 + rw / 2, ry0 + rh / 2);
    ctx.fillStyle = b.signColor; ctx.fillText(b.sign, rx0 + rw / 2, ry0 + rh / 2);
  }
}
function drawTree(t) {
  const cx = view.cx, cy = view.cy;
  const x = t.x + (t.x - cx) * t.k, y = t.y + (t.y - cy) * t.k, r = t.r * (1 + t.k);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(t.x + 8, t.y + 8, t.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = t.c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, Math.PI * 2); ctx.fill();
}
function drawBubbles(dt) {
  for (const b of bubbles) {
    b.t -= dt;
    const e = b.ent; const x = e.x, y = e.y - 34 - (e.z || 0) * 20;
    if (!inView(x, y)) continue;
    ctx.font = 'bold 14px system-ui, sans-serif';
    const w = ctx.measureText(b.text).width + 16, h = 24, a = Math.min(1, b.t * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff'; rrect(x - w / 2, y - h, w, h, 10); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y - 1); ctx.lineTo(x, y + 8); ctx.lineTo(x + 6, y - 1); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, x, y - h / 2);
    ctx.globalAlpha = 1;
  }
  bubbles = bubbles.filter(b => b.t > 0);
}
function drawParticles() {
  for (const q of parts) {
    if (!inView(q.x, q.y, 30)) continue;
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a;
    if (q.text) { label(q.text, q.x, q.y, q.size, q.color); }
    else if (q.conf) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.color; ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); ctx.restore(); }
    else { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function drawArrow(dt) {
  // screen-space pointer to mission target (or bandit)
  if (!mission || !mission.target) return;
  const t = mission.target;
  const sx = (t.x - view.cx) * cam.zoom + VW / 2, sy = (t.y - view.cy) * cam.zoom + VH / 2;
  const m = 46;
  if (sx > m && sx < VW - m && sy > m && sy < VH - m) {
    // bouncing arrow above target
    const by = sy - 60 - Math.abs(Math.sin(time * 5)) * 14;
    ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx - 16, by - 18); ctx.lineTo(sx + 16, by - 18); ctx.lineTo(sx, by + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    return;
  }
  const cx = VW / 2, cy = VH / 2, a = Math.atan2(sy - cy, sx - cx);
  // keep the arrow inside a rectangle that avoids the HUD corners and buttons
  const left = 60, right = VW - 60, top = Math.min(130, VH * 0.3), bottom = VH - Math.min(140, VH * 0.3);
  const ca = Math.cos(a), sa = Math.sin(a);
  const tx = ca > 0 ? (right - cx) / ca : ca < 0 ? (left - cx) / ca : 1e9;
  const ty = sa > 0 ? (bottom - cy) / sa : sa < 0 ? (top - cy) / sa : 1e9;
  const tt = Math.min(tx, ty), ex = cx + ca * tt, ey = cy + sa * tt;
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
  ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-12, -18); ctx.lineTo(-4, 0); ctx.lineTo(-12, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  const p = pp(); const meters = Math.round(dist(p.x, p.y, t.x, t.y) / 8);
  ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(meters + ' m', ex - Math.cos(a) * 34, ey - Math.sin(a) * 34);
  ctx.fillStyle = '#fff'; ctx.fillText(meters + ' m', ex - Math.cos(a) * 34, ey - Math.sin(a) * 34);
}
function render(dt) {
  const s = cam.zoom * DPR, cw = cv.width, ch = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2f7fd1'; ctx.fillRect(0, 0, cw, ch);
  const cx = cam.x + (R() - 0.5) * cam.shake, cy = cam.y + (R() - 0.5) * cam.shake;
  ctx.setTransform(s, 0, 0, s, cw / 2 - cx * s, ch / 2 - cy * s);
  const hw = cw / 2 / s, hh = ch / 2 / s;
  view = { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh, cx, cy };
  drawGround(); drawMarkings(); drawSkids(); drawMarkers(); drawCoins(); drawMissionWorld();
  for (const p of peds) if (inView(p.x, p.y)) {
    drawPerson(p.x, p.y, p.angle, p, false);
    if (p.state === 'wait') { ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText('🙋', p.x, p.y - 26 + Math.sin(time * 6) * 3); }
    if (p.state === 'scared' || p.state === 'flee') label('!', p.x, p.y - 22, 18, '#ffd60a');
  }
  for (const c of cars) if (c.z < 0.05 && inView(c.x, c.y)) drawCar(c);
  if (!player.car) drawPerson(player.x, player.y, player.angle, Object.assign(MARKUS_LOOK, { anim: player.anim }), true);
  const vis = blds.filter(b => b.x + b.w > view.x0 - 300 && b.x < view.x1 + 300 && b.y + b.h > view.y0 - 300 && b.y < view.y1 + 300);
  vis.sort((a, b) => dist(b.x + b.w / 2, b.y + b.h / 2, cx, cy) - dist(a.x + a.w / 2, a.y + a.h / 2, cx, cy));
  for (const b of vis) drawBuilding(b);
  for (const t of trees) if (inView(t.x, t.y, 60)) drawTree(t);
  for (const c of cars) if (c.z >= 0.05 && inView(c.x, c.y)) drawCar(c);
  drawParticles(); drawBubbles(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (state === 'play') drawArrow(dt);
}
function drawRadar() {
  const S = 150, sc = MMS / T, p = pp();
  rctx.setTransform(2, 0, 0, 2, 0, 0);
  rctx.fillStyle = '#2f7fd1'; rctx.fillRect(0, 0, S, S);
  const ox = S / 2 - p.x * sc, oy = S / 2 - p.y * sc;
  rctx.drawImage(mmBase, ox, oy);
  const edge = (x, y, rad) => { let dx = x - S / 2, dy = y - S / 2; const l = Math.hypot(dx, dy); if (l > rad) { dx *= rad / l; dy *= rad / l; } return [S / 2 + dx, S / 2 + dy]; };
  rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
  for (const m of markers) {
    if (!m.vis()) continue;
    const [x, y] = edge(ox + m.x * sc, oy + m.y * sc, 64);
    rctx.font = '13px serif'; rctx.fillText(m.icon, x, y);
  }
  for (const c of cars) {
    if (c.ai === 'police') { rctx.fillStyle = Math.floor(time * 6) % 2 ? '#ff2d2d' : '#2d6bff'; const [x, y] = edge(ox + c.x * sc, oy + c.y * sc, 70); rctx.beginPath(); rctx.arc(x, y, 3.5, 0, Math.PI * 2); rctx.fill(); }
  }
  if (mission && mission.target) {
    const [x, y] = edge(ox + mission.target.x * sc, oy + mission.target.y * sc, 66);
    rctx.fillStyle = '#ffd60a'; rctx.strokeStyle = '#000'; rctx.lineWidth = 1.5;
    rctx.beginPath(); rctx.arc(x, y, 5 + Math.sin(time * 6), 0, Math.PI * 2); rctx.fill(); rctx.stroke();
  }
  const a = player.car ? player.car.angle : player.angle;
  rctx.save(); rctx.translate(S / 2, S / 2); rctx.rotate(a);
  rctx.fillStyle = '#fff'; rctx.strokeStyle = '#000'; rctx.lineWidth = 1.5;
  rctx.beginPath(); rctx.moveTo(7, 0); rctx.lineTo(-5, -5); rctx.lineTo(-2, 0); rctx.lineTo(-5, 5); rctx.closePath(); rctx.fill(); rctx.stroke();
  rctx.restore();
}

// ============================================================ HUD
const hudCache = {};
function setHud(id, val, fn) { if (hudCache[id] === val) return; hudCache[id] = val; fn(val); }
function updateHud(dt) {
  setHud('money', save.money, v => { $('money').textContent = fmt(v) + ' kr'; });
  const s = stars(), chasing = cars.some(c => c.ai === 'police');
  setHud('stars', s + (chasing ? 'c' : ''), () => { const sp = $('stars').children; for (let i = 0; i < 5; i++) sp[i].classList.toggle('on', i < s); $('stars').classList.toggle('flash', chasing); });
  setHud('obj', mission ? mission.text : '', v => { $('objective').textContent = v; $('objective').classList.toggle('hidden', !v); });
  const tm = mission && mission.timer !== null ? Math.max(0, Math.ceil(mission.timer)) : -1;
  setHud('timer', tm, v => { const el = $('timer'); el.classList.toggle('hidden', v < 0); el.textContent = Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'); el.classList.toggle('low', v <= 10); });
  let hint = '';
  if (!player.car) {
    let near = false; for (const c of cars) if (c.ai !== 'bandit' && dist(c.x, c.y, player.x, player.y) < 75) near = true;
    bCar.classList.toggle('glow', near);
    if (near) hint = 'Trykk 🚗 for å kjøre!';
  } else bCar.classList.remove('glow');
  setHud('hint', hint, v => { $('hint').textContent = v; $('hint').classList.toggle('hidden', !v); });
  setHud('turbo', player.car ? Math.round(player.turboFuel * 20) : -1, v => { $('turboBar').classList.toggle('hidden', v < 0); $('turboFill').style.width = (v * 5) + '%'; });
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.add('hidden'); }
  if (bigT > 0) { bigT -= dt; if (bigT <= 0) $('big').classList.add('hidden'); }
}

// ============================================================ loop
let last = performance.now(), popT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    if (!isPaused()) {
      const n = Math.ceil(dt / (1 / 60)), sdt = dt / n;
      for (let i = 0; i < n; i++) update(sdt);
      popT -= dt; if (popT <= 0) { popT = 0.25; populate(); }
      updateCamera(dt);
    }
    render(isPaused() ? 0 : dt); drawRadar(); updateHud(dt);
  } else {
    // title: slow fly-over of the city
    time += dt;
    cam.x = (MW * T) / 2 + Math.cos(time * 0.05) * 1400; cam.y = (MW * T) / 2 + Math.sin(time * 0.05) * 1400;
    cam.zoom = Math.min(VW, VH) / 700;
    for (const c of cars) if (c.ai === 'npc') updateNpc(c, dt);
    popT -= dt; if (popT <= 0) { popT = 0.25; populate(); }
    render(dt);
  }
  AU.update(dt);
  requestAnimationFrame(frame);
}

function startGame() {
  AU.init(); goFullscreen();
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); $('controls').classList.remove('hidden');
  state = 'play'; initWorld(); updateButtons();
  if (!save.intro) {
    save.intro = true; writeSave();
    showDialog([
      ['📱', 'Pappa', 'Hei Markus! Velkommen til Markus City. Byen er din! 😎'],
      ['📱', 'Pappa', 'Bruk joysticken til venstre for å gå. Gå bort til den oransje bilen og trykk 🚗 for å kjøre.'],
      ['📱', 'Pappa', 'Kjør til de store sirklene for å få oppdrag og tjene penger. De vises på kartet oppe til venstre.'],
      ['📱', 'Pappa', 'Kjør pent! Krasjer du mye, kommer politiet 🚓. Blir du jaget, kan du lakkere bilen i garasjen 🎨.'],
      ['📱', 'Pappa', 'PS: Det er gjemt 25 gullmynter rundt i byen 🪙 Finner du alle? Lykke til!'],
    ]);
  } else toast('Velkommen tilbake, Markus! 😎', 3);
}
$('playBtn').addEventListener('click', startGame);
if (hasSave && save.intro) { $('newBtn').classList.remove('hidden'); $('playBtn').textContent = 'FORTSETT'; }
$('newBtn').addEventListener('click', () => { save = JSON.parse(JSON.stringify(DEFAULT_SAVE)); writeSave(); startGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !menuOpen && !dialogOpen) openPause(); });

// title background traffic
for (let i = 0; i < 30; i++) spawnNpcCar(0, 2600);
// #demo: start directly in a car (used for screenshots/testing)
if (location.hash.startsWith('#demo')) {
  save.intro = true; startGame();
  const c = cars.find(x => x.owned); enterCar(c);
  if (location.hash === '#demo-drive') { c.speed = 300; c.angle = Math.PI / 2; }
  if (location.hash === '#demo-foot') { exitCar(); player.x = places.pizza.x; player.y = places.pizza.y + 90; cam.x = player.x; cam.y = player.y; player.dance = 30; }
  if (location.hash === '#demo-mission') { exitCar(); enterCar(c); c.x = places.race.x; c.y = places.race.y + 120; startMission(MDEF.race); }
}
requestAnimationFrame(frame);
})();
