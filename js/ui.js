// 界面：HUD、3D 锚定标签、面板
import { S, R, G, hooks } from './game.js';
import { ING, RECIPES, SHOP, UPGRADES, DECOR, THEMES, ACHS, SEQ, SHOPS, BRANCHES, SCENES, RSTAR, PALS, PAL_HEART, SKILLS, CAMPAIGNS, TRAITS, CREW_LV, RIVALS, RANK_PRIZE, LAB_LV } from './data.js';
import { L } from './world.js';
import { setMusic, audio, sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
let W, curActions = [], actHtml = '', sheetName = null, sheetTab = 'shop', taskTab = 'goal', sheetData = null, lastSlow = 0, shown = -1, skHtml = '';
const tags = [], bubs = new Map(), bars = [null, null, null], labSel = new Set();
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const chip = (id, ok) => `<span class="ic${ok ? ' ok' : ''}">${ING[id].emo}<small>${ING[id].name}</small></span>`;
const sorted = (items) => SEQ.filter((i) => items.includes(i));

export function initUI(w) {
  W = w;
  const mkTags = () => {
    for (const t of tags) t.el.remove(); tags.length = 0;
    for (const st of W.stations) {
      if (st.hidden) continue;
      const el = document.createElement('div'); el.className = 'tag'; $('labels').appendChild(el); tags.push({ st, el, html: '' });
    }
    R.near = null;
  };
  mkTags(); W.onBuild = mkTags;
  hooks.celebrate = celebrate;
  $('actions').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button'); if (!b) return; e.preventDefault();
    const a = curActions[+b.dataset.i]; if (!a || a.dis || !a.fn) return;
    const st = R.near, P = R.player; if (st) P.rot = Math.atan2(st.x - P.x, st.z - P.z);
    a.fn();
  });
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { sfx('pop'); openSheet(b.dataset.sheet); } });
  $('orders').addEventListener('pointerdown', (e) => { const c = e.target.closest('.oc[data-i]'); if (c) { e.preventDefault(); G.pinOrder(+c.dataset.i); } });
  $('skills').addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (b) { e.preventDefault(); G.skill(b.dataset.k); } });
  hooks.fever = (on) => { document.body.classList.toggle('fever', !!on); audio.tempo = on ? 1.18 : 1; };
  hooks.coin = coinFly;
  $('open').addEventListener('click', () => G.openDoor());
  $('campbtn').addEventListener('click', () => { sfx('pop'); openSheet('camp'); });
  $('sheetwrap').addEventListener('click', (e) => {
    if (e.target === $('sheetwrap')) { if (sheetName !== 'summary') closeSheet(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const [a, x, y] = b.dataset.a.split(':');
    if (a === 'close') return closeSheet();
    if (a === 'buy') G.buy(x, +y || 1);
    else if (a === 'up') G.upgrade(x);
    else if (a === 'decor') G.buyDecor(x);
    else if (a === 'theme') G.setTheme(x);
    else if (a === 'scene') { const was = S.scene; G.setScene(x); if (S.scene !== was && R.tour > 0) return closeSheet(); }
    else if (a === 'restock') G.restock();
    else if (a === 'camp') { G.startCamp(x); if (R.camp) return closeSheet(); }
    else if (a === 'lsel') { if (labSel.has(x)) labSel.delete(x); else if (labSel.size < 7) labSel.add(x); sfx('pop'); }
    else if (a === 'lclear') labSel.clear();
    else if (a === 'labtry') { const n = Object.keys(S.lab).length; G.labTry([...labSel]); if (Object.keys(S.lab).length > n) labSel.clear(); }
    else if (a === 'tour') { R.tour = 8; return closeSheet(); }
    else if (a === 'ttab') { taskTab = x; sfx('pop'); }
    else if (a === 'branch') G.buyBranch(x);
    else if (a === 'rec') G.upRecipe(x);
    else if (a === 'expand') { const was = S.shop; G.expand(); if (S.shop !== was) return closeSheet(); }
    else if (a === 'tab') { sheetTab = x; sfx('pop'); }
    else if (a === 'sheet') return openSheet(x);
    else if (a === 'set') { S.set[x] = S.set[x] ? 0 : 1; audio.sfxOn = !!S.set.sfx; setMusic(!!S.set.music); G.save(); sfx('pop'); R.dirty = true; }
    else if (a === 'reset') { if (b.dataset.sure) G.reset(); else { b.dataset.sure = 1; b.textContent = '再点一次确认清空'; return; } }
    renderSheet(true);
  });
  hooks.toast = toast; hooks.float = float; hooks.confetti = confetti;
  hooks.levelUp = (d) => openSheet('level', d);
  hooks.summary = (d) => openSheet('summary', d);
}

export function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  const box = $('toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 3100);
}
function float(html, pos, cls = '') {
  const [x, y, ok] = W.project(pos[0], pos[1], pos[2]); if (!ok) return;
  const el = document.createElement('div'); el.className = 'fl ' + cls; el.innerHTML = html;
  el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; $('fx').appendChild(el);
  setTimeout(() => el.remove(), 1350);
}
function confetti(n = 34) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span'); el.className = 'cf'; el.textContent = ['🎉', '✨', '🧋', '💖', '⭐', '🍓'][i % 6];
    el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = 1.6 + Math.random() * 1.6 + 's'; el.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.appendChild(el); setTimeout(() => el.remove(), 3800);
  }
}

