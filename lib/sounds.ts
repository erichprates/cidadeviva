type WindowWithAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as WindowWithAudio;
  const Ctx = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

export function playPlantSound() {
  const ctx = getContext();
  if (!ctx) return;

  const notes = [261.63, 329.63, 392.0]; // Dó, Mi, Sol

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = freq;

    const start = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);

    osc.start(start);
    osc.stop(start + 0.8);
  });
}

export function playDingSound() {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.value = 329.63; // Mi

  const start = ctx.currentTime;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.3, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

  osc.start(start);
  osc.stop(start + 0.4);
}

