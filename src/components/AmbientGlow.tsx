import { useEffect, useState } from 'react';
import {
  AmbientPalette,
  DEFAULT_PALETTE,
  deriveFallbackPalette,
  extractAmbientPalette,
} from '../utils/colorExtractor';
import { globalPlayer } from '../services/globalPlayerService';

interface AmbientGlowProps {
  coverUrl: string;
  trackKey: string;
  fallbackGradient?: string;
  variant?: 'player' | 'backdrop';
  isPlaying?: boolean;
}

export default function AmbientGlow({
  coverUrl,
  trackKey,
  fallbackGradient,
  variant = 'player',
  isPlaying = false,
}: AmbientGlowProps) {
  const [slots, setSlots] = useState<[AmbientPalette, AmbientPalette]>(() => {
    const initial =
      trackKey === 'empty'
        ? DEFAULT_PALETTE
        : deriveFallbackPalette(trackKey, fallbackGradient);
    return [initial, DEFAULT_PALETTE];
  });
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [audioBoost, setAudioBoost] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const promise =
      trackKey === 'empty' && !coverUrl
        ? Promise.resolve(DEFAULT_PALETTE)
        : extractAmbientPalette(coverUrl, trackKey, fallbackGradient);

    promise.then((nextPalette) => {
      if (cancelled) return;
      setActiveSlot((current) => {
        const nextSlot: 0 | 1 = current === 0 ? 1 : 0;
        setSlots((prev) => {
          const updated: [AmbientPalette, AmbientPalette] = [prev[0], prev[1]];
          updated[nextSlot] = nextPalette;
          return updated;
        });
        return nextSlot;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [coverUrl, trackKey, fallbackGradient]);

  useEffect(() => {
    if (!isPlaying) {
      setAudioBoost(0);
      return;
    }
    const timer = window.setInterval(() => {
      const energy = globalPlayer.getAudioEnergy();
      setAudioBoost(energy);
    }, 180);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const baseOpacity = (variant === 'player' ? 0.28 : 0.14) + audioBoost * 0.08;
  const secondaryOpacity = (variant === 'player' ? 0.22 : 0.1) + audioBoost * 0.06;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {([0, 1] as const).map((slotIdx) => {
        const palette = slots[slotIdx];
        const isActive = activeSlot === slotIdx;

        return (
          <div
            key={slotIdx}
            className="absolute inset-0 transition-opacity duration-[2600ms] ease-in-out"
            style={{ opacity: isActive ? 1 : 0 }}
          >
            <div
              className="ambient-orb-a absolute -top-24 -left-20 w-[68%] h-[68%] rounded-full blur-[110px]"
              style={{
                background: `radial-gradient(circle at center, ${palette.primary}, transparent 72%)`,
                opacity: baseOpacity,
              }}
            />
            <div
              className="ambient-orb-b absolute -bottom-24 -right-16 w-[72%] h-[72%] rounded-full blur-[120px]"
              style={{
                background: `radial-gradient(circle at center, ${palette.secondary}, transparent 72%)`,
                opacity: secondaryOpacity,
              }}
            />
            <div
              className="ambient-orb-c absolute top-1/4 left-1/4 w-[58%] h-[58%] rounded-full blur-[115px]"
              style={{
                background: `radial-gradient(circle at center, ${palette.tertiary}, transparent 74%)`,
                opacity: secondaryOpacity * 0.85,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
