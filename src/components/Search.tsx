import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Link2,
  Loader2,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search as SearchIcon,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { COVERS, formatDuration } from '../data/catalog';
import { DensityMode, Playlist, Track } from '../types';
import CoverArt from './CoverArt';
import TrackRow from './TrackRow';

interface SearchProps {
  tracks: Track[];
  playlists: Playlist[];
  isOnline: boolean;
  lowDataMode: boolean;
  cachedTrackIds: string[];
  currentTrackId: string;
  isPlaying: boolean;
  likedTrackIds: string[];
  downloadedTrackIds: string[];
  density: DensityMode;
  onPlayTrack: (trackId: string) => void;
  onPlayOnlineTrack: (track: Track) => void;
  onRegisterOnlineTracks: (tracks: Track[]) => void;
  onAddToQueue: (trackId: string) => void;
  onToggleLowDataMode: () => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onInspectPlaylist: (playlist: Playlist) => void;
  onToggleLike: (trackId: string) => void;
  onToggleDownload: (trackId: string) => void;
  onOpenTrackMenu: (track: Track) => void;
}

interface ApiMusicItem {
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

function normalizeClientQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function mapApiMusicToTrack(item: ApiMusicItem): Track {
  const sourceName =
    item.source === 'youtube'
      ? 'YouTube'
      : item.source === 'google'
      ? 'Google'
      : item.source === 'jamendo'
      ? 'Jamendo'
      : item.source === 'itunes'
      ? 'iTunes Search'
      : 'Audius';
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    album: item.album,
    genre: item.genre || 'Electronic',
    mood: item.mood || 'Chill',
    bpm: item.bpm || 118,
    language: 'English',
    explicit: false,
    durationSec: item.durationSec || 180,
    sizeMb: 0,
    keySignature: sourceName,
    coverUrl: item.coverUrl || COVERS.electricNights,
    fallbackGradient: 'from-purple-950 via-slate-900 to-black',
    lyrics: [`Streaming via ${sourceName} · ${item.artist}`],
    chordHz: [196.0, 246.94, 293.66],
    source: item.source,
    streamUrl: item.streamUrl,
    lowDataStreamUrl: item.lowDataStreamUrl,
    youtubeVideoId: item.youtubeVideoId,
    playCount: item.playCount,
  };
}

