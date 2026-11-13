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

// 静态合批：把容器里不会动的网格按材质合并成一个，绘制调用从几百降到几十（手机更省电、不发烫）
// dyn 里的对象（会动、会显隐的部件）及其子孙保持原样
const _inv = new THREE.Matrix4(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
export function bake(container, dyn) {
  container.updateMatrixWorld(true); _inv.copy(container.matrixWorld).invert();
  const groups = new Map();
  const walk = (o) => {
    for (const c of o.children) {
      if (dyn.has(c) || !c.visible) continue;
      if (c.isMesh && !c.children.length && !Array.isArray(c.material) && !c.material.transparent && c.geometry.attributes.normal) {
        const g = c.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
        c.matrixWorld.decompose(_p, _q, _s);
        if (c.castShadow && g.boundingSphere.radius * Math.max(Math.abs(_s.x), Math.abs(_s.y), Math.abs(_s.z)) < 0.09) c.castShadow = false; // 太小的物件不投影
        _m.multiplyMatrices(_inv, c.matrixWorld); if (_m.determinant() <= 0) continue;
        const k = c.material.uuid + (c.castShadow ? 'c' : '') + (c.receiveShadow ? 'r' : '') + (g.attributes.uv ? 'u' : '');
        let l = groups.get(k); if (!l) groups.set(k, (l = [])); l.push([c, _m.clone()]);
      } else if (!c.isMesh && !c.isSprite && !c.isPoints) walk(c);
    }
  };
  walk(container);
  let removed = 0;
  for (const l of groups.values()) {
    if (l.length < 2) continue;
    let nv = 0, ni = 0; const uv = !!l[0][0].geometry.attributes.uv;
    for (const [c] of l) { const g = c.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = uv ? new Float32Array(nv * 2) : null, I = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const [c, m] of l) {
      const g = c.geometry.clone(); g.applyMatrix4(m);
      const p = g.attributes.position, n = g.attributes.normal, cnt = p.count;
      for (let i = 0; i < cnt; i++) { const j = (vo + i) * 3; P[j] = p.getX(i); P[j + 1] = p.getY(i); P[j + 2] = p.getZ(i); N[j] = n.getX(i); N[j + 1] = n.getY(i); N[j + 2] = n.getZ(i); }
      if (U) { const u = g.attributes.uv; for (let i = 0; i < cnt; i++) { U[(vo + i) * 2] = u.getX(i); U[(vo + i) * 2 + 1] = u.getY(i); } }
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) I[io + i] = a[i] + vo; io += a.length; } else { for (let i = 0; i < cnt; i++) I[io + i] = vo + i; io += cnt; }
      vo += cnt; g.dispose(); c.removeFromParent(); removed++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); if (U) geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    geo.setIndex(new THREE.BufferAttribute(I, 1)); geo.computeBoundingSphere();
    const src = l[0][0], mm = new THREE.Mesh(geo, src.material); mm.castShadow = src.castShadow; mm.receiveShadow = src.receiveShadow; mm.userData.baked = 1; container.add(mm);
  }
  return removed;
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
const BROW = new THREE.CapsuleGeometry(0.013, 0.06, 2, 6);
const COLLAR = new THREE.TorusGeometry(0.16, 0.035, 6, 18);
const BLACK = M('#3a2a2a'), WHITE = M('#ffffff'), BLUSH = M('#ff9aa8'), PUPIL = M('#2b2030'), MOUTH = M('#c4485e'), TONGUE = M('#ff8a9a'), SWEAT = M('#9fdcff', { emissive: '#9fdcff', emissiveIntensity: 0.3 }), PINK = M('#ffb6c6');
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };

