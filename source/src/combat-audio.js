// Short, layered combat sounds. All sources are one-shots routed through the ambience master/mute.
function createCombatAudio() {
  let context, noiseBuffer;
  const voices = new Set();
  const prepare = (ac) => {
    if (context === ac) return;
    context = ac;
    noiseBuffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * .7), ac.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    let seed = 0x4b1d2739;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = seed / 2147483648 - 1;
    }
  };
  const stopAll = () => { for (const voice of voices) voice.stop(); };
  function play(type, event = {}) {
    if (!AC || !OUT || muted || AC.state !== 'running') return false;
    if (!['fire', 'hit', 'rock', 'reload', 'kill', 'hurt'].includes(type)) return false;
    prepare(AC);
    if (voices.size >= 12) voices.values().next().value.stop();
    const ac = AC, start = ac.currentTime + .003, nodes = [], sources = [];
    let active = 0, disposed = false;
    const track = (node) => { nodes.push(node); return node; };
    const master = track(ac.createGain()), panner = track(ac.createStereoPanner()), water = track(ac.createBiquadFilter());
    let pan = type === 'fire' || type === 'reload' ? .16 : 0, attenuation = 1;
    // A hit's position is supplied by the simulation. Other effects remain close to the diver.
    if ((type === 'hit' || type === 'rock') && Number.isFinite(event.x) && typeof F !== 'undefined') {
      const dx = event.x - F[0], dy = event.y - F[1], dz = event.z - F[2], distance = Math.hypot(dx, dy, dz);
      if (Number.isFinite(distance)) {
        pan = Math.max(-.8, Math.min(.8, (dx * F[8] + dz * F[9]) / Math.max(1, distance)));
        attenuation = Math.max(.3, 1 / (1 + distance / 24));
      }
    }
    if (Number.isFinite(event.pan)) pan = Math.max(-1, Math.min(1, event.pan));
    master.gain.value = .68 * attenuation;
    panner.pan.value = pan;
    water.type = 'lowpass'; water.frequency.value = type === 'rock' ? 3000 : 2600; water.Q.value = .6;
    master.connect(water); water.connect(panner); panner.connect(OUT);
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      for (const node of nodes) node.disconnect();
      voices.delete(voice);
    };
    const voice = { stop() { for (const source of sources) { try { source.stop(); } catch {} } dispose(); } };
    voices.add(voice);
    const schedule = (source, when, duration) => {
      sources.push(source); active++;
      source.onended = () => { source.disconnect(); if (--active === 0) dispose(); };
      source.start(when); source.stop(when + duration + .02);
    };
    const envelope = (when, duration, volume, attack = .002) => {
      const gain = track(ac.createGain());
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(volume, when + Math.min(attack, duration * .25));
      gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
      gain.connect(master); return gain;
    };
    const tone = (when, duration, f0, f1, volume, waveform = 'sine') => {
      const oscillator = track(ac.createOscillator());
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(f0, when);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, f1), when + duration);
      oscillator.connect(envelope(when, duration, volume));
      schedule(oscillator, when, duration);
    };
    const noise = (when, duration, volume, filterType, frequency, q = .65) => {
      const source = track(ac.createBufferSource()), filter = track(ac.createBiquadFilter());
      source.buffer = noiseBuffer;
      filter.type = filterType; filter.frequency.value = frequency; filter.Q.value = q;
      source.connect(filter); filter.connect(envelope(when, duration, volume, .001));
      schedule(source, when, duration);
    };
    const bubbles = (when, volume = .025) => {
      tone(when, .07, 370, 940, volume);
      tone(when + .045, .09, 530, 1250, volume * .7);
    };
    if (type === 'fire') {
      // Finger/trigger click, rubber snap, pressure thump and a damped rush of displaced water.
      tone(start, .025, 1700, 920, .038, 'triangle');
      noise(start, .055, .1, 'bandpass', 1750, .8);
      tone(start + .009, .14, 285, 88, .14, 'triangle');
      tone(start + .012, .2, 116, 43, .2);
      noise(start + .014, .24, .18, 'lowpass', 950);
      noise(start + .055, .3, .06, 'bandpass', 620, .5);
      bubbles(start + .06, .03);
    } else if (type === 'hit') {
      noise(start, .105, .19, 'lowpass', 550);
      tone(start, .13, 145, 58, .15, 'triangle');
      tone(start + .003, .045, 440, 180, .035);
      bubbles(start + .025, .025);
    } else if (type === 'rock') {
      noise(start, .035, .13, 'highpass', 1400);
      tone(start, .19, 2160, 1710, .055);
      tone(start + .002, .13, 3260, 2900, .025);
      tone(start, .08, 190, 70, .065);
      bubbles(start + .035, .017);
    } else if (type === 'reload') {
      // Small ratchet teeth followed by the sear latch; distinct from the release sound.
      for (let i = 0; i < 3; i++) {
        noise(start + i * .035, .022, .055, 'bandpass', 1200 + i * 350, .8);
        tone(start + i * .035, .026, 700 + i * 170, 420, .022, 'triangle');
      }
      tone(start + .13, .075, 360, 190, .075, 'triangle');
      noise(start + .13, .045, .07, 'lowpass', 1600);
    } else if (type === 'kill') {
      tone(start, .17, 660, 660, .04);
      tone(start + .075, .22, 990, 990, .035);
    } else if (type === 'hurt') {
      tone(start, .3, 92, 39, .16, 'triangle');
      noise(start, .16, .12, 'lowpass', 320);
    }
    return true;
  }
  return { play, update() {}, reset: stopAll };
}
