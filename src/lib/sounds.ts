// Programmatic Web Audio chimes — no asset dependencies.
// Each tone uses a sine wave with a fast attack + exponential decay envelope
// so it sounds like a soft bell rather than a beep.

type AudioContextCtor = typeof AudioContext;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

function playChime(frequencies: number[], noteDurationMs = 180, peakGain = 0.25) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const noteDuration = noteDurationMs / 1000;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + i * noteDuration;
      const endTime = startTime + noteDuration;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(endTime);
    });

    setTimeout(
      () => {
        ctx.close().catch(() => {});
      },
      noteDurationMs * frequencies.length + 100,
    );
  } catch {}
}

// C5 → E5 — positive ascending two-tone bell.
export function playSetCompleteChime() {
  playChime([523.25, 659.25], 180);
}

// G4 — single soft tone signaling "ready for next set".
export function playBreakCompleteChime() {
  playChime([392], 220, 0.2);
}
