// 启动、输入、相机、主循环
import { createWorld, L } from './world.js';
import { S, R, G, hooks } from './game.js';
import * as UI from './ui.js';
import { initAudio, sfx, audio } from './audio.js';

const canvas = document.getElementById('c');
const W = createWorld(canvas);
G.init(W); UI.initUI(W);
hooks.sfx = sfx; audio.sfxOn = !!S.set.sfx; audio.musicOn = !!S.set.music;
const P = R.player;

// ---------- 输入 ----------
const joy = document.getElementById('joy'), knob = joy.firstElementChild;
let jid = null, ox = 0, oy = 0, jx = 0, jz = 0;
const keys = {};
canvas.addEventListener('pointerdown', (e) => {
  if (R.tour > 0) { R.tour = 0.01; return; }
  if (jid != null || R.phase === 'title') return;
  jid = e.pointerId; ox = e.clientX; oy = e.clientY; jx = jz = 0;
  joy.style.left = ox + 'px'; joy.style.top = oy + 'px'; knob.style.transform = ''; joy.classList.add('on');
  try { canvas.setPointerCapture(jid); } catch (err) { /* ignore */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== jid) return;
  let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy), m = 48;
  if (d > m) { dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  jx = dx / m; jz = dy / m;
});
const endJoy = (e) => { if (e.pointerId !== jid) return; jid = null; jx = jz = 0; joy.classList.remove('on'); };
canvas.addEventListener('pointerup', endJoy); canvas.addEventListener('pointercancel', endJoy);
addEventListener('keydown', (e) => { keys[e.code] = 1; if (e.code === 'Space') { const b = document.querySelector('#actions button.hot') || document.querySelector('#actions button:not(.dis)'); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); } });
addEventListener('keyup', (e) => { keys[e.code] = 0; });
for (const ev of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (!e.target.closest('#sheetbody')) e.preventDefault(); }, { passive: false });
addEventListener('resize', () => W.resize()); addEventListener('orientationchange', () => setTimeout(() => W.resize(), 200));

// ---------- 标题 ----------
const startBtn = document.getElementById('start');
if (S.had) startBtn.textContent = `继续营业 · 第 ${S.day} 天`;
// iPhone Safari 里还没添加到主屏幕时，提示一下（全屏体验更好）
if (/iP(hone|ad|od)/.test(navigator.userAgent) && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches) document.getElementById('tip').textContent = '💡 点 Safari 的「分享」→「添加到主屏幕」，像 App 一样全屏玩';
startBtn.addEventListener('click', () => {
  initAudio(); sfx('level');
  document.getElementById('title').hidden = true; document.getElementById('hud').hidden = false;
  G.begin();
});

