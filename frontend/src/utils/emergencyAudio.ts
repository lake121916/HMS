/**
 * Emergency Audio Synthesizer for Alem Ketema Enat Hospital Management System
 * Uses Web Audio API oscillator for zero-dependency, ultra-reliable emergency sirens.
 */

let audioCtx: AudioContext | null = null;
let isMuted: boolean = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playEmergencyAlertSound(): boolean {
  if (isMuted) return false;
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;
    // Two-tone emergency siren: 880Hz (A5) and 659Hz (E5)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(659, now + 0.15);
    osc.frequency.setValueAtTime(880, now + 0.3);
    osc.frequency.setValueAtTime(659, now + 0.45);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
    return true;
  } catch (err) {
    console.warn('Emergency audio could not play (browser policy or unsupported):', err);
    return false;
  }
}

export function setEmergencyMuted(muted: boolean): void {
  isMuted = muted;
}

export function isEmergencyMuted(): boolean {
  return isMuted;
}
