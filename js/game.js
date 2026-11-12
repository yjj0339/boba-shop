// 核心玩法：存档、制作、顾客、店员、经济、日循环
import { ING, RECIPES, SHOP, UPGRADES, DECOR, THEMES, ACHS, SEQ, WEATHERS, SHOPS, CTYPES, BRANCHES, SCENES, HIRE_COST, RSTAR } from './data.js';
import { L } from './world.js';

const KEY = 'boba-shop-save-v1';
export const DAY_LEN = 150;
export const hooks = { toast() {}, float() {}, sfx() {}, levelUp() {}, summary() {}, confetti() {}, celebrate() {} };
let W = null;

function fresh() {
  return {
    v: 1, coins: 60, day: 1, level: 1, xp: 0, rep: 2.5, shop: 1, scene: 'town', scenes: { town: 1 }, rlv: {}, branch: {}, lastDay: '', streak: 0,
    stock: { black: 3, milk: 20, pearl: 2 }, urn: {}, cooked: 0, up: {}, decor: {}, themes: { cream: 1 }, theme: 'cream',
    stats: { served: 0, earned: 0, bestCombo: 0, perfect: 0, vip: 0, tips: 0, lost: 0, horse: 0, staff: 0 }, ach: {}, set: { sfx: 1, music: 1, guide: 1 },
  };
}
function load() {
  const f = fresh();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.v === 1) { for (const k in f) if (s[k] == null) s[k] = f[k]; for (const k in f.stats) if (s.stats[k] == null) s.stats[k] = 0; s.had = true; return s; }
  } catch (e) { /* ignore */ }
  return f;
}
export const S = load();
export const R = {
  phase: 'title', paused: false, t: 0, prog: 0, customers: [], slots: [], waits: [], seats: [],
  held: null, shelf: [], brew: {}, cook: null, seal: null, combo: 0, today: null, goals: [], spawnT: 3, weather: WEATHERS[0], rush: 1, buzz: 0,
  coins: [], near: null, hint: null, player: { x: 0, z: 1.6, rot: Math.PI, moving: false }, dirty: true, cid: 0, catT: 0, staff: [], waiter: null,
};
const lv = (id) => S.up[id] || 0;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dirty = () => { R.dirty = true; };
const stockOf = (id) => S.stock[id] || 0;
const shop = () => SHOPS[S.shop - 1];
const FX = { urn: 'tea', stove: 'cooker', sealer: 'sealer', shelf: 'shelf', shoes: 'player' };

