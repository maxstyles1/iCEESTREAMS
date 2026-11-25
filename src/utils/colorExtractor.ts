export interface AmbientPalette {
  primary: string;
  secondary: string;
  tertiary: string;
}

const DEFAULT_PALETTE: AmbientPalette = {
  primary: 'rgb(124, 58, 237)',
  secondary: 'rgb(14, 165, 233)',
  tertiary: 'rgb(79, 70, 229)',
};

const paletteCache = new Map<string, AmbientPalette>();

function clampChannel(n: number): number {
  return Math.max(24, Math.min(220, Math.round(n)));
}

function softenColor(r: number, g: number, b: number): string {
  // Blend 20% toward a deep neutral slate so ambient lights remain calm and relaxing
  const sr = clampChannel(r * 0.8 + 20 * 0.2);
  const sg = clampChannel(g * 0.8 + 24 * 0.2);
  const sb = clampChannel(b * 0.8 + 38 * 0.2);
  return `rgb(${sr}, ${sg}, ${sb})`;
}

export function deriveFallbackPalette(seed: string, fallbackGradient?: string): AmbientPalette {
  const grad = (fallbackGradient || '').toLowerCase();
  if (grad.includes('amber') || grad.includes('orange')) {
    return {
      primary: 'rgb(180, 96, 42)',
      secondary: 'rgb(120, 62, 138)',
      tertiary: 'rgb(52, 78, 128)',
    };
  }
  if (grad.includes('cyan') || grad.includes('blue')) {
    return {
      primary: 'rgb(34, 136, 178)',
      secondary: 'rgb(67, 88, 184)',
      tertiary: 'rgb(28, 84, 130)',
    };
  }
  if (grad.includes('indigo') || grad.includes('violet')) {
    return {
      primary: 'rgb(98, 72, 188)',
      secondary: 'rgb(54, 118, 168)',
      tertiary: 'rgb(138, 66, 146)',
    };
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const hue1 = hash % 360;
  const hue2 = (hue1 + 48) % 360;
  const hue3 = (hue1 + 115) % 360;

  const hslToRgb = (h: number, s: number, l: number): string => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return softenColor((r + m) * 255, (g + m) * 255, (b + m) * 255);
  };

  return {
    primary: hslToRgb(hue1, 0.56, 0.44),
    secondary: hslToRgb(hue2, 0.48, 0.38),
    tertiary: hslToRgb(hue3, 0.42, 0.34),
  };
}

export function extractAmbientPalette(
  coverUrl: string,
  fallbackKey: string,
  fallbackGradient?: string
): Promise<AmbientPalette> {
  const cacheKey = `${coverUrl}::${fallbackKey}`;
  const cached = paletteCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  if (!coverUrl || typeof document === 'undefined') {
    const fallback = deriveFallbackPalette(fallbackKey, fallbackGradient);
    paletteCache.set(cacheKey, fallback);
    return Promise.resolve(fallback);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    const finishFallback = () => {
      const fb = deriveFallbackPalette(fallbackKey, fallbackGradient);
      paletteCache.set(cacheKey, fb);
      resolve(fb);
    };

    const timer = window.setTimeout(finishFallback, 2500);

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          finishFallback();
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<string, { r: number; g: number; b: number; weight: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 160) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (luma < 20 || luma > 238) continue;

          const saturation = max === 0 ? 0 : (max - min) / max;
          const weight = 1 + saturation * 2.5;

          const qR = Math.round(r / 36) * 36;
          const qG = Math.round(g / 36) * 36;
          const qB = Math.round(b / 36) * 36;
          const key = `${qR},${qG},${qB}`;

          const prev = buckets.get(key) || { r: 0, g: 0, b: 0, weight: 0 };
          prev.r += r * weight;
          prev.g += g * weight;
          prev.b += b * weight;
          prev.weight += weight;
          buckets.set(key, prev);
        }

        const sorted = Array.from(buckets.values())
          .sort((a, b) => b.weight - a.weight)
          .map((bucket) => ({
            r: bucket.r / bucket.weight,
            g: bucket.g / bucket.weight,
            b: bucket.b / bucket.weight,
          }));

        if (sorted.length === 0) {
          finishFallback();
          return;
        }

        const primary = sorted[0];
        const secondary =
          sorted.find(
            (c) =>
              Math.abs(c.r - primary.r) + Math.abs(c.g - primary.g) + Math.abs(c.b - primary.b) > 75
          ) ||
          sorted[1] ||
          primary;
        const tertiary =
          sorted.find(
            (c) =>
              Math.abs(c.r - primary.r) + Math.abs(c.g - primary.g) + Math.abs(c.b - primary.b) >
                55 &&
              Math.abs(c.r - secondary.r) +
                Math.abs(c.g - secondary.g) +
                Math.abs(c.b - secondary.b) >
                55
          ) ||
          sorted[2] ||
          secondary;

        const palette: AmbientPalette = {
          primary: softenColor(primary.r, primary.g, primary.b),
          secondary: softenColor(secondary.r, secondary.g, secondary.b),
          tertiary: softenColor(tertiary.r, tertiary.g, tertiary.b),
        };
        paletteCache.set(cacheKey, palette);
        resolve(palette);
      } catch {
        finishFallback();
      }
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      finishFallback();
    };

    img.src = coverUrl;
  });
}

export { DEFAULT_PALETTE };
