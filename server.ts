import express from 'express';
import path from 'path';
import net from 'net';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const AUDIUS_DISCOVERY = 'https://discoveryprovider.audius.co';
const AUDIUS_APP_NAME = 'iCEEStreams';
const ITUNES_AUDIO_HOST = 'audio-ssl.itunes.apple.com';

const YOUTUBE_ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

interface MusicSearchItem {
  id: string;
  source: 'audius' | 'jamendo' | 'itunes' | 'youtube' | 'google';
  title: string;
  artist: string;
  album: string;
  genre: string;
  mood: string;
  bpm: number;
  durationSec: number;
  coverUrl: string;
  streamUrl: string;
  lowDataStreamUrl: string;
  youtubeVideoId?: string;
  playCount: string;
}

function formatCompactCount(n: number | undefined): string {
  if (!n || n <= 0) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M plays`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K plays`;
  return `${n} plays`;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(feat\.?|ft\.?|featuring|official|audio|video|lyrics|visualizer|remix|version)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSearchQuery(raw: string): string {
  const cleaned = raw
    .replace(/\((official|audio|video|lyrics|hd|4k)[^)]*\)/gi, ' ')
    .replace(/\[(official|audio|video|lyrics|hd|4k)[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || raw.trim();
}

function buildCoreFallbackQuery(normalized: string): string {
  const tokens = normalizeText(normalized)
    .split(' ')
    .filter((t) => t.length >= 2);
  if (tokens.length <= 2) return tokens.join(' ');
  return tokens.slice(0, 2).join(' ');
}

function scoreTrackMatch(item: MusicSearchItem, query: string): number {
  const normQuery = normalizeText(query);
  if (!normQuery) return 0;

  const normTitle = normalizeText(item.title);
  const normArtist = normalizeText(item.artist);
  const normAlbum = normalizeText(item.album);
  const combined = `${normTitle} ${normArtist} ${normAlbum}`;
  const queryTokens = normQuery.split(' ').filter(Boolean);

  let score = 0;

  if (normTitle === normQuery) score += 120;
  else if (normArtist === normQuery) score += 105;
  else if (normTitle.includes(normQuery)) score += 75;
  else if (normArtist.includes(normQuery)) score += 68;
  else if (combined.includes(normQuery)) score += 55;

  let matchedTokens = 0;
  for (const token of queryTokens) {
    if (normTitle.includes(token)) {
      score += 24;
      matchedTokens++;
    } else if (normArtist.includes(token)) {
      score += 20;
      matchedTokens++;
    } else if (normAlbum.includes(token)) {
      score += 8;
      matchedTokens++;
    }
  }

  if (queryTokens.length > 1 && matchedTokens === queryTokens.length) {
    score += 45;
  }

  // Prefer full-length streams over 30s previews when relevance is close
  if (item.source === 'audius' || item.source === 'jamendo') {
    score += 12;
  }
  if (item.coverUrl) {
    score += 4;
  }

  return score;
}

function isPrivateOrBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === 'metadata.google.internal'
  ) {
    return true;
  }

  const ipVersion = net.isIP(lower);
  if (ipVersion === 4) {
    const parts = lower.split('.').map((p) => parseInt(p, 10));
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  } else if (ipVersion === 6) {
    if (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    ) {
      return true;
    }
  }
  return false;
}

function extractYouTubeVideoId(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_ALLOWED_HOSTS.has(host)) return null;

  let candidate: string | null = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    candidate = parsed.pathname.split('/').filter(Boolean)[0] || null;
  } else if (parsed.searchParams.get('v')) {
    candidate = parsed.searchParams.get('v');
  } else {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (
      parts.length >= 2 &&
      (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live')
    ) {
      candidate = parts[1];
    }
  }

  return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

function extractGoogleDriveFileId(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  if (host !== 'drive.google.com' && host !== 'docs.google.com') return null;

  const fileMatch = /\/file\/d\/([A-Za-z0-9_-]{10,80})/.exec(parsed.pathname);
  const candidate = fileMatch?.[1] || parsed.searchParams.get('id');
  return candidate && /^[A-Za-z0-9_-]{10,80}$/.test(candidate) ? candidate : null;
}

function isGoogleStorageAudioHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return lower === 'storage.googleapis.com' || lower.endsWith('.storage.googleapis.com');
}

function isVidmateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return lower === 'vidmateapp.com' || lower.endsWith('.vidmateapp.com') || lower.includes('vidmate');
}

function parseIso8601Duration(iso?: string): number {
  if (!iso) return 180;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(iso);
  if (!match) return 180;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  const secs = parseInt(match[3] || '0', 10);
  const total = hours * 3600 + mins * 60 + secs;
  return total > 0 ? total : 180;
}

async function fetchYouTubeOembed(videoId: string): Promise<MusicSearchItem> {
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const fallback: MusicSearchItem = {
    id: `youtube-${videoId}`,
    source: 'youtube',
    title: `YouTube Track (${videoId})`,
    artist: 'YouTube Stream',
    album: 'YouTube Music',
    genre: 'Music',
    mood: 'Chill',
    bpm: 118,
    durationSec: 210,
    coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streamUrl: canonicalUrl,
    lowDataStreamUrl: canonicalUrl,
    youtubeVideoId: videoId,
    playCount: 'YouTube Stream',
  };

  try {
    const oembedUrl = new URL('https://www.youtube.com/oembed');
    oembedUrl.searchParams.set('url', canonicalUrl);
    oembedUrl.searchParams.set('format', 'json');
    const res = await fetch(oembedUrl.toString(), {
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      ...fallback,
      title: json.title?.trim() || fallback.title,
      artist: json.author_name?.trim() || fallback.artist,
      coverUrl: json.thumbnail_url || fallback.coverUrl,
    };
  } catch {
    return fallback;
  }
}

async function searchYouTubeDataApi(
  query: string,
  limit: number,
  apiKey: string
): Promise<MusicSearchItem[]> {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('videoCategoryId', '10');
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('maxResults', String(Math.min(limit, 15)));
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('key', apiKey);

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6500),
  });
  if (!searchRes.ok) {
    throw new Error(`YouTube Data API responded with ${searchRes.status}`);
  }

  const searchJson = (await searchRes.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  };

  const rawItems = (searchJson.items || []).filter(
    (entry) => entry.id?.videoId && /^[A-Za-z0-9_-]{11}$/.test(entry.id.videoId)
  );
  if (rawItems.length === 0) return [];

  const durationMap = new Map<string, number>();
  try {
    const ids = rawItems.map((entry) => entry.id!.videoId!).join(',');
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails');
    detailsUrl.searchParams.set('id', ids);
    detailsUrl.searchParams.set('key', apiKey);
    const detailsRes = await fetch(detailsUrl.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (detailsRes.ok) {
      const detailsJson = (await detailsRes.json()) as {
        items?: Array<{ id?: string; contentDetails?: { duration?: string } }>;
      };
      for (const v of detailsJson.items || []) {
        if (v.id) {
          durationMap.set(v.id, parseIso8601Duration(v.contentDetails?.duration));
        }
      }
    }
  } catch {
    // fallback duration used if video details request times out
  }

  return rawItems.map((entry) => {
    const videoId = entry.id!.videoId!;
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
      id: `youtube-${videoId}`,
      source: 'youtube' as const,
      title: entry.snippet?.title?.trim() || 'YouTube Audio',
      artist: entry.snippet?.channelTitle?.trim() || 'YouTube Artist',
      album: 'YouTube Music',
      genre: 'Music',
      mood: 'Chill',
      bpm: 118,
      durationSec: durationMap.get(videoId) || 210,
      coverUrl:
        entry.snippet?.thumbnails?.high?.url ||
        entry.snippet?.thumbnails?.medium?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      streamUrl: canonicalUrl,
      lowDataStreamUrl: canonicalUrl,
      youtubeVideoId: videoId,
      playCount: 'YouTube Stream',
    };
  });
}