// q: 排队依次播放（不会互相顶掉）；quiet: 不撒彩带
let cBusy = 0, cTimer = 0; const cq = [];
function celebrate(o) {
  const now = performance.now();
  if (o.q && now < cBusy) { if (o.quiet) for (let i = cq.length - 1; i >= 0; i--) if (cq[i].quiet) cq.splice(i, 1); if (cq.length < 5) cq.push(o); return; }
  const { emo, title, sub, big, quiet } = o, dur = big ? 3200 : 2300;
  document.querySelectorAll('.celebrate').forEach((e) => e.remove());
  const el = document.createElement('div'); el.className = 'celebrate' + (big ? ' big' : '') + (quiet ? ' quiet' : '');
  el.innerHTML = `<i class="rays"></i><div class="cbox"><span>${emo}</span><b>${title}</b><small>${sub || ''}</small></div>`;
  document.body.appendChild(el); if (!quiet) confetti(big ? 60 : 30);
  if (big) { const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 900); }
  cBusy = now + dur - 250; clearTimeout(cTimer);
  cTimer = setTimeout(() => { el.remove(); cBusy = 0; const n = cq.shift(); if (n) celebrate(n); }, dur - 250);
}
// 金币从顾客头顶飞进左上角的钱包
function coinFly(pos, amount) {
  const [x, y, ok] = W.project(pos[0], pos[1], pos[2]); if (!ok || !document.body.animate) return;
  const r = $('coins').getBoundingClientRect(), tx = r.left + 4, ty = r.top + 2, n = Math.min(7, 2 + Math.floor(Math.log10(Math.max(1, amount)) * 1.6));
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i'); el.className = 'coinfly'; document.body.appendChild(el);
    const sx = x + (Math.random() - 0.5) * 46, sy = y + (Math.random() - 0.5) * 30;
    const an = el.animate([
      { transform: `translate(${x}px,${y}px) scale(.3)`, opacity: 0 },
      { transform: `translate(${sx}px,${sy - 26}px) scale(1.15)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${tx}px,${ty}px) scale(.55)`, opacity: 1 },
    ], { duration: 620 + i * 70, easing: 'cubic-bezier(.45,0,.3,1)' });
    an.onfinish = () => { el.remove(); const p = $('coins').parentNode; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); };
  }
}

// ---------- HUD ----------
function renderHud() {
  $('rep').textContent = S.rep.toFixed(1);
  const live = R.phase === 'open' || R.phase === 'closing';
  $('frow').hidden = !live;
  const sk = live ? SKILLS.filter((s) => S.level >= s.lv).map((s) => `<button data-k="${s.id}" title="${s.name}"><span>${s.emo}</span><em></em></button>`).join('') : '';
  if (sk !== skHtml) { skHtml = sk; $('skills').innerHTML = sk; }
  $('lvtxt').textContent = `Lv.${S.level} ${G.rank()}`; $('xpfill').style.width = Math.min(100, S.xp / G.xpNeed() * 100) + '%';
  $('combo').textContent = R.combo >= 2 ? `🔥${R.combo}连击` : '';
  $('open').hidden = R.phase !== 'prep';
  const cp = G.camp(); $('campbtn').hidden = R.phase !== 'prep' || S.day < 3;
  $('campbtn').textContent = cp ? `${cp.emo} 今日：${cp.name}` : '📣 今日宣传（可选）'; $('campbtn').classList.toggle('on', !!cp);
  const low = G.lowStock(); $('lowbadge').textContent = low || '';
  const gl = R.goals.filter((g) => !g.done).length; $('goalbadge').textContent = R.phase === 'prep' && gl ? gl : '';
  // 订单卡
  const h = R.hint || {}, cup = R.held;
  const ns = R.slots.length; $('orders').style.gridTemplateColumns = `repeat(${ns}, 1fr)`; $('orders').className = ns > 4 ? 'n4 n5' : ns > 3 ? 'n4' : '';
  $('orders').innerHTML = R.phase === 'prep' || R.phase === 'summary' ? '' : R.slots.map((c, i) => {
    if (!c || c.state !== 'order') return `<div class="oc empty">等待客人</div>`;
    const tg = h.target === c, ty = c.type, sm = ns > 3;
    const who = ty.id === 'rider' ? `🛵${sm ? '' : '外卖'} 还要${c.left}杯 ` : ty.id === 'pal' ? `${ty.emo}${sm ? '' : ty.name}×${ty.mul} ` : ty.name ? `${ty.emo}${sm ? '' : ty.name}×${ty.mul} ` : '';
    return `<div class="oc${tg ? ' tg' : ''}${c.vip ? ' vip' : ''}${ty.id === 'horse' ? ' horse' : ''}${ty.id === 'pal' ? ' pal' : ''}${c.claim ? ' claimed' : ''}${R.pin === c ? ' pin' : ''}" data-i="${i}"><div class="oh"><b>${i + 1}</b><span>${c.order.hot ? '🔥' : ''}${c.order.name}</span></div>
      ${who || c.claim ? `<div class="ty">${who}${c.claim ? `<span class="st">🧑‍🍳${sm && who ? '' : '店员在做'}</span>` : ''}</div>` : ''}
      <div class="oi">${sorted(c.order.items).map((id) => chip(id, tg && cup && cup.items.includes(id))).join('')}</div><i class="pb"><u data-s="${i}"></u></i></div>`;
  }).join('');
  for (let i = 0; i < ns; i++) bars[i] = $('orders').querySelector(`u[data-s="${i}"]`);
  // 手上
  $('held').innerHTML = cup ? `🥤 <b>${G.cupName(cup)}</b> ${sorted(cup.items).map((id) => chip(id)).join('')}<span class="st${cup.sealed ? ' ok' : ''}">${cup.sealed ? '✓ 已封口' : cup.items.length ? '未封口' : '去加料吧'}</span>` : '';
}
function renderActions() {
  curActions = R.phase === 'title' || R.phase === 'summary' ? [] : G.actions(R.near);
  const html = curActions.map((a, i) => `<button data-i="${i}" class="${a.dis ? 'dis' : ''}${a.hot && !a.dis ? ' hot' : ''}"><span>${a.emo}</span><b>${a.label}</b><small>${a.sub || '&nbsp;'}</small>${a.prog ? `<i style="width:${Math.round(a.prog.t / a.prog.dur * 100)}%"></i>` : ''}</button>`).join('');
  if (html !== actHtml) { actHtml = html; $('actions').innerHTML = html; }
  const ht = R.hint && S.set.guide ? R.hint.text : '';
  if ($('hint').textContent !== ht) $('hint').textContent = ht;
}