export const G = {
  init(w) { W = w; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } },
  reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } location.reload(); },
  lv, shop,
  speed: () => 3.3 * (1 + 0.1 * lv('shoes')),
  urnCap: () => 6 + 2 * lv('urn'),
  brewTime: () => 7 * (1 - 0.18 * lv('stove')) * (lv('cat') >= 3 ? 0.5 : 1),
  cookTime: () => 9 * (1 - 0.18 * lv('stove')) * (lv('cat') >= 3 ? 0.5 : 1),
  sealTime: () => 1.5 - 0.38 * lv('sealer'),
  charm: () => DECOR.reduce((a, d) => a + (S.decor[d.id] ? d.charm : 0), 0) + (Object.keys(S.scenes).length - 1) * 3 + (S.shop - 1) * 2,
  priceMul: () => 1 + 0.08 * lv('quality') + Math.max(0, S.level - 24) * 0.01,
  price: (r) => Math.round(r.price * (1 + 0.12 * (S.rlv[r.id] || 0)) * G.priceMul()),
  tipMul: () => (1 + 0.2 * lv('tipjar')) * (1 + 0.03 * G.charm()) * R.weather.tip,
  patienceMax: () => 44 * (1 + 0.12 * lv('sofa')) * R.weather.pat * Math.max(0.75, 1 - S.day * 0.006),
  arrivalGap() {
    const m = (0.62 + S.rep * 0.14) * (1 + 0.12 * lv('sign')) * (1 + 0.02 * G.charm()) * (1 + Math.min(0.7, S.day * 0.035)) * (1 + 0.22 * (S.shop - 1)) * R.weather.arr * R.rush * (R.buzz > 0 ? 1.5 : 1);
    return Math.min(12, Math.max(2.3 - S.shop * 0.25, 8.2 / m));
  },
  xpNeed: () => Math.round(60 + S.level * 45 + Math.max(0, S.level - 12) * 30),
  recipes: () => RECIPES.filter((r) => r.lv <= S.level),
  unlocked() { const s = new Set(); for (const r of RECIPES) if (r.lv <= S.level) r.items.forEach((i) => s.add(i)); return s; },
  avail: (id) => (ING[id].type === 'tea' ? S.urn[id] || 0 : id === 'pearl' ? S.cooked : id === 'ice' ? 99 : stockOf(id)),
  rank: () => shop().name,
  upCost(u) { return u.id === 'hire' ? HIRE_COST[lv('hire')] : Math.round(u.base * Math.pow(u.g, lv(u.id)) / 10) * 10; },
  recCost(r) { const l = S.rlv[r.id] || 0; return Math.round(r.price * 16 * Math.pow(l + 1, 1.75) / 10) * 10; },
  branchCost(b) { const l = S.branch[b.id] || 0; return l ? Math.round(b.cost * 0.6 * l) : b.cost; },
  branchIncome: () => BRANCHES.reduce((a, b) => a + b.inc * (S.branch[b.id] || 0), 0),
  wages: () => lv('hire') * (30 + 15 * lv('train')) + lv('waiter') * 25 + (lv('cat') ? 15 : 0),
  cupName(cup) {
    const r = RECIPES.find((x) => x.items.length === cup.items.length && x.items.every((i) => cup.items.includes(i)));
    return r ? r.name : cup.items.length ? '特调' : '空杯';
  },
  lowStock() {
    const un = G.unlocked(); let n = 0;
    for (const id of un) { if (id === 'ice') continue; const t = ING[id].type === 'tea' || id === 'pearl'; if (stockOf(id) <= (t ? 0 : 2)) n++; }
    return n;
  },

  // ---------- 流程 ----------
  begin() {
    R.phase = 'prep'; G.resetRoom(); G.prepDay();
    const d = new Date().toDateString();
    if (S.lastDay !== d) {
      const y = new Date(Date.now() - 864e5).toDateString();
      S.streak = S.lastDay === y ? Math.min(7, (S.streak || 0) + 1) : 1; S.lastDay = d;
      const r = Math.round(30 * S.streak * (0.5 + S.shop * 0.5) * G.priceMul() / 5) * 5; S.coins += r;
      setTimeout(() => hooks.celebrate({ emo: '🎁', title: `每日开业红包 +${r}`, sub: `连续登录第 ${S.streak} 天（连续 7 天奖励最高）` }), 600);
      G.save();
    }
  },
  resetRoom() {
    R.slots = L.SLOTS.map(() => null); R.waits = L.WAITS.map(() => null); R.seats = L.SEATS.map(() => null);
    G.syncStaff();
  },
  prepDay() {
    R.t = 0; R.prog = 0; R.combo = 0; R.spawnT = 2.5; R.rush = 1; R.buzz = 0;
    R.today = { income: 0, tips: 0, cost: 0, served: 0, lost: 0, perfect: 0, wrong: 0, bestCombo: 0, tipsCollected: 0, vip: 0, staff: 0 };
    const ws = WEATHERS.filter((w) => w.minDay <= S.day); let tot = ws.reduce((a, w) => a + w.w, 0) * Math.random();
    R.weather = S.day === 1 ? WEATHERS[0] : ws.find((w) => (tot -= w.w) < 0) || WEATHERS[0];
    G.genGoals(); dirty();
  },
  openDoor() {
    if (R.phase !== 'prep') return;
    R.phase = 'open'; hooks.sfx('bell'); hooks.toast(`第 ${S.day} 天开门营业！${R.weather.emo} ${R.weather.name}：${R.weather.desc}`); dirty();
  },
  genGoals() {
    const d = S.day, recs = G.recipes(), avg = recs.reduce((a, r) => a + G.price(r), 0) / recs.length;
    const est = DAY_LEN / G.arrivalGap() * 0.75;
    const pool = [
      { type: 'served', target: Math.round(est * 0.7), text: (n) => `卖出 ${n} 杯奶茶` },
      { type: 'income', target: Math.round(est * avg * 0.65 / 10) * 10, text: (n) => `营业额达到 ${n}` },
      { type: 'bestCombo', target: Math.min(4 + Math.floor(d / 2), 18), text: (n) => `亲手达成 ${n} 连击` },
      { type: 'perfect', target: Math.round(est * 0.55), text: (n) => `完美出杯 ${n} 次` },
      { type: 'tipsCollected', target: Math.min(2 + Math.floor(d / 3), 6), text: (n) => `收到 ${n} 次桌上小费` },
      { type: 'vip', target: 1 + Math.floor(S.shop / 2), text: (n) => `服务 ${n} 位贵客（富豪/大亨）`, need: S.level >= 3 },
    ].filter((g) => g.need !== false);
    pool.sort(() => Math.random() - 0.5);
    R.goals = pool.slice(0, 3).map((g) => ({ ...g, target: Math.max(1, g.target), reward: Math.round((25 + d * 12) * G.priceMul() * (0.6 + S.shop * 0.4) / 5) * 5, done: false }));
  },
  tick() {
    for (const g of R.goals) if (!g.done && R.today[g.type] >= g.target) {
      g.done = true; S.coins += g.reward; hooks.sfx('level'); hooks.toast(`🎯 目标达成：${g.text(g.target)}　+${g.reward} 💰`);
    }
    for (const a of ACHS) if (!S.ach[a.id] && a.ok(S)) { S.ach[a.id] = 1; S.coins += a.r; hooks.sfx('level'); hooks.toast(`🏆 成就「${a.name}」　+${a.r} 💰`); }
    dirty();
  },
  addXp(n) {
    S.xp += n; const got = [];
    while (S.xp >= G.xpNeed()) {
      S.xp -= G.xpNeed(); S.level++;
      const before = new Set(); RECIPES.filter((r) => r.lv < S.level).forEach((r) => r.items.forEach((i) => before.add(i)));
      const recs = RECIPES.filter((r) => r.lv === S.level);
      for (const r of recs) for (const i of r.items) if (!before.has(i) && SHOP[i]) { S.stock[i] = stockOf(i) + SHOP[i].n * (ING[i].type === 'tea' ? 2 : 1); before.add(i); }
      const bonus = recs.length ? 0 : 100 + S.level * 30; S.coins += bonus;
      got.push({ level: S.level, recs, bonus });
    }
    if (got.length) { hooks.sfx('level'); hooks.confetti(); hooks.levelUp(got[got.length - 1]); }
  },
  endDay() {
    const t = R.today, total = t.served + t.lost;
    const sat = total ? (t.perfect + 0.4 * t.wrong) / total : 0;
    const stars = total === 0 ? 1 : sat > 0.92 ? 5 : sat > 0.78 ? 4 : sat > 0.6 ? 3 : sat > 0.4 ? 2 : 1;
    const bonus = stars === 5 ? 20 + S.day * 10 : stars === 4 ? 10 + S.day * 4 : 0;
    const wages = Math.min(G.wages(), S.coins + bonus), branch = G.branchIncome();
    S.coins += bonus + branch - wages; S.stats.earned += branch; S.rep = Math.min(5, Math.max(0.5, S.rep + (stars - 3) * 0.12));
    const wasted = Object.values(S.urn).reduce((a, b) => a + b, 0) + S.cooked;
    S.urn = {}; S.cooked = 0; R.brew = {}; R.cook = null;
    for (const c of R.coins) W.remove(c.mesh); R.coins = [];
    for (const b of R.staff) G.staffIdle(b);
    const sum = { day: S.day, ...t, stars, bonus, wasted, wages, branch, goals: R.goals.filter((g) => g.done).length, profit: t.income + t.tips + branch - t.cost - wages };
    S.day++; R.phase = 'summary'; G.tick(); G.save(); hooks.sfx('level'); hooks.summary(sum);
  },
  nextDay() { R.phase = 'prep'; G.prepDay(); },

  // ---------- 进货 / 升级 ----------
  pay(cost) { if (S.coins < cost) { hooks.sfx('bad'); hooks.toast('金币不够啦'); return false; } S.coins -= cost; return true; },
  buy(id, times = 1, quiet) {
    const it = SHOP[id], cost = it.cost * times;
    if (S.coins < cost) { if (!quiet) { hooks.sfx('bad'); hooks.toast('金币不够啦'); } return false; }
    S.coins -= cost; S.stock[id] = stockOf(id) + it.n * times; if (R.today) R.today.cost += cost;
    if (!quiet) hooks.sfx('coin'); dirty(); return true;
  },
  upgrade(id) {
    const u = UPGRADES.find((x) => x.id === id);
    if (lv(id) >= u.max) return;
    if (id === 'hire' && lv('hire') >= shop().staff) { hooks.sfx('bad'); hooks.toast('店面站不下更多店员了，先扩建店铺吧'); return; }
    if (!G.pay(G.upCost(u))) return;
    S.up[id] = lv(id) + 1; hooks.sfx('level');
    hooks.celebrate({ emo: u.emo, title: id === 'hire' ? `新奶茶师入职！` : `${u.name} Lv.${S.up[id]}`, sub: u.desc(S.up[id]) });
    if (FX[id]) W.pulse(FX[id]);
    G.syncStaff(); G.tick(); G.save();
  },
  buyDecor(id) {
    const d = DECOR.find((x) => x.id === id); if (S.decor[id]) return;
    if (d.shop && S.shop < d.shop) { hooks.sfx('bad'); hooks.toast(`需要先扩建到「${SHOPS[d.shop - 1].name}」`); return; }
    if (!G.pay(d.cost)) return;
    S.decor[id] = 1; hooks.sfx('level'); hooks.celebrate({ emo: d.emo, title: `${d.name} 摆进店里啦`, sub: `魅力 +${d.charm}，客人更多、小费更高` }); G.tick(); G.save();
  },
  setTheme(id) {
    const t = THEMES.find((x) => x.id === id);
    if (!S.themes[id]) { if (!G.pay(t.cost)) return; S.themes[id] = 1; hooks.celebrate({ emo: '🎨', title: `新主题「${t.name}」`, sub: '店里焕然一新' }); }
    S.theme = id; hooks.sfx('pop'); dirty(); G.save();
  },
  setScene(id) {
    const s = SCENES.find((x) => x.id === id);
    if (!S.scenes[id]) {
      if (S.shop < s.shop) { hooks.sfx('bad'); hooks.toast(`需要先扩建到「${SHOPS[s.shop - 1].name}」`); return; }
      if (!G.pay(s.cost)) return; S.scenes[id] = 1; hooks.celebrate({ emo: s.emo, title: `搬到「${s.name}」`, sub: '新场景解锁，魅力 +3', big: 1 });
    }
    S.scene = id; hooks.sfx('pop'); W.build(S.shop, S.scene); G.tick(); G.save();
  },
  expand() {
    const n = SHOPS[S.shop]; if (!n) return;
    if (R.phase !== 'prep') { hooks.sfx('bad'); hooks.toast('营业中不能施工，打烊后的准备阶段再扩建'); return; }
    if (S.level < n.lv) { hooks.sfx('bad'); hooks.toast(`需要达到 Lv.${n.lv}`); return; }
    if (!G.pay(n.cost)) return;
    S.shop++; W.build(S.shop, S.scene); G.resetRoom(); R.player.x = 0; R.player.z = 1.6;
    hooks.sfx('level'); hooks.celebrate({ emo: n.emo, title: `扩建完成 · ${n.name}`, sub: `${n.slots} 个点单位 · ${n.tables.length * 2} 个座位 · 可雇 ${n.staff} 位奶茶师`, big: 1 });
    G.genGoals(); G.tick(); G.save();
  },
  upRecipe(id) {
    const r = RECIPES.find((x) => x.id === id), l = S.rlv[id] || 0; if (l >= 5 || r.lv > S.level) return;
    if (!G.pay(G.recCost(r))) return;
    S.rlv[id] = l + 1; hooks.sfx('level'); hooks.celebrate({ emo: '🧋', title: `${r.name} · ${RSTAR[l + 1]}`, sub: `研发升级！售价提升到 💰${G.price(r)}` }); G.tick(); G.save();
  },
  buyBranch(id) {
    const b = BRANCHES.find((x) => x.id === id), l = S.branch[id] || 0; if (l >= 5) return;
    if (S.shop < b.shop) { hooks.sfx('bad'); hooks.toast(`需要先扩建到「${SHOPS[b.shop - 1].name}」`); return; }
    if (!G.pay(G.branchCost(b))) return;
    S.branch[id] = l + 1; hooks.sfx('level'); hooks.celebrate({ emo: b.emo, title: l ? `${b.name} 升到 Lv.${l + 1}` : `${b.name} 开业！`, sub: `每天打烊分红 💰${b.inc * (l + 1)}`, big: !l }); G.tick(); G.save();
  },

  // ---------- 制作 ----------
  takeCup() { if (R.held) return; R.held = { items: [], sealed: false }; hooks.sfx('pop'); dirty(); },
  addItem(id) {
    const c = R.held, ing = ING[id];
    if (!c || c.sealed || c.items.includes(id)) return;
    if (ing.type === 'tea' && c.items.some((i) => ING[i].type === 'tea')) { hooks.toast('杯里已经有茶底啦'); return; }
    if (G.avail(id) <= 0) { hooks.sfx('bad'); hooks.toast(`${ing.name}没有了`); return; }
    if (ing.type === 'tea') S.urn[id]--; else if (id === 'pearl') S.cooked--; else if (id !== 'ice') S.stock[id]--;
    c.items.push(id); hooks.sfx(ing.type === 'tea' || ing.type === 'mix' ? 'pour' : 'pop'); dirty();
  },
  brew(id) {
    if (R.brew[id] || (S.urn[id] || 0) > 2) return;
    if (stockOf(id) <= 0) { hooks.sfx('bad'); hooks.toast(`${ING[id].name}茶叶用完了，去 🛒 进货`); return; }
    S.stock[id]--; R.brew[id] = { t: 0, dur: G.brewTime() }; hooks.sfx('pour'); dirty();
  },
  cook() {
    if (R.cook || S.cooked > 3) return;
    if (stockOf('pearl') <= 0) { hooks.sfx('bad'); hooks.toast('生珍珠用完了，去 🛒 进货'); return; }
    S.stock.pearl--; R.cook = { t: 0, dur: G.cookTime() }; hooks.sfx('pop'); dirty();
  },
  seal() { const c = R.held; if (!c || c.sealed || R.seal || !c.items.length) return; R.seal = { t: 0, dur: G.sealTime() }; hooks.sfx('pop'); dirty(); },
  trash() { if (!R.held) return; R.held = null; hooks.sfx('bad'); dirty(); },
  shelfPut() { if (!R.held || R.shelf.length >= lv('shelf')) return; R.shelf.push(R.held); R.held = null; hooks.sfx('pop'); dirty(); },
  shelfTake(i) { if (R.held || !R.shelf[i]) return; R.held = R.shelf.splice(i, 1)[0]; hooks.sfx('pop'); dirty(); },

  // who: 'me' 亲手 | 'staff' 店员
  payFor(c, perfect, who) {
    const o = c.order, ty = c.type; let price = Math.round(o.price * ty.mul), tip = 0;
    if (!perfect) price = Math.round(price * 0.4);
    else tip = Math.round((price * (0.06 + 0.24 * c.patience / c.maxP) * G.tipMul() + (who === 'me' ? Math.min(8, Math.max(0, R.combo - 1)) : 0)) * (who === 'me' ? 1 : 0.5));
    S.coins += price + tip; S.stats.earned += price + tip; S.stats.served++; R.today.income += price; R.today.tips += tip; R.today.served++;
    if (perfect) { R.today.perfect++; S.stats.perfect++; S.rep = Math.min(5, S.rep + 0.035); } else { R.today.wrong++; S.rep = Math.max(0.5, S.rep - 0.08); }
    if (ty.mul >= 3) { S.stats.vip++; R.today.vip++; }
    if (ty.id === 'horse') { S.stats.horse++; hooks.confetti(); hooks.sfx('level'); }
    if (ty.id === 'star' && perfect) { S.rep = Math.min(5, S.rep + 0.25); R.buzz = 25; hooks.toast('📸 博主发了五星好评，客人闻讯赶来！'); }
    if (who === 'staff') { S.stats.staff++; R.today.staff++; }
    const p = c.mesh.position;
    hooks.float(`+${price}${tip ? ` <small>小费${tip}</small>` : ''}`, [p.x, 2.3, p.z], perfect ? (ty.mul >= 3 ? 'gain big' : 'gain') : 'meh');
    if (ty.mul >= 3) W.burst(p.x, 1.8, p.z, 18);
    return price + tip;
  },
  serve(i) {
    const c = R.slots[i], cup = R.held;
    if (!c || c.state !== 'order' || !cup || !cup.sealed) return;
    const need = c.order.items, ok = need.length === cup.items.length && need.every((x) => cup.items.includes(x));
    if (ok) { R.combo++; R.today.bestCombo = Math.max(R.today.bestCombo, R.combo); S.stats.bestCombo = Math.max(S.stats.bestCombo, R.combo); } else R.combo = 0;
    const got = G.payFor(c, ok, 'me');
    const p = c.mesh.position;
    if (ok) { hooks.sfx('coin'); hooks.float(pick(['💕', '😋', '🥰', '✨']), [p.x, 2.7, p.z], 'emo'); W.burst(p.x, 1.6, p.z, 6, 0.6); if (R.combo >= 3) hooks.float(`${R.combo} 连击!`, [p.x, 3.0, p.z], 'combo'); }
    else { hooks.sfx('bad'); hooks.float('😕 做错了…', [p.x, 2.7, p.z], 'emo'); }
    W.giveCup(c.mesh, cup.items); R.held = null; c.happy = ok;
    G.leave(c, ok);
    G.addXp(Math.round(8 + Math.min(got, 200) * 0.45)); G.tick(); G.save();
  },
  aisle: () => ({ x: 0, z: Math.max(L.bz + 1.3, -5.4) }),
  leave(c, canSit) {
    if (c.slot != null) { R.slots[c.slot] = null; c.slot = null; }
    c.claim = null;
    const free = R.seats.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
    if (canSit && free.length && Math.random() < 0.65 && R.phase === 'open') {
      const si = pick(free), s = L.SEATS[si], lz = s.z + (s.r === 0 ? -0.45 : 0.45); R.seats[si] = c; c.seat = si;
      c.path = [{ x: 0, z: Math.min(-3.0, lz) }, { x: 0, z: lz }, { x: s.x, z: lz }, { x: s.x, z: s.z }]; c.then = 'sit'; c.state = 'walk';
    } else G.exit(c);
  },
  exit(c) {
    const path = [];
    if (c.seat != null) { const s = L.SEATS[c.seat], lz = s.z + (s.r === 0 ? -0.45 : 0.45); R.seats[c.seat] = null; c.seat = null; path.push({ x: s.x, z: lz }, { x: 0, z: lz }); }
    else path.push(G.aisle());
    c.mesh.position.y = 0; c.speed = 2.5;
    path.push({ x: 0, z: L.bz + 0.9 }, { x: 0, z: L.bz - 0.9 }, { x: pick([-1, 1]) * rnd(7, 10), z: L.bz - 1.2 });
    c.path = path; c.then = 'gone'; c.state = 'walk';
  },

  // ---------- 顾客 ----------
  pickType() {
    const k = 1 + 0.3 * (S.shop - 1) + G.charm() * 0.015;
    const ts = CTYPES.filter((t) => (!t.lv || S.level >= t.lv) && (!t.shop || S.shop >= t.shop));
    const ws = ts.map((t) => (t.id === 'normal' ? t.w : t.w * k)); let x = ws.reduce((a, b) => a + b, 0) * Math.random();
    for (let i = 0; i < ts.length; i++) if ((x -= ws[i]) < 0) return ts[i];
    return ts[0];
  },
  spawn() {
    const si = R.slots.indexOf(null), wi = R.waits.indexOf(null);
    const waiting = R.waits.some((w) => w);
    let then, target;
    if (si >= 0 && !waiting) { then = 'order'; target = L.SLOTS[si]; } else if (wi >= 0) { then = 'wait'; target = L.WAITS[wi]; } else return;
    const ty = G.pickType();
    const kind = ty.id === 'horse' ? 'horse' : ty.id === 'office' || ty.id === 'star' ? 'human' : pick(['human', 'human', 'human', 'bear', 'bunny', 'cat']);
    const look = {
      kind, crown: ty.id === 'rich', style: Math.floor(Math.random() * 5), shades: ty.id === 'star', tie: ty.id === 'office' ? '#ff7d95' : null,
      skin: kind === 'horse' ? '#d9a066' : kind === 'human' ? pick(['#ffe2cc', '#ffd5b8', '#f3c9a5', '#e8b48c']) : kind === 'bear' ? pick(['#e2b185', '#c99a72', '#f3d9b8']) : kind === 'bunny' ? pick(['#ffffff', '#ffe3ec', '#e9e4f5']) : pick(['#ffcf8f', '#d9d9e3', '#f7e7d3']),
      hair: pick(['#6b4a3a', '#3f3340', '#c98a4b', '#f2c66d', '#e98fa6', '#8f7bd6']),
      outfit: ty.id === 'horse' ? '#2b2738' : ty.id === 'rich' ? '#ffd23f' : ty.id === 'office' ? pick(['#5d6f9c', '#6b6480', '#4f7a8c']) : ty.id === 'star' ? '#ff5d9e' : pick(['#8fd0ff', '#a5e6cc', '#ffd66b', '#c9b3ff', '#ffb38a', '#ff9fb4', '#9be0e0', '#ffffff']),
      pants: ty.id === 'horse' || ty.id === 'office' ? '#3f3a52' : pick(['#7a6a86', '#5d7fa3', '#8a6f5a', '#6f8f7a']),
    };
    const mesh = W.addChibi(look);
    if (ty.id === 'horse') { mesh.scale.setScalar(1.15); hooks.toast('🐴 金马大亨驾到！做好他的单，报酬 8 倍！'); hooks.sfx('level'); }
    mesh.position.set(rnd(-7, 7), 0, L.bz - 1.3);
    const path = [{ x: 0, z: L.bz - 0.9 }, { x: 0, z: L.bz + 0.9 }];
    if (L.bz < -7) path.push(G.aisle());
    path.push({ x: target[0], z: target[1] });
    const c = { id: ++R.cid, mesh, type: ty, vip: ty.mul >= 3, state: 'walk', then, slot: null, wait: null, seat: null, speed: 2.2, patience: 1, maxP: 1, order: null, claim: null, path };
    if (then === 'order') { R.slots[si] = c; c.slot = si; } else { R.waits[wi] = c; c.wait = wi; }
    R.customers.push(c); hooks.sfx('bell');
  },
  makeOrder(c) {
    const recs = G.recipes(), un = G.unlocked(), rich = c.type.mul >= 3;
    const ws = recs.map((r) => (r.lv >= S.level - 2 ? 1.6 : 1) * (r.items.includes('ice') ? R.weather.ice : 1) * (rich ? r.price / 12 : 1));
    let t = ws.reduce((a, b) => a + b, 0) * Math.random(), r = recs[0];
    for (let i = 0; i < recs.length; i++) if ((t -= ws[i]) < 0) { r = recs[i]; break; }
    const items = [...r.items]; let name = r.name, price = G.price(r);
    const extra = [...un].filter((i) => ING[i].type === 'top' && !items.includes(i));
    if (S.level >= 4 && extra.length && items.filter((i) => ING[i].type === 'top').length < 2 && Math.random() < (rich ? 0.5 : 0.22)) { const e = pick(extra); items.push(e); name += `+${ING[e].name}`; price += Math.round(4 * G.priceMul()); }
    c.order = { items, name, price, rid: r.id };
    c.maxP = c.patience = G.patienceMax() * c.type.pat * (0.9 + items.length * 0.05);
  },
  arrive(c) {
    c.state = c.then;
    if (c.state === 'order') { G.makeOrder(c); c.mesh.rotation.y = 0; hooks.sfx('pop'); dirty(); }
    else if (c.state === 'wait') c.mesh.rotation.y = 0;
    else if (c.state === 'sit') { c.sitT = rnd(8, 14); c.mesh.rotation.y = L.SEATS[c.seat].r; c.mesh.position.y = 0.3; }
    else if (c.state === 'gone') { W.dropCup(c.mesh); W.remove(c.mesh); R.customers.splice(R.customers.indexOf(c), 1); }
  },
  walk(o, dt) { // 沿路径移动；返回是否在走
    const p = o.mesh.position, w = o.path[0], dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz), st = o.speed * dt;
    if (d <= st) { p.x = w.x; p.z = w.z; o.path.shift(); return false; }
    p.x += dx / d * st; p.z += dz / d * st; o.mesh.rotation.y = Math.atan2(dx, dz); return true;
  },
  updCustomers(dt) {
    for (const c of [...R.customers]) {
      let moving = false;
      if (c.path && c.path.length) { moving = G.walk(c, dt); if (!c.path.length) G.arrive(c); }
      if (c.state === 'order') {
        c.patience -= dt;
        if (c.patience <= 0) {
          R.combo = 0; R.today.lost++; S.stats.lost++; S.rep = Math.max(0.5, S.rep - (c.vip ? 0.3 : 0.15));
          const p = c.mesh.position; hooks.float('😠 不等了!', [p.x, 2.6, p.z], 'emo'); hooks.sfx('bad');
          G.leave(c, false); dirty();
        }
      } else if (c.state === 'sit') {
        c.sitT -= dt * (R.phase === 'closing' ? 3 : 1);
        if (c.sitT <= 0) {
          if (c.happy && Math.random() < 0.7 && R.phase === 'open') {
            const s = L.SEATS[c.seat], t = L.TABLES[s.t];
            const x = t[0] + rnd(-0.25, 0.25), z = t[1] + (s.z < t[1] ? -0.25 : 0.25);
            R.coins.push({ x, z, v: Math.round((3 + S.level * 0.8) * G.tipMul() * c.type.mul), mesh: W.addCoin(x, z) });
          }
          G.exit(c);
        }
      }
      W.anim(c.mesh, dt, { moving, hold: !!c.mesh.userData.cup, sit: c.state === 'sit', happy: c.then === 'gone' && c.happy && moving });
    }
    for (let i = 0; i < R.slots.length; i++) if (!R.slots[i]) {
      const c = R.waits.filter((w) => w).sort((a, b) => a.id - b.id)[0]; if (!c) break;
      R.waits[c.wait] = null; c.wait = null; R.slots[i] = c; c.slot = i;
      c.path = [{ x: L.SLOTS[i][0], z: L.SLOTS[i][1] }]; c.then = 'order'; c.state = 'walk';
    }
  },
  collect(c) {
    R.coins.splice(R.coins.indexOf(c), 1); W.remove(c.mesh); S.coins += c.v; S.stats.tips++; S.stats.earned += c.v; R.today.tips += c.v; R.today.tipsCollected++;
    hooks.sfx('coin'); hooks.float(`+${c.v} 小费`, [c.x, 1.5, c.z], 'gain'); G.tick();
  },

  // ---------- 店员 ----------
  syncStaff() {
    const n = Math.min(lv('hire'), shop().staff);
    while (R.staff.length < n) {
      const i = R.staff.length;
      const mesh = W.addChibi({ kind: i % 3 === 2 ? 'bear' : 'human', skin: ['#ffe2cc', '#f3c9a5', '#e2b185', '#ffd5b8', '#e8b48c', '#f3d9b8'][i], hair: ['#3f3340', '#c98a4b', '#6b4a3a', '#e98fa6', '#8f7bd6', '#f2c66d'][i], style: [2, 3, 0, 1, 2, 3][i], outfit: ['#a5e6cc', '#8fd0ff', '#ffd66b', '#c9b3ff', '#ffb38a', '#9be0e0'][i], apron: true, visor: i % 3 === 2 ? null : ['#7fd1b0', '#6fb6f0', '#f0b840', '#a98fe8', '#f09868', '#70c8c8'][i] });
      const b = { i, mesh, state: 'idle', plan: [], path: [], wait: 0, rest: 1 + i * 0.7, target: null, cup: null, speed: 2.4, home: { x: -1.25 + (i % 3) * 1.25, z: 2.9 + Math.floor(i / 3) * 0.75 } };
      mesh.position.set(b.home.x, 0, b.home.z); R.staff.push(b);
    }
    if (lv('waiter') && !R.waiter) {
      const mesh = W.addChibi({ kind: 'bunny', skin: '#ffffff', outfit: '#3f3a52', apron: true, pants: '#3f3a52' }); mesh.scale.setScalar(0.92);
      R.waiter = { mesh, path: [], speed: 2.4 };
    }
    if (R.waiter) { R.waiter.home = { x: L.hw - 1.0, z: -3.3 }; R.waiter.mesh.position.set(R.waiter.home.x, 0, R.waiter.home.z); R.waiter.path = []; R.waiter.go = null; }
  },
  canMake(items) {
    for (const i of items) {
      if (i === 'ice') continue;
      if (ING[i].type === 'tea') { if ((S.urn[i] || 0) <= 0 && stockOf(i) <= 0) return false; }
      else if (i === 'pearl') { if (S.cooked <= 0 && stockOf('pearl') <= 0) return false; }
      else if (stockOf(i) <= 0) return false;
    }
    return true;
  },
  take(i) { // 店员取料（茶/珍珠没了会自己现泡现煮）
    if (i === 'ice') return true;
    if (ING[i].type === 'tea') { if ((S.urn[i] || 0) <= 0) { if (stockOf(i) <= 0) return false; S.stock[i]--; S.urn[i] = G.urnCap(); } S.urn[i]--; }
    else if (i === 'pearl') { if (S.cooked <= 0) { if (stockOf('pearl') <= 0) return false; S.stock.pearl--; S.cooked = 8; } S.cooked--; }
    else { if (stockOf(i) <= 0) return false; S.stock[i]--; }
    dirty(); return true;
  },
  staffIdle(b) {
    if (b.target && b.target.claim === b) b.target.claim = null;
    b.target = null; b.cup = null; b.plan = []; b.state = 'idle'; b.rest = 0.6; W.dropCup(b.mesh); b.path = [{ ...b.home }];
  },
  updStaff(dt) {
    const tr = lv('train'), mine = R.held && R.hint ? R.hint.target : null;
    for (const b of R.staff) {
      b.speed = 2.4 * (1 + 0.15 * tr);
      let moving = false;
      if (b.path.length) moving = G.walk(b, dt);
      if (b.state === 'idle') {
        b.rest -= dt;
        if (b.rest <= 0 && R.phase !== 'prep') {
          const c = R.slots.filter((x) => x && x.state === 'order' && !x.claim && x !== mine && G.canMake(x.order.items)).sort((a, z) => a.patience / a.maxP - z.patience / z.maxP)[0];
          if (c) {
            c.claim = b; b.target = c; b.cup = []; b.state = 'work';
            b.plan = [{ st: 'cups' }, ...SEQ.filter((i) => c.order.items.includes(i)).map((i) => ({ st: ING[i].st, ing: i })), { st: 'sealer', seal: 1 }, { st: 'slot' + c.slot, serve: 1 }];
            b.go = false;
          } else b.rest = 0.5;
        }
        if (!moving && !b.path.length) b.mesh.rotation.y += (0 - b.mesh.rotation.y) * Math.min(1, dt * 6);
      } else {
        const c = b.target;
        if (!c || c.state !== 'order') { if (b.cup && b.cup.length) hooks.float('💦', [b.mesh.position.x, 2.2, b.mesh.position.z], 'emo'); G.staffIdle(b); }
        else if (!b.go) { const st = W.st[b.plan[0].st]; b.path = [{ x: st.fx + (b.i % 2 ? 0.25 : -0.25) * (st.slot != null ? 0 : 1), z: st.fz }]; b.go = true; b.wait = b.plan[0].seal ? Math.max(0.3, G.sealTime()) : 0.75 * (1 - 0.1 * tr); }
        else if (!b.path.length) {
          const step = b.plan[0], st = W.st[step.st];
          b.mesh.rotation.y = Math.atan2(st.x - b.mesh.position.x, st.z - b.mesh.position.z);
          b.wait -= dt;
          if (b.wait <= 0) {
            if (step.ing) { if (!G.take(step.ing)) { G.staffIdle(b); continue; } b.cup.push(step.ing); }
            if (step.serve) {
              const got = G.payFor(c, true, 'staff'); hooks.sfx('coin');
              W.giveCup(c.mesh, c.order.items); c.happy = true; G.leave(c, true); G.addXp(Math.round(4 + Math.min(got, 200) * 0.25)); G.tick();
              b.target = null; G.staffIdle(b); continue;
            }
            W.giveCup(b.mesh, b.cup, !!step.seal); b.plan.shift(); b.go = false;
          }
        }
      }
      W.anim(b.mesh, dt, { moving, hold: !!b.mesh.userData.cup });
    }
    const w = R.waiter;
    if (w) {
      w.speed = 2.0 + 0.9 * lv('waiter');
      if (w.go && !R.coins.includes(w.go)) { w.go = null; w.path = [{ ...w.home }]; }
      if (!w.go && R.coins.length) { const p = w.mesh.position; w.go = [...R.coins].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; w.path = [{ x: w.go.x + (w.go.x > 0 ? -0.8 : 0.8), z: w.go.z }]; }
      const moving = w.path.length ? G.walk(w, dt) : false;
      if (w.go && !w.path.length) { G.collect(w.go); w.go = null; w.path = [{ ...w.home }]; }
      W.anim(w.mesh, dt, { moving });
    }
  },
  catWork() {
    const un = G.unlocked();
    for (const id of un) {
      if (ING[id].type === 'tea' && (S.urn[id] || 0) <= 0 && !R.brew[id] && stockOf(id) > 0) { S.stock[id]--; R.brew[id] = { t: 0, dur: G.brewTime() }; dirty(); }
      if (lv('cat') >= 2 && SHOP[id]) { const t = ING[id].type === 'tea' || id === 'pearl'; if (stockOf(id) <= (t ? 0 : 2) && S.coins >= SHOP[id].cost + 30) G.buy(id, 1, true); }
    }
    if (un.has('pearl') && S.cooked <= 1 && !R.cook && stockOf('pearl') > 0) { S.stock.pearl--; R.cook = { t: 0, dur: G.cookTime() }; dirty(); }
  },

  update(dt) {
    if (R.paused || R.phase === 'title' || R.phase === 'summary') return;
    for (const id in R.brew) { const b = R.brew[id]; b.t += dt; if (b.t >= b.dur) { delete R.brew[id]; S.urn[id] = (S.urn[id] || 0) + G.urnCap(); hooks.sfx('ding'); hooks.float(`${ING[id].emo} ${ING[id].name}泡好啦`, [W.st.tea.x, 2.4, W.st.tea.z], 'info'); dirty(); } }
    if (R.cook) { R.cook.t += dt; if (R.cook.t >= R.cook.dur) { R.cook = null; S.cooked += 8; hooks.sfx('ding'); hooks.float('⚫ 珍珠煮好啦', [W.st.cooker.x, 2.4, W.st.cooker.z], 'info'); dirty(); } }
    if (R.seal) { R.seal.t += dt; if (R.seal.t >= R.seal.dur) { R.seal = null; R.held.sealed = true; hooks.sfx('ding'); dirty(); } }
    if (lv('cat')) { R.catT -= dt; if (R.catT <= 0) { R.catT = 1; G.catWork(); } }
    if (R.phase === 'open') {
      R.t += dt; R.prog = R.t / DAY_LEN; if (R.buzz > 0) R.buzz -= dt;
      const rush = (R.prog > 0.3 && R.prog < 0.45) || (R.prog > 0.72 && R.prog < 0.86);
      if (rush && R.rush === 1) hooks.toast(R.prog < 0.5 ? '🔥 午高峰来了，客人变多！' : '🌇 晚高峰来了，加油！');
      R.rush = rush ? 1.6 : 1;
      R.spawnT -= dt; if (R.spawnT <= 0) { G.spawn(); R.spawnT = G.arrivalGap() * rnd(0.7, 1.3); }
      if (R.t >= DAY_LEN) {
        R.phase = 'closing'; hooks.toast('🌙 打烊时间到，服务完吧台前的客人就收工');
        for (const c of R.customers) if (c.wait != null) { R.waits[c.wait] = null; c.wait = null; G.exit(c); }
        dirty();
      }
    }
    if (R.phase === 'open' || R.phase === 'closing') G.updCustomers(dt);
    G.updStaff(dt);
    if (R.phase === 'closing' && !R.customers.length) { G.endDay(); return; }
    const P = R.player;
    for (const c of [...R.coins]) if (Math.hypot(c.x - P.x, c.z - P.z) < 1.25) G.collect(c);
    R.hint = G.hint();
  },

  // ---------- 指引 ----------
  hint() {
    const un = G.unlocked();
    if (R.phase === 'prep') {
      if ((S.urn.black || 0) <= 0 && !R.brew.black) return stockOf('black') > 0 ? { text: '开门前先去茶桶泡一桶红茶', st: 'tea', act: 'brew:black' } : { text: '红茶茶叶用完了，点下面 🛒 进货', shop: 1 };
      if (un.has('pearl') && S.cooked <= 0 && !R.cook) return stockOf('pearl') > 0 ? { text: '再去煮锅煮一锅珍珠', st: 'cooker', act: 'cook' } : { text: '生珍珠用完了，点下面 🛒 进货', shop: 1 };
      return { text: '准备好了就点「开门营业」吧！' };
    }
    const all = R.slots.filter((c) => c && c.state === 'order'), cup = R.held;
    if (!all.length) return { text: cup ? '等客人点单…' : '等待客人光临，可以趁机泡茶备料' };
    const urgent = (a) => a.sort((x, y) => (x.claim ? 1 : 0) - (y.claim ? 1 : 0) || y.type.mul - x.type.mul || x.patience - y.patience)[0];
    const orders = all.filter((c) => !c.claim);
    if (!cup) {
      if (!orders.length) return { text: '店员们正在做单，你可以去备料或收小费' };
      const t = urgent(orders); return { text: `${t.slot + 1}号${t.type.name || '客人'}要「${t.order.name}」：先去杯架取杯`, st: 'cups', act: 'cup', target: t };
    }
    const cands = all.filter((c) => cup.items.every((i) => c.order.items.includes(i)) && (!cup.sealed || cup.items.length === c.order.items.length));
    if (!cands.length) return lv('shelf') > R.shelf.length && cup.sealed ? { text: '这杯暂时没人要，可以先放备餐台', st: 'shelf', act: 'put' } : { text: '这杯和订单对不上，去垃圾桶倒掉重做', st: 'trash', act: 'trash' };
    const t = urgent(cands), need = SEQ.filter((i) => t.order.items.includes(i) && !cup.items.includes(i));
    if (need.length) {
      const id = need[0], ing = ING[id], h = { target: t, ing: id };
      if (ing.type === 'tea') {
        if ((S.urn[id] || 0) > 0) return { ...h, text: `去茶桶倒${ing.name}`, st: 'tea' };
        if (R.brew[id]) return { ...h, text: `${ing.name}正在泡，稍等一下…`, st: 'tea' };
        return stockOf(id) > 0 ? { ...h, text: `${ing.name}倒完了，先泡一桶`, st: 'tea', act: 'brew:' + id } : { ...h, text: `${ing.name}茶叶用完了，快去 🛒 进货`, shop: 1 };
      }
      if (id === 'pearl') {
        if (S.cooked > 0) return { ...h, text: '去小料台加珍珠', st: 'toppings' };
        if (R.cook) return { ...h, text: '珍珠还在煮，稍等一下…', st: 'cooker' };
        return stockOf('pearl') > 0 ? { ...h, text: '熟珍珠用完了，去煮一锅', st: 'cooker', act: 'cook' } : { ...h, text: '生珍珠用完了，快去 🛒 进货', shop: 1 };
      }
      if (id === 'ice') return { ...h, text: '去冰柜加冰块', st: 'ice' };
      return stockOf(id) > 0 ? { ...h, text: `去${W.st[ing.st].name}加${ing.name}`, st: ing.st } : { ...h, text: `${ing.name}用完了，快去 🛒 进货`, shop: 1 };
    }
    if (!cup.sealed) return { text: '配料齐了！去封口机封口', st: 'sealer', act: 'seal', target: t };
    return { text: `做好啦！递给 ${t.slot + 1} 号客人`, st: 'slot' + t.slot, act: 'serve', target: t };
  },

  actions(st) {
    if (!st) return [];
    const cup = R.held, open = cup && !cup.sealed, h = R.hint || {}, un = G.unlocked(), A = [];
    const ingChip = (id) => {
      const n = G.avail(id), has = open && cup.items.includes(id);
      A.push({ emo: ING[id].emo, label: ING[id].name, sub: id === 'ice' ? '不限量' : has ? '已加' : `剩 ${n}`, dis: !open || has || n <= 0, hot: h.ing === id && open, fn: () => G.addItem(id) });
    };
    if (st.id === 'cups') A.push({ emo: '🥤', label: '取杯', sub: cup ? '手上已有杯子' : '拿一个空杯', dis: !!cup, hot: h.act === 'cup', fn: G.takeCup });
    else if (st.id === 'toppings') ['pearl', 'jelly', 'pudding', 'taroball', 'redbean'].filter((i) => un.has(i)).forEach(ingChip);
    else if (st.id === 'ice') ingChip('ice');
    else if (st.id === 'mix') ['milk', 'brownsugar', 'matcha', 'taro', 'mango', 'strawberry', 'lemon', 'foam'].filter((i) => un.has(i)).forEach(ingChip);
    else if (st.id === 'tea') {
      for (const id of ['black', 'green', 'oolong']) {
        if (!un.has(id)) continue;
        const n = S.urn[id] || 0, b = R.brew[id], ing = ING[id];
        if (b) { A.push({ emo: '⏳', label: `${ing.name}泡制中`, sub: `${Math.round(b.t / b.dur * 100)}%`, dis: true, prog: b }); continue; }
        const canPour = open && n > 0 && !cup.items.some((i) => ING[i].type === 'tea');
        if (n > 0) A.push({ emo: ing.emo, label: `倒${ing.name}`, sub: `桶里剩 ${n} 杯`, dis: !canPour, hot: h.ing === id && canPour, fn: () => G.addItem(id) });
        if (n <= 2) A.push({ emo: '♨️', label: `泡${ing.name}`, sub: `茶叶 ${stockOf(id)} 包`, dis: stockOf(id) <= 0, hot: h.act === 'brew:' + id, fn: () => G.brew(id) });
      }
    } else if (st.id === 'cooker') {
      if (R.cook) A.push({ emo: '⏳', label: '珍珠熬煮中', sub: `${Math.round(R.cook.t / R.cook.dur * 100)}%`, dis: true, prog: R.cook });
      else A.push({ emo: '🔥', label: '煮珍珠', sub: S.cooked > 3 ? `还有 ${S.cooked} 份熟珍珠` : `生珍珠 ${stockOf('pearl')} 袋`, dis: S.cooked > 3 || stockOf('pearl') <= 0, hot: h.act === 'cook', fn: G.cook });
    } else if (st.id === 'sealer') {
      if (R.seal) A.push({ emo: '⏳', label: '封口中…', sub: '', dis: true, prog: R.seal });
      else A.push({ emo: '⚡', label: '封口', sub: !cup ? '先做一杯奶茶' : cup.sealed ? '已经封好了' : !cup.items.length ? '杯子还是空的' : '封上杯膜、插吸管', dis: !open || !cup.items.length, hot: h.act === 'seal', fn: G.seal });
    } else if (st.id === 'trash') A.push({ emo: '🗑️', label: '倒掉', sub: cup ? '倒掉手上这杯' : '手上没有东西', dis: !cup, hot: h.act === 'trash', fn: G.trash });
    else if (st.id === 'shelf') {
      if (cup) A.push({ emo: '📥', label: '放上备餐台', sub: `${R.shelf.length}/${lv('shelf')}`, dis: R.shelf.length >= lv('shelf'), hot: h.act === 'put', fn: G.shelfPut });
      else R.shelf.forEach((c, i) => A.push({ emo: '🧋', label: G.cupName(c), sub: c.sealed ? '已封口' : '未封口', fn: () => G.shelfTake(i) }));
      if (!cup && !R.shelf.length) A.push({ emo: '🗄️', label: '备餐台', sub: '空的', dis: true });
    } else if (st.slot != null) {
      const c = R.slots[st.slot];
      if (c && c.state === 'order') A.push({ emo: '🤝', label: `递给 ${st.slot + 1} 号客人`, sub: !cup ? '先做好奶茶' : !cup.sealed ? '还没封口呢' : c.order.name, dis: !cup || !cup.sealed, hot: h.act === 'serve' && h.target === c, fn: () => G.serve(st.slot) });
    }
    return A;
  },
  status(id) {
    const s = { tea: 'urn', cooker: 'stove', sealer: 'sealer', shelf: 'shelf' }[id], star = s && lv(s) ? ' ' + '★'.repeat(lv(s)) : '';
    if (id === 'tea') return [...G.unlocked()].filter((i) => ING[i].type === 'tea').map((i) => `${ING[i].emo}${R.brew[i] ? '⏳' : S.urn[i] || 0}`).join(' ') + star;
    if (id === 'cooker') return (R.cook ? `⏳${Math.round(R.cook.t / R.cook.dur * 100)}%` : `熟珍珠 ${S.cooked}`) + star;
    if (id === 'shelf') return `${R.shelf.length}/${lv('shelf')}`;
    return star.trim();
  },
  debugMake(i) { const c = R.slots[i]; if (c && c.order) { R.held = { items: [...c.order.items], sealed: true }; dirty(); } },
};
