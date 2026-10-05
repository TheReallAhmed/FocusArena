"use client";

/** Loud, punchy chimes for session completion — shared across the app. */

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  getCtx();
}

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type ChimeKind = "focus" | "break" | "bank";

const MELODIES: Record<ChimeKind, number[]> = {
  focus: [523.25, 659.25, 783.99, 1046.5],
  break: [783.99, 659.25, 523.25],
  bank: [440, 554.37, 659.25, 880],
};

/**
 * Loud chime: master gain through a compressor, layered oscillators
 * (sine + detuned triangle) and a low thump intro — clearly audible
 * even from another room.
 */
export function playChime(kind: ChimeKind): void {
  const ac = getCtx();
  if (!ac) return;

  const master = ac.createGain();
  master.gain.value = 0.55;

  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;

  master.connect(comp).connect(ac.destination);

  const now = ac.currentTime;

  // low thump to grab attention
  const thump = ac.createOscillator();
  const thumpGain = ac.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(120, now);
  thump.frequency.exponentialRampToValueAtTime(45, now + 0.18);
  thumpGain.gain.setValueAtTime(0.5, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  thump.connect(thumpGain).connect(master);
  thump.start(now);
  thump.stop(now + 0.26);

  MELODIES[kind].forEach((freq, i) => {
    const t = now + 0.12 + i * 0.16;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.6, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.75);

    // detuned shimmer layer
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 1.005;
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.22, t + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc2.connect(gain2).connect(master);
    osc2.start(t);
    osc2.stop(t + 0.65);
  });

  // final bell an octave up
  const last = now + 0.12 + MELODIES[kind].length * 0.16;
  const bell = ac.createOscillator();
  const bellGain = ac.createGain();
  bell.type = "sine";
  bell.frequency.value = MELODIES[kind][MELODIES[kind].length - 1] * 2;
  bellGain.gain.setValueAtTime(0, last);
  bellGain.gain.linearRampToValueAtTime(0.4, last + 0.02);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, last + 0.9);
  bell.connect(bellGain).connect(master);
  bell.start(last);
  bell.stop(last + 0.95);
}
