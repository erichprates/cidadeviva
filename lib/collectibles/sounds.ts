// Sons por raridade — Web Audio API.
// Cada função usa osciladores simples; nada de assets pesados.

type WindowWithAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as WindowWithAudio;
  const Ctx = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

function tone(
  audio: AudioContext,
  freq: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audio.destination);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playComum() {
  const a = ctx(); if (!a) return;
  tone(a, 329.63, a.currentTime, 0.3, 0.28, 'sine');
}

function playIncomum() {
  const a = ctx(); if (!a) return;
  const t = a.currentTime;
  tone(a, 329.63, t, 0.28, 0.24, 'sine');
  tone(a, 440.0, t + 0.18, 0.34, 0.24, 'sine');
}

function playRaro() {
  const a = ctx(); if (!a) return;
  const t = a.currentTime;
  tone(a, 329.63, t, 0.25, 0.22, 'sine');
  tone(a, 440.0, t + 0.16, 0.25, 0.22, 'sine');
  tone(a, 523.25, t + 0.32, 0.36, 0.24, 'triangle');
}

function playEpico() {
  const a = ctx(); if (!a) return;
  const t = a.currentTime;
  // Acorde com "reverb" simulado (toques consecutivos do mesmo acorde)
  const chord = [261.63, 329.63, 392.0, 523.25];
  chord.forEach((f, i) => tone(a, f, t, 0.8, 0.18, i === 3 ? 'triangle' : 'sine'));
  // Eco leve
  chord.forEach((f) => tone(a, f, t + 0.22, 0.5, 0.08, 'sine'));
  tone(a, 659.25, t + 0.5, 0.4, 0.18, 'triangle');
}

function playLendario() {
  const a = ctx(); if (!a) return;
  const t = a.currentTime;
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
  // Fanfarra ascendente rápida
  notes.forEach((f, i) => tone(a, f, t + i * 0.09, 0.3, 0.22, 'triangle'));
  // Sustentado no topo
  tone(a, 659.25, t + notes.length * 0.09, 0.8, 0.2, 'triangle');
  // Harmônicos abaixo pra encorpar
  tone(a, 329.63, t + 0.4, 0.9, 0.1, 'sine');
  tone(a, 523.25, t + 0.6, 0.9, 0.12, 'sine');
}

export function playCollectibleSound(rarity: string) {
  try {
    if (rarity === 'lendario') return playLendario();
    if (rarity === 'epico') return playEpico();
    if (rarity === 'raro') return playRaro();
    if (rarity === 'incomum') return playIncomum();
    return playComum();
  } catch {
    // best-effort — navegadores podem bloquear sem interação do usuário
  }
}
