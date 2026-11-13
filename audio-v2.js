/* Local PCM recordings play through the browser's media playback route on iOS. */
(() => {
  'use strict';

  const base = new URL('assets/audio/', document.currentScript?.src || document.baseURI);
  const sounds = new Set(['stir', 'pour', 'peel', 'cut', 'press', 'pop', 'release', 'finish']);
  const beds = new Set(['stir', 'pour', 'peel', 'cut', 'press']);
  const clips = new Map();
  const clock = () => performance.now();
  const clamp = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
  let muted = false;
  let lastError = '';
  let starts = 0;
  let activeBed = '';
  let bedTimer;
  let lastKind = '';
  let lastAt = -Infinity;
  let order = 0;

  function sessionType(type) {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== type) {
        navigator.audioSession.type = type;
      }
    } catch { /* Native HTML audio also works without the optional session API. */ }
  }

  function channel() {
    const element = new Audio();
    element.preload = 'auto';
    element.setAttribute('playsinline', '');
    element.setAttribute('webkit-playsinline', '');
    const voice = {element, clip: '', request: 0, started: 0, primed: false, pending: null, priming: false};
    element.addEventListener('error', () => {
      lastError = 'MediaError ' + (element.error?.code || 'unknown');
      voice.priming = false;
      voice.primed = false;
    });
    return voice;
  }

  // Keep the same HTMLMediaElements between touches. Safari grants media
  // playback per element, so a new Audio() for every sound can lose activation.
  const effects = [channel(), channel(), channel()];
  const movement = channel();
  const voices = [...effects, movement];

  function source(voice, name) {
    if (voice.clip === name && !voice.element.error) return;
    voice.element.src = new URL(name + '.wav', base).href;
    voice.clip = name;
  }

  function attempt(voice, request, name, prime = false) {
    const token = ++voice.request;
    const element = voice.element;
    voice.priming = prime;
    try {
      source(voice, name);
      element.loop = request.loop;
      element.volume = request.volume;
      element.playbackRate = request.rate;
      if (!prime && element.readyState > 0) element.currentTime = 0;
      // Must be invoked in the event task, before any promise, timer, or load handler.
      const promise = element.play();
      Promise.resolve(promise).then(() => {
        if (voice.request !== token) return;
        voice.pending = null;
        voice.priming = false;
        voice.primed = true;
        if (!prime) starts++;
        lastError = '';
      }, err => failed(err));
    } catch (err) { failed(err); }
    function failed(err) {
      if (voice.request !== token) return;
      voice.priming = false;
      if (err?.name === 'AbortError') return;
      lastError = err?.name || 'playback unavailable';
      if (err?.name === 'NotAllowedError') {
        voice.primed = false;
        if (!prime) voice.pending = {...request, name};
      }
    }
  }

  function unlock() {
    if (muted || document.hidden) return;
    sessionType('playback');
    const now = clock();
    for (const voice of voices) {
      if (voice.pending) {
        const waiting = voice.pending;
        voice.pending = null;
        if (now - waiting.at <= 2200) {
          attempt(voice, waiting, waiting.name);
          continue;
        }
      }
      if (!voice.primed && !voice.priming && (voice.clip === '' || voice.element.paused)) {
        // An unmuted 50ms silent PCM clip authorizes every reusable element.
        attempt(voice, {loop: false, rate: 1, volume: 1, at: now}, 'ready', true);
      }
    }
  }

  function play(kind, strength = 1) {
    if (muted || document.hidden || !sounds.has(kind)) return;
    const at = clock();
    if (kind === lastKind && at - lastAt < 58) return;
    lastKind = kind;
    lastAt = at;
    sessionType('playback');
    const voice = effects.find(v => v.priming || v.clip === '' || (v.element.paused && !v.pending) || v.element.ended) ||
      effects.reduce((old, next) => next.started < old.started ? next : old);
    // Alternate takes. Slightly pitch-shift them by pressure without changing their character.
    const next = clips.has(kind) ? 3 - clips.get(kind) : Math.random() < 0.5 ? 1 : 2;
    clips.set(kind, next);
    const force = clamp(strength);
    const rate = .94 + .085 * force + Math.random() * .035;
    voice.started = ++order;
    voice.pending = null;
    voice.element.preservesPitch = false;
    attempt(voice, {loop: false, rate, volume: .72 + force * .28, at}, kind + '-' + next);
  }

  function stop() {
    clearTimeout(bedTimer);
    activeBed = '';
    movement.pending = null;
    movement.request++;
    movement.priming = false;
    movement.element.pause();
  }

  function motion(kind, strength = 1) {
    if (muted || document.hidden || !beds.has(kind)) return;
    sessionType('playback');
    const force = clamp(strength);
    const rate = .78 + force * .42;
    const volume = .48 + force * .40;
    if (kind !== activeBed || (movement.element.paused && !movement.pending)) {
      activeBed = kind;
      movement.element.preservesPitch = false;
      attempt(movement, {loop: true, rate, volume, at: clock()}, kind + '-bed');
    } else {
      movement.element.playbackRate = rate;
      movement.element.volume = volume;
    }
    clearTimeout(bedTimer);
    bedTimer = setTimeout(stop, 420);
  }

  function quiet() {
    stop();
    for (const voice of effects) {
      voice.request++;
      voice.pending = null;
      voice.priming = false;
      voice.element.pause();
    }
    sessionType('auto');
  }

  function setMuted(value) {
    muted = Boolean(value);
    voices.forEach(voice => { voice.element.muted = muted; });
    if (muted) quiet();
    return muted;
  }

  function gesture(event) {
    if (event.isTrusted) unlock();
  }
  for (const event of ['touchend', 'pointerup', 'click', 'keydown']) {
    document.addEventListener(event, gesture, {capture: true, passive: true});
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) quiet();
  });
  window.addEventListener('pagehide', quiet);

  function status() {
    return {
      implementation: 'html-media',
      muted, starts, lastError, activeBed,
      session: navigator.audioSession?.type || 'browser-default',
      channels: voices.map(v => ({
        clip: v.clip, primed: v.primed, paused: v.element.paused, ended: v.element.ended,
        time: +v.element.currentTime.toFixed(3), waitingForGesture: Boolean(v.pending),
      })),
    };
  }
  window.GelAudio = Object.freeze({unlock, play, motion, stop, setMuted, status});
  // Temporary, opt-in hardware bench readout. No network calls or persistence.
  if (location.hash === '#soundcheck') {
    const hud = document.createElement('pre');
    hud.style.cssText = 'position:fixed;z-index:10000;right:4px;top:4px;margin:0;padding:6px;background:#181125ed;color:#fff;font:15px/1.2 monospace;pointer-events:none;text-align:left;border-radius:4px';
    (document.body || document.documentElement).append(hud);
    let held = false, first = true, currentHold = 0, bestHeld = 0, firstHeld = 0;
    let baseline = 0, latest = '';
    document.addEventListener('pointerdown', () => {
      held = true; currentHold = 0; baseline = order;
    }, true);
    const end = () => {
      if (held && currentHold > 0) { if (first) firstHeld = currentHold; first = false; }
      held = false;
    };
    document.addEventListener('pointerup', end, true);
    document.addEventListener('pointercancel', end, true);
    setInterval(() => {
      for (const v of voices) {
        if (!v.clip || v.clip === 'ready') continue;
        const t = v.element.currentTime;
        if (held && (v.started > baseline || v === movement && activeBed)) {
          currentHold = Math.max(currentHold, t);
          bestHeld = Math.max(bestHeld, currentHold);
        }
        if (t > .002 && (!v.element.ended || latest === '')) latest = v.clip + ' ' + t.toFixed(2);
      }
      hud.textContent = ['Sound bench | ' + (muted ? 'MUTED' : 'ON') + ' | ' + (navigator.audioSession?.type || 'system'),
        'Starts ' + starts + ' | last ' + latest,
        'In first hold ' + firstHeld.toFixed(2) + 's | any ' + bestHeld.toFixed(2) + 's',
        ...voices.filter(v => v.clip && v.clip !== 'ready').map(v =>
          v.clip + ' ' + v.element.currentTime.toFixed(2) + ' ' + (v.element.ended ? 'ended' : v.element.paused ? 'paused' : 'playing')),
        lastError].filter(Boolean).join('\n');
    }, 50);
  }
})();