async function searchAudius(query: string, limit: number): Promise<MusicSearchItem[]> {
  const url = new URL(`${AUDIUS_DISCOVERY}/v1/tracks/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('app_name', AUDIUS_APP_NAME);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6500),
  });
  if (!res.ok) {
    throw new Error(`Audius responded with ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: Array<{
      id?: string;
      title?: string;
      genre?: string;
      mood?: string;
      duration?: number;
      play_count?: number;
      artwork?: { '150x150'?: string; '480x480'?: string; '1000x1000'?: string };
      user?: { name?: string; handle?: string };
    }>;
  };

  const items: MusicSearchItem[] = [];
  for (const t of json.data || []) {
    if (!t.id || !t.title) continue;
    const streamUrl = `${AUDIUS_DISCOVERY}/v1/tracks/${encodeURIComponent(
      t.id
    )}/stream?app_name=${AUDIUS_APP_NAME}`;
    items.push({
      id: `audius-${t.id}`,
      source: 'audius',
      title: t.title,
      artist: t.user?.name || t.user?.handle || 'Audius Artist',
      album: 'Audius Stream',
      genre: t.genre || 'Electronic',
      mood: t.mood || 'Chill',
      bpm: 118,
      durationSec: t.duration && t.duration > 0 ? Math.round(t.duration) : 180,
      coverUrl: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
      streamUrl,
      lowDataStreamUrl: streamUrl,
      playCount: formatCompactCount(t.play_count),
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function searchJamendo(
  query: string,
  limit: number,
  clientId: string,
  lowData: boolean
): Promise<MusicSearchItem[]> {
  const url = new URL('https://api.jamendo.com/v3.0/tracks/');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('namesearch', query);
  url.searchParams.set('include', 'musicinfo');
  url.searchParams.set('audioformat', lowData ? 'mp31' : 'mp32');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6500),
  });
  if (!res.ok) {
    throw new Error(`Jamendo responded with ${res.status}`);
  }
  const json = (await res.json()) as {
    results?: Array<{
      id?: string;
      name?: string;
      artist_name?: string;
      album_name?: string;
      duration?: number;
      audio?: string;
      image?: string;
      musicinfo?: { tags?: { genres?: string[]; vartags?: string[] } };
    }>;
  };

  const items: MusicSearchItem[] = [];
  for (const t of json.results || []) {
    if (!t.id || !t.name || !t.audio) continue;
    const genreTag = t.musicinfo?.tags?.genres?.[0] || 'Indie';
    const moodTag = t.musicinfo?.tags?.vartags?.[0] || 'Chill';
    items.push({
      id: `jamendo-${t.id}`,
      source: 'jamendo',
      title: t.name,
      artist: t.artist_name || 'Jamendo Artist',
      album: t.album_name || 'Jamendo',
      genre: genreTag,
      mood: moodTag,
      bpm: 112,
      durationSec: t.duration && t.duration > 0 ? Math.round(t.duration) : 180,
      coverUrl: t.image || '',
      streamUrl: t.audio,
      lowDataStreamUrl: t.audio,
      playCount: '',
    });
  }
  return items;
}

async function searchItunes(query: string, limit: number): Promise<MusicSearchItem[]> {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', query);
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6500),
  });
  if (!res.ok) {
    throw new Error(`iTunes Search responded with ${res.status}`);
  }
  const json = (await res.json()) as {
    results?: Array<{
      trackId?: number;
      trackName?: string;
      artistName?: string;
      collectionName?: string;
      primaryGenreName?: string;
      trackTimeMillis?: number;
      previewUrl?: string;
      artworkUrl100?: string;
      artworkUrl60?: string;
    }>;
  };

  const items: MusicSearchItem[] = [];
  for (const t of json.results || []) {
    if (!t.trackId || !t.trackName || !t.previewUrl) continue;
    let parsedPreview: URL;
    try {
      parsedPreview = new URL(t.previewUrl);
    } catch {
      continue;
    }
    if (parsedPreview.hostname !== ITUNES_AUDIO_HOST) continue;

    const highResArtwork = t.artworkUrl100
      ? t.artworkUrl100.replace('100x100bb', '600x600bb')
      : t.artworkUrl60 || '';
    const proxiedStreamUrl = `/api/music/stream-proxy?url=${encodeURIComponent(
      parsedPreview.toString()
    )}`;

    items.push({
      id: `itunes-${t.trackId}`,
      source: 'itunes',
      title: t.trackName,
      artist: t.artistName || 'Unknown Artist',
      album: t.collectionName || 'iTunes Single',
      genre: t.primaryGenreName || 'Pop',
      mood: 'Chill',
      bpm: 116,
      durationSec: 30,
      coverUrl: highResArtwork,
      streamUrl: proxiedStreamUrl,
      lowDataStreamUrl: proxiedStreamUrl,
      playCount: '30s Preview',
    });
  }
  return items;
}

