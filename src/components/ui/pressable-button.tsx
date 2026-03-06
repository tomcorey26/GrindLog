'use client';

import { Button } from '@/components/ui/button';

type PressableButtonProps = React.ComponentProps<typeof Button>;

let audioCtx: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let loadingPromise: Promise<void> | null = null;

function ensureLoaded() {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      audioCtx = new AudioContext();
      const res = await fetch('/button-click.mp3');
      const buf = await res.arrayBuffer();
      clickBuffer = await audioCtx.decodeAudioData(buf);
    } catch {
      // Ignore load errors
    }
  })();
  return loadingPromise;
}

function playClick() {
  if (!audioCtx || !clickBuffer) {
    ensureLoaded();
    return;
  }
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const source = audioCtx.createBufferSource();
    source.buffer = clickBuffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch {
    // Ignore audio errors
  }
}

export function PressableButton({ className, onClick, onPointerEnter, ...props }: PressableButtonProps) {
  return (
    <Button
      className={`shadow-[0_5px_0_0_color-mix(in_srgb,var(--primary)_70%,black)] active:shadow-none active:translate-y-1.25 transition-all ${className ?? ''}`}
      onPointerEnter={(e) => {
        ensureLoaded();
        onPointerEnter?.(e);
      }}
      onClick={(e) => {
        playClick();
        onClick?.(e);
      }}
      {...props}
    />
  );
}
