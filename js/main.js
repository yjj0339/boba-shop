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
  if (best !== R.near) { R.near = best; R.dirty = true; }
}

// ---------- 相机 ----------
const CAM = window.__cam = { pitch: 0.8, w: 4.5, zb: 1.1, zk: 0.6, xk: 0.2, max: 21 };
const cam = W.camera; let cx = 0, cz = 0, cd = 15, first = true;
function camUpdate(dt) {
  const a = innerWidth / innerHeight, port = a < 1, tv = Math.tan((cam.fov / 2) * Math.PI / 180);
  const dist = Math.min(CAM.max, Math.max(10.5, CAM.w / (tv * a)));
  const tx = P.x * (port ? (L.hw > 3.5 ? 0.8 : CAM.xk) : 0.8), tz = port ? CAM.zb + (P.z - 1.8) * CAM.zk : P.z - 1.0;
  const k = first ? 1 : Math.min(1, dt * 4); first = false;
  cx += (tx - cx) * k; cz += (tz - cz) * k; cd += (dist - cd) * k;
  const pitch = CAM.pitch;
  cam.position.set(cx, Math.sin(pitch) * cd + 0.8, cz + Math.cos(pitch) * cd);
  cam.lookAt(cx, 0.8, cz);
}

// ---------- 主循环 ----------
let last = performance.now(), time = 0;
function step(dt) {
  time += dt;
  const live = !R.paused && R.phase !== 'title' && R.phase !== 'summary';
  if (live) movePlayer(dt); else P.moving = false;
  G.update(dt);
  if (live) findNear();
}
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
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
window.__g = { S, R, G, W, P, run(sec) { for (let i = 0; i < sec * 30; i++) step(1 / 30); R.dirty = true; } };

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