async function getTrendingAudius(limit: number): Promise<MusicSearchItem[]> {
  const url = new URL(`${AUDIUS_DISCOVERY}/v1/tracks/trending`);
  url.searchParams.set('app_name', AUDIUS_APP_NAME);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) {
    throw new Error(`Audius trending responded with ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: Array<{
      id?: string;
      title?: string;
      genre?: string;
      mood?: string;
      duration?: number;
      play_count?: number;
      artwork?: { '480x480'?: string; '150x150'?: string };
      user?: { name?: string; handle?: string };
    }>;
  };

  return (json.data || [])
    .filter((t) => Boolean(t.id && t.title))
    .slice(0, limit)
    .map((t) => {
      const streamUrl = `${AUDIUS_DISCOVERY}/v1/tracks/${encodeURIComponent(
        t.id!
      )}/stream?app_name=${AUDIUS_APP_NAME}`;
      return {
        id: `audius-${t.id}`,
        source: 'audius' as const,
        title: t.title!,
        artist: t.user?.name || t.user?.handle || 'Audius Artist',
        album: 'Audius Trending',
        genre: t.genre || 'Electronic',
        mood: t.mood || 'Chill',
        bpm: 120,
        durationSec: t.duration && t.duration > 0 ? Math.round(t.duration) : 180,
        coverUrl: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
        streamUrl,
        lowDataStreamUrl: streamUrl,
        playCount: formatCompactCount(t.play_count),
      };
    });
}

function deduplicateAndRank(items: MusicSearchItem[], query: string): MusicSearchItem[] {
  const scored = items
    .map((item) => ({ item, score: scoreTrackMatch(item, query) }))
    .sort((a, b) => b.score - a.score);

  const seenKeys = new Set<string>();
  const ranked: MusicSearchItem[] = [];

  for (const entry of scored) {
    const dedupKey = `${normalizeText(entry.item.title)}::${normalizeText(entry.item.artist)}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);
    ranked.push(entry.item);
  }

  return ranked;
}