export function makeChibi(o = {}) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const skin = M(o.skin || '#ffe2cc'), outfit = M(o.outfit || '#ff9fb4'), kind0 = o.kind || 'human';
  const shoe = M(o.shoe || (kind0 === 'human' ? ['#ffffff', '#5b4a5e', '#ff9fb4', '#8fd0ff'][Math.floor(Math.random() * 4)] : shade(o.skin || '#ffe2cc', 0.82)));
  const legL = mesh(caps(0.1, 0.14), M(o.pants || '#7a6a86'), -0.13, 0.17, 0, inner);
  const legR = mesh(caps(0.1, 0.14), M(o.pants || '#7a6a86'), 0.13, 0.17, 0, inner);
  for (const l of [legL, legR]) { const s = mesh(sph(0.105, 12, 8), shoe, 0, -0.13, 0.035, l); s.scale.set(1.02, 0.62, 1.38); }
  mesh(caps(0.27, 0.22), outfit, 0, 0.6, 0, inner);
  mesh(cyl(0.272, 0.29, 0.07, 18), M(shade(o.outfit || '#ff9fb4', 0.88)), 0, 0.31, 0, inner); // 衣摆
  if (kind0 === 'human' || kind0 === 'horse') { const cl = mesh(COLLAR, o.tie ? WHITE : M(shade(o.outfit || '#ff9fb4', 1.12)), 0, 0.86, 0.02, inner); cl.rotation.x = Math.PI / 2; cl.scale.set(1, 1, 0.6); }
  if (o.apron) {
    mesh(rbox(0.4, 0.38, 0.1, 0.05), WHITE, 0, 0.55, 0.22, inner);
    mesh(rbox(0.2, 0.08, 0.02, 0.01), M('#ffd0dc'), 0, 0.5, 0.275, inner); // 围裙口袋
    for (const s of [-1, 1]) { const st = mesh(rbox(0.05, 0.36, 0.04, 0.015), WHITE, s * 0.15, 0.82, 0.12, inner); st.rotation.x = -0.45; }
    mesh(sph(0.045), M('#ff7d95'), 0, 0.64, 0.275, inner);
  } else if (!o.tie && kind0 !== 'horse') for (let i = 0; i < 2; i++) mesh(sph(0.026, 8, 6), M(shade(o.outfit || '#ff9fb4', 0.7)), 0, 0.72 - i * 0.14, 0.268 - i * 0.004, inner);
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.3, 0.78, 0); inner.add(p);
    const a = mesh(caps(0.08, 0.2), outfit, s * 0.04, -0.15, 0, p); a.rotation.z = s * 0.28;
    mesh(sph(0.085), skin, s * 0.085, -0.3, 0, p);
    return p;
  });
  const head = new THREE.Group(); head.position.set(0, 1.2, 0); inner.add(head);
  const hm = mesh(sph(0.4, 24, 18), skin, 0, 0, 0, head); hm.scale.set(1.04, 0.94, 0.98);
  // 眼睛：瞳孔 + 两颗高光（整组眨眼），可选睫毛；眉毛
  const eyes = [], lash = o.lash ?? (kind0 === 'human' && Math.random() < 0.45), browC = M(o.hair && kind0 === 'human' ? shade(o.hair, 0.8) : '#5a4048');
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(s * 0.15, 0.0, 0.352); head.add(eg); eyes.push(eg);
    const e = mesh(sph(0.058, 14, 10), PUPIL, 0, 0, 0, eg); e.scale.set(1, 1.3, 0.48);
    mesh(sph(0.021, 8, 6), WHITE, s * 0.012 + 0.012, 0.03, 0.026, eg); mesh(sph(0.011, 6, 5), WHITE, -0.014, -0.032, 0.027, eg);
    if (lash) { const l = mesh(rbox(0.05, 0.016, 0.012, 0.005), PUPIL, s * 0.045, 0.06, 0.012, eg); l.rotation.z = s * -0.55; }
    if (kind0 !== 'horse') { const hu = kind0 === 'human' && !o.helmet, br = mesh(BROW, browC, s * 0.155, hu ? 0.118 : 0.125, hu ? 0.428 : 0.352, head); br.rotation.z = Math.PI / 2 - s * 0.1; br.castShadow = false; }
    const b = mesh(sph(0.062), BLUSH, s * 0.25, -0.1, 0.305, head); b.scale.set(1, 0.6, 0.4);
  }
  // 三种嘴型：微笑 / 开心张嘴 / 着急撇嘴；外加着急时的汗滴
  const sm = mesh(SMILE, BLACK, 0, -0.085, 0.385, head); sm.rotation.z = Math.PI;
  const om = new THREE.Group(); om.position.set(0, -0.1, 0.375); head.add(om); om.visible = false;
  { const a = mesh(sph(0.055, 12, 8), MOUTH, 0, 0, 0, om); a.scale.set(1, 0.72, 0.4); const t = mesh(sph(0.03, 8, 6), TONGUE, 0, -0.02, 0.012, om); t.scale.set(1.1, 0.5, 0.5); }
  const fm = mesh(SMILE, BLACK, 0, -0.11, 0.383, head); fm.scale.set(0.8, 0.7, 1); fm.visible = false;
  const sweat = mesh(sph(0.045, 10, 8), SWEAT, 0.34, 0.2, 0.2, head); sweat.scale.set(0.75, 1.2, 0.6); sweat.visible = false; sweat.castShadow = false;
  const kind = o.kind || 'human';
  if (kind === 'human') {
    const hc = M(o.hair || '#6b4a3a');
    const h = mesh(HAIR, hc, 0, 0.02, -0.02, head); h.rotation.x = -0.32; h.scale.set(1.04, 1, 1.02);
    const st = o.style || 0;
    if (st !== 4 && !o.helmet) for (let i = -2; i <= 2; i++) { const b = mesh(sph(0.11, 10, 8), hc, i * 0.1, 0.25 - Math.abs(i) * 0.03, 0.3 - Math.abs(i) * 0.04, head); b.scale.set(1, 0.55, 0.6); b.rotation.z = -i * 0.25; } // 刘海
    if (st === 5) for (const s of [-1, 1]) { const b = mesh(sph(0.2, 12, 10), hc, s * 0.33, -0.08, -0.04, head); b.scale.set(0.6, 1.2, 0.9); } // 波波头
    if (st === 6) { mesh(sph(0.1, 10, 8), M('#ff9fb4'), 0, 0.12, -0.42, head); const p = mesh(caps(0.1, 0.32), hc, 0, -0.16, -0.5, head); p.rotation.x = 0.35; } // 马尾
    if (st === 1) for (const s of [-1, 1]) mesh(sph(0.15), hc, s * 0.3, 0.3, -0.05, head);
    if (st === 2) { mesh(sph(0.16), hc, 0, 0.05, -0.43, head); mesh(sph(0.12), hc, 0, -0.14, -0.5, head); }
    if (st === 3) for (const s of [-1, 1]) { const t = mesh(caps(0.09, 0.26), hc, s * 0.4, -0.2, -0.05, head); t.rotation.z = s * 0.2; }
    if (st === 4) { mesh(cyl(0.37, 0.4, 0.16), outfit, 0, 0.3, 0, head); const br = mesh(cyl(0.3, 0.3, 0.04), outfit, 0, 0.24, 0.3, head); br.scale.z = 0.8; }
    if (o.hat === 'beret') { const b = mesh(sph(0.3), M('#ff6f8e'), 0.05, 0.36, 0, head); b.scale.set(1.15, 0.45, 1.15); mesh(sph(0.045), M('#7bc47f'), 0.05, 0.5, 0, head); }
  } else if (kind === 'bear') {
    for (const s of [-1, 1]) { mesh(sph(0.14), skin, s * 0.29, 0.3, 0, head); mesh(sph(0.075), BLUSH, s * 0.29, 0.3, 0.08, head); }
    const mz = mesh(sph(0.13), M('#fff3e6'), 0, -0.07, 0.31, head); mz.scale.set(1.2, 0.85, 0.7);
    const ns = mesh(sph(0.04, 8, 6), PUPIL, 0, -0.03, 0.41, head); ns.scale.set(1.3, 0.9, 0.8);
    const tl = mesh(sph(0.08, 10, 8), skin, 0, 0.4, -0.26, inner); tl.castShadow = false;
  } else if (kind === 'bunny') {
    for (const s of [-1, 1]) { const e = mesh(caps(0.08, 0.34), skin, s * 0.16, 0.52, 0, head); e.rotation.z = -s * 0.14; const ie = mesh(caps(0.04, 0.26), PINK, s * 0.16 - s * 0.006, 0.53, 0.05, head); ie.rotation.z = -s * 0.14; ie.scale.z = 0.5; }
    mesh(sph(0.1, 10, 8), WHITE, 0, 0.42, -0.27, inner);
    mesh(sph(0.025, 8, 6), PINK, 0, -0.04, 0.4, head);
  } else if (kind === 'cat') {
    for (const s of [-1, 1]) { const e = mesh(cone(0.14, 0.24, 4), skin, s * 0.24, 0.38, 0, head); e.rotation.y = Math.PI / 4; const ie = mesh(cone(0.08, 0.15, 4), PINK, s * 0.235, 0.37, 0.05, head); ie.rotation.y = Math.PI / 4; ie.scale.z = 0.4; }
    for (const s of [-1, 1]) { const w = mesh(cyl(0.006, 0.006, 0.22, 4), BLACK, s * 0.34, -0.08, 0.3, head); w.rotation.z = Math.PI / 2 + s * 0.15; }
    mesh(sph(0.025, 8, 6), PINK, 0, -0.04, 0.4, head);
    const tail = mesh(caps(0.05, 0.42), skin, 0.08, 0.5, -0.32, inner); tail.rotation.set(-0.7, 0, -0.35);
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
  // 合批：头和身体上不会单独动的部件合并，角色细节多了，绘制调用反而更少
  bake(head, new Set([...eyes, sm, om, fm, sweat]));
  bake(inner, new Set([legL, legR, ...arms, head]));
  g.userData = { inner, legL, legR, arms, head, eyes, sm, om, fm, sweat, face: 0, bl: 1 + Math.random() * 4, ph: Math.random() * 6, mv: 0 };
  return g;
}
// 释放角色合批生成的几何体（顾客离开时调用）
export function disposeChibi(g) { g.traverse((o) => { if (o.userData && o.userData.baked) o.geometry.dispose(); }); }

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
  const ey = u.bl < 0 ? 0.18 : 1; if (u.eyes[0].scale.y !== ey) for (const e of u.eyes) e.scale.y = ey;
  // 表情：1 开心张嘴 / 2 着急撇嘴冒汗 / 0 微笑
  const face = o.happy || o.cheer ? 1 : o.fret ? 2 : 0;
  if (face !== u.face) { u.face = face; u.sm.visible = face === 0; u.om.visible = face === 1; u.fm.visible = face === 2; u.sweat.visible = face === 2; }
  if (face === 2) u.sweat.position.y = 0.2 - ((u.ph * 0.4) % 1) * 0.12;
}

