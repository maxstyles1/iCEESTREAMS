import { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface CoverArtProps {
  src: string;
  alt: string;
  fallbackGradient?: string;
  className?: string;
  iconSize?: number;
}

export default function CoverArt({
  src,
  alt,
  fallbackGradient = 'from-slate-800 to-slate-950',
  className = 'w-12 h-12 rounded-xl',
  iconSize = 20,
}: CoverArtProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`bg-gradient-to-br ${fallbackGradient} flex items-center justify-center text-white/60 shrink-0 ${className}`}
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
      className={`object-cover shrink-0 bg-slate-900 ${className}`}
    />
  );
}
