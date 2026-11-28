import { useEffect, useState } from 'react';
import { globalPlayer } from '../services/globalPlayerService';

interface MiniVisualizerProps {
  isPlaying: boolean;
  enabled: boolean;
}

const BAR_COUNT = 16;

export default function MiniVisualizer({ isPlaying, enabled }: MiniVisualizerProps) {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.16)
  );

  useEffect(() => {
    if (!enabled) return;
    if (!isPlaying) {
      setLevels(Array.from({ length: BAR_COUNT }, () => 0.16));
      return;
    }

    let rafId = 0;
    let lastSample = 0;

    const tick = (now: number) => {
      if (now - lastSample >= 48) {
        lastSample = now;
        setLevels(globalPlayer.getVisualizerBars(BAR_COUNT));
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying, enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-label="Audio spectrum visualizer"
      className="w-full h-9 flex items-end justify-center gap-1.5 px-4 mb-3"
    >
      {levels.map((level, i) => {
        const isPinkSide = i >= BAR_COUNT / 2;
        return (
          <span
            key={i}
            className="w-1.5 h-full rounded-full origin-bottom transition-transform duration-75"
            style={{
              transform: `scaleY(${level})`,
              background: isPinkSide ? 'var(--accent2)' : 'var(--accent)',
              opacity: isPlaying ? 0.45 + level * 0.55 : 0.25,
              boxShadow:
                isPlaying && level > 0.55
                  ? `0 0 8px ${isPinkSide ? 'var(--accent2-glow)' : 'var(--accent-glow)'}`
                  : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
