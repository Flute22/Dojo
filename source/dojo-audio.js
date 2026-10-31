// Pandas Dojo — generative flute + tanpura ambience (Web Audio, no files)
(function () {
  if (window.DojoAudio) return; // guard against double loading
  const RAGAS = {
    bhupali: { label: 'Bhupali · pentatonic', scale: [0, 2, 4, 7, 9], rest: [0, 2, 3], start: [0, 2, 3, -1] },
    yaman: { label: 'Yaman · evening', scale: [0, 2, 4, 6, 7, 9, 11], rest: [0, 2, 4, 6], start: [-1, 2, 4] },
    bhairavi: { label: 'Bhairavi · morning', scale: [0, 1, 3, 5, 7, 8, 10], rest: [0, 3, 4], start: [0, 2, 4] },
  };
  const SA = 293.66; // flute tonic (D4); drone plays an octave lower
  const DRONE = [110.0, 146.83, 146.83, 73.42]; // Pa, Sa, Sa, low Sa
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const A = {
    RAGAS, ctx: null, master: null, reverb: null, noise: null, bus: null, pad: [],
    playing: false, volume: 15, mood: 'bhupali', timer: null, tNext: 0, dNext: 0, dStep: 0, prevF: 0, error: null,
  };

  function init() {
    if (A.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) throw new Error('Web Audio is not supported in this browser.');
    const ctx = new C();
    A.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3;
    A.master = ctx.createGain(); A.master.gain.value = 0;
    A.master.connect(comp); comp.connect(ctx.destination);
    // Generated impulse response: stereo noise with a smooth exponential tail.
    const len = Math.floor(ctx.sampleRate * 4.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4);
    }
    A.reverb = ctx.createConvolver(); A.reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    A.reverb.connect(wet); wet.connect(A.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    A.noise = nb;
  }
  const level = () => (A.volume / 100) * 1.5;

  function newBus() {
    const g = A.ctx.createGain();
    const dry = A.ctx.createGain(); dry.gain.value = 0.7;
    g.connect(dry); dry.connect(A.master); g.connect(A.reverb);
    return g;
  }
  function freq(idx) {
    const sc = RAGAS[A.mood].scale, n = sc.length;
    const oct = Math.floor(idx / n), deg = ((idx % n) + n) % n;
    return SA * Math.pow(2, oct + sc[deg] / 12);
  }

  function flute(bus, t, dur, f, fromF) {
    const ctx = A.ctx, end = t + dur, stop = end + 1;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.15, t + 0.28);
    env.gain.linearRampToValueAtTime(0.11, end - 0.05);
    env.gain.linearRampToValueAtTime(0.0001, end + 0.75);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = 0.3;
    env.connect(lp); lp.connect(bus);
    // Delayed vibrato, the way a bansuri player lets a long note bloom.
    const vib = ctx.createOscillator(); vib.frequency.value = 4.5 + Math.random() * 0.8;
    const vibAmt = ctx.createGain();
    vibAmt.gain.setValueAtTime(0, t);
    vibAmt.gain.linearRampToValueAtTime(0, t + Math.min(0.6, dur * 0.4));
    vibAmt.gain.linearRampToValueAtTime(13, t + Math.min(1.5, dur));
    vib.connect(vibAmt);
    const oscs = [['sine', 1, 0.8], ['triangle', 1, 0.2], ['sine', 2, 0.06], ['sine', 3, 0.02]].map(([type, mult, amp]) => {
      const o = ctx.createOscillator(); o.type = type;
      if (fromF) { o.frequency.setValueAtTime(fromF * mult, t); o.frequency.exponentialRampToValueAtTime(f * mult, t + 0.24); }
      else o.frequency.setValueAtTime(f * mult, t);
      vibAmt.connect(o.detune);
      const g = ctx.createGain(); g.gain.value = amp;
      o.connect(g); g.connect(env);
      return o;
    });
    const n = ctx.createBufferSource(); n.buffer = A.noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2.2; bp.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.045, t + 0.08);
    ng.gain.linearRampToValueAtTime(0.01, t + 0.45);
    ng.gain.linearRampToValueAtTime(0.0001, end + 0.5);
    n.connect(bp); bp.connect(ng); ng.connect(lp);
    oscs.concat([vib]).forEach((o) => { o.start(t); o.stop(stop); });
    n.start(t, Math.random()); n.stop(stop);
  }

  function pluck(bus, t, f) {
    const ctx = A.ctx;
    for (let k = 1; k <= 7; k++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = f * k; o.detune.value = (Math.random() - 0.5) * 6;
      const g = ctx.createGain();
      const amp = 0.045 / Math.pow(k, 0.8), dec = 4.4 / (0.7 + k * 0.22);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + dec + 0.05);
    }
  }

  // One phrase: mostly stepwise motion that comes to rest on a resting tone of the raga.
  function phrase(t0) {
    const R = RAGAS[A.mood], n = R.scale.length;
    let idx = pick(R.start);
    const notes = [];
    const len = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < len; i++) {
      notes.push(idx);
      idx = Math.max(-3, Math.min(n + 2, idx + pick([-1, -1, 1, 1, 1, -2, 2])));
    }
    const last = notes[notes.length - 1];
    const rests = R.rest.flatMap((r) => [r - n, r, r + n]);
    const target = rests.reduce((a, b) => (Math.abs(b - last) < Math.abs(a - last) ? b : a));
    if (target !== last) notes.push(target);
    let t = t0, prev = 0;
    notes.forEach((ix, i) => {
      const final = i === notes.length - 1;
      const dur = final ? 2.6 + Math.random() * 1.6 : pick([0.8, 0.95, 1.15, 1.4, 1.8]);
      const f = freq(ix);
      flute(A.bus, t, dur, f, prev && Math.random() < 0.35 ? prev : 0);
      prev = f;
      t += dur + 0.04;
    });
    return t + 2.4 + Math.random() * 3.2;
  }

  function tick() {
    if (!A.playing) return;
    const now = A.ctx.currentTime;
    while (A.dNext < now + 1.5) {
      pluck(A.bus, A.dNext, DRONE[A.dStep % 4]);
      A.dNext += A.dStep % 4 === 3 ? 1.9 : 1.25;
      A.dStep++;
    }
    if (A.tNext < now + 1.5) A.tNext = phrase(Math.max(A.tNext, now + 0.1));
  }

  A.play = function () {
    try { init(); } catch (e) { A.error = e.message; return false; }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    A.bus = newBus();
    A.playing = true;
    const now = A.ctx.currentTime;
    A.dNext = now + 0.2; A.dStep = 0; A.tNext = now + 3;
    A.pad = [146.83, 220.0].map((f) => {
      const o = A.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.012, now + 3);
      o.connect(g); g.connect(A.bus); o.start(now);
      return o;
    });
    A.master.gain.cancelScheduledValues(now);
    A.master.gain.setValueAtTime(A.master.gain.value, now);
    A.master.gain.linearRampToValueAtTime(level(), now + 1.5);
    clearInterval(A.timer);
    A.timer = setInterval(tick, 200);
    tick();
    return true;
  };

  A.pause = function () {
    if (!A.ctx || !A.playing) return;
    A.playing = false;
    clearInterval(A.timer);
    const now = A.ctx.currentTime, bus = A.bus, pad = A.pad;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    setTimeout(() => {
      try { pad.forEach((o) => o.stop()); bus.disconnect(); } catch (e) {}
      if (!A.playing && A.ctx.state === 'running') A.ctx.suspend();
    }, 1000);
  };

  A.setVolume = function (v) {
    A.volume = Math.max(0, Math.min(100, Number(v) || 0));
    if (A.ctx && A.playing) {
      const now = A.ctx.currentTime;
      A.master.gain.cancelScheduledValues(now);
      A.master.gain.setValueAtTime(A.master.gain.value, now);
      A.master.gain.linearRampToValueAtTime(level(), now + 0.15);
    }
  };
  A.setMood = function (k) { if (RAGAS[k]) A.mood = k; };

  // Two soft bell tones for the Pomodoro timer.
  A.chime = function () {
    try {
      init();
      const ctx = A.ctx;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime + 0.05;
      [[659.25, 0], [987.77, 0.35]].forEach(([f, d]) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now + d);
        g.gain.linearRampToValueAtTime(0.06, now + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + d + 2.2);
        o.connect(g); g.connect(ctx.destination); g.connect(A.reverb);
        o.start(now + d); o.stop(now + d + 2.3);
      });
      if (!A.playing) setTimeout(() => { if (!A.playing && ctx.state === 'running') ctx.suspend(); }, 3200);
    } catch (e) {}
  };

  window.DojoAudio = A;
})();
