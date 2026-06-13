/* ============ Audio: procedural music + SFX (Web Audio API) ============ */
const AudioMan = (() => {
  let ctx = null, master, musicGain, sfxGain;
  let muted = false, musicTimer = null;
  let noiseBuf = null;

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    // cached noise buffer for footsteps
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(freq, when, dur, type, vol, dest, glideTo) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, when);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, when + dur);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest);
    o.start(when); o.stop(when + dur + 0.05);
  }

  /* ---------- Music: cheerful 4-bar loop, C major (I-vi-IV-V) ---------- */
  const BPM = 104, EIGHTH = 60 / BPM / 2;
  // 32 eighth-notes of melody (null = rest)
  const MEL = [
    72, 76, 79, 76, 81, 79, 76, 72,     // C
    76, 72, 69, 72, 74, 76, 72, null,   // Am
    65, 69, 72, 69, 77, 76, 74, 72,     // F
    67, 71, 74, 71, 74, 76, 79, null    // G -> resolves to C
  ];
  // 16 quarter-note bass (root / fifth)
  const BASS = [48, 55, 60, 55, 45, 52, 57, 52, 41, 48, 53, 48, 43, 50, 55, 50];

  let stepIdx = 0, nextTime = 0;

  function scheduleStep(i, t) {
    const m = MEL[i];
    if (m !== null) tone(midi(m), t, 0.26, 'triangle', 0.16, musicGain);
    if (i % 2 === 0) tone(midi(BASS[(i / 2) | 0]), t, 0.4, 'sine', 0.2, musicGain);
    if (i % 8 === 4) tone(midi(91 + (i % 16 === 4 ? 0 : -3)), t, 0.5, 'sine', 0.045, musicGain); // sparkle
  }

  function startMusic() {
    if (!ctx || musicTimer) return;
    stepIdx = 0; nextTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      while (nextTime < ctx.currentTime + 0.18) {
        scheduleStep(stepIdx, nextTime);
        stepIdx = (stepIdx + 1) % 32;
        nextTime += EIGHTH;
      }
    }, 40);
  }

  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

  function toggleMute() {
    if (!ctx) return muted;
    muted = !muted;
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
    return muted;
  }

  /* ---------- SFX ---------- */
  const now = () => ctx ? ctx.currentTime : 0;

  function blip()    { tone(880, now(), 0.045, 'square', 0.05, sfxGain); }
  function collect() {
    [76, 83, 88].forEach((m, i) => tone(midi(m), now() + i * 0.07, 0.18, 'triangle', 0.22, sfxGain));
  }
  function chime() {
    [84, 88, 91].forEach((m, i) => tone(midi(m), now() + i * 0.09, 0.4, 'sine', 0.25, sfxGain));
  }
  function fanfare() {
    [72, 76, 79, 84].forEach((m, i) => tone(midi(m), now() + i * 0.13, 0.25, 'triangle', 0.25, sfxGain));
    [72, 76, 79, 84].forEach(m => tone(midi(m), now() + 0.55, 1.1, 'triangle', 0.16, sfxGain));
  }
  function open() {
    tone(100, now(), 0.7, 'triangle', 0.3, sfxGain, 420);
    setTimeout(chime, 450);
  }
  function meow() {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2.5;
    const t = now();
    o.frequency.setValueAtTime(740, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.32);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(f); f.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + 0.45);
  }
  function step() {
    if (!ctx) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = 700;
    const t = now();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(t); s.stop(t + 0.1);
  }

  return { init, startMusic, stopMusic, toggleMute, blip, collect, chime, fanfare, open, meow, step };
})();
