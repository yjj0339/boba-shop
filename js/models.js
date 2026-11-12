// 模型工具：卡通材质、圆角盒、Q 版角色、奶茶杯
import * as THREE from '../lib/three.module.js';
import { ING } from './data.js';
export { THREE };

const gd = new Uint8Array([150, 208, 255]);
export const grad = new THREE.DataTexture(gd, 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;

const mc = new Map();
export function M(color, o) {
  const k = color + (o ? JSON.stringify(o) : '');
  let m = mc.get(k);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: grad, ...(o || {}) }); mc.set(k, m); }
  return m;
}
export const toon = (color, o) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...(o || {}) });
export const GLASS = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: grad, transparent: true, opacity: 0.28, depthWrite: false });

export function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = !mat.transparent; m.receiveShadow = !mat.transparent;
  if (parent) parent.add(m);
  return m;
}

const gc = new Map();
const geo = (k, f) => { let g = gc.get(k); if (!g) { g = f(); gc.set(k, g); } return g; };
export const cyl = (rt, rb, h, s = 20) => geo(`cy${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const sph = (r, ws = 18, hs = 14) => geo(`sp${r},${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
export const caps = (r, l) => geo(`ca${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 12));
export const cone = (r, h, s = 12) => geo(`co${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
export const rbox = (w, h, d, r = 0.06) => geo(`rb${w},${h},${d},${r}`, () => {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const b = r * 0.5, W = w - 2 * b, H = h - 2 * b, c = r - b, x = -W / 2, y = -H / 2;
  const s = new THREE.Shape();
  s.moveTo(x + c, y); s.lineTo(x + W - c, y); s.quadraticCurveTo(x + W, y, x + W, y + c);
  s.lineTo(x + W, y + H - c); s.quadraticCurveTo(x + W, y + H, x + W - c, y + H);
  s.lineTo(x + c, y + H); s.quadraticCurveTo(x, y + H, x, y + H - c);
  s.lineTo(x, y + c); s.quadraticCurveTo(x, y, x + c, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
});

export function emojiTex(emoji, bg = '#ffffff', size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, size, size);
  x.font = `${size * 0.62}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(emoji, size / 2, size / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Q 版角色 ----------
const HAIR = new THREE.SphereGeometry(0.425, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.54);
const SMILE = new THREE.TorusGeometry(0.045, 0.014, 6, 12, Math.PI);
const BLACK = M('#3a2a2a'), WHITE = M('#ffffff'), BLUSH = M('#ff9aa8');

export function makeChibi(o = {}) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const skin = M(o.skin || '#ffe2cc'), outfit = M(o.outfit || '#ff9fb4');
  const legL = mesh(caps(0.1, 0.14), M(o.pants || '#7a6a86'), -0.13, 0.17, 0, inner);
  const legR = mesh(caps(0.1, 0.14), M(o.pants || '#7a6a86'), 0.13, 0.17, 0, inner);
  mesh(caps(0.27, 0.22), outfit, 0, 0.6, 0, inner);
  if (o.apron) {
    mesh(rbox(0.4, 0.38, 0.1, 0.05), WHITE, 0, 0.55, 0.22, inner);
    mesh(sph(0.045), M('#ff7d95'), 0, 0.58, 0.275, inner);
  }
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.3, 0.78, 0); inner.add(p);
    const a = mesh(caps(0.08, 0.2), outfit, s * 0.04, -0.15, 0, p); a.rotation.z = s * 0.28;
    mesh(sph(0.085), skin, s * 0.085, -0.3, 0, p);
    return p;
  });
  const head = new THREE.Group(); head.position.set(0, 1.2, 0); inner.add(head);
  const hm = mesh(sph(0.4, 24, 18), skin, 0, 0, 0, head); hm.scale.set(1.04, 0.94, 0.98);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(sph(0.052), BLACK, s * 0.15, 0.0, 0.355, head); e.scale.set(1, 1.35, 0.5); eyes.push(e);
    mesh(sph(0.018), WHITE, s * 0.15 + 0.018, 0.03, 0.385, head);
    const b = mesh(sph(0.062), BLUSH, s * 0.25, -0.1, 0.305, head); b.scale.set(1, 0.6, 0.4);
  }
  const sm = mesh(SMILE, BLACK, 0, -0.085, 0.385, head); sm.rotation.z = Math.PI;
  const kind = o.kind || 'human';
  if (kind === 'human') {
    const hc = M(o.hair || '#6b4a3a');
    const h = mesh(HAIR, hc, 0, 0.02, -0.02, head); h.rotation.x = -0.32; h.scale.set(1.04, 1, 1.02);
    const st = o.style || 0;
    if (st === 1) for (const s of [-1, 1]) mesh(sph(0.15), hc, s * 0.3, 0.3, -0.05, head);
    if (st === 2) { mesh(sph(0.16), hc, 0, 0.05, -0.43, head); mesh(sph(0.12), hc, 0, -0.14, -0.5, head); }
    if (st === 3) for (const s of [-1, 1]) { const t = mesh(caps(0.09, 0.26), hc, s * 0.4, -0.2, -0.05, head); t.rotation.z = s * 0.2; }
    if (st === 4) { mesh(cyl(0.37, 0.4, 0.16), outfit, 0, 0.3, 0, head); const br = mesh(cyl(0.3, 0.3, 0.04), outfit, 0, 0.24, 0.3, head); br.scale.z = 0.8; }
    if (o.hat === 'beret') { const b = mesh(sph(0.3), M('#ff6f8e'), 0.05, 0.36, 0, head); b.scale.set(1.15, 0.45, 1.15); mesh(sph(0.045), M('#7bc47f'), 0.05, 0.5, 0, head); }
  } else if (kind === 'bear') {
    for (const s of [-1, 1]) { mesh(sph(0.14), skin, s * 0.29, 0.3, 0, head); mesh(sph(0.075), BLUSH, s * 0.29, 0.3, 0.08, head); }
    const mz = mesh(sph(0.13), M('#fff3e6'), 0, -0.07, 0.31, head); mz.scale.set(1.2, 0.85, 0.7);
  } else if (kind === 'bunny') {
    for (const s of [-1, 1]) { const e = mesh(caps(0.08, 0.34), skin, s * 0.16, 0.52, 0, head); e.rotation.z = -s * 0.14; }
  } else if (kind === 'cat') {
    for (const s of [-1, 1]) { const e = mesh(cone(0.14, 0.24, 4), skin, s * 0.24, 0.38, 0, head); e.rotation.y = Math.PI / 4; }
    for (const s of [-1, 1]) { const w = mesh(cyl(0.006, 0.006, 0.22, 4), BLACK, s * 0.34, -0.08, 0.3, head); w.rotation.z = Math.PI / 2 + s * 0.15; }
  }
  else if (kind === 'horse') {
    const mz = mesh(sph(0.2), M('#f3d9b0'), 0, -0.12, 0.3, head); mz.scale.set(1.05, 0.8, 1.1);
    for (const s of [-1, 1]) { const e = mesh(cone(0.09, 0.26, 8), skin, s * 0.2, 0.42, -0.02, head); e.rotation.z = -s * 0.25; mesh(sph(0.022, 6, 5), BLACK, s * 0.06, -0.1, 0.5, head); }
    for (let i = 0; i < 5; i++) mesh(sph(0.11), M('#6b4226'), 0, 0.36 - i * 0.13, -0.16 - i * 0.07, head);
    mesh(cyl(0.3, 0.3, 0.03, 18), M('#2b2738'), 0, 0.37, 0.02, head); mesh(cyl(0.19, 0.2, 0.3, 18), M('#2b2738'), 0, 0.53, 0.02, head); mesh(cyl(0.205, 0.205, 0.07, 18), M('#ffd23f'), 0, 0.43, 0.02, head);
    mesh(sph(0.07), M('#ffd23f', { emissive: '#ffb300', emissiveIntensity: 0.4 }), 0, 0.74, 0.26, inner);
  }
  if (o.tie) { mesh(rbox(0.09, 0.26, 0.04, 0.02), M(o.tie), 0, 0.66, 0.265, inner); mesh(rbox(0.2, 0.08, 0.05, 0.02), WHITE, 0, 0.83, 0.2, inner); }
  if (o.shades) for (const s of [-1, 1]) { const g2 = mesh(sph(0.1, 10, 8), M('#2b2738'), s * 0.15, 0.01, 0.37, head); g2.scale.set(1, 0.75, 0.3); }
  if (o.visor) { mesh(cyl(0.41, 0.42, 0.1, 20), M(o.visor), 0, 0.2, 0, head); const br = mesh(cyl(0.3, 0.3, 0.035, 18), M(o.visor), 0, 0.16, 0.26, head); br.scale.z = 0.75; }
  if (o.crown) { const c = mesh(cyl(0.16, 0.13, 0.13, 6), M('#ffd23f'), 0, 0.44, 0, head); c.rotation.y = 0.3; }
  if (o.helmet) { // 外卖头盔 + 保温箱
    const h = mesh(HAIR, M(o.helmet), 0, 0.03, 0, head); h.scale.set(1.13, 1.08, 1.13); h.rotation.x = -0.12;
    const br = mesh(cyl(0.3, 0.3, 0.035, 18), M('#3f3a52'), 0, 0.14, 0.3, head); br.scale.z = 0.6;
    mesh(rbox(0.46, 0.42, 0.3, 0.06), M(o.helmet), 0, 0.66, -0.36, inner); mesh(rbox(0.3, 0.12, 0.02, 0.01), WHITE, 0, 0.7, -0.515, inner);
  }
  g.userData = { inner, legL, legR, arms, head, eyes, bl: 1 + Math.random() * 4, ph: Math.random() * 6, mv: 0 };
  return g;
}

export function animChibi(g, dt, o = {}) {
  const u = g.userData;
  u.ph += dt * (o.moving ? 11 : 2.4);
  u.mv += ((o.moving ? 1 : 0) - u.mv) * Math.min(1, dt * 12);
  const s = Math.sin(u.ph);
  if (o.sit) {
    u.legL.rotation.x = u.legR.rotation.x = -1.35; u.inner.position.y = 0.12;
  } else {
    u.legL.rotation.x = s * 0.75 * u.mv; u.legR.rotation.x = -s * 0.75 * u.mv;
    u.inner.position.y = Math.abs(s) * 0.06 * u.mv + (1 - u.mv) * Math.sin(u.ph) * 0.012;
  }
  const hold = o.hold ? -1.15 : 0;
  u.arms[0].rotation.x = hold || -s * 0.6 * u.mv;
  u.arms[1].rotation.x = hold || s * 0.6 * u.mv;
  u.head.rotation.z = Math.sin(u.ph * 0.5) * 0.045;
  u.head.rotation.y = o.fret ? Math.sin(u.ph * 3.2) * 0.3 : 0;
  if (o.happy) u.inner.position.y += Math.abs(Math.sin(u.ph * 2)) * 0.1;
  if (o.fret && !o.sit) u.inner.position.y += Math.abs(Math.sin(u.ph * 2.4)) * 0.05;
  u.bl -= dt; if (u.bl < -0.12) u.bl = 1.8 + Math.random() * 3.6;
  const ey = u.bl < 0 ? 0.25 : 1.35; if (u.eyes[0].scale.y !== ey) for (const e of u.eyes) e.scale.y = ey;
}

// ---------- 奶茶杯 ----------
const CH = 0.44, RT = 0.155, RB = 0.115;
const rAt = (f) => RB + (RT - RB) * f;
const SHELL = new THREE.CylinderGeometry(RT, RB, CH, 20, 1, true);
const SHELL_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: grad, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
const ICE_MAT = M('#eaf7ff', { transparent: true, opacity: 0.8 });
const STRAWS = ['#ff7d95', '#6fc3ff', '#7bd389', '#ffb84d', '#b48be0'];

function mixColor(ids) {
  const c = new THREE.Color(0, 0, 0), t = new THREE.Color(); let w = 0;
  for (const id of ids) { const k = id === 'milk' ? 1.3 : 1; t.set(ING[id].color); c.r += t.r * k; c.g += t.g * k; c.b += t.b * k; w += k; }
  return w ? c.multiplyScalar(1 / w) : c.set('#ffffff');
}

export function makeCup() {
  const g = new THREE.Group(), dyn = new THREE.Group();
  g.add(dyn);
  const sh = new THREE.Mesh(SHELL, SHELL_MAT); sh.position.y = CH / 2; sh.renderOrder = 2; g.add(sh);
  mesh(cyl(RB, RB, 0.012, 20), M('#ffffff'), 0, 0.006, 0, g);
  let liqMat = null, liqGeo = null;
  const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  g.userData.set = (items, sealed) => {
    dyn.clear();
    if (liqGeo) { liqGeo.dispose(); liqGeo = null; }
    const liq = items.filter((i) => ING[i].type === 'tea' || ING[i].type === 'mix');
    const hasIce = items.includes('ice'), tops = items.filter((i) => ING[i].type === 'top');
    let fill = liq.length ? Math.min(0.8, 0.5 + 0.15 * (liq.length - 1)) + (hasIce ? 0.06 : 0) : 0;
    if (liq.length) {
      if (!liqMat) liqMat = toon('#fff');
      liqMat.color.copy(mixColor(liq));
      liqGeo = new THREE.CylinderGeometry(rAt(fill) - 0.008, RB - 0.008, CH * fill, 18);
      const m = new THREE.Mesh(liqGeo, liqMat); m.position.y = CH * fill / 2 + 0.01; dyn.add(m);
    }
    tops.forEach((id, ti) => {
      const mat = M(ING[id].color), y0 = 0.045 + ti * 0.06;
      if (id === 'pudding') { const p = mesh(sph(0.1), mat, 0, y0 + 0.01, 0, dyn); p.scale.set(1.12, 0.5, 1.12); return; }
      const n = id === 'redbean' ? 9 : 7, r = id === 'redbean' ? 0.022 : id === 'jelly' ? 0.026 : 0.032;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ti, rr = rAt(y0 / CH) - r * 0.75;
        const m = mesh(id === 'jelly' ? rbox(r * 1.7, r * 1.7, r * 1.7, 0.008) : sph(r, 10, 8), id === 'taroball' && i % 2 ? M('#ffb36b') : mat,
          Math.cos(a) * rr, y0 + rnd(i, ti) * 0.03, Math.sin(a) * rr, dyn);
        m.castShadow = false;
      }
    });
    if (hasIce) {
      const y = liq.length ? CH * fill : 0.05 + tops.length * 0.06;
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.4, m = mesh(rbox(0.07, 0.07, 0.07, 0.015), ICE_MAT, Math.cos(a) * 0.055, y + 0.005, Math.sin(a) * 0.055, dyn);
        m.rotation.set(rnd(i, 1), rnd(i, 2) * 3, rnd(i, 3));
      }
    }
    if (items.includes('foam')) {
      if (!fill) fill = 0.3;
      mesh(cyl(rAt(fill + 0.1) - 0.008, rAt(fill) - 0.008, CH * 0.1, 18), M('#fff5dc'), 0, CH * (fill + 0.05) + 0.012, 0, dyn);
    }
    if (sealed) {
      mesh(cyl(RT + 0.012, RT + 0.012, 0.022, 20), M('#ffd0dc'), 0, CH + 0.005, 0, dyn);
      const st = mesh(cyl(0.017, 0.017, 0.42, 8), M(STRAWS[items.length % STRAWS.length]), 0.045, CH * 0.72 + 0.03, 0, dyn);
      st.rotation.z = -0.16;
    }
  };
  g.userData.dispose = () => { if (liqGeo) liqGeo.dispose(); if (liqMat) liqMat.dispose(); };
  return g;
}