async function createServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      sources: {
        audius: true,
        itunes: true,
        youtube: Boolean((process.env.YOUTUBE_API_KEY || '').trim()),
        youtubeLinks: true,
        googleDriveLinks: true,
        jamendo: Boolean((process.env.JAMENDO_CLIENT_ID || '').trim()),
      },
    });
  });

  app.get('/api/music/trending', async (req, res) => {
    const parsedLimit = parseInt(String(req.query.limit || '8'), 10);
    const limit = Number.isNaN(parsedLimit) ? 8 : Math.min(16, Math.max(1, parsedLimit));
    try {
      const items = await getTrendingAudius(limit);
      res.json({ items });
    } catch (err) {
      console.error('Trending fetch error:', err instanceof Error ? err.message : err);
      res.status(502).json({ error: 'Unable to load trending streams right now.' });
    }
  });

  // Same-origin audio stream proxy strictly allowlisted for iTunes preview URLs so EQ & caching work seamlessly
  app.get('/api/music/stream-proxy', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl || rawUrl.length > 512) {
      res.status(400).json({ error: 'Stream URL is required.' });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Invalid stream URL.' });
      return;
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== ITUNES_AUDIO_HOST) {
      res.status(403).json({ error: 'Stream host is not in the allowed preview list.' });
      return;
    }

    try {
      const headers: Record<string, string> = {};
      if (typeof req.headers.range === 'string') {
        headers.Range = req.headers.range;
      }
      const upstream = await fetch(parsed.toString(), {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });

      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status).end();
        return;
      }

      res.status(upstream.status);
      const contentType = upstream.headers.get('content-type');
      const contentLength = upstream.headers.get('content-length');
      const contentRange = upstream.headers.get('content-range');
      const acceptRanges = upstream.headers.get('accept-ranges');

      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (!upstream.body) {
        res.end();
        return;
      }

      Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    } catch (err) {
      console.error('Stream proxy error:', err instanceof Error ? err.message : err);
      res.status(502).json({ error: 'Unable to proxy audio preview.' });
    }
  });

  app.get('/api/music/search', async (req, res) => {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!rawQuery) {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }
    if (rawQuery.length > 260) {
      res.status(400).json({ error: 'Search query must be 260 characters or fewer.' });
      return;
    }

    // Direct YouTube / YouTube Music / Google Drive URL pasted straight into Search
    if (/^https?:\/\//i.test(rawQuery)) {
      const ytId = extractYouTubeVideoId(rawQuery);
      if (ytId) {
        const track = await fetchYouTubeOembed(ytId);
        res.json({
          query: rawQuery,
          normalizedQuery: track.title,
          items: [track],
        });
        return;
      }

      const gdriveId = extractGoogleDriveFileId(rawQuery);
      if (gdriveId) {
        const directUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
          gdriveId
        )}`;
        res.json({
          query: rawQuery,
          normalizedQuery: rawQuery,
          items: [
            {
              id: `google-${gdriveId}`,
              source: 'google',
              title: 'Google Drive Audio',
              artist: 'Google Drive Stream',
              album: 'Google Drive',
              genre: 'Direct Stream',
              mood: 'Chill',
              bpm: 118,
              durationSec: 210,
              coverUrl: '',
              streamUrl: directUrl,
              lowDataStreamUrl: directUrl,
              playCount: 'Google Drive',
            },
          ],
        });
        return;
      }

      try {
        const parsedQueryUrl = new URL(rawQuery);
        if (isVidmateHost(parsedQueryUrl.hostname)) {
          res.status(400).json({
            error:
              'VidMate does not provide a public web streaming API. Paste a YouTube, YouTube Music, or Google Drive audio link instead.',
          });
          return;
        }
      } catch {
        // continue to standard keyword search
      }
    }

    const normalizedQuery = normalizeSearchQuery(rawQuery);
    const sourceParam = String(req.query.source || 'all');
    const lowData = req.query.lowData === '1' || req.query.lowData === 'true';
    const parsedMax = parseInt(String(req.query.maxResults || '14'), 10);
    const maxResults = Number.isNaN(parsedMax) ? 14 : Math.min(24, Math.max(1, parsedMax));
    const jamendoClientId = (process.env.JAMENDO_CLIENT_ID || '').trim();
    const youtubeApiKey = (process.env.YOUTUBE_API_KEY || '').trim();

    type SearchProvider = 'audius' | 'jamendo' | 'itunes' | 'youtube';

    const runProviders = async (
      queryText: string,
      sources: SearchProvider[]
    ): Promise<{ items: MusicSearchItem[]; allRejected: boolean }> => {
      const tasks: Promise<MusicSearchItem[]>[] = [];
      if (sources.includes('youtube') && youtubeApiKey) {
        tasks.push(searchYouTubeDataApi(queryText, maxResults, youtubeApiKey));
      }
      if (sources.includes('audius')) {
        tasks.push(searchAudius(queryText, maxResults));
      }
      if (sources.includes('itunes')) {
        tasks.push(searchItunes(queryText, maxResults));
      }
      if (sources.includes('jamendo') && jamendoClientId) {
        tasks.push(searchJamendo(queryText, maxResults, jamendoClientId, lowData));
      }

      if (tasks.length === 0) {
        return { items: [], allRejected: false };
      }

      const settled = await Promise.allSettled(tasks);
      const collected: MusicSearchItem[] = [];
      let fulfilledCount = 0;
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          fulfilledCount++;
          collected.push(...result.value);
        }
      }
      return { items: collected, allRejected: fulfilledCount === 0 };
    };

    try {
      const requestedSources: SearchProvider[] =
        sourceParam === 'youtube'
          ? ['youtube']
          : sourceParam === 'audius'
          ? ['audius']
          : sourceParam === 'itunes'
          ? ['itunes']
          : sourceParam === 'jamendo'
          ? ['jamendo']
          : ['youtube', 'audius', 'itunes', 'jamendo'];

      const primary = await runProviders(normalizedQuery, requestedSources);
      let items = primary.items;
      let fallbackNotice = '';
      let allRejected = primary.allRejected;

      // Automatic multi-source fallback when a single chosen provider returns 0 tracks
      if (items.length === 0 && sourceParam !== 'all') {
        const fallbackSources = (['youtube', 'audius', 'itunes', 'jamendo'] as const).filter(
          (s) => !requestedSources.includes(s)
        );
        const secondary = await runProviders(normalizedQuery, [...fallbackSources]);
        if (secondary.items.length > 0) {
          items = secondary.items;
          allRejected = false;
          if (sourceParam === 'youtube' && !youtubeApiKey) {
            fallbackNotice =
              'YouTube keyword search needs YOUTUBE_API_KEY in Secrets — showing Audius & iTunes streams, or paste any youtube.com / youtu.be link directly.';
          } else {
            fallbackNotice = `No matches on ${sourceParam} — showing fallback results from ${
              secondary.items[0].source === 'itunes'
                ? 'iTunes Search'
                : secondary.items[0].source === 'jamendo'
                ? 'Jamendo'
                : secondary.items[0].source === 'youtube'
                ? 'YouTube'
                : 'Audius'
            }.`;
          }
        }
      }

      // Secondary normalized token fallback when full phrase returns 0 matches
      if (items.length === 0) {
        const coreQuery = buildCoreFallbackQuery(normalizedQuery);
        if (coreQuery && coreQuery !== normalizeText(normalizedQuery)) {
          const coreRun = await runProviders(coreQuery, ['youtube', 'audius', 'itunes', 'jamendo']);
          if (coreRun.items.length > 0) {
            items = coreRun.items;
            allRejected = false;
            fallbackNotice = `Showing closest matches for "${coreQuery}".`;
          }
        }
      }

      if (items.length === 0 && allRejected) {
        res.status(502).json({
          error: 'Music stream providers could not be reached. Please check your connection.',
        });
        return;
      }

      const ranked = deduplicateAndRank(items, normalizedQuery).slice(0, maxResults);

      res.json({
        query: rawQuery,
        normalizedQuery,
        fallbackNotice: fallbackNotice || undefined,
        items: ranked,
        jamendoConfigured: Boolean(jamendoClientId),
        youtubeConfigured: Boolean(youtubeApiKey),
      });
    } catch (err) {
      console.error('Music search error:', err instanceof Error ? err.message : err);
      res.status(502).json({ error: 'Music search failed.' });
    }
  });

  app.post('/api/music/inspect-url', async (req, res) => {
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!rawUrl || rawUrl.length > 512) {
      res.status(400).json({ error: 'Please provide a valid stream URL.' });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Invalid URL format.' });
      return;
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      res.status(400).json({ error: 'Only HTTP and HTTPS stream URLs are allowed.' });
      return;
    }

    if (isPrivateOrBlockedHost(parsed.hostname)) {
      res.status(400).json({ error: 'Private or local network hosts cannot be probed.' });
      return;
    }

    if (isVidmateHost(parsed.hostname)) {
      res.status(400).json({
        error:
          'VidMate does not provide a public web streaming API. Use a YouTube, YouTube Music, Google Drive, or direct audio URL instead.',
      });
      return;
    }

    const ytVideoId = extractYouTubeVideoId(parsed.toString());
    if (ytVideoId) {
      const ytTrack = await fetchYouTubeOembed(ytVideoId);
      res.json({
        ok: true,
        kind: 'youtube',
        youtubeVideoId: ytVideoId,
        title: ytTrack.title,
        artist: ytTrack.artist,
        coverUrl: ytTrack.coverUrl,
        normalizedUrl: ytTrack.streamUrl,
      });
      return;
    }

    const gdriveId = extractGoogleDriveFileId(parsed.toString());
    if (gdriveId) {
      res.json({
        ok: true,
        kind: 'google',
        title: 'Google Drive Audio',
        artist: 'Google Drive Stream',
        contentType: 'audio/mpeg',
        normalizedUrl: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
          gdriveId
        )}`,
      });
      return;
    }

    if (isGoogleStorageAudioHost(parsed.hostname)) {
      res.json({
        ok: true,
        kind: 'google',
        contentType: 'audio/mpeg',
        normalizedUrl: parsed.toString(),
      });
      return;
    }

    try {
      const headRes = await fetch(parsed.toString(), {
        method: 'HEAD',
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
      const contentType = headRes.headers.get('content-type') || 'audio/mpeg';
      res.json({
        ok: headRes.ok,
        kind: 'custom',
        contentType,
        normalizedUrl: parsed.toString(),
      });
    } catch {
      res.json({
        ok: true,
        kind: 'custom',
        contentType: 'audio/mpeg',
        normalizedUrl: parsed.toString(),
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`iCEE Streams server running on http://0.0.0.0:${PORT}`);
  });
}

createServer();