// ---------- 玩家移动 ----------
function walkable(x, z) {
  for (const [a, b, c, d] of L.WALK) if (x >= a && x <= b && z >= c && z <= d) {
    for (const [ox2, oz2, r] of L.OBST) if (Math.hypot(x - ox2, z - oz2) < r) return false;
    return true;
  }
  return false;
}
function movePlayer(dt) {
  let x = jx + (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let z = jz + (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const d = Math.hypot(x, z);
  P.moving = d > 0.15 && !R.seal;
  if (!P.moving) return;
  const k = Math.min(1, d), sp = G.speed() * k * dt; x /= d; z /= d;
  const nx = P.x + x * sp, nz = P.z + z * sp;
  if (walkable(nx, nz)) { P.x = nx; P.z = nz; } else if (walkable(nx, P.z)) P.x = nx; else if (walkable(P.x, nz)) P.z = nz;
  let da = Math.atan2(x, z) - P.rot; da = Math.atan2(Math.sin(da), Math.cos(da));
  P.rot += da * Math.min(1, dt * 14);
}
function findNear() {
  let best = null, bd = 1.5;
  for (const st of W.stations) {
    if (st.off) continue;
    if (st.slot != null && (P.z > 0.4 || P.z < -0.6)) continue;
    const d = Math.hypot(st.x - P.x, st.z - P.z);
    if (d < bd) { bd = d; best = st; }
  }
  // 提示的目标设备只要够得着就优先选中（点单位挨得近时不会递错人）
  const hs = R.hint && R.hint.st ? W.st[R.hint.st] : null;
  if (hs && !hs.off && hs !== best && Math.hypot(hs.x - P.x, hs.z - P.z) < 1.5 && (hs.slot == null || (P.z <= 0.4 && P.z >= -0.6))) best = hs;
  if (best !== R.near) { R.near = best; R.dirty = true; }
}
// 顺手操作：走到提示的设备旁，自动完成提示的那一步
let autoT = 0, autoKey = '';
function autoStep(dt) {
  const h = R.hint, st = R.near;
  if (!S.set.auto || R.seal || !h || !st || h.st !== st.id) { autoT = 0; return; }
  const key = st.id + '|' + (h.act || h.ing || '') + '|' + (R.held ? R.held.items.length : -1);
  if (key !== autoKey) { autoKey = key; autoT = 0; }
  autoT += dt; if (autoT < 0.16) return;
  const a = G.actions(st).find((x) => x.hot && !x.dis && x.fn); if (!a) return;
  P.rot = Math.atan2(st.x - P.x, st.z - P.z); a.fn(); autoT = -0.15;
}

// ---------- 相机 ----------
const CAM = window.__cam = { pitch: 0.8, w: 4.5, zb: 1.1, zk: 0.6, xk: 0.2, max: 21 };
const cam = W.camera; let cx = 0, cz = 0, cd = 15, cp = CAM.pitch, cyaw = 0, first = true, touring = false, tourA = 0;
function camUpdate(dt) {
  const a = innerWidth / innerHeight, port = a < 1, tv = Math.tan((cam.fov / 2) * Math.PI / 180);
  let dist = Math.min(CAM.max, Math.max(10.5, CAM.w / (tv * a)));
  const hallF = Math.min(1, Math.max(0, (-0.5 - P.z) / 2.4)); // 在厨房时镜头基本不横移，进了大厅才跟着走
  let tx = P.x * (port ? CAM.xk + (L.hw > 3.5 ? 0.6 * hallF : 0) : 0.8), tz = port ? CAM.zb + (P.z - 1.8) * CAM.zk : P.z - 1.0, pitch = CAM.pitch, yaw = 0, k = Math.min(1, dt * 4);
  if (R.tour > 0) { // 全景巡览：拉远、绕店慢慢转
    if (!touring) { touring = true; tourA = 0; document.body.classList.add('tour'); }
    R.tour -= dt; tourA += dt;
    tx = 0; tz = (L.bz + 2.5) / 2; pitch = 0.66; yaw = Math.sin(tourA * 0.55) * 0.6;
    dist = Math.min(52, Math.max((L.hw * 2 + 7) / (2 * tv * a) * 0.92, (5.3 - L.bz) * 0.95));
    k = Math.min(1, dt * 1.8);
  } else if (touring) { touring = false; document.body.classList.remove('tour'); R.dirty = true; }
  if (first) { k = 1; first = false; }
  cx += (tx - cx) * k; cz += (tz - cz) * k; cd += (dist - cd) * k; cp += (pitch - cp) * k; cyaw += (yaw - cyaw) * k;
  const h = Math.cos(cp) * cd;
  cam.position.set(cx + Math.sin(cyaw) * h, Math.sin(cp) * cd + 0.8, cz + Math.cos(cyaw) * h);
  cam.lookAt(cx, 0.8, cz);
}

// ---------- 主循环 ----------
// 自适应画质：持续掉帧就逐级降低渲染分辨率（手机不发烫、不卡顿）
const PR = [2, 1.7, 1.45, 1.2, 1].filter((p) => p <= Math.min(2, devicePixelRatio || 1) + 0.01);
let prI = 0, fpsT = 0, fpsN = 0, fpsSlow = 0, skip = 0;
function adapt(raw) {
  if (document.hidden || R.phase === 'title' || raw > 0.25) return; // 切后台回来的那一帧不算
  fpsT += raw; fpsN++;
  if (fpsT < 2.5) return;
  const fps = fpsN / fpsT; fpsT = 0; fpsN = 0;
  fpsSlow = fps < 42 ? fpsSlow + 1 : 0;
  if (fpsSlow >= 2 && prI < PR.length - 1) { prI++; fpsSlow = 0; W.renderer.setPixelRatio(PR[prI]); W.resize(); }
}
if (PR.length) W.renderer.setPixelRatio(PR[0]);
window.__quality = () => ({ pr: W.renderer.getPixelRatio(), steps: PR, i: prI });

// 切到后台：立刻存档；回来时如果正在营业，先暂停，免得一回来客人就在催
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (R.phase !== 'title') G.save(); return; }
  if ((R.phase === 'open' || R.phase === 'closing') && !R.paused) UI.openSheet('set');
});
addEventListener('pagehide', () => { if (R.phase !== 'title') G.save(); });

let last = performance.now(), time = 0;
function step(dt) {
  time += dt;
  const live = !R.paused && R.tour <= 0 && R.phase !== 'title' && R.phase !== 'summary';
  if (live) movePlayer(dt); else P.moving = false;
  G.update(dt);
  if (live) { findNear(); autoStep(dt); }
}
function loop(now) {
  requestAnimationFrame(loop);
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
  adapt(raw);
  // 面板打开（游戏暂停）时降到约 20 帧，省电
  if (R.paused && R.tour <= 0 && R.phase !== 'title' && (skip = (skip + 1) % 3) !== 0) { UI.frame(time); return; }
  step(dt);
  if (R.dirty) W.sync(S, R, G);
  W.update(dt, time, S, R, G);
  camUpdate(dt);
  W.renderer.render(W.scene, cam);
  UI.frame(time);
  R.dirty = false;
}
W.sync(S, R, G);
requestAnimationFrame(loop);

// 调试钩子
window.__g = { S, R, G, W, P, UI, L, run(sec) { for (let i = 0; i < sec * 30; i++) step(1 / 30); R.dirty = true; } };

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
