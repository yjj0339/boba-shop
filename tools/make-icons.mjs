// 生成应用图标（纯 Node，无依赖）：node tools/make-icons.mjs
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('../icons/', import.meta.url));

function crc(buf) { let c, r = 0xffffffff; for (const b of buf) { c = (r ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); }
function png(size, px) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0; for (let x = 0; x < size; x++) { const o = y * (size * 3 + 1) + 1 + x * 3, c = px(x, y); raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// 场景（单位坐标 0..1）：粉色渐变底 + 奶茶杯 + 珍珠 + 吸管
function scene(u, v) {
  let c = mix(hex('#ffd0dc'), hex('#ffb0c6'), v);
  const d0 = Math.hypot(u - 0.5, v - 0.42); c = mix(c, hex('#fff1f5'), Math.max(0, 1 - d0 / 0.5) * 0.7);
  // 吸管
  const sx = 0.6 - (v - 0.1) * 0.22; if (v > 0.08 && v < 0.62 && Math.abs(u - sx) < 0.03) c = hex(Math.floor(v * 22) % 2 ? '#ff7d95' : '#ffffff');
  // 杯身（梯形）
  const top = 0.3, bot = 0.86, k = (v - top) / (bot - top), hw = 0.25 - k * 0.07;
  if (v >= top && v <= bot && Math.abs(u - 0.5) < hw) {
    c = hex('#fffaf3');
    const inner = Math.abs(u - 0.5) < hw - 0.022 && v < bot - 0.022;
    if (inner && v > top + 0.1) c = mix(hex('#e9b98c'), hex('#d49a68'), k);
    else if (inner) c = hex('#fff3dc');
    if (inner) for (const [px, py] of [[0.36, 0.78], [0.45, 0.8], [0.54, 0.78], [0.63, 0.8], [0.41, 0.71], [0.5, 0.72], [0.59, 0.71], [0.47, 0.64], [0.56, 0.645]]) if (Math.hypot(u - px, v - py) < 0.038) c = Math.hypot(u - px + 0.012, v - py + 0.012) < 0.012 ? hex('#8a6a58') : hex('#3a2418');
    // 小脸
    if (inner) { for (const s of [-1, 1]) { if (Math.hypot(u - 0.5 - s * 0.075, v - 0.5) < 0.02) c = hex('#5b4654'); if (Math.hypot(u - 0.5 - s * 0.125, v - 0.54) < 0.026) c = mix(c, hex('#ff8fa6'), 0.75); } const md = Math.hypot(u - 0.5, v - 0.52); if (md > 0.022 && md < 0.034 && v > 0.525) c = hex('#5b4654'); }
    if (u - 0.5 < -hw + 0.07 && u - 0.5 > -hw + 0.04 && v > top + 0.06 && v < bot - 0.1) c = mix(c, [255, 255, 255], 0.6);
  }
  // 杯盖
  if (v > 0.255 && v < 0.315 && Math.abs(u - 0.5) < 0.275) c = hex('#ff8fab');
  return c;
}
function render(size, pad = 0) {
  const SS = 3;
  return png(size, (x, y) => {
    const a = [0, 0, 0];
    for (let i = 0; i < SS; i++) for (let j = 0; j < SS; j++) {
      let u = (x + (i + 0.5) / SS) / size, v = (y + (j + 0.5) / SS) / size;
      u = 0.5 + (u - 0.5) * (1 + pad); v = 0.5 + (v - 0.5) * (1 + pad);
      const c = scene(Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v))); a[0] += c[0]; a[1] += c[1]; a[2] += c[2];
    }
    return a.map((s) => Math.round(s / (SS * SS)));
  });
}
writeFileSync(out + 'apple-touch-icon.png', render(180));
writeFileSync(out + 'icon-192.png', render(192));
writeFileSync(out + 'icon-512.png', render(512, 0.12));
console.log('icons written to', out);
