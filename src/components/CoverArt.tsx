import { useEffect, useState } from 'react';
import { Disc3 } from 'lucide-react';
import {
  deriveFallbackPalette,
  extractAmbientPalette,
  toGlowRgba,
} from '../utils/colorExtractor';

interface CoverArtProps {
  src: string;
  alt: string;
  fallbackGradient?: string;
  className?: string;
  iconSize?: number;
  glow?: boolean;
  glowSeed?: string;
  glowStrength?: 'soft' | 'strong';
}

export default function CoverArt({
  src,
  alt,
  fallbackGradient = 'from-slate-800 to-slate-950',
  className = 'w-14 h-14 rounded-2xl',
  iconSize = 20,
  glow = false,
  glowSeed,
  glowStrength = 'soft',
}: CoverArtProps) {
  const [hasError, setHasError] = useState(false);
  const seed = glowSeed || alt || src || 'icee';
  const [glowColor, setGlowColor] = useState<string>(() =>
    deriveFallbackPalette(seed, fallbackGradient).primary
  );

  useEffect(() => {
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (!glow) return;
    let cancelled = false;
    extractAmbientPalette(src, seed, fallbackGradient).then((palette) => {
      if (!cancelled) setGlowColor(palette.primary);
    });
    return () => {
      cancelled = true;
    };
  }, [glow, src, seed, fallbackGradient]);

  const glowStyle = glow
    ? {
        boxShadow:
          glowStrength === 'strong'
            ? `0 18px 46px -8px ${toGlowRgba(glowColor, 0.56)}, 0 0 24px -4px ${toGlowRgba(glowColor, 0.36)}`
            : `0 8px 22px -6px ${toGlowRgba(glowColor, 0.44)}`,
      }
    : undefined;

  if (hasError || !src) {
    return (
      <div
        style={glowStyle}
        className={`bg-gradient-to-br ${fallbackGradient} flex items-center justify-center text-[#F5F5FA]/70 shrink-0 ${className}`}
        aria-label={alt}
      >
        <Disc3 size={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      style={glowStyle}
      className={`object-cover shrink-0 bg-[#121218] ${className}`}
    />
  );
}