export function frame(t) {
  if (R.phase === 'title') return;
  if (R.dirty) renderHud();
  const slow = t - lastSlow > 0.2; if (slow) lastSlow = t;
  if (shown !== S.coins) { // 金币数字滚动
    shown = shown < 0 || Math.abs(S.coins - shown) < 1.5 ? S.coins : shown + (S.coins - shown) * 0.22;
    $('coins').textContent = fmt(shown);
  }
  if (slow && !$('frow').hidden) {
    const fv = R.feverT > 0;
    $('feverfill').style.width = (fv ? Math.min(1, R.feverT / (12 + 3 * G.lv('fever'))) : R.fever) * 100 + '%';
    $('fevertxt').textContent = fv ? `狂热 ${Math.ceil(R.feverT)}s ×1.5` : R.dash > 0 ? `⚡ ${Math.ceil(R.dash)}s` : '';
    for (const b of $('skills').children) { const cd = R.skillCd[b.dataset.k] || 0; b.classList.toggle('cd', cd > 0); b.lastChild.textContent = cd > 0 ? Math.ceil(cd) : ''; }
  }
  if (R.dirty || slow) renderActions();
  // 时钟
  if (slow) {
    const p = R.phase === 'prep' ? 0 : Math.min(1, R.prog), m = Math.floor(600 + p * 720);
    $('daytxt').textContent = `第${S.day}天 ${R.weekend ? '🎪' : R.weather.emo}${G.camp() ? G.camp().emo : ''} ${R.phase === 'prep' ? '准备中' : R.phase === 'closing' ? '打烊中' : `${Math.floor(m / 60)}:${String(m % 60 - m % 10).padStart(2, '0')}`}`;
    $('tprog').style.width = p * 100 + '%';
    $('tprog').style.background = R.rush > 1 ? 'linear-gradient(90deg,#ff9f6b,#ff5d6d)' : '';
  }
  // 设备标签
  for (const tg of tags) {
    const st = tg.st;
    if (st.off) { tg.el.style.display = 'none'; continue; }
    const [x, y, ok] = W.project(st.x, st.ly, st.z);
    tg.el.style.display = ok ? '' : 'none';
    tg.el.style.transform = `translate(${Math.min(innerWidth - 44, Math.max(44, x)).toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
    if (slow || R.dirty) {
      const s = G.status(st.id), html = `${st.emo} ${st.name}${s ? `<small>${s}</small>` : ''}`;
      if (html !== tg.html) { tg.html = html; tg.el.innerHTML = html; }
      tg.el.classList.toggle('on', R.near === st);
    }
  }
  // 顾客气泡
  const seen = new Set();
  for (const c of R.customers) {
    if (c.state !== 'order') continue; seen.add(c.id);
    let b = bubs.get(c.id);
    if (!b) { const el = document.createElement('div'); el.className = 'bub' + (c.vip ? ' vip' : ''); el.innerHTML = `<b>${c.slot + 1}</b><span></span><em style="font-style:normal">${c.type.emo}</em><i><u></u></i>`; $('labels').appendChild(el); b = { el, face: el.children[1], bar: el.querySelector('u'), f: '' }; bubs.set(c.id, b); }
    const p = c.mesh.position, [x, y] = W.project(p.x, 2.05, p.z), k = Math.max(0, c.patience / c.maxP);
    b.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
    const col = k > 0.5 ? '#58c98b' : k > 0.25 ? '#ffb347' : '#ff6b7d', f = k > 0.6 ? '😊' : k > 0.3 ? '🙂' : '😣';
    b.bar.style.width = k * 100 + '%'; b.bar.style.background = col;
    if (f !== b.f) { b.f = f; b.face.textContent = f; }
    const u = bars[c.slot]; if (u) { u.style.width = k * 100 + '%'; u.style.background = col; }
  }
  for (const [id, b] of bubs) if (!seen.has(id)) { b.el.remove(); bubs.delete(id); }
}

// ---------- 面板 ----------
export function openSheet(name, data) {
  if (R.phase === 'title') return;
  sheetName = name; sheetData = data; R.paused = true; $('sheetwrap').hidden = false; renderSheet();
}
export function closeSheet() {
  const was = sheetName; sheetName = null; $('sheetwrap').hidden = true; R.paused = false; R.dirty = true;
  if (was === 'summary') G.nextDay();
}
const head = (t, sub) => `<h2>${t}<button class="x" data-a="close">✕</button></h2>${sub ? `<p class="sub">${sub}</p>` : ''}`;
const buyBtn = (act, cost, label, sub) => `<button class="btn${S.coins < cost ? ' no' : ''}" data-a="${act}">${label}<small>${sub || `💰${fmt(cost)}`}</small></button>`;

function renderSheet(keep) {
  const body = $('sheetbody'), sc = body.scrollTop; let h = '';
  if (sheetName === 'shop') {
    h = head('🛒 进货', `余额 💰${fmt(S.coins)}　今天已进货 💰${fmt(R.today ? R.today.cost : 0)}　货品即买即到${G.lv('bulk') ? `　批发价 -${G.lv('bulk') * 6}%` : ''}`);
    const plan = G.restockPlan();
    h += plan.cost ? `<button class="btn big${S.coins < plan.cost ? ' soft' : ''}" style="margin:0 0 10px" data-a="restock">📦 一键补货<small>把 ${plan.list.length} 种常用原料补到安全库存　💰${fmt(plan.cost)}</small></button>` : '<p class="sub center">✅ 库存充足，今天不用补货</p>';
    for (const id of SEQ) {
      if (!SHOP[id] || !G.unlocked().has(id)) continue;
      const it = SHOP[id], ing = ING[id], n = S.stock[id] || 0, tea = ing.type === 'tea', pe = id === 'pearl';
      const info = tea ? `茶叶 ${n} 包 · 桶里 ${S.urn[id] || 0} 杯（每包泡 ${G.urnCap()} 杯）` : pe ? `生珍珠 ${n} 袋 · 已煮好 ${S.cooked} 份（每袋 8 份）` : `库存 ${n} 份`;
      h += `<div class="row${n <= (tea || pe ? 0 : 2) ? ' low' : ''}"><div class="e">${ing.emo}</div><div class="m"><b>${ing.name}</b><small>${info}</small></div>
        ${buyBtn(`buy:${id}:1`, G.cost(id), `+${it.n}${it.unit[0] === '份' ? '份' : it.unit[0]}`)}${buyBtn(`buy:${id}:5`, G.cost(id) * 5, '×5')}</div>`;
    }
    h += `<p class="sub">🧊 冰块免费不限量。${G.lv('fridge') ? '有保鲜冷柜，泡好的茶和熟珍珠可以留到明天。' : '泡好的茶和煮好的珍珠不能隔夜，打烊时会倒掉哦。'}</p>`;
  } else if (sheetName === 'up') {
    h = head('⬆️ 升级小店', `余额 💰${fmt(S.coins)}　魅力 ${G.charm()}（每点 +3% 小费、+2% 客流）`);
    h += `<div class="seg">${[['shop', '店铺'], ['up', '设备'], ['staff', '店员'], ['decor', '装饰']].map(([k, n]) => `<button class="${sheetTab === k ? 'on' : ''}" data-a="tab:${k}">${n}</button>`).join('')}</div>`;
    if (sheetTab === 'shop') {
      const cur = SHOPS[S.shop - 1], nx = SHOPS[S.shop];
      h += `<div class="hero"><div class="he">${cur.emo}</div><b>${cur.name}</b><small>${'★'.repeat(cur.t)}${'☆'.repeat(SHOPS.length - cur.t)}　${cur.slots} 个点单位 · ${cur.tables.length * 2} 个座位 · 可雇 ${cur.staff} 位奶茶师</small></div>`;
      if (nx) {
        const okLv = S.level >= nx.lv;
        h += `<div class="row next"><div class="e">${nx.emo}</div><div class="m"><b>扩建为「${nx.name}」</b><small>${nx.slots} 个点单位 · ${nx.tables.length * 2} 个座位 · 可雇 ${nx.staff} 位奶茶师<br>客流 +22%，魅力 +2${okLv ? '' : `<br><span style="color:var(--bad)">需要 Lv.${nx.lv}（当前 Lv.${S.level}）</span>`}${R.phase !== 'prep' ? '<br>打烊后的准备阶段才能施工' : ''}</small></div>
          <button class="btn${S.coins < nx.cost || !okLv || R.phase !== 'prep' ? ' no' : ''}" data-a="expand">扩建<small>💰${fmt(nx.cost)}</small></button></div>`;
      } else h += '<p class="sub center">👑 已经是最大规模的云端城堡啦！继续开分店、研发配方吧</p>';
      h += '<button class="btn g" style="display:block;width:100%;margin:2px 0 4px" data-a="tour">🎥 全景欣赏我的店</button>';
      h += `<h3>连锁分店　每天打烊分红 💰${fmt(G.branchIncome())}</h3>`;
      for (const b of BRANCHES) {
        const l = S.branch[b.id] || 0, lock = S.shop < b.shop;
        h += `<div class="row${lock ? ' lock' : ''}"><div class="e">${b.emo}</div><div class="m"><b>${b.name} <span class="dots">${'●'.repeat(l)}${'○'.repeat(5 - l)}</span></b><small>${lock ? `扩建到「${SHOPS[b.shop - 1].name}」后可开` : l ? `每天分红 💰${fmt(b.inc * l)}${l < 5 ? ` → 💰${fmt(b.inc * (l + 1))}` : ''}` : `开业后每天分红 💰${fmt(b.inc)}`}</small></div>${l >= 5 ? '<span class="btn done">已满级</span>' : lock ? '<span class="btn no">🔒</span>' : buyBtn(`branch:${b.id}`, G.branchCost(b), l ? '升级' : '开店')}</div>`;
      }
      h += '<h3>店址场景（每拥有一个 魅力 +3）</h3><div class="grid2">' + SCENES.map((s) => { const own = S.scenes[s.id], lock = !own && S.shop < s.shop; return `<div class="cell"><b style="font-size:14px">${s.emo} ${s.name}</b>
        <button class="btn ${S.scene === s.id ? 'done' : own ? 'g' : lock || S.coins < s.cost ? 'no' : ''}" style="margin-top:6px;width:100%" data-a="scene:${s.id}">${S.scene === s.id ? '当前店址' : own ? '搬过去' : lock ? `🔒 ${SHOPS[s.shop - 1].name}` : `💰${fmt(s.cost)}`}</button></div>`; }).join('') + '</div>';
    } else if (sheetTab === 'decor') {
      h += '<h3>店铺主题</h3><div class="grid2">' + THEMES.map((t) => `<div class="cell" style="background:${t.wall};border-color:${t.accent}"><b style="font-size:14px">${t.name}</b>
        <button class="btn ${S.theme === t.id ? 'done' : S.themes[t.id] ? 'g' : S.coins < t.cost ? 'no' : ''}" style="margin-top:6px;width:100%" data-a="theme:${t.id}">${S.theme === t.id ? '使用中' : S.themes[t.id] ? '换上' : `💰${fmt(t.cost)}`}</button></div>`).join('') + '</div><h3>装饰摆件</h3>';
      for (const d of DECOR) { const lock = d.shop && S.shop < d.shop; h += `<div class="row${lock ? ' lock' : ''}"><div class="e">${d.emo}</div><div class="m"><b>${d.name}</b><small>魅力 +${d.charm}${lock ? `　需要「${SHOPS[d.shop - 1].name}」` : ''}</small></div>${S.decor[d.id] ? '<span class="btn done">已拥有</span>' : lock ? '<span class="btn no">🔒</span>' : buyBtn(`decor:${d.id}`, d.cost, '购买')}</div>`; }
    } else {
      if (sheetTab === 'staff') {
        h += `<p class="sub">员工工资每天打烊结算：今天 💰${fmt(G.wages())}　·　当前店面最多 ${SHOPS[S.shop - 1].staff} 位奶茶师</p>`;
        const crew = S.crew.slice(0, Math.min(G.lv('hire'), SHOPS[S.shop - 1].staff));
        if (crew.length) h += '<h3>我的奶茶师</h3><div class="crew">' + crew.map((c) => {
          const l = G.crewLv(c), t = TRAITS[c.trait], a = CREW_LV[l - 1], b = CREW_LV[l];
          return `<div class="cc"><div class="cn">🧑‍🍳 <b>${c.name}</b><span class="lv">Lv.${l}</span></div><span class="trait">${t.emo} ${t.name}</span><small>${t.desc}</small><i class="xb"><u style="width:${b ? Math.round((c.xp - a) / (b - a) * 100) : 100}%"></u></i><small>${b ? `出杯 ${c.xp}/${b} 升级` : `出杯 ${c.xp} · 已满级`}</small></div>`;
        }).join('') + '</div>';
      }
      for (const u of UPGRADES.filter((x) => x.cat === sheetTab)) {
        const l = G.lv(u.id), max = l >= (u.id === 'hire' ? Math.min(u.max, SHOPS[S.shop - 1].staff) : u.max), c = max ? 0 : G.upCost(u);
        h += `<div class="row"><div class="e">${u.emo}</div><div class="m"><b>${u.name} <span class="dots">${'●'.repeat(l)}${'○'.repeat(u.max - l)}</span></b>
          <small>${l ? '当前：' + u.desc(l) : u.desc(0)}${max ? '' : `<br>下一级：${u.desc(l + 1)}`}</small></div>${max ? `<span class="btn done">${l >= u.max ? '已满级' : '需扩建'}</span>` : buyBtn(`up:${u.id}`, c, u.id === 'hire' ? '雇用' : l ? '升级' : '购买')}</div>`;
      }
    }
  } else if (sheetName === 'menu') {
    h = head('📖 配方与研发', `取杯 → 小料 → 冰块 → 茶底 → 奶/果酱 → 奶盖 → 封口。研发一次售价 +12%　余额 💰${fmt(S.coins)}`);
    h += S.level >= LAB_LV ? `<button class="btn big g" style="margin:0 0 10px" data-a="sheet:lab">🧪 新品实验室<small>照着线索搭配原料，研发隐藏配方（已研发 ${Object.keys(S.lab).length}/${G.secrets().length}）</small></button>` : `<p class="sub center">🧪 Lv.${LAB_LV} 解锁新品实验室，可以研发隐藏配方</p>`;
    for (const r of RECIPES) {
      if (r.secret && !S.lab[r.id]) continue;
      const ok = r.lv <= S.level;
      const l = S.rlv[r.id] || 0;
      h += `<div class="row${ok ? '' : ' lock'}${r.id === R.hot ? ' next' : ''}"><div class="e">${ok ? (r.id === R.hot ? '🔥' : '🧋') : '🔒'}</div><div class="m"><b>${r.name} ${ok ? `<span class="rs r${l}">${RSTAR[l]}</span>` : ''}${r.id === R.hot ? ' <span class="rs r4">今日爆款 ×1.5</span>' : ''}</b>${ok ? `<div class="chips">${sorted(r.items).map((i) => chip(i)).join('')}</div><small>售价 💰${G.price(r)}　<span class="dots">${'★'.repeat(l)}${'☆'.repeat(5 - l)}</span></small>` : `<small>Lv.${r.lv} 解锁</small>`}</div>${!ok ? `<b>💰${G.price(r)}</b>` : l >= 5 ? '<span class="btn done">传奇</span>' : buyBtn(`rec:${r.id}`, G.recCost(r), '研发', `💰${fmt(G.recCost(r))}`)}</div>`;
    }
  } else if (sheetName === 'camp') {
    const cp = G.camp();
    h = head('📣 今日宣传', `开门前选一个，当天有效。客人多了记得备足原料、安排好人手　余额 💰${fmt(S.coins)}`);
    for (const c of CAMPAIGNS) {
      const lock = S.level < c.lv, cost = G.campCost(c), on = cp && cp.id === c.id;
      h += `<div class="row${lock ? ' lock' : ''}${on ? ' next' : ''}"><div class="e">${c.emo}</div><div class="m"><b>${c.name}</b><small>${c.desc}${lock ? `<br>Lv.${c.lv} 解锁` : ''}</small></div>${on ? '<span class="btn done">进行中</span>' : lock ? '<span class="btn no">🔒</span>' : cp ? '<span class="btn no">今天已选</span>' : buyBtn(`camp:${c.id}`, cost, '开始')}</div>`;
    }
    h += '<p class="sub">💡 店里接待不过来时，客人多了反而会流失。人手不够的日子，可以选「会员日」这种不加客流的活动。</p>';
  } else if (sheetName === 'lab') {
    const all = G.secrets(), un = [...G.unlocked()];
    h = head('🧪 新品实验室', `选 2~7 种原料试做一杯，配对成功就能上架隐藏配方。每次试做 💰${fmt(G.labCost())}　余额 💰${fmt(S.coins)}`);
    h += `<div class="lab">${SEQ.filter((i) => un.includes(i)).map((i) => `<button class="lc${labSel.has(i) ? ' on' : ''}" data-a="lsel:${i}"><span>${ING[i].emo}</span>${ING[i].name}</button>`).join('')}</div>`;
    h += `<div class="labcup">${labSel.size ? SEQ.filter((i) => labSel.has(i)).map((i) => chip(i)).join('') : '<small>点上面的原料放进杯子</small>'}</div>`;
    h += `<div style="display:flex;gap:8px;margin:6px 0 4px"><button class="btn g" style="flex:0 0 auto" data-a="lclear">清空</button><button class="btn${labSel.size < 2 || S.coins < G.labCost() ? ' no' : ''}" style="flex:1" data-a="labtry">🧪 试做这一杯<small>💰${fmt(G.labCost())}</small></button></div>`;
    if (R.labMsg) h += `<p class="sub tipbox">${R.labMsg}</p>`;
    h += '<h3>配方线索</h3>';
    all.forEach((r, i) => {
      const got = S.lab[r.id], lock = r.lv > S.level;
      h += `<div class="row${lock ? ' lock' : ''}${got ? ' next' : ''}"><div class="e">${got ? '🧋' : lock ? '🔒' : '❓'}</div><div class="m"><b>#${i + 1} ${got ? r.name : lock ? `Lv.${r.lv} 解锁线索` : '神秘配方'}</b><small>${got ? `${sorted(r.items).map((x) => ING[x].emo).join(' ')}　售价 💰${G.price(r)}` : lock ? '等级够了才能研究' : `线索：${r.hint}`}</small></div></div>`;
    });
  } else if (sheetName === 'tasks') {
    h = head('🎯 目标与图鉴', `完成目标立刻获得奖励 · 当前店面「${G.rank()}」`);
    h += `<div class="seg">${[['goal', '目标'], ['rank', '排行'], ['pal', '常客'], ['ach', `成就 ${Object.keys(S.ach).length}/${ACHS.length}`]].map(([k, n]) => `<button class="${taskTab === k ? 'on' : ''}" data-a="ttab:${k}">${n}</button>`).join('')}</div>`;
    if (taskTab === 'goal') {
      for (const g of R.goals) h += `<div class="row"><div class="e">${g.done ? '✅' : '🎯'}</div><div class="m"><b>${g.text(g.target)}</b><small>进度 ${Math.min(g.target, Math.floor(R.today[g.type]))}/${g.target}</small></div><span class="btn ${g.done ? 'done' : 'g'}">💰${g.reward}</span></div>`;
      const hot = RECIPES.find((r) => r.id === R.hot);
      if (hot) h += `<div class="row next"><div class="e">🔥</div><div class="m"><b>今日爆款：${hot.name}</b><small>今天售价 ×1.5（💰${G.price(hot)}），点的人也更多，记得多备点料</small></div></div>`;
      h += `<h3>生涯</h3><div class="grid2"><div class="cell">单日最高收入<b>${fmt(S.stats.bestDay || 0)}</b></div><div class="cell">单日最多出杯<b>${S.stats.bestServed || 0}</b></div><div class="cell">累计出杯<b>${fmt(S.stats.served)}</b></div><div class="cell">累计收入<b>${fmt(S.stats.earned)}</b></div><div class="cell">最高连击<b>${S.stats.bestCombo}</b></div><div class="cell">服务贵宾<b>${S.stats.vip}</b></div><div class="cell">狂热时刻<b>${S.stats.fever || 0}</b></div><div class="cell">外卖单<b>${S.stats.rider || 0}</b></div></div>`;
    } else if (taskTab === 'rank') {
      G.rankWeek();
      const rk = S.rank, live = R.today && (R.phase === 'open' || R.phase === 'closing') ? R.today.income + R.today.tips : 0, me = rk.score + live;
      const left = 7 - ((S.day - 1) % 7);
      const list = [...RIVALS.map((r, i) => ({ emo: r.emo, name: r.name, v: rk.riv[i] })), { emo: '🧋', name: '啵啵奶茶铺（你）', v: me, me: 1 }].sort((a, b) => b.v - a.v);
      h += `<p class="sub">第 ${rk.w} 届街区奶茶榜：比一比这一周的营业额（含小费）。第 ${rk.w * 7} 天（周末集市）打烊时结算${rk.done ? '，本届已结算' : `，还剩 ${left} 天`}。</p>`;
      list.forEach((x, i) => { h += `<div class="row${x.me ? ' next' : ''}"><div class="e">${['🥇', '🥈', '🥉'][i] || i + 1}</div><div class="m"><b>${x.emo} ${x.name}</b><small>本周 💰${fmt(x.v)}</small></div>${x.me ? `<span class="btn g">奖励 ${Math.round(RANK_PRIZE[i] * 100)}%</span>` : ''}</div>`; });
      h += `<p class="sub">名次奖励 = 本周营业额 × ${RANK_PRIZE.map((p) => Math.round(p * 100) + '%').join(' / ')}，第 1 名口碑额外 +0.15。对手会跟着你的成绩一起进步哦。${rk.best ? `　历史最好：第 ${rk.best} 名` : ''}</p>`;
    } else if (taskTab === 'pal') {
      h += '<p class="sub">常客只喝自己最爱的那一款。每次完美出杯 +1 好感，每升一颗 ♥：一份谢礼、魅力 +1、付款再多 10%。</p>';
      for (const p of PALS) {
        const n = S.pal[p.id] || 0, hs = G.hearts(p.id), lock = p.lv > S.level, fav = RECIPES.find((r) => r.id === p.fav), nx = PAL_HEART[hs];
        h += `<div class="row${lock ? ' lock' : ''}"><div class="e">${lock ? '❔' : p.emo}</div><div class="m"><b>${lock ? '神秘客人' : p.name} <span class="hearts">${'♥'.repeat(hs)}<i>${'♥'.repeat(5 - hs)}</i></span></b>
          <small>${lock ? `Lv.${p.lv} 后会来光顾` : `最爱「${fav.name}」　“${p.say}”<br>${nx ? `好感 ${n}/${nx}` : '已是知己'}　付款 ×${(1.2 + 0.1 * hs).toFixed(1)}`}</small></div></div>`;
      }
    } else for (const a of ACHS) h += `<div class="row${S.ach[a.id] ? '' : ' lock'}"><div class="e">${S.ach[a.id] ? '🏆' : '🔒'}</div><div class="m"><b>${a.name}</b><small>${a.desc}</small></div><span class="btn ${S.ach[a.id] ? 'done' : 'g'}">💰${fmt(a.r)}</span></div>`;
  } else if (sheetName === 'set') {
    h = head('⚙️ 设置', '游戏已暂停');
    for (const [k, n, d] of [['auto', '🤖 顺手操作', '走到提示的设备旁，自动完成那一步，不用再点按钮'], ['guide', '💡 指引', '黄色箭头和下一步提示'], ['sfx', '🔔 音效', '操作与收银音效'], ['music', '🎵 音乐', '轻快的背景音乐']])
      h += `<div class="row"><div class="m"><b>${n}</b><small>${d}</small></div><button class="tog${S.set[k] ? ' on' : ''}" data-a="set:${k}"></button></div>`;
    h += `<div class="row"><div class="m"><b>🎥 全景欣赏</b><small>镜头拉远，绕着整家店转一圈</small></div><button class="btn g" data-a="tour">看看</button></div>
      <div class="row"><div class="m"><b>📒 玩法小贴士</b><small>
        · <b style="display:inline">点订单卡</b>可以指定「这单我来做」，店员会让给你<br>
        · 连续亲手做对会攒 🔥 狂热条，攒满进入狂热时刻：收入 ×1.5<br>
        · 订单上方右侧是技能按钮：安抚客人、闪电手、魔法调饮<br>
        · 每天有一款 🔥 今日爆款，售价 ×1.5，开门前多备料<br>
        · 🛵 外卖骑手一次要 2~3 杯同款；💗 常客只点自己最爱的<br>
        · 店里排满时客人会改下线上外卖单，空闲店员做好放进 🛵 外卖柜<br>
        · 第 5 天起设备偶尔会出故障，要老板亲自走过去修<br>
        · 客人看到有人在做自己的单，耐心掉得更慢；排队太久的客人耐心更少<br>
        · 每 7 天一次 🎪 周末集市：客人更多、小费更高，同时结算 🏆 街区排行榜<br>
        · 开门前可以选 📣 宣传活动；Lv.7 起在「配方 → 🧪 新品实验室」照线索研发隐藏配方<br>
        · 每位奶茶师有自己的特长，出杯越多等级越高，在「升级 → 店员」查看<br>
        · 听不到声音？检查 iPhone 侧边的静音开关</small></div></div>
      <div class="row"><div class="m"><b>📱 添加到主屏幕</b><small>Safari 底部「分享」→「添加到主屏幕」，即可像 App 一样全屏游玩</small></div></div>
      <div class="row"><div class="m"><b>🗑️ 重新开始</b><small>清空存档，从第 1 天重来</small></div><button class="btn g" data-a="reset">清空存档</button></div>`;
  } else if (sheetName === 'level') {
    const d = sheetData;
    h = `<div class="center"><div class="logo" style="font-size:56px">🎉</div><h2 style="justify-content:center">升到 Lv.${d.level} 啦！</h2></div>`;
    if (d.recs.length) {
      h += '<h3>新饮品解锁（新原料已免费送到店里）</h3>';
      for (const r of d.recs) h += `<div class="row"><div class="e">🧋</div><div class="m"><b>${r.name}</b><div class="chips">${sorted(r.items).map((i) => chip(i)).join('')}</div></div><b>💰${G.price(r)}</b></div>`;
    } else h += `<p class="sub center">招牌越来越响！升级奖励 💰${d.bonus}</p>`;
    for (const s of d.skills || []) h += `<div class="row next"><div class="e">${s.emo}</div><div class="m"><b>新技能：${s.name}</b><small>${s.desc}（营业时点订单下方的圆按钮，冷却 ${s.cd} 秒）</small></div></div>`;
    for (const p of d.pals || []) h += `<div class="row"><div class="e">${p.emo}</div><div class="m"><b>新常客：${p.name}</b><small>听说了你的店，以后会常来。“${p.say}”</small></div></div>`;
    for (const c of d.camps || []) h += `<div class="row next"><div class="e">${c.emo}</div><div class="m"><b>新宣传活动：${c.name}</b><small>${c.desc}（开门前点「今日宣传」）</small></div></div>`;
    if (d.lab) h += '<div class="row next"><div class="e">🧪</div><div class="m"><b>新品实验室开放！</b><small>在「配方」里照着线索搭配原料，研发隐藏配方</small></div></div>';
    if (d.secrets) h += `<div class="row"><div class="e">❓</div><div class="m"><b>实验室出现 ${d.secrets} 条新线索</b><small>去「配方 → 新品实验室」看看</small></div></div>`;
    h += '<button class="btn big" data-a="close">太棒了！</button>';
  } else if (sheetName === 'summary') {
    const d = sheetData;
    h = `<div class="center"><h2 style="justify-content:center">🌙 第 ${d.day} 天打烊</h2><div class="stars">${'⭐'.repeat(d.stars)}<span style="opacity:.25">${'⭐'.repeat(5 - d.stars)}</span></div>
      <p class="sub">${['', '手忙脚乱的一天，明天会更好', '有点吃力，试试升级设备', '稳稳当当！', '客人们都很满意！', '完美营业！口碑大涨！'][d.stars]}${d.bonus ? `　好评奖励 💰${d.bonus}` : ''}</p>
      ${d.record || d.recServed ? `<p class="rec">🏅 新纪录！${d.record ? `单日收入 💰${fmt(d.income + d.tips)}` : ''}${d.record && d.recServed ? '　' : ''}${d.recServed ? `单日出杯 ${d.served} 杯` : ''}</p>` : ''}
      ${d.lost >= 3 ? `<p class="sub tipbox">💡 今天有 ${d.lost} 位客人等不及走了。${G.lv('hire') < SHOPS[S.shop - 1].staff ? '雇一位奶茶师' : '培训店员'}、升级跑鞋和等位区都能缓解；快撑不住时用 🍬 技能安抚。</p>` : ''}</div>
      <div class="grid2"><div class="cell">营业额<b>💰${fmt(d.income)}</b></div><div class="cell">小费<b>💰${fmt(d.tips)}</b></div><div class="cell">进货 + 工资<b>💰${fmt(d.cost + d.wages)}</b></div>${d.branch || d.staff ? `<div class="cell">分店分红<b>💰${fmt(d.branch)}</b></div><div class="cell">店员出杯<b>${d.staff}${d.online ? `<small style="font-size:11px;color:var(--ink2)"> 含外卖 ${d.online}</small>` : ""}</b></div>` : ''}<div class="cell">今日净赚<b style="color:${d.profit >= 0 ? '#2f9b62' : '#ff6b7d'}">💰${fmt(d.profit)}</b></div>
      <div class="cell">出杯 / 流失<b>${d.served} / ${d.lost}</b></div><div class="cell">连击 / 狂热<b>${d.bestCombo} / ${d.fever || 0}</b></div></div>
      <p class="sub center" style="margin-top:10px">🎯 完成目标 ${d.goals}/3${d.wasted ? `　·　隔夜的 ${d.wasted} 份茶和珍珠已倒掉` : ''}</p>
      ${d.rank ? `<div class="rankres"><b>${['🥇', '🥈', '🥉'][d.rank.pos - 1] || '🏅'} 第 ${d.rank.w} 届街区奶茶榜：第 ${d.rank.pos} 名</b><small>本周营业额 💰${fmt(d.rank.score)}　名次奖励 +💰${fmt(d.rank.prize)}${d.rank.pos === 1 ? '　口碑 +0.15' : ''}</small></div>` : ''}
      ${d.reviews && d.reviews.length ? `<h3>今日点评</h3>${d.reviews.map((r) => `<div class="rv"><span class="ra">${r.emo}</span><div><b>${r.who} <i>${'★'.repeat(r.s)}<em>${'★'.repeat(5 - r.s)}</em></i></b><small>${r.text}</small></div></div>`).join('')}` : ''}
      <button class="btn big" data-a="close">☀️ 准备第 ${S.day} 天</button>`;
  }
  body.innerHTML = h; body.scrollTop = keep ? sc : 0;
}
export { L };