export default function Search({
  tracks,
  playlists,
  isOnline,
  lowDataMode,
  cachedTrackIds,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  downloadedTrackIds,
  density,
  onPlayTrack,
  onPlayOnlineTrack,
  onRegisterOnlineTracks,
  onAddToQueue,
  onToggleLowDataMode,
  onPlayPlaylist,
  onInspectPlaylist,
  onToggleLike,
  onToggleDownload,
  onOpenTrackMenu,
}: SearchProps) {
  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'online' | 'all' | 'local'>('online');
  const [providerFilter, setProviderFilter] = useState<'all' | 'youtube' | 'audius' | 'itunes' | 'jamendo'>('all');
  const [genre, setGenre] = useState('All');
  const [mood, setMood] = useState('Any');
  const [bpmRange, setBpmRange] = useState('Any');
  const [language, setLanguage] = useState('Any');
  const [explicitMode, setExplicitMode] = useState<'all' | 'clean' | 'explicit'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'bpm-asc' | 'bpm-desc' | 'duration'>('relevance');
  const [showFilters, setShowFilters] = useState(false);

  const [showCustomUrlForm, setShowCustomUrlForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customUrlError, setCustomUrlError] = useState<string | null>(null);
  const [customUrlLoading, setCustomUrlLoading] = useState(false);

  const [onlineResults, setOnlineResults] = useState<Track[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');

  const runOnlineSearch = async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setOnlineResults([]);
      setOnlineError(null);
      setFallbackNotice(null);
      setLastSearchedQuery('');
      return;
    }
    if (!isOnline) {
      setOnlineError('You are offline. Connect to Wi-Fi or mobile data to stream online music.');
      return;
    }

    setOnlineLoading(true);
    setOnlineError(null);
    setFallbackNotice(null);
    try {
      const res = await fetch(
        `/api/music/search?q=${encodeURIComponent(trimmed)}&source=${providerFilter}&lowData=${
          lowDataMode ? '1' : '0'
        }&maxResults=14`
      );
      const data = (await res.json()) as {
        items?: ApiMusicItem[];
        fallbackNotice?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reach music streaming API.');
      }
      const mapped = (data.items || []).map(mapApiMusicToTrack);
      setOnlineResults(mapped);
      setFallbackNotice(data.fallbackNotice || null);
      setLastSearchedQuery(trimmed);
      if (mapped.length > 0) {
        onRegisterOnlineTracks(mapped);
      }
    } catch (err) {
      setOnlineError(
        err instanceof Error ? err.message : 'Unable to reach streaming providers right now.'
      );
    } finally {
      setOnlineLoading(false);
    }
  };

  useEffect(() => {
    if (searchScope === 'local' || !isOnline) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setOnlineResults([]);
      setOnlineError(null);
      setLastSearchedQuery('');
      return;
    }
    const timer = window.setTimeout(() => {
      runOnlineSearch(trimmed);
    }, 360);
    return () => window.clearTimeout(timer);
  }, [query, searchScope, providerFilter, lowDataMode, isOnline]);

  const handleAddCustomStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomUrlError(null);
    const trimmedUrl = customUrl.trim();
    if (!trimmedUrl) {
      setCustomUrlError('Enter a valid audio stream URL.');
      return;
    }

    setCustomUrlLoading(true);
    try {
      const res = await fetch('/api/music/inspect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        kind?: 'youtube' | 'google' | 'custom';
        youtubeVideoId?: string;
        title?: string;
        artist?: string;
        coverUrl?: string;
        normalizedUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.normalizedUrl) {
        throw new Error(data.error || 'Could not validate stream URL.');
      }

      const resolvedKind = data.kind || 'custom';
      const customTrack: Track = {
        id:
          resolvedKind === 'youtube' && data.youtubeVideoId
            ? `youtube-${data.youtubeVideoId}`
            : `${resolvedKind}-${Date.now()}`,
        title:
          customTitle.trim() ||
          data.title ||
          (resolvedKind === 'youtube'
            ? 'YouTube Audio Stream'
            : resolvedKind === 'google'
            ? 'Google Drive Audio'
            : 'Custom Audio Stream'),
        artist:
          customArtist.trim() ||
          data.artist ||
          (resolvedKind === 'youtube'
            ? 'YouTube'
            : resolvedKind === 'google'
            ? 'Google Drive'
            : 'Self-Hosted Source'),
        album:
          resolvedKind === 'youtube'
            ? 'YouTube Music'
            : resolvedKind === 'google'
            ? 'Google Stream'
            : 'Custom Stream',
        genre: resolvedKind === 'youtube' ? 'Music' : resolvedKind === 'google' ? 'Google Stream' : 'Custom',
        mood: 'Chill',
        bpm: 120,
        language: 'English',
        explicit: false,
        durationSec: resolvedKind === 'youtube' ? 210 : 240,
        sizeMb: 0,
        keySignature:
          resolvedKind === 'youtube'
            ? 'YouTube'
            : resolvedKind === 'google'
            ? 'Google'
            : 'Direct Stream',
        coverUrl: data.coverUrl || COVERS.oceanicStates,
        fallbackGradient: 'from-cyan-950 via-slate-900 to-black',
        lyrics: [`Stream URL: ${data.normalizedUrl}`],
        chordHz: [164.81, 196.0, 246.94],
        source: resolvedKind,
        streamUrl: data.normalizedUrl,
        lowDataStreamUrl: data.normalizedUrl,
        youtubeVideoId: data.youtubeVideoId,
      };

      onRegisterOnlineTracks([customTrack]);
      onPlayOnlineTrack(customTrack);
      setCustomTitle('');
      setCustomArtist('');
      setCustomUrl('');
      setShowCustomUrlForm(false);
    } catch (err) {
      setCustomUrlError(err instanceof Error ? err.message : 'Invalid stream URL.');
    } finally {
      setCustomUrlLoading(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setGenre('All');
    setMood('Any');
    setBpmRange('Any');
    setLanguage('Any');
    setExplicitMode('all');
    setSortBy('relevance');
    setOnlineResults([]);
    setOnlineError(null);
    setLastSearchedQuery('');
  };

  const hasActiveFilters =
    query !== '' ||
    genre !== 'All' ||
    mood !== 'Any' ||
    bpmRange !== 'Any' ||
    language !== 'Any' ||
    explicitMode !== 'all' ||
    sortBy !== 'relevance';

  const filteredLocalCatalog = tracks
    .filter((track) => {
      const q = normalizeClientQuery(query);
      if (q) {
        const hay = normalizeClientQuery(
          `${track.title} ${track.artist} ${track.album} ${track.genre}`
        );
        const tokens = q.split(' ').filter(Boolean);
        const matchesText = tokens.every((tok) => hay.includes(tok));
        if (!matchesText) return false;
      }
      if (genre !== 'All' && track.genre !== genre) return false;
      if (mood !== 'Any' && track.mood !== mood) return false;
      if (language !== 'Any' && track.language !== language) return false;
      if (explicitMode === 'clean' && track.explicit) return false;
      if (explicitMode === 'explicit' && !track.explicit) return false;
      if (bpmRange === '60-90' && (track.bpm < 60 || track.bpm > 90)) return false;
      if (bpmRange === '90-120' && (track.bpm < 90 || track.bpm > 120)) return false;
      if (bpmRange === '120+' && track.bpm < 120) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'bpm-asc') return a.bpm - b.bpm;
      if (sortBy === 'bpm-desc') return b.bpm - a.bpm;
      if (sortBy === 'duration') return a.durationSec - b.durationSec;
      return 0;
    });

  const matchingPlaylists = playlists.filter((pl) => {
    const q = query.trim().toLowerCase();
    if (!q) return mood === 'Any' || pl.moodTag === mood;
    return (
      pl.title.toLowerCase().includes(q) ||
      pl.subtitle.toLowerCase().includes(q) ||
      pl.moodTag.toLowerCase().includes(q)
    );
  });

  const showOnlineSection = searchScope === 'online' || searchScope === 'all';
  const showLocalSection = searchScope === 'local' || searchScope === 'all';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Fast Music Search</h1>
          <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi size={14} className="accent-text shrink-0" />
                <span>Multi-source search across YouTube, Audius, iTunes & Jamendo · Paste YouTube or Google links</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-amber-400 shrink-0" />
                <span>Offline — playing cached streams & local device tracks</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleLowDataMode}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              lowDataMode
                ? 'accent-soft-bg accent-text border accent-ring'
                : 'surface-card text-slate-300 hover:text-white'
            }`}
          >
            {lowDataMode ? 'Low-Data: On' : 'Low-Data: Off'}
          </button>

          <button
            type="button"
            onClick={() => setShowCustomUrlForm((v) => !v)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl surface-card text-xs font-medium text-white flex items-center gap-1.5 whitespace-nowrap"
          >
            <Link2 size={14} className="accent-text" />
            <span>YouTube / Link</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl surface-card text-xs font-medium text-white flex items-center gap-1.5 whitespace-nowrap"
          >
            <SlidersHorizontal size={14} className="accent-text" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {showCustomUrlForm && (
        <form
          onSubmit={handleAddCustomStream}
          className="surface-elevated rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Play Direct Link (YouTube, YouTube Music, Google Drive, or Audio URL)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                VidMate has no web streaming API; paste any YouTube, Google Drive/Cloud audio, or direct MP3/M4A link below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomUrlForm(false)}
              aria-label="Close custom stream form"
              className="text-slate-400 hover:text-white min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Track title (auto-detected for YouTube links)"
              className="min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="text"
              value={customArtist}
              onChange={(e) => setCustomArtist(e.target.value)}
              placeholder="Artist / channel (auto-detected for YouTube)"
              className="min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              required
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/file/d/..."
              className="flex-1 min-h-[44px] bg-black/45 border border-white/15 rounded-xl px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={customUrlLoading}
              className="min-h-[44px] px-4 rounded-xl accent-bg text-white text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {customUrlLoading ? 'Loading...' : 'Play Link'}
            </button>
          </div>
          {customUrlError && <p className="text-xs text-rose-300">{customUrlError}</p>}
        </form>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (searchScope !== 'local') {
            runOnlineSearch(query);
          }
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <SearchIcon
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isOnline && searchScope !== 'local'
                ? 'Search song/artist or paste YouTube / Google Drive link...'
                : 'Search local device & cached tracks...'
            }
            aria-label="Search music"
            className="w-full min-h-[48px] surface-card rounded-2xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setOnlineResults([]);
                setLastSearchedQuery('');
              }}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {searchScope !== 'local' && (
          <button
            type="submit"
            disabled={!query.trim() || onlineLoading || !isOnline}
            className="min-h-[48px] px-5 rounded-2xl accent-bg text-white text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-40"
          >
            {onlineLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Radio size={16} />
            )}
            <span className="hidden sm:inline">Search</span>
          </button>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Search source"
          className="flex items-center gap-1 p-1 surface-card rounded-xl"
        >
          {(
            [
              { id: 'online', label: 'Fast Online API' },
              { id: 'all', label: 'All Sources' },
              { id: 'local', label: 'Local & Catalog' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={searchScope === tab.id}
              onClick={() => setSearchScope(tab.id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                searchScope === tab.id
                  ? 'accent-bg text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {['KAYTRANADA', 'Electronic', 'Lo-fi', 'Ambient'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="min-h-[34px] px-3 py-1 rounded-lg surface-card text-xs text-slate-300 hover:text-white whitespace-nowrap shrink-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <section aria-label="Search filters" className="surface-card rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Precision Filters</h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs accent-text hover:underline flex items-center gap-1 min-h-[32px] px-2"
              >
                <RotateCcw size={13} />
                <span>Reset all</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div>
              <label htmlFor="filter-provider" className="text-slate-400 text-xs block mb-1">
                API Provider
              </label>
              <select
                id="filter-provider"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as typeof providerFilter)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="all">All Sources (Auto)</option>
                <option value="youtube">YouTube (API / Links)</option>
                <option value="audius">Audius Only</option>
                <option value="itunes">iTunes Search Only</option>
                <option value="jamendo">Jamendo Only</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-genre" className="text-slate-400 text-xs block mb-1">
                Genre
              </label>
              <select
                id="filter-genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="All">All Genres</option>
                <option value="Hip Hop">Hip Hop</option>
                <option value="Electronic">Electronic</option>
                <option value="R&B">R&B</option>
                <option value="Ambient">Ambient</option>
                <option value="Indie">Indie</option>
                <option value="Local">Local Device</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-mood" className="text-slate-400 text-xs block mb-1">
                Mood
              </label>
              <select
                id="filter-mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Any">Any Mood</option>
                <option value="Chill">Chill</option>
                <option value="Energetic">Energetic</option>
                <option value="Melancholic">Melancholic</option>
                <option value="Focus">Focus</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-bpm" className="text-slate-400 text-xs block mb-1">
                Tempo (BPM)
              </label>
              <select
                id="filter-bpm"
                value={bpmRange}
                onChange={(e) => setBpmRange(e.target.value)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Any">Any BPM</option>
                <option value="60-90">60–90 BPM</option>
                <option value="90-120">90–120 BPM</option>
                <option value="120+">120+ BPM</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-language" className="text-slate-400 text-xs block mb-1">
                Language
              </label>
              <select
                id="filter-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Any">Any Language</option>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="Instrumental">Instrumental</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-sort" className="text-slate-400 text-xs block mb-1">
                Sort By
              </label>
              <select
                id="filter-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="relevance">Relevance</option>
                <option value="bpm-asc">BPM: Low to High</option>
                <option value="bpm-desc">BPM: High to Low</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 mr-1">Content rating:</span>
            {(
              [
                { id: 'all', label: 'All Tracks' },
                { id: 'clean', label: 'Clean Only' },
                { id: 'explicit', label: 'Explicit Only' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setExplicitMode(opt.id)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  explicitMode === opt.id
                    ? 'accent-bg text-white'
                    : 'surface-elevated text-slate-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {showOnlineSection && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
              <Radio size={17} className="accent-text" />
              <span>Online Music Streams</span>
            </h2>
            {lastSearchedQuery && (
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {onlineResults.length} tracks for “{lastSearchedQuery}”
              </span>
            )}
          </div>

          {!isOnline ? (
            <div className="surface-card rounded-2xl p-6 text-center space-y-2">
              <WifiOff size={22} className="mx-auto text-amber-400" />
              <p className="text-sm font-medium text-white">No internet connection</p>
              <p className="text-xs text-slate-400">
                Switch to Local & Catalog to play your device files and cached streams.
              </p>
              <button
                type="button"
                onClick={() => setSearchScope('local')}
                className="mt-2 min-h-[40px] px-4 py-1.5 rounded-xl accent-bg text-white text-xs font-medium"
              >
                Browse Local & Cached Tracks
              </button>
            </div>
          ) : onlineLoading ? (
            <div className="surface-card rounded-2xl p-8 text-center space-y-2">
              <Loader2 size={22} className="mx-auto animate-spin accent-text" />
              <p className="text-sm text-slate-300">Searching YouTube, Audius, iTunes & Jamendo...</p>
            </div>
          ) : onlineError ? (
            <div className="surface-card rounded-2xl p-6 text-center space-y-3">
              <p className="text-sm text-rose-300">{onlineError}</p>
              <button
                type="button"
                onClick={() => runOnlineSearch(query)}
                className="min-h-[40px] px-4 py-1.5 rounded-xl surface-elevated text-xs font-medium text-white"
              >
                Retry Search
              </button>
            </div>
          ) : !query.trim() ? (
            <div className="surface-card rounded-2xl p-6 text-center">
              <p className="text-sm font-medium text-white">
                Direct streaming from YouTube, Google Drive, Audius, iTunes & Jamendo
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Search by artist or song name, or paste any YouTube, YouTube Music, or Google Drive audio link to stream immediately.
              </p>
            </div>
          ) : onlineResults.length === 0 ? (
            <div className="surface-card rounded-2xl p-6 text-center text-sm text-slate-400">
              No online streams found for “{query}”. Try another artist or paste a direct YouTube / Google Drive link.
            </div>
          ) : (
            <div className="space-y-2.5">
              {fallbackNotice && (
                <p className="text-xs text-slate-300 px-1">{fallbackNotice}</p>
              )}
              <div className="surface-card rounded-2xl p-2 divide-y divide-white/[0.06]">
                {onlineResults.map((track) => {
                  const isCurrent = track.id === currentTrackId;
                  const isCached = cachedTrackIds.includes(track.id);
                  const sourceLabel =
                    track.source === 'youtube'
                      ? 'YouTube'
                      : track.source === 'google'
                      ? 'Google Stream'
                      : track.source === 'jamendo'
                      ? 'Jamendo'
                      : track.source === 'itunes'
                      ? 'iTunes Search'
                      : 'Audius';
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        isCurrent
                          ? 'accent-soft-bg border accent-ring'
                          : 'hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onPlayOnlineTrack(track)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <CoverArt
                          src={track.coverUrl}
                          alt={track.title}
                          fallbackGradient={track.fallbackGradient}
                          className="w-12 h-12 rounded-lg"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isCurrent ? 'accent-text' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {track.artist} · {sourceLabel}
                            {track.playCount ? ` · ${track.playCount}` : ''}
                            {' · '}
                            <span className="font-mono tabular-nums">
                              {formatDuration(track.durationSec)}
                            </span>
                            {isCached && (
                              <>
                                {' · '}
                                <span className="accent-text font-medium inline-flex items-center gap-0.5">
                                  <CheckCircle2 size={11} /> Cached
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onRegisterOnlineTracks([track]);
                          onAddToQueue(track.id);
                        }}
                        aria-label={`Add ${track.title} to queue`}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl surface-elevated text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1"
                      >
                        <Plus size={13} />
                        <span className="hidden sm:inline">Queue</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onPlayOnlineTrack(track)}
                        aria-label={`Play ${track.title}`}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl accent-bg text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <Play size={13} className="fill-white" />
                        <span>{isCurrent && isPlaying ? 'Playing' : 'Play'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTrackMenu(track)}
                        aria-label={`More options for ${track.title}`}
                        className="min-h-[40px] min-w-[38px] rounded-xl surface-elevated text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold"
                      >
                        ···
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {showLocalSection && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-base font-semibold text-white">
              Local Device & Catalog Tracks
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {filteredLocalCatalog.length} {filteredLocalCatalog.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {filteredLocalCatalog.length === 0 ? (
            <div className="surface-card rounded-2xl p-8 text-center">
              <p className="text-sm font-medium text-white">No local or catalog tracks match</p>
              <p className="text-xs text-slate-400 mt-1">
                Try clearing filters or switching to Fast Online API.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 min-h-[44px] px-5 py-2 rounded-xl accent-bg text-white text-xs font-medium"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="surface-card rounded-2xl p-2 divide-y divide-white/[0.06]">
              {filteredLocalCatalog.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isCurrent={track.id === currentTrackId}
                  isPlaying={isPlaying}
                  isLiked={likedTrackIds.includes(track.id)}
                  isDownloaded={downloadedTrackIds.includes(track.id)}
                  density={density}
                  onPlay={onPlayTrack}
                  onToggleLike={onToggleLike}
                  onToggleDownload={onToggleDownload}
                  onOpenMenu={onOpenTrackMenu}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {matchingPlaylists.length > 0 && searchScope !== 'online' && (
        <section>
          <h2 className="font-display text-base font-semibold text-white mb-2">Playlists</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchingPlaylists.slice(0, 4).map((pl) => (
              <div
                key={pl.id}
                className="surface-card rounded-2xl p-3 flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => onInspectPlaylist(pl)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <CoverArt
                    src={pl.coverUrl}
                    alt={pl.title}
                    fallbackGradient={pl.fallbackGradient}
                    className="w-12 h-12 rounded-xl"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-white truncate">{pl.title}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {pl.category} · {pl.trackIds.length} tracks
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onPlayPlaylist(pl)}
                  aria-label={`Play ${pl.title}`}
                  className="min-h-[40px] min-w-[40px] rounded-xl surface-elevated text-white flex items-center justify-center hover:bg-white/10 shrink-0"
                >
                  <Play size={15} className="fill-white ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
