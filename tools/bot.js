// 调试用：模拟一个跟着提示走的玩家，快进若干天，用来量化难度曲线。
// 在浏览器控制台：const s = document.createElement('script'); s.src = 'tools/bot.js'; document.head.appendChild(s); 然后 __bot(5, { sp: 0.7, pause: 0.35, buy: false })
window.__bot = function (days, o = {}) {
  const { S, R, G, P, UI, W } = window.__g, sp = o.sp ?? 0.7, pause = o.pause ?? 0.35, dt = 1 / 30, out = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ORDER = ['hire', 'shoes', 'sofa', 'stove', 'urn', 'sealer', 'sign', 'quality', 'tipjar', 'cat', 'train', 'fever', 'bulk', 'waiter', 'care', 'fridge'];
  const shop = () => {
    G.restock(); if (!o.buy) return;
    G.expand();
    for (let pass = 0; pass < 3; pass++) for (const id of ORDER) {
      const before = S.coins; if (S.coins > 150 + S.day * 10) G.upgrade(id); if (S.coins === before) continue;
    }
    G.restock();
  };
  let minP = 1, sumQ = 0, nQ = 0; let wait = 0, key = '', end = S.day + days, guard = 0, shopped = -1;
  while (S.day < end && guard++ < 4e6) {
    if (R.tour > 0) R.tour = 0;
    if (R.paused) {
      if (R.phase === 'summary') { const t = R.today; out.push({ day: S.day - 1, lv: S.level, shop: S.shop, served: t.served, mine: t.served - t.staff, lost: t.lost, income: t.income + t.tips, fever: t.fever, minP: +minP.toFixed(2), avgQ: +(sumQ / Math.max(1, nQ)).toFixed(1), combo: t.bestCombo, coins: Math.round(S.coins), rep: +S.rep.toFixed(2) }); }
      if (R.phase === 'summary') { minP = 1; sumQ = 0; nQ = 0; } UI.closeSheet(); continue;
    }
    const h = R.hint;
    if (R.phase === 'prep') {
      if (shopped !== S.day) { shopped = S.day; shop(); }
      if (h && !h.st && !h.shop) G.openDoor();
    }
    if (h && h.shop) G.restock();
    if (h && h.st) {
      const st = W.st[h.st], tx = clamp(st.fx, -2.2, 2.2), tz = clamp(st.fz, -0.35, 3.9);
      const k = h.st + (h.act || h.ing || ''); if (k !== key) { key = k; wait = pause; }
      if (wait > 0) wait -= dt;
      else { const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz), s = G.speed() * sp * dt; if (d > 0.02) { P.x += dx / d * Math.min(s, d); P.z += dz / d * Math.min(s, d); } }
    }
    if (R.phase === 'open') { for (const c of R.slots) if (c && c.state === 'order') minP = Math.min(minP, c.patience / c.maxP); sumQ += R.waits.filter(Boolean).length; nQ++; }
    window.__g.run(dt);
  }
  return out;
};
