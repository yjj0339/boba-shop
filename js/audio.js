// 合成音效 + 轻快的背景音乐（全部 WebAudio 生成，无需音频文件）
let ctx = null, master = null, musicGain = null, timer = null, step = 0, nextT = 0;
export const audio = { sfxOn: true, musicOn: true, tempo: 1 };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = audio.musicOn ? 0.5 : 0; musicGain.connect(master);
  nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 100);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume().catch(() => {}); });
  // iPhone 锁屏/来电后音频会被系统打断，只能在下一次触摸时恢复
  const wake = () => { if (ctx && ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => {}); };
  document.addEventListener('pointerdown', wake, true); document.addEventListener('touchend', wake, true);
}
export function setMusic(on) { audio.musicOn = on; if (musicGain) musicGain.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.2); }

function tone(f, t, d, type = 'sine', v = 0.2, dest = master, f2) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.03);
}
function noise(t, d, v = 0.15, freq = 1800) {
  const n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n) * (0.6 + 0.4 * Math.sin(i / 900));
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = v;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
export function sfx(name) {
  if (!ctx || !audio.sfxOn || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  if (name === 'pop') tone(520, t, 0.12, 'sine', 0.25, master, 880);
  else if (name === 'pour') { noise(t, 0.4, 0.16, 1500); tone(300, t, 0.35, 'sine', 0.06, master, 620); }
  else if (name === 'ding') { tone(1318, t, 0.35, 'triangle', 0.18); tone(1760, t + 0.09, 0.45, 'triangle', 0.16); }
  else if (name === 'coin') { tone(988, t, 0.09, 'square', 0.07); tone(1319, t + 0.08, 0.28, 'square', 0.07); tone(1976, t + 0.08, 0.3, 'sine', 0.1); }
  else if (name === 'bad') tone(220, t, 0.28, 'sawtooth', 0.08, master, 110);
  else if (name === 'bell') { tone(1568, t, 0.5, 'sine', 0.09); tone(2093, t + 0.12, 0.6, 'sine', 0.07); }
  else if (name === 'level') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.085, 0.4, 'triangle', 0.15));
}

// 背景音乐：C–Am–F–G / F–G–Em–Am 的可爱小循环
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CH = [[48, 64, 67, 72], [45, 60, 64, 69], [41, 60, 65, 69], [43, 62, 67, 71], [41, 60, 65, 69], [43, 62, 67, 71], [40, 59, 64, 67], [45, 60, 64, 69]];
const MEL = [76, 0, 79, 76, 72, 0, 74, 76, 0, 72, 69, 0, 72, 74, 76, 0, 77, 0, 81, 77, 74, 0, 76, 79, 0, 76, 72, 74, 76, 0, 0, 0,
  81, 0, 79, 77, 76, 0, 77, 79, 0, 74, 77, 0, 79, 83, 79, 0, 79, 0, 76, 71, 74, 0, 76, 79, 84, 0, 81, 0, 76, 0, 0, 0];
function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  const sp = 60 / (104 * audio.tempo) / 2;
  if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.3) {
    const bar = Math.floor(step / 8) % 8, i = step % 8, c = CH[bar];
    if (i === 0 || i === 4) tone(N(c[0]), nextT, 0.5, 'triangle', 0.16, musicGain);
    if (i % 2 === 1) tone(N(c[1 + ((i >> 1) % 3)]), nextT, 0.22, 'sine', 0.07, musicGain);
    if (i === 2 || i === 6) { tone(N(c[1]), nextT, 0.3, 'sine', 0.05, musicGain); tone(N(c[2]), nextT, 0.3, 'sine', 0.05, musicGain); }
    const m = MEL[step % 64]; if (m) tone(N(m), nextT, 0.34, 'triangle', 0.085, musicGain);
    nextT += sp; step++;
  }
}
