// 界面：HUD、3D 锚定标签、面板
import { S, R, G, hooks } from './game.js';
import { ING, RECIPES, SHOP, UPGRADES, DECOR, THEMES, ACHS, SEQ, SHOPS, BRANCHES, SCENES, RSTAR } from './data.js';
import { L } from './world.js';
import { setMusic, audio, sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
let W, curActions = [], actHtml = '', sheetName = null, sheetTab = 'shop', sheetData = null, lastSlow = 0;
const tags = [], bubs = new Map(), bars = [null, null, null];
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
  $('open').addEventListener('click', () => G.openDoor());
  $('sheetwrap').addEventListener('click', (e) => {
    if (e.target === $('sheetwrap')) { if (sheetName !== 'summary') closeSheet(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const [a, x, y] = b.dataset.a.split(':');
    if (a === 'close') return closeSheet();
    if (a === 'buy') G.buy(x, +y || 1);
    else if (a === 'up') G.upgrade(x);
    else if (a === 'decor') G.buyDecor(x);
    else if (a === 'theme') G.setTheme(x);
    else if (a === 'scene') G.setScene(x);
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

function celebrate({ emo, title, sub, big }) {
  document.querySelectorAll('.celebrate').forEach((e) => e.remove());
  const el = document.createElement('div'); el.className = 'celebrate' + (big ? ' big' : '');
  el.innerHTML = `<i class="rays"></i><div class="cbox"><span>${emo}</span><b>${title}</b><small>${sub || ''}</small></div>`;
  document.body.appendChild(el); confetti(big ? 60 : 30);
  if (big) { const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 900); }
  setTimeout(() => el.remove(), big ? 3200 : 2300);
}

// ---------- HUD ----------
function renderHud() {
  $('coins').textContent = fmt(S.coins); $('rep').textContent = S.rep.toFixed(1);
  $('lvtxt').textContent = `Lv.${S.level} ${G.rank()}`; $('xpfill').style.width = Math.min(100, S.xp / G.xpNeed() * 100) + '%';
  $('combo').textContent = R.combo >= 2 ? `🔥${R.combo}连击` : '';
  $('open').hidden = R.phase !== 'prep';
  const low = G.lowStock(); $('lowbadge').textContent = low || '';
  const gl = R.goals.filter((g) => !g.done).length; $('goalbadge').textContent = R.phase === 'prep' && gl ? gl : '';
  // 订单卡
  const h = R.hint || {}, cup = R.held;
  const ns = R.slots.length; $('orders').style.gridTemplateColumns = `repeat(${ns}, 1fr)`; $('orders').className = ns > 3 ? 'n4' : '';
  $('orders').innerHTML = R.phase === 'prep' || R.phase === 'summary' ? '' : R.slots.map((c, i) => {
    if (!c || c.state !== 'order') return `<div class="oc empty">等待客人</div>`;
    const tg = h.target === c, ty = c.type;
    return `<div class="oc${tg ? ' tg' : ''}${c.vip ? ' vip' : ''}${ty.id === 'horse' ? ' horse' : ''}${c.claim ? ' claimed' : ''}"><div class="oh"><b>${i + 1}</b><span>${c.order.name}</span></div>
      ${ty.name || c.claim ? `<div class="ty">${ty.name ? `${ty.emo}${ns > 3 ? '' : ty.name}×${ty.mul} ` : ''}${c.claim ? `<span class="st">🧑‍🍳${ns > 3 && ty.name ? '' : '店员在做'}</span>` : ''}</div>` : ''}
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
  if (R.dirty || slow) renderActions();
  // 时钟
  if (slow) {
    const p = R.phase === 'prep' ? 0 : Math.min(1, R.prog), m = Math.floor(600 + p * 720);
    $('daytxt').textContent = `第${S.day}天 ${R.weather.emo} ${R.phase === 'prep' ? '准备中' : R.phase === 'closing' ? '打烊中' : `${Math.floor(m / 60)}:${String(m % 60 - m % 10).padStart(2, '0')}`}`;
    $('tprog').style.width = p * 100 + '%';
    $('tprog').style.background = R.rush > 1 ? 'linear-gradient(90deg,#ff9f6b,#ff5d6d)' : '';
  }
  // 设备标签
  for (const tg of tags) {
    const st = tg.st;
    if (st.off) { tg.el.style.display = 'none'; continue; }
    const [x, y, ok] = W.project(st.x, st.ly, st.z);
    tg.el.style.display = ok ? '' : 'none';
    tg.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
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
    h = head('🛒 进货', `余额 💰${fmt(S.coins)}　今天已进货 💰${fmt(R.today ? R.today.cost : 0)}　货品即买即到`);
    for (const id of SEQ) {
      if (!SHOP[id] || !G.unlocked().has(id)) continue;
      const it = SHOP[id], ing = ING[id], n = S.stock[id] || 0, tea = ing.type === 'tea', pe = id === 'pearl';
      const info = tea ? `茶叶 ${n} 包 · 桶里 ${S.urn[id] || 0} 杯（每包泡 ${G.urnCap()} 杯）` : pe ? `生珍珠 ${n} 袋 · 已煮好 ${S.cooked} 份（每袋 8 份）` : `库存 ${n} 份`;
      h += `<div class="row${n <= (tea || pe ? 0 : 2) ? ' low' : ''}"><div class="e">${ing.emo}</div><div class="m"><b>${ing.name}</b><small>${info}</small></div>
        ${buyBtn(`buy:${id}:1`, it.cost, `+${it.n}${it.unit[0] === '份' ? '份' : it.unit[0]}`)}${buyBtn(`buy:${id}:5`, it.cost * 5, '×5')}</div>`;
    }
    h += '<p class="sub">🧊 冰块免费不限量。泡好的茶和煮好的珍珠不能隔夜，打烊时会倒掉哦。</p>';
  } else if (sheetName === 'up') {
    h = head('⬆️ 升级小店', `余额 💰${fmt(S.coins)}　魅力 ${G.charm()}（每点 +3% 小费、+2% 客流）`);
    h += `<div class="seg">${[['shop', '店铺'], ['up', '设备'], ['staff', '店员'], ['decor', '装饰']].map(([k, n]) => `<button class="${sheetTab === k ? 'on' : ''}" data-a="tab:${k}">${n}</button>`).join('')}</div>`;
    if (sheetTab === 'shop') {
      const cur = SHOPS[S.shop - 1], nx = SHOPS[S.shop];
      h += `<div class="hero"><div class="he">${cur.emo}</div><b>${cur.name}</b><small>${'★'.repeat(cur.t)}${'☆'.repeat(5 - cur.t)}　${cur.slots} 个点单位 · ${cur.tables.length * 2} 个座位 · 可雇 ${cur.staff} 位奶茶师</small></div>`;
      if (nx) {
        const okLv = S.level >= nx.lv;
        h += `<div class="row next"><div class="e">${nx.emo}</div><div class="m"><b>扩建为「${nx.name}」</b><small>${nx.slots} 个点单位 · ${nx.tables.length * 2} 个座位 · 可雇 ${nx.staff} 位奶茶师<br>客流 +22%，魅力 +2${okLv ? '' : `<br><span style="color:var(--bad)">需要 Lv.${nx.lv}（当前 Lv.${S.level}）</span>`}${R.phase !== 'prep' ? '<br>打烊后的准备阶段才能施工' : ''}</small></div>
          <button class="btn${S.coins < nx.cost || !okLv || R.phase !== 'prep' ? ' no' : ''}" data-a="expand">扩建<small>💰${fmt(nx.cost)}</small></button></div>`;
      } else h += '<p class="sub center">🏰 已经是最大规模的总店啦！继续开分店吧</p>';
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
      if (sheetTab === 'staff') h += `<p class="sub">员工工资每天打烊结算：今天 💰${fmt(G.wages())}　·　当前店面最多 ${SHOPS[S.shop - 1].staff} 位奶茶师</p>`;
      for (const u of UPGRADES.filter((x) => x.cat === sheetTab)) {
        const l = G.lv(u.id), max = l >= (u.id === 'hire' ? Math.min(u.max, SHOPS[S.shop - 1].staff) : u.max), c = max ? 0 : G.upCost(u);
        h += `<div class="row"><div class="e">${u.emo}</div><div class="m"><b>${u.name} <span class="dots">${'●'.repeat(l)}${'○'.repeat(u.max - l)}</span></b>
          <small>${l ? '当前：' + u.desc(l) : u.desc(0)}${max ? '' : `<br>下一级：${u.desc(l + 1)}`}</small></div>${max ? `<span class="btn done">${l >= u.max ? '已满级' : '需扩建'}</span>` : buyBtn(`up:${u.id}`, c, u.id === 'hire' ? '雇用' : l ? '升级' : '购买')}</div>`;
      }
    }
  } else if (sheetName === 'menu') {
    h = head('📖 配方与研发', `取杯 → 小料 → 冰块 → 茶底 → 奶/果酱 → 奶盖 → 封口。研发一次售价 +12%　余额 💰${fmt(S.coins)}`);
    for (const r of RECIPES) {
      const ok = r.lv <= S.level;
      const l = S.rlv[r.id] || 0;
      h += `<div class="row${ok ? '' : ' lock'}"><div class="e">${ok ? '🧋' : '🔒'}</div><div class="m"><b>${r.name} ${ok ? `<span class="rs r${l}">${RSTAR[l]}</span>` : ''}</b>${ok ? `<div class="chips">${sorted(r.items).map((i) => chip(i)).join('')}</div><small>售价 💰${G.price(r)}　<span class="dots">${'★'.repeat(l)}${'☆'.repeat(5 - l)}</span></small>` : `<small>Lv.${r.lv} 解锁</small>`}</div>${!ok ? `<b>💰${G.price(r)}</b>` : l >= 5 ? '<span class="btn done">传奇</span>' : buyBtn(`rec:${r.id}`, G.recCost(r), '研发', `💰${fmt(G.recCost(r))}`)}</div>`;
    }
  } else if (sheetName === 'tasks') {
    h = head('🎯 今日目标', `完成目标立刻获得奖励 · 当前称号「${G.rank()}」`);
    for (const g of R.goals) h += `<div class="row"><div class="e">${g.done ? '✅' : '🎯'}</div><div class="m"><b>${g.text(g.target)}</b><small>进度 ${Math.min(g.target, Math.floor(R.today[g.type]))}/${g.target}</small></div><span class="btn ${g.done ? 'done' : 'g'}">💰${g.reward}</span></div>`;
    h += `<h3>生涯</h3><div class="grid2"><div class="cell">累计出杯<b>${fmt(S.stats.served)}</b></div><div class="cell">累计收入<b>${fmt(S.stats.earned)}</b></div><div class="cell">最高连击<b>${S.stats.bestCombo}</b></div><div class="cell">服务贵宾<b>${S.stats.vip}</b></div></div><h3>成就 ${Object.keys(S.ach).length}/${ACHS.length}</h3>`;
    for (const a of ACHS) h += `<div class="row${S.ach[a.id] ? '' : ' lock'}"><div class="e">${S.ach[a.id] ? '🏆' : '🔒'}</div><div class="m"><b>${a.name}</b><small>${a.desc}</small></div><span class="btn ${S.ach[a.id] ? 'done' : 'g'}">💰${fmt(a.r)}</span></div>`;
  } else if (sheetName === 'set') {
    h = head('⚙️ 设置', '游戏已暂停');
    for (const [k, n, d] of [['sfx', '🔔 音效', '操作与收银音效'], ['music', '🎵 音乐', '轻快的背景音乐'], ['guide', '💡 新手指引', '黄色箭头和下一步提示']])
      h += `<div class="row"><div class="m"><b>${n}</b><small>${d}</small></div><button class="tog${S.set[k] ? ' on' : ''}" data-a="set:${k}"></button></div>`;
    h += `<div class="row"><div class="m"><b>📱 添加到主屏幕</b><small>Safari 底部「分享」→「添加到主屏幕」，即可像 App 一样全屏游玩</small></div></div>
      <div class="row"><div class="m"><b>🗑️ 重新开始</b><small>清空存档，从第 1 天重来</small></div><button class="btn g" data-a="reset">清空存档</button></div>`;
  } else if (sheetName === 'level') {
    const d = sheetData;
    h = `<div class="center"><div class="logo" style="font-size:56px">🎉</div><h2 style="justify-content:center">升到 Lv.${d.level} 啦！</h2></div>`;
    if (d.recs.length) {
      h += '<h3>新饮品解锁（新原料已免费送到店里）</h3>';
      for (const r of d.recs) h += `<div class="row"><div class="e">🧋</div><div class="m"><b>${r.name}</b><div class="chips">${sorted(r.items).map((i) => chip(i)).join('')}</div></div><b>💰${G.price(r)}</b></div>`;
    } else h += `<p class="sub center">招牌越来越响！升级奖励 💰${d.bonus}</p>`;
    h += '<button class="btn big" data-a="close">太棒了！</button>';
  } else if (sheetName === 'summary') {
    const d = sheetData;
    h = `<div class="center"><h2 style="justify-content:center">🌙 第 ${d.day} 天打烊</h2><div class="stars">${'⭐'.repeat(d.stars)}<span style="opacity:.25">${'⭐'.repeat(5 - d.stars)}</span></div>
      <p class="sub">${['', '手忙脚乱的一天，明天会更好', '有点吃力，试试升级设备', '稳稳当当！', '客人们都很满意！', '完美营业！口碑大涨！'][d.stars]}${d.bonus ? `　好评奖励 💰${d.bonus}` : ''}</p></div>
      <div class="grid2"><div class="cell">营业额<b>💰${fmt(d.income)}</b></div><div class="cell">小费<b>💰${fmt(d.tips)}</b></div><div class="cell">进货 + 工资<b>💰${fmt(d.cost + d.wages)}</b></div>${d.branch ? `<div class="cell">分店分红<b>💰${fmt(d.branch)}</b></div><div class="cell">店员出杯<b>${d.staff}</b></div>` : ''}<div class="cell">今日净赚<b style="color:${d.profit >= 0 ? '#2f9b62' : '#ff6b7d'}">💰${fmt(d.profit)}</b></div>
      <div class="cell">出杯 / 流失<b>${d.served} / ${d.lost}</b></div><div class="cell">最高连击<b>${d.bestCombo}</b></div></div>
      <p class="sub center" style="margin-top:10px">🎯 完成目标 ${d.goals}/3${d.wasted ? `　·　隔夜的 ${d.wasted} 份茶和珍珠已倒掉` : ''}</p>
      <button class="btn big" data-a="close">☀️ 准备第 ${S.day} 天</button>`;
  }
  body.innerHTML = h; body.scrollTop = keep ? sc : 0;
}
export { L };
