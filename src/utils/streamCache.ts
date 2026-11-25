import { Track } from '../types';

const STREAM_CACHE_NAME = 'icee-streams-audio-v1';
const META_STORAGE_KEY = 'icee_cached_streams_meta_v1';
const MAX_CACHED_STREAMS = 15;

export interface CachedStreamEntry {
  trackId: string;
  title: string;
  artist: string;
  streamUrl: string;
  sizeBytes: number;
  cachedAt: number;
}

const activePrefetches = new Set<string>();

export function getCachedStreamEntries(): CachedStreamEntry[] {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedStreamEntries(entries: CachedStreamEntry[]) {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_CACHED_STREAMS)));
  } catch {
    // ignore storage quota errors
  }
}

export function isTrackStreamCached(trackId: string): boolean {
  return getCachedStreamEntries().some((e) => e.trackId === trackId);
}

export async function resolveCachedStreamBlobUrl(streamUrl: string): Promise<string | null> {
  if (typeof caches === 'undefined' || !streamUrl) return null;
  try {
    const cache = await caches.open(STREAM_CACHE_NAME);
    const match = await cache.match(streamUrl);
    if (!match) return null;
    const blob = await match.blob();
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function cacheStreamInBackground(
  track: Track,
  streamUrl: string,
  options: { lowDataMode: boolean; cacheEnabled: boolean }
): Promise<boolean> {
  if (options.lowDataMode || !options.cacheEnabled || typeof caches === 'undefined' || !streamUrl) {
    return false;
  }
  if (activePrefetches.has(streamUrl)) return false;

  activePrefetches.add(streamUrl);
  try {
    const cache = await caches.open(STREAM_CACHE_NAME);
    const existing = await cache.match(streamUrl);
    if (existing) return true;

    const response = await fetch(streamUrl, { mode: 'cors' });
    if (!response.ok) return false;

    const clone = response.clone();
    const blob = await response.blob();
    if (blob.size === 0 || blob.size > 40 * 1024 * 1024) return false;

    await cache.put(streamUrl, clone);

    const prev = getCachedStreamEntries().filter((e) => e.trackId !== track.id);
    const next: CachedStreamEntry[] = [
      {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        streamUrl,
        sizeBytes: blob.size,
        cachedAt: Date.now(),
      },
      ...prev,
    ];

    if (next.length > MAX_CACHED_STREAMS) {
      const evicted = next.slice(MAX_CACHED_STREAMS);
      for (const old of evicted) {
        await cache.delete(old.streamUrl).catch(() => {});
      }
    }

    saveCachedStreamEntries(next.slice(0, MAX_CACHED_STREAMS));
    return true;
  } catch {
    return false;
  } finally {
    activePrefetches.delete(streamUrl);
  }
}

export async function clearAllCachedStreams(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete(STREAM_CACHE_NAME);
    }
    localStorage.removeItem(META_STORAGE_KEY);
  } catch {
    // ignore
  }
}
