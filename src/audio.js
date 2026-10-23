/* Audio: Web Audio only, created on first user gesture. Every scheduled source and timer is tracked so stopAll() leaves nothing running. */
const Audio = (() => {
  let ctx = null, master = null;
  const live = new Set();       // active AudioScheduledSourceNodes
  const timers = new Set();     // setTimeout ids
  const bufCache = new Map();
  let unsupported = false;

  function ensure() {
    if (unsupported) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { unsupported = true; return null; }
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const freq = midi => 440 * Math.pow(2, (midi - 69) / 12);
  const track = node => { live.add(node); node.onended = () => live.delete(node); return node; };

  /* Karplus–Strong plucked string, rendered once per pitch and cached. */
  function pluckBuffer(midi, opts = {}) {
    const key = midi + (opts.muted ? 'm' : '');
    if (bufCache.has(key)) return bufCache.get(key);
    const sr = ctx.sampleRate, dur = opts.muted ? 0.35 : 2.2;
    const len = Math.floor(sr * dur), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq(midi)));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    const damp = opts.muted ? 0.45 : 0.498;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const next = (idx + 1) % period;
      const v = (ring[idx] + ring[next]) * damp;
      d[i] = ring[idx]; ring[idx] = v; idx = next;
    }
    bufCache.set(key, buf); return buf;
  }
  function pluck(midi, when = 0, opts = {}) {
    const c = ensure(); if (!c) return;
    const t = Math.max(c.currentTime, when || c.currentTime);
    const src = track(c.createBufferSource()); src.buffer = pluckBuffer(midi, opts);
    const g = c.createGain(); const vel = opts.velocity == null ? 0.8 : opts.velocity;
    g.gain.setValueAtTime(vel, t);
    const len = opts.length || (opts.muted ? 0.3 : 1.8);
    g.gain.setTargetAtTime(0, t + len * 0.7, len * 0.15);
    let node = src;
    if (opts.muted) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; src.connect(lp); node = lp; }
    node.connect(g).connect(master);
    src.start(t); src.stop(t + len + 0.6);
  }
  function strum(midis, when, opts = {}) {
    const c = ensure(); if (!c) return;
    const t = when || c.currentTime + 0.02;
    midis.filter(m => m != null).forEach((m, i) => pluck(m, t + i * (opts.spread || 0.018), opts));
  }
  /* Continuous tone with pitch automation for technique demos (bend, slide, vibrato, legato). */
  function tone(points, opts = {}) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + 0.03;
    const osc = track(c.createOscillator()); osc.type = opts.type || 'sawtooth';
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opts.cutoff || 1800; lp.Q.value = 0.7;
    const g = c.createGain();
    const end = points[points.length - 1].t;
    osc.frequency.setValueAtTime(freq(points[0].midi), t0);
    points.forEach(p => {
      if (p.jump) osc.frequency.setValueAtTime(freq(p.midi), t0 + p.t);
      else osc.frequency.linearRampToValueAtTime(freq(p.midi), t0 + p.t);
    });
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.01);
    (opts.accents || []).forEach(a => { g.gain.setValueAtTime(0.32, t0 + a); g.gain.exponentialRampToValueAtTime(0.18, t0 + a + 0.25); });
    g.gain.setTargetAtTime(0.12, t0 + 0.05, 0.4);
    g.gain.setTargetAtTime(0.0001, t0 + end, 0.08);
    if (opts.vibrato) {
      const lfo = track(c.createOscillator()); lfo.frequency.value = opts.vibrato.rate || 5.5;
      const lg = c.createGain(); lg.gain.value = freq(points[0].midi) * (Math.pow(2, (opts.vibrato.depth || 0.4) / 12) - 1);
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t0 + (opts.vibrato.delay || 0.3)); lfo.stop(t0 + end + 0.5);
    }
    osc.connect(lp).connect(g).connect(master);
    osc.start(t0); osc.stop(t0 + end + 0.6);
  }
  function bell(midi, when) {
    const c = ensure(); if (!c) return;
    const t = when || c.currentTime + 0.02;
    const o = track(c.createOscillator()); o.type = 'sine'; o.frequency.value = freq(midi);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g).connect(master); o.start(t); o.stop(t + 2.5);
  }
  function noise(when, dur = 0.06) {
    const c = ensure(); if (!c) return;
    const t = when || c.currentTime + 0.02;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = track(c.createBufferSource()); s.buffer = b;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800;
    const g = c.createGain(); g.gain.value = 0.5;
    s.connect(bp).connect(g).connect(master); s.start(t);
  }
  function click(when, accent) {
    const c = ensure(); if (!c) return;
    const o = track(c.createOscillator()); o.frequency.value = accent === 2 ? 1760 : accent === 1 ? 1320 : 990;
    const g = c.createGain();
    g.gain.setValueAtTime(accent ? 0.5 : 0.28, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    o.connect(g).connect(master); o.start(when); o.stop(when + 0.06);
  }
  function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, Math.max(0, ms)); timers.add(id); return id; }

  /* Lookahead step sequencer. steps(i) returns {dur (s), fire(time, i)} or null to stop; onStep(i) runs in sync for UI. */
  let seq = null;
  function runSequence({ next, onStep, onEnd }) {
    const c = ensure(); if (!c) return false;
    stopSequence();
    const s = { t: c.currentTime + 0.08, i: 0, alive: true, queue: [] };
    seq = s;
    const tick = () => {
      if (!s.alive) return;
      while (s.t < c.currentTime + 0.12) {
        const step = next(s.i);
        if (!step) { const endT = s.t; later(() => { if (s.alive) { s.alive = false; seq = null; onEnd && onEnd(); } }, (endT - c.currentTime) * 1000); return; }
        step.fire && step.fire(s.t, s.i);
        const at = s.t, idx = s.i;
        later(() => { if (s.alive && onStep) onStep(idx, step); }, (at - c.currentTime) * 1000);
        s.t += step.dur; s.i++;
      }
      s.timer = later(tick, 25);
    };
    tick();
    return true;
  }
  function stopSequence() { if (seq) { seq.alive = false; seq = null; } }
  function stopAll() {
    stopSequence();
    timers.forEach(id => clearTimeout(id)); timers.clear();
    live.forEach(n => { try { n.stop(); } catch (e) { /* already stopped */ } }); live.clear();
  }
  const isRunning = () => !!(seq && seq.alive);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  return { ensure, pluck, strum, tone, bell, noise, click, runSequence, stopSequence, stopAll, isRunning, freq, get supported() { return !unsupported && !!(window.AudioContext || window.webkitAudioContext); }, get ctx() { return ctx; }, _live: live, _timers: timers };
})();
