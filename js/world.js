// 3D 场景：可扩建的小店、设备、装饰、可切换的室外场景、光照与特效
import { THREE, M, toon, mesh, rbox, cyl, sph, cone, GLASS, emojiTex, makeChibi, makeCup, animChibi, bake, disposeChibi } from './models.js';
import { ING, THEMES, SHOPS } from './data.js';

export const L = { SLOTS: [], WAITS: [], SEATS: [], TABLES: [], DOOR: [0, -8.7], WALK: [], OBST: [], hw: 3.4, bz: -9, tier: 1 };
export function setLayout(sh) {
  const xs = sh.slots === 2 ? [-2.2, -0.4] : sh.slots === 3 ? [-2.6, -1.1, 0.4] : sh.slots === 4 ? [-2.35, -1.3, -0.25, 0.8] : [-2.5, -1.65, -0.8, 0.05, 0.9];
  L.hw = sh.hw; L.bz = sh.bz; L.tier = sh.t;
  L.SLOTS = xs.map((x) => [x, -2.15]);
  L.WAITS = []; for (let i = 0; i < sh.waits; i++) L.WAITS.push([xs[i % xs.length], -3.7 - Math.floor(i / xs.length) * 1.2]);
  L.TABLES = sh.tables; L.SEATS = [];
  sh.tables.forEach(([x, z], t) => L.SEATS.push({ x, z: z - 0.95, r: 0, t }, { x, z: z + 0.95, r: Math.PI, t }));
  L.DOOR = [0, sh.bz + 0.3];
  L.WALK = [[-2.3, 2.3, -0.4, 4.0], [1.75, 3.0, -2.9, -0.3], [-sh.hw + 0.4, sh.hw - 0.4, sh.bz + 0.6, -2.75]];
  L.OBST = sh.tables.map(([x, z]) => [x, z, 0.95]);
}
const TOP = 0.985, H = 2.7;
const ENV = {
  town: { ground: '#bfe5a6', walk: '#f3ead9', road: '#bdb6cc', tree: ['#8fd694', '#7cc98a'], roof: '#ff9f8a' },
  sakura: { ground: '#d3eeb4', walk: '#fbeee6', road: '#cdbfd0', tree: ['#ffc2d4', '#ffb0c8', '#ffd6e2'], roof: '#ff9fb4', fall: '#ffc6d6' },
  beach: { ground: '#f7e4b2', walk: '#fff4d8', road: '#f7e4b2', tree: ['#6fc28a'], sea: 1 },
  snow: { ground: '#f4f9ff', walk: '#e4ecf6', road: '#c5cfe0', tree: ['#7fb89a'], roof: '#ffffff', fall: '#ffffff', pine: 1 },
  night: { ground: '#66739a', walk: '#9b96b8', road: '#57526f', tree: ['#62b08a'], roof: '#8a7fd0', night: 1, lantern: 1 },
  cloud: { ground: '#eaf5ff', walk: '#ffffff', road: '#dcecff', tree: ['#ffc9de', '#cfe6ff', '#fff0b0', '#d9c8ff'], roof: '#ffb3c4', cloud: 1 },
};
const torus = (() => { const c = new Map(); return (r) => { let g = c.get(r); if (!g) { g = new THREE.TorusGeometry(r, 0.3, 8, 56, Math.PI); c.set(r, g); } return g; }; })();

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe9ff'); scene.fog = new THREE.Fog('#bfe9ff', 45, 85);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 140);
  const W = { renderer, scene, camera, stations: [], st: {} };

  const hemi = new THREE.HemisphereLight('#ffffff', '#ffe6d2', 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e2', 1.7);
  sun.position.set(5, 11, 6); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  const lamp = new THREE.PointLight('#ffd9a0', 0, 34, 1.2); scene.add(lamp);

  // ---------- 主题 ----------
  const th = { wall: toon('#fff'), accent: toon('#fff'), cab: toon('#fff') };
  const fc = document.createElement('canvas'); fc.width = fc.height = 128;
  const mkTex = () => { const t = new THREE.CanvasTexture(fc); t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const texK = mkTex(), texL = mkTex();
  let themeId = null;
  function setTheme(id) {
    const t = THEMES.find((x) => x.id === id) || THEMES[0]; themeId = t.id;
    th.wall.color.set(t.wall); th.accent.color.set(t.accent); th.cab.color.set(t.cab);
    const x = fc.getContext('2d'), n = 64;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { // 带倒角高光和细缝的瓷砖
      x.fillStyle = (i + j) % 2 ? t.fa : t.fb; x.fillRect(i * n, j * n, n, n);
      x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; x.strokeRect(i * n + 4.5, j * n + 4.5, n - 9, n - 9);
      x.strokeStyle = 'rgba(140,100,115,.13)'; x.lineWidth = 2; x.strokeRect(i * n + 1, j * n + 1, n - 2, n - 2);
    }
    texK.needsUpdate = texL.needsUpdate = true;
  }
  setTheme('cream');
  const WOOD = M('#e8b98a'), CREAM = M('#fffaf2'), GOLD = M('#ffd23f', { emissive: '#ffb300', emissiveIntensity: 0.25 });

  let root = null, parts = {}, decor = {}, cars = [], robotless = true, fall = null, envCfg = ENV.town, bulbs = [], fishes = null, lanterns = [];
  const box = (x, y, z, w, h, d, mat = th.wall, cast = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = cast; root.add(m); return m;
  };
  const steamTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const starTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.translate(32, 32); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30, a = i * Math.PI / 4; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); return new THREE.CanvasTexture(c); })();
  const makeSteam = (parent, x, y, z) => {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData.o = i / 5; g.add(s); }
    g.visible = false; return g;
  };
  const animSteam = (g, on, t) => {
    g.visible = on; if (!on) return;
    for (const s of g.children) { const k = (t * 0.55 + s.userData.o) % 1; s.position.set(Math.sin(k * 5 + s.userData.o * 9) * 0.08, k * 0.75, 0); s.scale.setScalar(0.18 + k * 0.4); s.material.opacity = (1 - k) * 0.6; }
  };
  const tree = (x, z, c = '#8fd694', s = 1, kind = 0, parent = root) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
    if (kind === 1) { // 松树
      mesh(cyl(0.1, 0.14, 0.7, 8), M('#a07a5a'), 0, 0.35, 0, g);
      for (let i = 0; i < 3; i++) { mesh(cone(0.85 - i * 0.22, 0.9, 10), M(c), 0, 1.0 + i * 0.6, 0, g); mesh(cone(0.5 - i * 0.13, 0.3, 10), M('#ffffff'), 0, 1.36 + i * 0.6, 0, g); }
    } else if (kind === 2) { // 椰子树
      const tr = mesh(cyl(0.09, 0.14, 2.2, 8), M('#c9a070'), 0.15, 1.1, 0, g); tr.rotation.z = -0.14;
      for (let i = 0; i < 6; i++) { const lf = mesh(sph(0.5, 10, 6), M(c), 0.3 + Math.cos(i * 1.05) * 0.5, 2.2, Math.sin(i * 1.05) * 0.5, g); lf.scale.set(1.3, 0.16, 0.45); lf.rotation.y = -i * 1.05; lf.rotation.z = -0.3; }
      mesh(sph(0.11, 8, 6), M('#8a5a3a'), 0.3, 2.12, 0.1, g);
    } else {
      mesh(cyl(0.12, 0.16, 1.2, 8), M('#b98a63'), 0, 0.6, 0, g);
      mesh(sph(0.75), M(c), 0, 1.7, 0, g); mesh(sph(0.5), M(c), 0.45, 1.4, 0.1, g); mesh(sph(0.5), M(c), -0.4, 1.45, -0.1, g);
    }
    return g;
  };
  const baseCab = (w = 1.56) => {
    const g = new THREE.Group();
    mesh(rbox(w, 0.82, 0.8, 0.07), th.cab, 0, 0.49, 0, g); mesh(rbox(w - 0.06, 0.1, 0.72, 0.03), M('#8b86a0'), 0, 0.05, 0, g);
    mesh(rbox(w + 0.06, 0.09, 0.88, 0.04), CREAM, 0, 0.94, 0, g);
    for (const x of [-w / 4, w / 4]) { mesh(rbox(w / 2 - 0.1, 0.56, 0.03, 0.03), th.accent, x, 0.5, 0.395, g); mesh(rbox(0.2, 0.045, 0.05, 0.02), CREAM, x, 0.7, 0.42, g); }
    return g;
  };
  const addStation = (id, name, emo, g, x, z, rot, ly = 2.0) => {
    g.position.set(x, 0, z); g.rotation.y = rot; root.add(g);
    const st = { id, name, emo, x, z, g, ly, fx: x + Math.sin(rot) * 0.95, fz: z + Math.cos(rot) * 0.95 }; W.stations.push(st); W.st[id] = st; return st;
  };

  // ---------- 室外场景 ----------
  function buildEnv(id, hw, bz) {
    const e = envCfg = ENV[id] || ENV.town;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), M(e.ground));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; ground.receiveShadow = true; root.add(ground);
    box(0, -0.02, bz - 1.1, 160, 0.03, 1.8, M(e.walk));
    cars = []; lanterns = [];
    const far = bz - 7.6;
    if (e.sea) {
      box(0, -0.015, bz - 34, 160, 0.03, 56, M('#74d2e8')); box(0, -0.01, bz - 6.3, 160, 0.03, 0.7, M('#ffffff')); box(0, -0.012, bz - 7.6, 160, 0.03, 1.6, M('#a5e6f2'));
      for (let i = -4; i <= 4; i++) {
        const x = i * 4.2 + 1.5, z = bz - 3.6 - (i & 1) * 1.1, c = ['#ff9fb4', '#ffd66b', '#8fd0ff', '#a5e6cc'][(i + 8) % 4];
        mesh(cyl(0.03, 0.03, 1.5, 6), M('#ffffff'), x, 0.75, z, root); const u = mesh(cone(0.95, 0.4, 10), M(c), x, 1.6, z, root); u.rotation.z = 0.12;
        mesh(rbox(0.5, 0.07, 1.2, 0.03), M(c), x + 0.7, 0.14, z + 0.2, root);
      }
      for (const [x, z] of [[-9, bz - 12], [7, bz - 16], [18, bz - 11]]) { mesh(rbox(1.5, 0.35, 0.6, 0.12), M('#ffffff'), x, 0.1, z, root); mesh(cyl(0.025, 0.025, 1.3, 6), M('#b98a63'), x, 0.85, z, root); const sl = mesh(cone(0.55, 1.1, 3), M('#ff9fb4'), x + 0.2, 0.95, z, root); sl.scale.z = 0.1; }
    } else if (e.cloud) {
      const puff = (x, y, z, s) => { for (const [dx, dy, dz, r] of [[0, 0, 0, 1], [0.9, -0.15, 0.1, 0.7], [-0.85, -0.2, -0.1, 0.65], [0.3, 0.35, -0.2, 0.6]]) { const m = mesh(sph(0.9), M('#ffffff'), x + dx * s, y + dy * s, z + dz * s, root); m.scale.setScalar(r * s); m.castShadow = false; } };
      for (let i = 0; i < 24; i++) { const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, r2 = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1; puff((r1 - 0.5) * 64, 0.2 + (i % 3) * 0.25, bz - 3.2 - r2 * 17, 1 + r2 * 1.5); }
      ['#ff8fa8', '#ffb86b', '#ffe066', '#8fe0a0', '#7fc8ff', '#b79aff'].forEach((c, i) => { const m = new THREE.Mesh(torus(12 - i * 0.6), M(c)); m.position.set(0, 0.3, bz - 16); root.add(m); });
      for (let i = 0; i < 9; i++) {
        const x = (i - 4) * 4.6 + 1.2, y = 3.3 + (i % 3) * 0.9, z = bz - 4.5 - (i % 4) * 1.5, c = ['#ff9fb4', '#ffd66b', '#8fd0ff', '#c9b3ff'][i % 4];
        const b = mesh(sph(0.34, 12, 10), M(c), x, y, z, root); b.scale.y = 1.2; b.castShadow = false; lanterns.push(b);
        mesh(cyl(0.008, 0.008, 1.3, 4), M('#ffffff'), x, y - 1.05, z, root).castShadow = false;
      }
    } else {
      box(0, -0.02, bz - 3.6, 160, 0.03, 3.2, M(e.road));
      for (let i = -14; i <= 14; i++) box(i * 2.4, -0.005, bz - 3.6, 1.1, 0.01, 0.12, M('#fffdf5'));
      const HC = e.night ? ['#8f86c9', '#6f7fb8', '#b08fc9', '#7a9ac4', '#9c8fd6', '#c79ab8'] : ['#ffd3dc', '#cfe8ff', '#fff0b8', '#d8f3dc', '#e6d8ff', '#ffe0c2'];
      for (let i = -7; i <= 7; i++) {
        const h = 2.6 + ((i * 7 + 28) % 5) * 0.5, x = i * 3.6 + 0.8;
        mesh(rbox(3, h, 2.6, 0.12), M(HC[(i + 12) % 6]), x, h / 2, far, root);
        const rf = mesh(cone(2.3, 1.2, 4), M(e.roof), x, h + 0.6, far, root); rf.rotation.y = Math.PI / 4;
        mesh(rbox(0.6, 1, 0.1, 0.05), M('#a8795a'), x - 0.6, 0.5, far + 1.32, root);
        mesh(rbox(0.7, 0.7, 0.1, 0.05), e.night ? M('#ffe9a8', { emissive: '#ffd66b', emissiveIntensity: 0.9 }) : M('#fffbe8'), x + 0.6, 1.5, far + 1.32, root);
      }
      cars = ['#ff9fb4', '#8fd0ff', '#ffd66b'].map((c, i) => {
        const g = new THREE.Group(); root.add(g);
        mesh(rbox(1.5, 0.45, 0.8, 0.16), M(c), 0, 0.42, 0, g); mesh(rbox(0.85, 0.4, 0.7, 0.14), M('#f4fbff'), -0.05, 0.8, 0, g);
        for (const x of [-0.45, 0.45]) for (const z of [-0.38, 0.38]) { const w = mesh(cyl(0.17, 0.17, 0.12, 12), M('#4a4458'), x, 0.17, z, g); w.rotation.x = Math.PI / 2; }
        g.userData = { dir: i % 2 ? -1 : 1, v: 3 + i * 0.9, off: i * 17 };
        g.position.z = bz + (i % 2 ? -4.3 : -2.9); if (i % 2) g.rotation.y = Math.PI;
        return g;
      });
    }
    const kind = e.pine ? 1 : e.sea ? 2 : 0;
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1, r1 = (Math.sin(i * 12.9898) * 43758.5453) % 1, r2 = (Math.sin(i * 78.233) * 12345.678) % 1;
      const x = side * (hw + 2.4 + Math.abs(r1) * 7), z = bz - 0.5 + Math.abs(r2) * (7.5 - bz);
      tree(x, z, e.tree[i % e.tree.length], 0.95 + Math.abs(r1) * 0.5, kind);
    }
    for (let i = -5; i <= 5; i++) if (!e.sea && Math.abs(i * 4.4 + 2) > 2.2) tree(i * 4.4 + 2, far + 2.4, e.tree[(i + 9) % e.tree.length], 1.15, kind);
    if (!e.pine && !e.sea && !e.night) for (let i = 0; i < 30; i++) { const a = i * 2.4, r = hw + 2 + (i % 7) * 1.3; const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r - 2; if (Math.abs(x) > hw + 0.9 && z > bz) mesh(sph(0.11, 8, 6), M(['#ff9fb4', '#fff3a8', '#ffffff'][i % 3]), x, 0.06, z, root); }
    if (e.pine) for (const [x, z] of [[-hw - 2.2, 2.5], [hw + 2.4, -1.5]]) { mesh(sph(0.55), M('#ffffff'), x, 0.45, z, root); mesh(sph(0.38), M('#ffffff'), x, 1.15, z, root); mesh(cone(0.06, 0.24, 6), M('#ff9f43'), x, 1.15, z + 0.4, root).rotation.x = Math.PI / 2; for (const s of [-1, 1]) mesh(sph(0.04, 6, 5), M('#3a2a2a'), x + s * 0.13, 1.25, z + 0.33, root); }
    if (e.lantern) for (let i = -9; i <= 9; i++) {
      const x = i * 2.1, c = ['#ff7d6b', '#ffd66b', '#ff9fb4'][(i + 9) % 3];
      const m = mesh(sph(0.22, 10, 8), toon(c, { emissive: c, emissiveIntensity: 1 }), x, 2.6 + Math.sin(i * 1.7) * 0.2, bz - 1.9, root); m.scale.y = 1.2; m.castShadow = false; lanterns.push(m);
      if (i % 3 === 0) { mesh(rbox(1.6, 1, 1, 0.08), M(['#ff9fb4', '#8fd0ff', '#ffd66b'][(i / 3 + 6) % 3]), x + 1, 0.5, bz - 5.6, root); box(x + 1, 1.75, bz - 5.6, 2, 0.12, 1.4, M('#fff4e2'), true); for (const s of [-1, 1]) mesh(cyl(0.04, 0.04, 1.7, 6), M('#ffffff'), x + 1 + s * 0.9, 0.85, bz - 5, root); }
    }
    fall = null;
    if (e.fall) {
      const n = 220, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = Math.random() * 10; pos[i * 3 + 2] = bz - 9 + Math.random() * (16 - bz); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      fall = new THREE.Points(g, new THREE.PointsMaterial({ color: e.fall, size: e.pine ? 0.13 : 0.17, map: steamTex, transparent: true, depthWrite: false, opacity: 0.95 }));
      fall.userData = { z0: bz - 9, z1: 7, sp: e.pine ? 1.1 : 0.7 }; root.add(fall);
    }
  }

  // ---------- 建造 ----------
  W.build = (tier, sceneId) => {
    if (root) { scene.remove(root); root.traverse((o) => { if (o.isPoints || o.userData.baked || (o.geometry && (o.geometry.type === 'BoxGeometry' || o.geometry.type === 'PlaneGeometry'))) o.geometry.dispose(); }); }
    root = new THREE.Group(); scene.add(root);
    W.stations = []; W.st = {}; parts = {}; decor = {}; bulbs = []; fishes = null; W.tier = tier; W.sceneId = sceneId;
    const sh = SHOPS[tier - 1]; setLayout(sh);
    const hw = sh.hw, bz = sh.bz - 0.11, wide = hw > 3.5, zf = -0.3;
    sun.target.position.set(0, 0, (bz + 5) / 2);
    const span = Math.max(hw + 5, (5.3 - bz) / 2 + 4);
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 60 }); sun.shadow.camera.updateProjectionMatrix();
    lamp.position.set(0, 3.4, (bz - 1) / 2);

    // 地板
    const plane = (w, d, x, z, tex) => { tex.repeat.set(w / 2, d / 2); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon('#ffffff', { map: tex })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); m.receiveShadow = true; root.add(m); };
    plane(6.8, 5.3 - zf, 0, (5.3 + zf) / 2, texK); plane(hw * 2, zf - sh.bz, 0, (zf + sh.bz) / 2, texL);
    if (tier >= 4) { const c = box(0, 0.008, (sh.bz - 2.9) / 2 - 0.2, 1.5, 0.016, -2.9 - sh.bz - 1.2, th.accent); c.castShadow = false; for (const s of [-1, 1]) box(s * 0.82, 0.01, (sh.bz - 2.9) / 2 - 0.2, 0.07, 0.02, -2.9 - sh.bz - 1.2, GOLD); }
    // 厨房地垫
    { const a = box(0, 0.006, 2.3, 3.0, 0.012, 2.1, th.accent); a.castShadow = false; const b = box(0, 0.008, 2.3, 2.74, 0.014, 1.84, CREAM); b.castShadow = false; }
    // 高级店面：侧墙壁灯、大厅地面徽章
    if (tier >= 3) for (const s of [-1, 1]) for (let z = -4.3; z > sh.bz + 1.2; z -= 2.8) {
      mesh(rbox(0.06, 0.22, 0.14, 0.02), GOLD, s * (hw - 0.04), 1.92, z, root);
      mesh(sph(0.09, 10, 8), M('#fff6cf', { emissive: '#ffdf8a', emissiveIntensity: 0.9 }), s * (hw - 0.13), 2.05, z, root).castShadow = false;
    }
    if (tier >= 6) for (const z of tier >= 7 ? [-6.6, (sh.bz - 6.6) / 2, sh.bz + 3.2] : [-6.6, sh.bz + 3.2]) {
      [[1.05, GOLD, 0.02], [0.92, th.accent, 0.022], [0.62, CREAM, 0.024], [0.3, GOLD, 0.026]].forEach(([r, m, y]) => { const d = mesh(cyl(r, r, 0.012, 36), m, 0, y, z, root); d.castShadow = false; });
    }
    // 后墙（门 + 窗）
    const pillar = (s, a, b) => box(s * (a + b) / 2, H / 2, bz, b - a, H, 0.22);
    let lastP = 3.05;
    for (const s of [-1, 1]) {
      pillar(s, 0.8, 1.3); box(s * 0.84, 1.14, bz, 0.1, 2.28, 0.28, WOOD);
      let x = 1.3;
      for (;;) {
        const c = x + 0.65;
        box(s * c, 0.45, bz, 1.3, 0.9, 0.22); box(s * c, 2.45, bz, 1.3, 0.5, 0.22);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), M('#bfe6ff', { transparent: true, opacity: 0.3, depthWrite: false })); gl.position.set(s * c, 1.55, bz); root.add(gl);
        box(s * c, 0.92, bz + 0.1, 1.42, 0.07, 0.3, CREAM); box(s * c, 1.55, bz, 0.05, 1.3, 0.24, CREAM); box(s * c, 1.55, bz, 1.3, 0.05, 0.24, CREAM);
        box(s * c, 0.98, bz - 0.22, 1.3, 0.16, 0.22, WOOD); for (let i = 0; i < 4; i++) mesh(sph(0.11, 8, 6), M(['#ff9fb4', '#ffd66b', '#ffffff', '#ff7d95'][i]), s * (c - 0.45 + i * 0.3), 1.12, bz - 0.22, root);
        x += 1.3;
        const more = x + 0.5 + 1.3 + 0.4 <= hw + 0.11, end = more ? x + 0.5 : hw + 0.22;
        pillar(s, x, end); lastP = (x + end) / 2; x = end; if (!more) break;
      }
      box(s * (hw + 0.11), H / 2, (bz + (wide ? zf : 5.3)) / 2, 0.22, H, (wide ? zf : 5.3) - bz);
      box(s * (hw - 0.015), 0.36, (bz + (wide ? zf : 5.3)) / 2, 0.03, 0.72, (wide ? zf : 5.3) - bz, th.accent);
      box(s * (hw + 0.8) / 2, 0.36, bz + 0.125, hw - 0.8, 0.72, 0.03, th.accent);
      if (wide) { box(s * (hw + 3.4) / 2, H / 2, zf + 0.11, hw - 3.4 + 0.22, H, 0.22); box(s * 3.51, H / 2, (zf + 5.3) / 2 + 0.1, 0.22, H, 5.3 - zf); box(s * 3.385, 0.36, (zf + 5.3) / 2, 0.03, 0.72, 5.3 - zf, th.accent); }
      if (tier >= 3) box(s * (hw - 0.02), 2.2, (bz + zf) / 2, 0.03, 0.06, zf - bz, GOLD);
    }
    box(0, 2.475, bz, 1.6, 0.45, 0.22); box(0, 2.3, bz, 1.78, 0.1, 0.28, WOOD);
    box(0, 0.012, sh.bz + 0.6, 1.5, 0.024, 0.8, th.accent);
    // 屋顶招牌 + 雨棚
    { const c = document.createElement('canvas'); c.width = 640; c.height = 160; const x = c.getContext('2d');
      x.fillStyle = '#fff7fa'; x.fillRect(0, 0, 640, 160); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '900 78px ui-rounded,"PingFang SC","Microsoft YaHei",sans-serif'; x.fillStyle = '#ff6f96'; x.fillText('啵啵奶茶铺', 320, 62);
      x.font = '34px sans-serif'; x.fillStyle = '#ffb300'; x.fillText('★'.repeat(tier) + '☆'.repeat(Math.max(0, 5 - tier)), 320, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sw = 2.6 + tier * 0.35;
      mesh(rbox(sw + 0.2, sw / 4 + 0.2, 0.14, 0.06), th.accent, 0, H + sw / 8 + 0.12, bz, root);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw / 4), new THREE.MeshBasicMaterial({ map: t })); p.position.set(0, H + sw / 8 + 0.12, bz + 0.08); root.add(p);
      for (let i = -7; i <= 7; i++) { const a = box(i * 0.42, 2.42, bz - 0.55, 0.42, 0.06, 0.95, i % 2 ? CREAM : th.accent, true); a.rotation.x = -0.35; }
      if (tier >= 4) { // 屋顶奶茶杯吉祥物
        const g = new THREE.Group(); g.position.set(sw / 2 + 1.0, H, bz); g.scale.setScalar(tier >= 6 ? 1.35 : 1); root.add(g);
        mesh(cyl(0.46, 0.33, 1.0, 20), M('#fff6ee'), 0, 0.5, 0, g); mesh(cyl(0.405, 0.335, 0.5, 20), M('#e2a878'), 0, 0.27, 0.004, g);
        mesh(cyl(0.5, 0.5, 0.07, 20), th.accent, 0, 1.03, 0, g);
        const st = mesh(cyl(0.05, 0.05, 0.9, 8), M('#ff7d95'), 0.14, 1.4, 0, g); st.rotation.z = -0.2;
        for (const s of [-1, 1]) { const e = mesh(sph(0.055, 10, 8), M('#3a2a2a'), s * 0.15, 0.68, 0.41, g); e.scale.set(1, 1.3, 0.5); const b = mesh(sph(0.07, 8, 6), M('#ff9aa8'), s * 0.26, 0.58, 0.39, g); b.scale.set(1, 0.6, 0.4); }
        for (let i = 0; i < 5; i++) mesh(sph(0.06, 8, 6), M('#3a2418'), -0.2 + i * 0.1, 0.12 + (i % 2) * 0.07, 0.3 - Math.abs(i - 2) * 0.03, g);
      }
      if (tier >= 5) for (const s of [-1, 1]) { mesh(cone(0.2, 0.5, 4), GOLD, s * (hw + 0.11), H + 0.25, bz, root).rotation.y = Math.PI / 4; mesh(sph(0.09, 8, 6), GOLD, s * (hw + 0.11), H + 0.56, bz, root); }
      if (tier >= 6) for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const c = ['#ff9fb4', '#ffd66b', '#8fd0ff', '#c9b3ff'][(i + (s > 0 ? 2 : 0)) % 4], x = s * (sw / 2 + 2.4 + (i % 2) * 0.45), y = H + 1.2 + i * 0.32;
        const b = mesh(sph(0.26, 12, 10), M(c), x, y, bz - 0.1 * i, root); b.scale.y = 1.2; b.castShadow = false;
        mesh(cyl(0.006, 0.006, y - H, 4), M('#ffffff'), x, (y + H) / 2 - 0.25, bz - 0.1 * i, root).castShadow = false;
      }
      if (tier >= 7) for (const s of [-1, 1]) { // 城堡塔楼
        const x = s * (hw + 0.25);
        mesh(cyl(0.62, 0.68, 4.1, 20), th.wall, x, 2.05, bz, root); mesh(cyl(0.72, 0.72, 0.16, 20), GOLD, x, 4.15, bz, root);
        mesh(cone(0.84, 1.4, 20), th.accent, x, 4.92, bz, root); mesh(sph(0.11, 8, 6), GOLD, x, 5.68, bz, root);
        const w = mesh(rbox(0.3, 0.5, 0.06, 0.1), M('#fff6cf', { emissive: '#ffdf8a', emissiveIntensity: 0.8 }), x, 3.1, bz + 0.64, root); w.castShadow = false;
      }
    }
    buildEnv(sceneId, hw, sh.bz);
    // 店门前的小花园：白色栅栏、花坛、踏脚石、路灯、长椅、邮筒
    { const PK = M('#fffaf2'), STONE = M('#ebe3d6'), SOIL = M('#8a6a52'), LEAF = M('#7cc98a'), POLE = M('#6b6480'), snow = sceneId === 'snow';
      for (let x = -3.55; x <= 3.56; x += 0.39) {
        if (Math.abs(x) < 0.75) continue;
        mesh(rbox(0.08, 0.44, 0.05, 0.02), PK, x, 0.22, 5.78, root); const t = mesh(cone(0.058, 0.09, 4), PK, x, 0.485, 5.78, root); t.rotation.y = Math.PI / 4;
      }
      for (const s of [-1, 1]) for (const y of [0.15, 0.33]) mesh(rbox(2.85, 0.05, 0.03, 0.012), PK, s * 2.15, y, 5.75, root);
      for (let i = 0; i < 5; i++) mesh(cyl(0.2 - (i % 2) * 0.03, 0.22, 0.035, 14), STONE, Math.sin(i * 1.9) * 0.12, 0.012, 5.62 + i * 0.5, root);
      [-1, 1].forEach((s) => {
        const bx = s * 2.05;
        mesh(rbox(2.1, 0.24, 0.72, 0.05), WOOD, bx, 0.12, 6.45, root); mesh(rbox(1.96, 0.04, 0.6, 0.02), SOIL, bx, 0.245, 6.45, root);
        for (let i = 0; i < 10; i++) {
          const fx = bx - 0.82 + (i % 5) * 0.41 + (i > 4 ? 0.2 : 0), fz = 6.3 + (i > 4 ? 0.3 : 0), h = 0.16 + ((i * 7) % 3) * 0.05;
          if (snow) { const b = mesh(sph(0.13, 10, 8), LEAF, fx, 0.32, fz, root); b.scale.y = 0.8; mesh(sph(0.1, 8, 6), PK, fx, 0.4, fz, root).scale.y = 0.5; continue; }
          mesh(cyl(0.012, 0.012, h, 4), LEAF, fx, 0.26 + h / 2, fz, root);
          const lf = mesh(sph(0.045, 6, 5), LEAF, fx + 0.04, 0.3, fz, root); lf.scale.set(1.4, 0.4, 0.7);
          const c = ['#ff8fab', '#ffd66b', '#ffffff', '#c9b3ff', '#ff9f6b'][(i + (s > 0 ? 2 : 0)) % 5];
          for (let k = 0; k < 5; k++) { const a = k * 1.2566; const p = mesh(sph(0.032, 6, 5), M(c), fx + Math.cos(a) * 0.035, 0.27 + h, fz + Math.sin(a) * 0.035, root); p.scale.y = 0.6; }
          mesh(sph(0.022, 6, 5), M('#ffcf3f'), fx, 0.285 + h, fz, root);
        }
        // 路灯
        const lx = s * 3.95; mesh(cyl(0.05, 0.07, 2.2, 8), POLE, lx, 1.1, 5.95, root); mesh(cyl(0.14, 0.14, 0.06, 10), POLE, lx, 0.03, 5.95, root);
        mesh(sph(0.17, 12, 10), M('#fff6cf', { emissive: '#ffdf8a', emissiveIntensity: 0.9 }), lx, 2.3, 5.95, root).castShadow = false;
        const cap = mesh(cone(0.24, 0.16, 12), POLE, lx, 2.5, 5.95, root); cap.castShadow = false;
      });
      // 长椅 + 邮筒 + 小灌木
      { const bx = -2.1, bz2 = 7.45;
        mesh(rbox(1.2, 0.07, 0.38, 0.03), WOOD, bx, 0.42, bz2, root); mesh(rbox(1.2, 0.28, 0.05, 0.03), WOOD, bx, 0.66, bz2 - 0.17, root);
        for (const s of [-1, 1]) { mesh(rbox(0.06, 0.4, 0.34, 0.02), POLE, bx + s * 0.5, 0.21, bz2, root); }
      }
      mesh(cyl(0.035, 0.035, 0.9, 6), POLE, 1.25, 0.45, 5.98, root); mesh(rbox(0.3, 0.26, 0.38, 0.08), M('#ff7d95'), 1.25, 1.0, 5.98, root); mesh(rbox(0.16, 0.025, 0.02, 0.008), PK, 1.25, 1.05, 6.18, root);
      for (const [x, z, r] of [[3.3, 7.2, 0.32], [2.9, 7.45, 0.24], [-3.4, 6.95, 0.28]]) { const b = mesh(sph(r, 12, 10), M('#8fd694'), x, r * 0.75, z, root); b.scale.y = 0.85; }
    }
    // 大厅两侧墙上的小置物架
    for (const s of [-1, 1]) {
      const x = s * (hw - 0.14), z = s < 0 ? -4.1 : Math.max(sh.bz + 1.6, -5.4);
      mesh(rbox(0.2, 0.04, 1.1, 0.015), WOOD, x, 1.45, z, root);
      for (const k of [-1, 1]) { const b = mesh(rbox(0.03, 0.12, 0.03, 0.01), WOOD, x + s * 0.06, 1.38, z + k * 0.42, root); b.castShadow = false; }
      mesh(cyl(0.07, 0.055, 0.12, 10), M('#fff'), x, 1.53, z - 0.35, root); const pl = mesh(sph(0.1, 10, 8), M('#7cc98a'), x, 1.65, z - 0.35, root); pl.scale.y = 0.8;
      mesh(cyl(0.05, 0.04, 0.16, 10), M(s < 0 ? '#ffd3dc' : '#cfe8ff'), x, 1.55, z, root); mesh(cyl(0.012, 0.012, 0.16, 4), M('#ff7d95'), x, 1.66, z, root);
      mesh(rbox(0.08, 0.2, 0.14, 0.02), M(s < 0 ? '#ffd66b' : '#c9b3ff'), x, 1.57, z + 0.32, root);
    }

    // 大厅桌椅
    L.TABLES.forEach(([x, z], ti) => {
      mesh(cyl(0.58, 0.58, 0.07, 28), CREAM, x, 0.74, z, root); mesh(cyl(0.07, 0.09, 0.7, 10), WOOD, x, 0.36, z, root); mesh(cyl(0.3, 0.34, 0.05, 16), WOOD, x, 0.025, z, root);
      mesh(cyl(0.6, 0.6, 0.02, 28), th.accent, x, 0.7, z, root).castShadow = false;
      mesh(cyl(0.07, 0.06, 0.12, 10), M('#ffffff'), x + 0.1, 0.83, z, root).castShadow = false; mesh(sph(0.07, 8, 6), M(['#ff9fb4', '#ffd66b', '#c9b3ff'][ti % 3]), x + 0.1, 0.94, z, root).castShadow = false; mesh(sph(0.05, 8, 6), M('#8fd694'), x + 0.15, 0.9, z + 0.04, root).castShadow = false;
      if (ti % 2) { const c = mesh(rbox(0.16, 0.13, 0.02, 0.008), M('#fff'), x - 0.2, 0.84, z + 0.05, root); c.rotation.x = -0.35; c.castShadow = false; mesh(rbox(0.12, 0.03, 0.022, 0.008), th.accent, x - 0.2, 0.87, z + 0.052, root).rotation.x = -0.35; }
      else { mesh(cyl(0.12, 0.12, 0.012, 14), M('#ffffff'), x - 0.2, 0.782, z, root).castShadow = false; mesh(cyl(0.07, 0.07, 0.06, 12), M('#ffe3a8'), x - 0.2, 0.818, z, root).castShadow = false; mesh(sph(0.025, 6, 5), M('#ff5d7a'), x - 0.2, 0.862, z, root).castShadow = false; }
      const cord = mesh(cyl(0.012, 0.012, 0.6, 5), M('#b9a79a'), x, 2.75, z, root); cord.castShadow = false;
      const shd = mesh(cone(0.3, 0.28, 16), tier >= 4 ? GOLD : th.accent, x, 2.4, z, root); shd.castShadow = false;
      mesh(sph(0.1, 10, 8), M('#fff6cf', { emissive: '#ffdf8a', emissiveIntensity: 0.9 }), x, 2.27, z, root).castShadow = false;
    });
    for (const s of L.SEATS) {
      mesh(cyl(0.24, 0.2, 0.4, 16), WOOD, s.x, 0.2, s.z, root); mesh(cyl(0.26, 0.26, 0.08, 16), th.accent, s.x, 0.43, s.z, root);
      const d = s.r === 0 ? -0.27 : 0.27; mesh(rbox(0.5, 0.36, 0.07, 0.035), th.accent, s.x, 0.74, s.z + d, root); mesh(rbox(0.05, 0.3, 0.05, 0.02), WOOD, s.x, 0.5, s.z + d, root).castShadow = false;
    }

    // 吧台
    const cx = -1.1, sx = L.SLOTS.map((p) => p[0]), n = sx.length;
    mesh(rbox(4.6, 0.92, 0.8, 0.08), th.cab, cx, 0.46, -1.2, root);
    mesh(rbox(4.76, 0.1, 0.98, 0.045), CREAM, cx, 0.96, -1.2, root);
    for (let i = 0; i < 9; i++) mesh(rbox(0.26, 0.6, 0.03, 0.012), i % 2 ? CREAM : th.accent, cx - 2.08 + i * 0.52, 0.5, -1.615, root);
    if (tier >= 3) mesh(rbox(4.78, 0.04, 1.0, 0.02), GOLD, cx, 0.9, -1.2, root);
    const reg = new THREE.Group(); reg.position.set((sx[0] + sx[1]) / 2, 1.01, -1.2); root.add(reg);
    mesh(rbox(0.5, 0.2, 0.42, 0.05), M('#fff'), 0, 0.1, 0, reg);
    const scr = mesh(rbox(0.42, 0.3, 0.05, 0.02), M('#6b6480'), 0, 0.36, -0.08, reg); scr.rotation.x = 0.35;
    const scr2 = mesh(rbox(0.34, 0.22, 0.02, 0.008), M('#aef0ff', { emissive: '#7fdcff', emissiveIntensity: 0.5 }), 0, 0.365, -0.05, reg); scr2.rotation.x = 0.35;
    const jar = new THREE.Group(); jar.position.set(n > 2 ? (sx[n - 2] + sx[n - 1]) / 2 : sx[1] + 0.85, 1.01, -1.25); root.add(jar);
    mesh(cyl(0.12, 0.1, 0.24, 16), GLASS, 0, 0.12, 0, jar); mesh(cyl(0.09, 0.085, 0.1, 12), M('#ffd23f'), 0, 0.06, 0, jar); mesh(cyl(0.125, 0.125, 0.03, 16), th.accent, 0, 0.255, 0, jar);
    // 甜品罩 + 吧台小盆栽
    { const g = new THREE.Group(); g.position.set(0.95, 1.01, -1.2); root.add(g); mesh(cyl(0.2, 0.2, 0.03, 18), CREAM, 0, 0.015, 0, g); mesh(cyl(0.11, 0.11, 0.1, 14), M('#ffd3dc'), 0, 0.08, 0, g); mesh(sph(0.04, 8, 6), M('#ff5d7a'), 0, 0.15, 0, g); const d = mesh(sph(0.2, 16, 10), GLASS, 0, 0.03, 0, g); d.scale.y = 1.1; }

    // 工作台
    { const g = baseCab();
      for (let c = 0; c < 2; c++) for (let i = 0; i < 6; i++) mesh(cyl(0.13, 0.1, 0.3, 16), i % 2 ? M('#fff5f8') : M('#ffffff'), -0.45 + c * 0.36, TOP + 0.15 + i * 0.055, 0, g);
      mesh(cyl(0.11, 0.09, 0.24, 14), M('#a5e6cc'), 0.42, TOP + 0.12, 0.05, g);
      ['#ff7d95', '#6fc3ff', '#ffb84d', '#b48be0', '#7bd389'].forEach((c, i) => { const s = mesh(cyl(0.014, 0.014, 0.4, 6), M(c), 0.42 + Math.cos(i * 1.3) * 0.05, TOP + 0.32, 0.05 + Math.sin(i * 1.3) * 0.05, g); s.rotation.z = Math.cos(i * 1.3) * -0.25; s.rotation.x = Math.sin(i * 1.3) * 0.25; });
      addStation('cups', '杯架', '🥤', g, -3.0, 0.4, Math.PI / 2); }
    { const g = baseCab();
      ['pearl', 'jelly', 'pudding', 'taroball', 'redbean'].forEach((id, i) => {
        const p = new THREE.Group(); p.position.set(-0.6 + i * 0.3, TOP, 0.02); g.add(p); parts[id] = p;
        mesh(cyl(0.135, 0.11, 0.16, 16), M(['#ffd3dc', '#cfe8ff', '#fff0b8', '#e6d8ff', '#d8f3dc'][i]), 0, 0.08, 0, p);
        const c = mesh(sph(0.118, 14, 8), M(ING[id].color), 0, 0.135, 0, p); c.scale.y = 0.35;
        const sp = mesh(cyl(0.012, 0.012, 0.2, 5), M('#ffffff'), 0.05, 0.22, 0, p); sp.rotation.z = -0.5;
      });
      mesh(rbox(1.5, 0.3, 0.05, 0.02), GLASS, 0, TOP + 0.3, -0.3, g);
      addStation('toppings', '小料台', '🍮', g, -3.0, 2.0, Math.PI / 2); }
    { const g = baseCab();
      mesh(rbox(0.86, 0.1, 0.62, 0.04), M('#8b86a0'), -0.22, TOP + 0.05, 0, g);
      W.burner = mesh(cyl(0.24, 0.24, 0.03, 20), toon('#5a5568', { emissive: '#ff7a3d', emissiveIntensity: 0 }), -0.22, TOP + 0.11, 0, g);
      mesh(cyl(0.31, 0.27, 0.34, 22), M('#ffb3c4'), -0.22, TOP + 0.29, 0, g);
      W.potTop = mesh(cyl(0.285, 0.285, 0.02, 22), M('#5b3a26'), -0.22, TOP + 0.44, 0, g);
      for (let i = 0; i < 9; i++) mesh(sph(0.04, 8, 6), M('#2e1c12'), Math.cos(i * 0.7) * 0.17 * ((i % 3) / 2.2 + 0.2), 0.015, Math.sin(i * 0.7) * 0.17 * ((i % 3) / 2.2 + 0.2), W.potTop);
      for (const s of [-1, 1]) mesh(rbox(0.1, 0.05, 0.12, 0.02), M('#fff'), -0.22 + s * 0.35, TOP + 0.36, 0, g);
      mesh(rbox(0.34, 0.42, 0.26, 0.09), M('#e9d2b0'), 0.5, TOP + 0.21, 0, g); mesh(rbox(0.2, 0.14, 0.02, 0.01), M('#fff'), 0.5, TOP + 0.24, 0.135, g);
      W.steamPot = makeSteam(g, -0.22, TOP + 0.5, 0);
      addStation('cooker', '煮锅', '🍲', g, -3.0, 3.6, Math.PI / 2); }
    { const g = baseCab(); W.urnLids = {}; W.steamTea = {};
      ['black', 'green', 'oolong'].forEach((id, i) => {
        const p = new THREE.Group(); p.position.set(-0.5 + i * 0.5, TOP, 0); g.add(p); parts[id] = p;
        mesh(cyl(0.16, 0.18, 0.06, 16), M('#8b86a0'), 0, 0.03, 0, p);
        mesh(cyl(0.2, 0.2, 0.5, 20), M('#e3eaf2'), 0, 0.31, 0, p);
        mesh(cyl(0.205, 0.205, 0.16, 20), M(ING[id].color), 0, 0.3, 0, p);
        const lid = new THREE.Group(); lid.position.y = 0.56; p.add(lid); W.urnLids[id] = lid;
        const d = mesh(sph(0.2, 18, 10), M('#e3eaf2'), 0, 0, 0, lid); d.scale.y = 0.4; mesh(sph(0.045, 8, 6), M('#4a4458'), 0, 0.09, 0, lid);
        const tap = mesh(cyl(0.025, 0.025, 0.12, 8), M('#8b86a0'), 0, 0.14, 0.23, p); tap.rotation.x = Math.PI / 2;
        mesh(rbox(0.04, 0.09, 0.04, 0.01), M('#ff7d95'), 0, 0.2, 0.28, p);
        W.steamTea[id] = makeSteam(p, 0, 0.66, 0);
      });
      addStation('tea', '茶桶', '🫖', g, 3.0, 0.4, -Math.PI / 2); }
    { const g = baseCab();
      const P = (id, x, z, f) => { const p = new THREE.Group(); p.position.set(x, TOP, z); g.add(p); parts[id] = p; f(p); };
      P('milk', -0.6, -0.12, (p) => { mesh(rbox(0.2, 0.32, 0.2, 0.03), M('#ffffff'), 0, 0.16, 0, p); mesh(rbox(0.205, 0.1, 0.205, 0.02), M('#8fd0ff'), 0, 0.13, 0, p); const r = mesh(cone(0.145, 0.1, 4), M('#ffffff'), 0, 0.37, 0, p); r.rotation.y = Math.PI / 4; });
      [['mango', -0.3], ['strawberry', -0.04], ['matcha', 0.22], ['taro', 0.48]].forEach(([id, x]) => P(id, x, -0.12, (p) => {
        mesh(cyl(0.1, 0.1, 0.24, 14), M(ING[id].color), 0, 0.12, 0, p); mesh(cyl(0.105, 0.105, 0.045, 14), CREAM, 0, 0.26, 0, p);
      }));
      P('brownsugar', -0.48, 0.2, (p) => { mesh(cyl(0.08, 0.08, 0.2, 12), M('#6e3a1c'), 0, 0.1, 0, p); mesh(cyl(0.03, 0.06, 0.1, 10), M('#6e3a1c'), 0, 0.25, 0, p); mesh(cyl(0.035, 0.035, 0.04, 10), M('#ffd23f'), 0, 0.31, 0, p); });
      P('lemon', -0.1, 0.2, (p) => { mesh(cyl(0.14, 0.09, 0.09, 14), M('#ffffff'), 0, 0.045, 0, p); for (let i = 0; i < 3; i++) mesh(sph(0.065, 10, 8), M('#ffe66b'), Math.cos(i * 2.1) * 0.055, 0.12, Math.sin(i * 2.1) * 0.055, p); });
      P('foam', 0.32, 0.2, (p) => { mesh(cyl(0.1, 0.085, 0.22, 14), M('#dfe6ee'), 0, 0.11, 0, p); const c = mesh(sph(0.095, 12, 8), M('#fff5dc'), 0, 0.22, 0, p); c.scale.y = 0.5; });
      addStation('mix', '奶果台', '🥛', g, 3.0, 2.0, -Math.PI / 2); }
    { const g = baseCab();
      mesh(rbox(0.8, 0.14, 0.6, 0.05), M('#ffffff'), 0, TOP + 0.07, 0, g);
      mesh(rbox(0.12, 0.6, 0.5, 0.04), M('#ff9fb4'), -0.34, TOP + 0.4, 0, g); mesh(rbox(0.12, 0.6, 0.5, 0.04), M('#ff9fb4'), 0.34, TOP + 0.4, 0, g);
      mesh(rbox(0.8, 0.16, 0.56, 0.05), M('#ff9fb4'), 0, TOP + 0.76, 0, g);
      W.sealHead = mesh(rbox(0.36, 0.1, 0.36, 0.03), M('#8b86a0'), 0, TOP + 0.66, 0.02, g);
      mesh(sph(0.04, 8, 6), M('#7bd389', { emissive: '#7bd389', emissiveIntensity: 0.8 }), 0.25, TOP + 0.76, 0.29, g);
      W.sealCup = makeCup(); W.sealCup.position.set(0, TOP + 0.14, 0.02); W.sealCup.visible = false; g.add(W.sealCup);
      const roll = mesh(cyl(0.09, 0.09, 0.5, 14), M('#ffd0dc'), 0, TOP + 0.93, -0.12, g); roll.rotation.z = Math.PI / 2; mesh(cyl(0.1, 0.1, 0.03, 14), CREAM, 0.27, TOP + 0.93, -0.12, g).rotation.z = Math.PI / 2; mesh(cyl(0.1, 0.1, 0.03, 14), CREAM, -0.27, TOP + 0.93, -0.12, g).rotation.z = Math.PI / 2;
      addStation('sealer', '封口机', '⚡', g, 3.0, 3.6, -Math.PI / 2); }
    { const g = baseCab();
      mesh(rbox(1.3, 0.2, 0.7, 0.06), M('#bfe6ff'), 0, TOP + 0.1, 0, g); mesh(rbox(1.14, 0.06, 0.56, 0.03), M('#8fbfe6'), 0, TOP + 0.19, 0, g);
      for (let i = 0; i < 16; i++) { const m = mesh(rbox(0.11, 0.11, 0.11, 0.025), M('#f2fbff'), -0.5 + (i % 8) * 0.14, TOP + 0.24 + (i > 7 ? 0.05 : 0), -0.12 + (i > 7 ? 0.2 : 0) + (i % 3) * 0.03, g); m.rotation.set(i, i * 2, i * 3); }
      addStation('ice', '冰柜', '🧊', g, -1.5, 4.75, Math.PI, 1.55); }
    { const g = new THREE.Group();
      mesh(cyl(0.3, 0.25, 0.62, 18), M('#a5e6cc'), 0, 0.31, 0, g); const l = mesh(sph(0.3, 16, 10), M('#7fd1b0'), 0, 0.62, 0, g); l.scale.y = 0.35;
      mesh(sph(0.05, 8, 6), M('#ffffff'), 0, 0.74, 0, g);
      addStation('trash', '垃圾桶', '🗑️', g, 0, 4.6, Math.PI, 1.25); }
    { const g = baseCab();
      mesh(rbox(1.3, 0.04, 0.6, 0.02), WOOD, 0, TOP + 0.02, 0, g);
      for (let i = 0; i < 3; i++) mesh(cyl(0.15, 0.15, 0.012, 18), CREAM, -0.4 + i * 0.4, TOP + 0.045, 0, g);
      W.shelfG = new THREE.Group(); g.add(W.shelfG);
      addStation('shelf', '备餐台', '🗄️', g, 1.5, 4.75, Math.PI, 1.55); }
    { // 外卖柜：店员把线上订单放到这里
      const g = new THREE.Group();
      mesh(rbox(1.1, 1.36, 0.46, 0.06), th.cab, 0, 0.68, 0, g); mesh(rbox(0.96, 0.4, 0.3, 0.03), CREAM, 0, 0.98, 0.1, g); mesh(rbox(0.96, 0.4, 0.3, 0.03), CREAM, 0, 0.5, 0.1, g);
      mesh(rbox(1.16, 0.08, 0.52, 0.03), CREAM, 0, 1.4, 0, g); mesh(rbox(0.7, 0.2, 0.05, 0.02), M('#3fa7ff'), 0, 1.56, 0.12, g);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.16), new THREE.MeshBasicMaterial({ map: emojiTex('🛵', '#3fa7ff', 64) })); p.scale.x = 0.3; p.position.set(0, 1.56, 0.15); g.add(p);
      mesh(sph(0.035, 8, 6), M('#7bd389', { emissive: '#7bd389', emissiveIntensity: 0.9 }), 0.44, 1.2, 0.235, g);
      W.pickG = new THREE.Group(); g.add(W.pickG);
      addStation('pickup', '外卖柜', '🛵', g, 3.14, -1.55, -Math.PI / 2, 1.9);
    }
    L.SLOTS.forEach(([x], i) => { const st = { id: 'slot' + i, slot: i, x, z: -1.2, ly: 0, hidden: true, fx: x, fz: -0.5 }; W.stations.push(st); W.st[st.id] = st; });

    // 装饰
    const D = (id, f) => { const g = new THREE.Group(); root.add(g); f(g); g.visible = false; decor[id] = g; };
    D('plant', (g) => {
      for (const [x, z] of [[-hw + 0.45, sh.bz + 0.6], [hw - 0.45, -3.4]]) {
        mesh(cyl(0.26, 0.2, 0.42, 14), M('#fff'), x, 0.21, z, g);
        for (let i = 0; i < 7; i++) { const a = i * 0.9; const lf = mesh(sph(0.26, 10, 8), M(i % 2 ? '#6fc28a' : '#8fd694'), x + Math.cos(a) * 0.22, 0.75 + (i % 3) * 0.22, z + Math.sin(a) * 0.22, g); lf.scale.set(1, 0.35, 0.7); lf.rotation.set(0.5, a, 0.4); }
      }
    });
    D('rug', (g) => { [[1.15, '#ffd3dc', 0.012], [0.85, '#fff7ef', 0.014], [0.4, '#ffd3dc', 0.016]].forEach(([r, c, y]) => { const a = mesh(cyl(r, r, 0.02, 40), M(c), 0, y + 0.01, sh.bz + 2.0, g); a.castShadow = false; }); });
    D('lights', (g) => {
      const nb = Math.round(hw * 5);
      for (let i = 0; i < nb; i++) { const x = -hw + 0.2 + i * (2 * hw - 0.4) / (nb - 1), c = ['#ffd66b', '#ff9fb4', '#8fd0ff', '#a5e6cc'][i % 4]; const b = mesh(sph(0.06, 8, 6), toon(c, { emissive: c, emissiveIntensity: 0.8 }), x, 2.62 - Math.abs(Math.sin(i * Math.PI / 4)) * 0.14, bz + 0.17, g); b.castShadow = false; bulbs.push(b); }
    });
    D('art', (g) => {
      [['🧋', -lastP, '#ffe6ec'], ['🍓', lastP, '#e8f4ff']].forEach(([e, x, bg]) => {
        mesh(rbox(0.66, 0.76, 0.05, 0.02), WOOD, x, 1.65, bz + 0.13, g);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.64), new THREE.MeshBasicMaterial({ map: emojiTex(e, bg) })); p.position.set(x, 1.65, bz + 0.162); g.add(p);
      });
    });
    D('neon', (g) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
      x.font = '900 86px ui-rounded,"Arial Rounded MT Bold","PingFang SC",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = '#ff5d8f'; x.shadowBlur = 22; x.fillStyle = '#fff0f5'; x.fillText('BOBA ♡ TEA', 256, 68); x.fillText('BOBA ♡ TEA', 256, 68);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.39), new THREE.MeshBasicMaterial({ map: t, transparent: true })); p.position.set(0, 2.5, bz + 0.13); g.add(p);
    });
    D('fish', (g) => {
      const fx = hw - 0.4;
      mesh(rbox(0.7, 0.72, 0.5, 0.06), th.cab, fx, 0.36, -4.6, g);
      mesh(rbox(0.66, 0.44, 0.46, 0.04), M('#8fd8ff', { transparent: true, opacity: 0.45, depthWrite: false }), fx, 0.95, -4.6, g);
      fishes = [0, 1, 2].map((i) => { const f = mesh(sph(0.06, 8, 6), M(['#ff9f43', '#ff7d95', '#ffd23f'][i]), fx, 0.9 + i * 0.07, -4.6, g); f.scale.set(1.5, 1, 0.7); f.userData.x = fx; return f; });
    });
    D('bear', (g) => {
      const b = M('#e8b98a'); g.position.set(hw - 0.6, 0, sh.bz + 0.7); g.rotation.y = -0.5;
      mesh(sph(0.5), b, 0, 0.45, 0, g); mesh(sph(0.4), b, 0, 1.15, 0, g);
      for (const s of [-1, 1]) { mesh(sph(0.14), b, s * 0.3, 1.47, 0, g); mesh(sph(0.2), b, s * 0.36, 0.2, 0.36, g); mesh(sph(0.15), b, s * 0.5, 0.65, 0.12, g); mesh(sph(0.045, 8, 6), M('#3a2a2a'), s * 0.14, 1.2, 0.36, g); }
      const mz = mesh(sph(0.15), M('#fff3e6'), 0, 1.07, 0.32, g); mz.scale.set(1.2, 0.85, 0.7); mesh(sph(0.04, 8, 6), M('#3a2a2a'), 0, 1.1, 0.42, g);
      mesh(sph(0.09, 8, 6), M('#ff7d95'), 0, 0.82, 0.36, g);
    });
    D('sakura', (g) => { tree(-2.6, sh.bz - 1.2, '#ffc2d4', 1.5, 0, g); tree(2.8, sh.bz - 1.3, '#ffb3c9', 1.35, 0, g); });
    D('jars', (g) => {
      for (const s of [-1, 1]) {
        mesh(rbox(0.22, 0.05, 3.4, 0.02), WOOD, s * 3.28, 1.95, 2.0, g);
        for (let i = 0; i < 7; i++) { const c = ['#ffc23d', '#ff7d95', '#8fbf5a', '#b79adf', '#8a4a22', '#fff7ea', '#cf9440'][(i + (s > 0 ? 3 : 0)) % 7]; mesh(cyl(0.085, 0.085, 0.2, 12), M(c), s * 3.28, 2.08, 0.6 + i * 0.47, g); mesh(cyl(0.09, 0.09, 0.04, 12), CREAM, s * 3.28, 2.2, 0.6 + i * 0.47, g); }
      }
    });
    D('claw', (g) => {
      g.position.set(-hw + 0.7, 0, -1.0); if (!wide) g.position.set(-1.9, 0, sh.bz + 0.75);
      mesh(rbox(0.9, 0.8, 0.8, 0.07), M('#ff9fb4'), 0, 0.4, 0, g); mesh(rbox(0.84, 0.9, 0.74, 0.05), GLASS, 0, 1.25, 0, g); mesh(rbox(0.94, 0.16, 0.84, 0.06), M('#ff7d95'), 0, 1.78, 0, g);
      for (let i = 0; i < 7; i++) mesh(sph(0.13, 10, 8), M(['#ffd66b', '#8fd0ff', '#a5e6cc', '#e6d8ff', '#ffffff'][i % 5]), -0.25 + (i % 3) * 0.25, 0.93 + Math.floor(i / 3) * 0.14, -0.15 + (i % 2) * 0.3, g);
      mesh(cyl(0.012, 0.012, 0.4, 5), M('#8b86a0'), 0, 1.5, 0, g); mesh(sph(0.06, 8, 6), M('#8b86a0'), 0, 1.3, 0, g);
      mesh(sph(0.05, 8, 6), M('#ff5d7a'), 0.2, 0.84, 0.42, g); mesh(cyl(0.015, 0.015, 0.1, 5), M('#ffffff'), 0.2, 0.8, 0.42, g);
    });
    D('chand', (g) => {
      const z = (sh.bz - 4.4) / 2; g.position.set(0, 0, z);
      mesh(cyl(0.015, 0.015, 0.5, 5), GOLD, 0, 3.0, 0, g).castShadow = false; mesh(cyl(0.5, 0.5, 0.05, 20), GOLD, 0, 2.75, 0, g).castShadow = false;
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; const c = mesh(cone(0.07, 0.22, 6), M('#e9f8ff', { emissive: '#bfeaff', emissiveIntensity: 0.9 }), Math.cos(a) * 0.45, 2.6, Math.sin(a) * 0.45, g); c.rotation.x = Math.PI; c.castShadow = false; }
      mesh(sph(0.16, 12, 8), M('#fff6cf', { emissive: '#ffdf8a', emissiveIntensity: 1 }), 0, 2.6, 0, g).castShadow = false;
    });
    D('gold', (g) => {
      g.position.set(-3.15, 1.01, -1.2);
      mesh(sph(0.16), GOLD, 0, 0.14, 0, g); mesh(sph(0.14), GOLD, 0, 0.36, 0, g);
      for (const s of [-1, 1]) { const e = mesh(cone(0.05, 0.09, 4), GOLD, s * 0.08, 0.5, 0, g); e.rotation.y = Math.PI / 4; mesh(sph(0.018, 6, 5), M('#3a2a2a'), s * 0.05, 0.38, 0.125, g); }
      W.paw = mesh(sph(0.05, 8, 6), GOLD, 0.15, 0.42, 0.04, g); mesh(sph(0.03, 6, 5), M('#ff5d7a'), 0, 0.26, 0.14, g);
    });
    // 合批：设备内部 → 装饰 → 整个场景（会动/会开关的部件除外）
    const stDyn = new Set([...Object.values(parts), W.burner, W.potTop, W.steamPot, ...Object.values(W.steamTea), W.sealHead, W.sealCup, W.shelfG, W.pickG]);
    for (const st of W.stations) if (st.g) bake(st.g, stDyn);
    const dcDyn = new Set([...(fishes || []), ...bulbs, W.paw]);
    for (const id in decor) bake(decor[id], dcDyn);
    bake(root, new Set([...W.stations.map((s) => s.g).filter(Boolean), ...Object.values(decor), ...lanterns, ...cars, ...(fall ? [fall] : [])]));
    W.root = root;
    if (W.onBuild) W.onBuild();
  };

  // ---------- 角色 ----------
  const player = makeChibi({ skin: '#ffe2cc', outfit: '#ff9fb4', hair: '#7a5240', style: 1, apron: true, hat: 'beret' });
  scene.add(player); W.player = player;
  const pcup = makeCup(); pcup.position.set(0, 0.6, 0.4); pcup.visible = false; player.userData.inner.add(pcup);
  const cat = makeChibi({ kind: 'cat', skin: '#ffd9a8', outfit: '#ffffff', apron: true, pants: '#ffd9a8' });
  cat.position.set(-2.05, 0, 4.05); cat.scale.setScalar(0.82); scene.add(cat);
  const arrow = new THREE.Group(); scene.add(arrow); arrow.visible = false;
  const am = toon('#ffcf3f', { emissive: '#ffb300', emissiveIntensity: 0.5 });
  const ac = mesh(cone(0.2, 0.3, 14), am, 0, 0, 0, arrow); ac.rotation.x = Math.PI; ac.castShadow = false; mesh(cyl(0.08, 0.08, 0.2, 10), am, 0, 0.24, 0, arrow).castShadow = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 32), new THREE.MeshBasicMaterial({ color: '#ffcf3f', transparent: true, opacity: 0.7, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; scene.add(ring); ring.visible = false;

  // ---------- 特效 ----------
  const sparks = [];
  for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, depthTest: false, color: ['#ffe066', '#ff9fb4', '#ffffff', '#8fd0ff'][i % 4] })); s.visible = false; s.userData = { life: 0, v: new THREE.Vector3() }; scene.add(s); sparks.push(s); }
  W.burst = (x, y, z, n = 14, spread = 1) => {
    let k = 0;
    for (const s of sparks) { if (s.userData.life > 0) continue; s.position.set(x, y, z); s.userData.v.set((Math.random() - 0.5) * 3 * spread, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 3 * spread); s.userData.life = 0.7 + Math.random() * 0.5; s.visible = true; if (++k >= n) break; }
  };
  const pulses = [];
  W.pulse = (id) => {
    const o = id === 'player' ? player : W.st[id] && W.st[id].g; if (!o) return;
    pulses.push({ o, t: 0 }); W.burst(o.position.x, 1.8, o.position.z, 16);
  };

  // ---------- API ----------
  W.addChibi = (look) => { const c = makeChibi(look); scene.add(c); return c; };
  W.addCustomer = W.addChibi;
  W.remove = (o) => { scene.remove(o); disposeChibi(o); };
  W.giveCup = (chibi, items, sealed = true) => { W.dropCup(chibi); const c = makeCup(); c.userData.set(items, sealed); c.position.set(0, 0.6, 0.4); chibi.userData.inner.add(c); chibi.userData.cup = c; };
  W.dropCup = (chibi) => { const c = chibi.userData.cup; if (c) { c.userData.dispose(); c.removeFromParent(); chibi.userData.cup = null; } };
  const picks = [];
  W.dropPick = (items) => {
    for (const p of picks) if (p.t > 0.3 && picks.length >= 3) p.t = 0.3;
    const m = makeCup(); m.userData.set(items, true); m.position.set(-0.32 + (picks.length % 3) * 0.32, 1.44, -0.06); W.pickG.add(m); picks.push({ m, t: 3.2, g: W.pickG });
  };
  W.addCoin = (x, z) => { const m = mesh(cyl(0.13, 0.13, 0.035, 16), M('#ffd23f', { emissive: '#ffb300', emissiveIntensity: 0.35 }), x, 0.95, z, scene); m.rotation.x = Math.PI / 2; return m; };
  const v = new THREE.Vector3();
  W.project = (x, y, z) => { v.set(x, y, z).project(camera); return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, v.z < 1]; };
  W.resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  W.anim = animChibi;

  W.sync = (S, R, G) => {
    if (W.tier !== S.shop || W.sceneId !== S.scene) W.build(S.shop, S.scene);
    const un = G.unlocked();
    for (const id in parts) parts[id].visible = un.has(id);
    const sh = (S.up.shelf || 0) > 0; W.st.shelf.g.visible = sh; W.st.shelf.off = !sh;
    const pk = S.shop >= 2 && (S.up.hire || 0) > 0; W.st.pickup.g.visible = pk; W.st.pickup.off = !pk;
    cat.visible = (S.up.cat || 0) > 0;
    for (const d in decor) decor[d].visible = !!S.decor[d];
    if (themeId !== S.theme) setTheme(S.theme);
    pcup.visible = !!R.held && !R.seal;
    if (R.held) { pcup.userData.set(R.held.items, R.held.sealed); W.sealCup.userData.set(R.held.items, false); }
    W.sealCup.visible = !!R.seal;
    for (const c of [...W.shelfG.children]) { c.userData.dispose(); W.shelfG.remove(c); }
    R.shelf.forEach((c, i) => { const m = makeCup(); m.userData.set(c.items, c.sealed); m.position.set(-0.4 + i * 0.4, TOP + 0.05, 0); W.shelfG.add(m); });
    W.potTop.visible = S.cooked > 0 || !!R.cook;
  };

  const KEYS = [
    [0, '#c4ecff', '#fff4e2', 1.7, 1.25, 0], [0.5, '#a6dcff', '#ffffff', 1.9, 1.3, 0],
    [0.78, '#ffc9a3', '#ffb680', 1.5, 1.15, 0.35], [1, '#3d4c85', '#93a4ff', 0.55, 0.85, 1],
  ];
  const ca = new THREE.Color(), cb = new THREE.Color();
  let tod = -1;
  W.setTime = (p0) => {
    const p = envCfg.night ? 0.86 + p0 * 0.14 : p0;
    if (Math.abs(p - tod) < 0.002) return; tod = p;
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], k = Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0])));
    scene.background.copy(ca.set(a[1]).lerp(cb.set(b[1]), k)); scene.fog.color.copy(scene.background);
    sun.color.copy(ca.set(a[2]).lerp(cb.set(b[2]), k));
    sun.intensity = a[3] + (b[3] - a[3]) * k; hemi.intensity = a[4] + (b[4] - a[4]) * k;
    const n = a[5] + (b[5] - a[5]) * k; lamp.intensity = n * 30;
    sun.position.set(6 - p * 10, 11 - p * 3, 6 + sun.target.position.z);
  };

  W.update = (dt, t, S, R, G) => {
    const P = R.player;
    player.position.set(P.x, 0, P.z); player.rotation.y = P.rot;
    animChibi(player, dt, { moving: P.moving, hold: !!R.held && !R.seal });
    if (cat.visible) animChibi(cat, dt, { happy: !!R.cook || Object.keys(R.brew).length > 0 });
    W.burner.material.emissiveIntensity = R.cook ? 1.2 + Math.sin(t * 9) * 0.3 : 0;
    animSteam(W.steamPot, !!R.cook, t);
    for (const id in W.steamTea) { const on = !!R.brew[id]; animSteam(W.steamTea[id], on, t); W.urnLids[id].position.y = 0.56 + (on ? Math.abs(Math.sin(t * 9)) * 0.03 : 0); }
    W.sealHead.position.y = TOP + (R.seal ? 0.66 - Math.sin(Math.min(1, R.seal.t / R.seal.dur) * Math.PI) * 0.1 : 0.66);
    for (const c of cars) { const u = c.userData; c.position.x = ((t * u.v + u.off) % 70 - 35) * u.dir; }
    if (fishes && decor.fish.visible) fishes.forEach((f, i) => { f.position.x = f.userData.x + Math.sin(t * (0.6 + i * 0.2) + i * 2) * 0.2; f.position.z = -4.6 + Math.cos(t * (0.5 + i * 0.15) + i) * 0.12; });
    if (decor.lights && decor.lights.visible) bulbs.forEach((b, i) => { b.material.emissiveIntensity = 0.6 + Math.sin(t * 2.5 + i * 1.3) * 0.4; });
    lanterns.forEach((m, i) => { m.position.y += Math.sin(t * 1.5 + i) * 0.0015; });
    if (W.paw && decor.gold.visible) W.paw.position.y = 0.42 + Math.sin(t * 4) * 0.04;
    if (fall) { const a = fall.geometry.attributes.position, u = fall.userData; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * u.sp * (0.7 + (i % 5) * 0.12); if (y < 0) y += 10; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t + i) * dt * 0.25); } a.needsUpdate = true; }
    for (const p of [...picks]) { p.t -= dt; if (p.t < 0.3) p.m.scale.setScalar(Math.max(0.01, p.t / 0.3)); if (p.t <= 0 || p.g !== W.pickG) { p.m.userData.dispose(); p.m.removeFromParent(); picks.splice(picks.indexOf(p), 1); } }
    for (const c of R.coins) { c.mesh.rotation.z = t * 3; c.mesh.position.y = 0.95 + Math.sin(t * 4 + c.x) * 0.05; }
    for (const s of sparks) { const u = s.userData; if (u.life <= 0) continue; u.life -= dt; u.v.y -= dt * 5; s.position.addScaledVector(u.v, dt); s.scale.setScalar(0.12 + u.life * 0.3); s.material.opacity = Math.min(1, u.life * 2); s.material.rotation += dt * 3; if (u.life <= 0) s.visible = false; }
    for (const p of [...pulses]) { p.t += dt / 0.7; const k = Math.min(1, p.t), sc = 1 + Math.sin(k * Math.PI * 3) * 0.14 * (1 - k); p.o.scale.set(sc, 2 - sc, sc); if (k >= 1) { p.o.scale.setScalar(1); pulses.splice(pulses.indexOf(p), 1); } }
    // 指引箭头
    const h = R.hint, st = h && S.set.guide && h.st ? W.st[h.st] : null;
    arrow.visible = ring.visible = !!st;
    if (st) {
      const sl = st.slot != null;
      arrow.position.set(st.x, (sl ? 2.75 : st.ly + 0.55) + Math.sin(t * 5) * 0.09, sl ? L.SLOTS[st.slot][1] : st.z); arrow.rotation.y = t * 2;
      ring.position.set(st.fx, 0.02, st.fz); ring.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
    }
    W.setTime(R.phase === 'open' || R.phase === 'closing' ? Math.min(1, R.prog) : R.phase === 'summary' ? 1 : 0);
  };
  W.build(1, 'town');
  W.resize();
  return W;
}
