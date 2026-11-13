/* Each sound is made from filtered grain, air and softly damped resonances. */
(() => {
  "use strict";

  const sampleRate = 24000;
  const durations = {
    squish: 0.72, poke: 0.22, stretch: 0.85, slice: 0.59, mold: 0.68,
    color: 0.67, mix: 0.68, face: 0.23, mend: 0.53, finish: 0.56,
  };
  const aliases = {
    squeeze: "squish", press: "squish", cut: "slice", pull: "stretch",
    shape: "mold", pour: "color", sprinkle: "mix", shake: "mix", sprinkles: "mix",
    reset: "mend", restore: "mend", play: "finish",
  };

  // Synthesize three closely related takes of each gesture on demand.
  function renderTake(context, action, take) {
    const buffer = context.createBuffer(1, Math.ceil(durations[action] * sampleRate), sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = (7919 * (take + 13) + action.charCodeAt(0) * 1741) >>> 0;
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    const pitch = 0.96 + random() * 0.09;
    const timing = 0.96 + random() * 0.07;
    const filterCoefficient = hz => 1 - Math.exp(-2 * Math.PI * hz / sampleRate);

    // Difference of two low-pass filters leaves the selected band of texture.
    function friction(start, length, low, high, strength, attack, flutter = 0) {
      const offset = Math.round(start * timing * sampleRate);
      const count = Math.min(samples.length - offset, Math.ceil(length * sampleRate));
      const upper = filterCoefficient(high * pitch);
      const lower = filterCoefficient(low * pitch);
      const ripple = 15 + random() * 16;
      const phase = random() * 2 * Math.PI;
      let lowPass = 0, bass = 0;
      for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        const position = t / length;
        lowPass += upper * (2 * random() - 1 - lowPass);
        bass += lower * (lowPass - bass);
        const ramp = Math.min(1, t / attack);
        const envelope = ramp * ramp * (1 - position) ** 1.6;
        const grain = 1 - flutter * (0.5 + 0.5 * Math.sin(t * ripple * 2 * Math.PI + phase));
        samples[offset + i] += (lowPass - bass) * strength * envelope * grain;
      }
    }

    // A contact plop glides in pitch like a small air pocket releasing.
    function plop(start, length, from, to, strength) {
      const offset = Math.round(start * timing * sampleRate);
      const count = Math.min(samples.length - offset, Math.ceil(length * sampleRate));
      const attack = Math.min(0.008, length / 7);
      let phase = 0;
      for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        const p = t / length;
        const freq = to + (from - to) * (1 - p) ** 3;
        phase += 2 * Math.PI * freq * pitch / sampleRate;
        const envelope = Math.min(1, t / attack) * (1 - p) ** 3;
        samples[offset + i] += (Math.sin(phase) + 0.18 * Math.sin(phase * 1.83)) * strength * envelope;
      }
    }

    function grains(start, span, number, size, colour, volume) {
      for (let i = 0; i < number; i++) {
        const at = start + span * (i + random() * 0.8) / number;
        const frequency = colour * (0.7 + random() * 0.55);
        const length = size * (0.6 + random() * 0.75);
        friction(at, length, frequency * 0.23, frequency, volume * (0.5 + random() * 0.5), 0.002);
      }
    }

    switch (action) {
      case "squish":
        plop(0, 0.22, 175, 72, 0.22);
        friction(0.012, 0.42, 110, 1420, 0.48, 0.056, 0.45);
        grains(0.06, 0.23, 8, 0.035, 1800, 0.30);
        friction(0.33, 0.34, 220, 1100, 0.36, 0.042);
        plop(0.40, 0.19, 113, 166, 0.10);
        break;
      case "poke":
        plop(0, 0.14, 390, 112, 0.32);
        friction(0.001, 0.063, 300, 1600, 0.32, 0.004);
        plop(0.073, 0.095, 143, 188, 0.072);
        break;
      case "stretch":
        friction(0, 0.66, 180, 1500, 0.42, 0.08, 0.67);
        grains(0.09, 0.42, 10, 0.047, 1600, 0.30);
        friction(0.37, 0.29, 350, 1950, 0.33, 0.055, 0.4);
        plop(0.56, 0.16, 285, 95, 0.23);
        friction(0.57, 0.19, 140, 1650, 0.30, 0.01);
        break;
      case "slice":
        friction(0, 0.44, 480, 3300, 0.52, 0.034, 0.38);
        friction(0.07, 0.30, 220, 1430, 0.39, 0.045, 0.76);
        grains(0.035, 0.29, 17, 0.020, 3100, 0.33);
        plop(0.35, 0.14, 158, 82, 0.22);
        friction(0.37, 0.14, 160, 1200, 0.28, 0.016);
        break;
      case "mold":
        for (const [at, volume] of [[0, 0.25], [0.23, 0.21]]) {
          plop(at, 0.21, 203, 79, volume);
          friction(at + 0.01, 0.24, 145, 1320, 0.45, 0.022);
          grains(at + 0.04, 0.10, 4, 0.026, 1350, 0.26);
        }
        friction(0.42, 0.22, 180, 1450, 0.26, 0.028);
        break;
      case "color":
        friction(0, 0.48, 180, 1450, 0.35, 0.075, 0.50);
        for (let i = 0; i < 7; i++) {
          const freq = 180 + random() * 145;
          plop(0.035 + i * 0.064, 0.079, freq, freq * 1.5, 0.15 + random() * 0.07);
        }
        plop(0.51, 0.10, 223, 356, 0.15);
        break;
      case "mix":
        for (const at of [0, 0.22]) {
          friction(at, 0.25, 600, 2920, 0.36, 0.042);
          grains(at + 0.005, 0.18, 12, 0.018, 3400, 0.42);
        }
        grains(0.49, 0.095, 4, 0.019, 2700, 0.31);
        break;
      case "face":
        friction(0, 0.10, 220, 1600, 0.27, 0.008);
        plop(0.004, 0.13, 304, 159, 0.23);
        plop(0.085, 0.080, 357, 272, 0.08);
        break;
      case "mend":
        friction(0, 0.36, 125, 1400, 0.43, 0.050);
        plop(0.19, 0.19, 190, 104, 0.21);
        plop(0.33, 0.12, 201, 315, 0.14);
        break;
      case "finish":
        plop(0.006, 0.14, 180, 245, 0.20);
        plop(0.14, 0.14, 232, 315, 0.20);
        plop(0.28, 0.20, 286, 386, 0.19);
        grains(0.25, 0.16, 7, 0.029, 2150, 0.26);
        break;
    }
    return buffer;
  }

  let context, volume, enabled = true, unlocking, silentPrimerSent = false;
  const cache = new Map();
  const voices = new Set();
  const previousTake = new Map();
  let previousAction = "", previousTime = 0, generation = 0;

  function unlock() {
    if (!enabled) return Promise.resolve(false);
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return Promise.resolve(false);
        context = new Audio();
        volume = context.createGain();
        volume.gain.value = 0.62;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -11;
        limiter.knee.value = 6;
        limiter.ratio.value = 9;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.11;
        limiter.connect(volume);
        volume.connect(context.destination);
        // Keep the shared input with the context so voices share headroom.
        masterInput = limiter;
      }
      if (!silentPrimerSent) {
        const source = context.createBufferSource();
        source.buffer = context.createBuffer(1, 1, context.sampleRate);
        source.connect(masterInput);
        source.onended = () => source.disconnect();
        source.start();
        silentPrimerSent = true;
      }
      if (context.state === "running") return Promise.resolve(true);
      if (!unlocking) {
        unlocking = context.resume().then(() => context.state === "running", () => false)
          .finally(() => { unlocking = undefined; });
      }
      return unlocking;
    } catch {
      return Promise.resolve(false);
    }
  }

  let masterInput;
  function fadeVoice(voice) {
    if (voice.fading) return;
    voice.fading = true;
    const now = context.currentTime;
    voice.gain.gain.setTargetAtTime(0, now, 0.005);
    try { voice.source.stop(now + 0.035); } catch { /* Already ended. */ }
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    generation++;
    if (volume) {
      volume.gain.setTargetAtTime(enabled ? 0.62 : 0, context.currentTime, 0.008);
      if (!enabled) voices.forEach(fadeVoice);
    }
    return enabled;
  }
  async function play(kind, options = {}) {
    const action = Object.hasOwn(durations, kind) ? kind : aliases[kind];
    if (!enabled || !Object.hasOwn(durations, action)) return;
    const at = performance.now();
    if (action === previousAction && at - previousTime < 53) return;
    previousAction = action;
    previousTime = at;
    const requested = generation;
    if (!await unlock() || !enabled || generation !== requested || performance.now() - at > 450) return;
    let take = Number.isFinite(options?.variation) ? Math.abs(Math.trunc(options.variation)) % 3 : undefined;
    if (take === undefined) {
      const last = previousTake.get(action);
      take = last === undefined ? Math.floor(Math.random() * 3) : (last + 1 + Math.floor(Math.random() * 2)) % 3;
    }
    previousTake.set(action, take);
    const key = action + take;
    if (!cache.has(key)) cache.set(key, renderTake(context, action, take));
    const active = Array.from(voices).filter(voice => !voice.fading);
    if (active.length >= 3) fadeVoice(active[0]);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = cache.get(key);
    source.connect(gain);
    gain.connect(masterInput);
    const voice = {source, gain, fading: false};
    voices.add(voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      voices.delete(voice);
    };
    source.start();
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden || !context) return;
    generation++;
    voices.forEach(fadeVoice);
  });
  window.FactorySound = Object.freeze({play, unlock, setEnabled});
})();