// ---------- 奶茶杯 ----------
const CH = 0.44, RT = 0.155, RB = 0.115;
const rAt = (f) => RB + (RT - RB) * f;
const SHELL = new THREE.CylinderGeometry(RT, RB, CH, 20, 1, true);
const SHELL_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: grad, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
const ICE_MAT = M('#eaf7ff', { transparent: true, opacity: 0.8 });
const STRAWS = ['#ff7d95', '#6fc3ff', '#7bd389', '#ffb84d', '#b48be0'];
// 杯套印花 + 封口膜图案（Canvas 画的小店 logo）
const cvTex = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const SLEEVE_TEX = cvTex(256, 64, (x, w, h) => {
  x.fillStyle = '#fff4f7'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff8fab'; x.fillRect(0, 0, w, 7); x.fillRect(0, h - 7, w, 7);
  x.font = '900 30px ui-rounded,"PingFang SC","Microsoft YaHei",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < 2; i++) { x.fillStyle = '#ff6f96'; x.fillText('啵啵', 50 + i * 128, 34); x.fillStyle = '#ffc23d'; x.fillText('♥', 110 + i * 128, 34); }
});
const FILM_TEX = cvTex(64, 64, (x, w) => {
  x.fillStyle = '#ffd6e0'; x.fillRect(0, 0, w, w); x.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) { x.beginPath(); x.arc(8 + i * 16, 8 + j * 16, 3.2, 0, 7); x.fill(); }
  x.font = '900 20px ui-rounded,"PingFang SC",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ff6f96'; x.fillText('啵', 32, 33);
});
const SLEEVE = new THREE.CylinderGeometry(RB + (RT - RB) * 0.6 + 0.004, RB + (RT - RB) * 0.28 + 0.004, CH * 0.32, 20, 1, true);
const SLEEVE_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: grad, map: SLEEVE_TEX });
const FILM = new THREE.CircleGeometry(RT + 0.01, 20), FILM_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: grad, map: FILM_TEX });

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
  const slv = new THREE.Mesh(SLEEVE, SLEEVE_MAT); slv.position.y = CH * 0.44; slv.castShadow = false; g.add(slv);
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
      const fl = new THREE.Mesh(FILM, FILM_MAT); fl.rotation.x = -Math.PI / 2; fl.position.y = CH + 0.0165; fl.castShadow = false; dyn.add(fl);
      const st = mesh(cyl(0.017, 0.017, 0.42, 8), M(STRAWS[items.length % STRAWS.length]), 0.045, CH * 0.72 + 0.03, 0, dyn);
      st.rotation.z = -0.16;
    }
  };
  g.userData.dispose = () => { if (liqGeo) liqGeo.dispose(); if (liqMat) liqMat.dispose(); };
  return g;
}
