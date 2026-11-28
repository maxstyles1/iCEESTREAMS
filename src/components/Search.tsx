import { useState } from 'react';
import {
  FolderOpen,
  Play,
  RotateCcw,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DensityMode, Playlist, Track } from '../types';
import CoverArt from './CoverArt';
import TrackRow from './TrackRow';
import EmptyState from './EmptyState';
import SkeletonLoader from './SkeletonLoader';

interface SearchProps {
  tracks: Track[];
  playlists: Playlist[];
  currentTrackId: string;
  isPlaying: boolean;
  isLoading: boolean;
  likedTrackIds: string[];
  downloadedTrackIds: string[];
  density: DensityMode;
  onPlayTrack: (trackId: string) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onInspectPlaylist: (playlist: Playlist) => void;
  onToggleLike: (trackId: string) => void;
  onToggleDownload: (trackId: string) => void;
  onOpenTrackMenu: (track: Track) => void;
  onOpenLibraryLocal: () => void;
}

function normalizeClientQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Search({
  tracks,
  playlists,
  currentTrackId,
  isPlaying,
  isLoading,
  likedTrackIds,
  downloadedTrackIds,
  density,
  onPlayTrack,
  onPlayPlaylist,
  onInspectPlaylist,
  onToggleLike,
  onToggleDownload,
  onOpenTrackMenu,
  onOpenLibraryLocal,
}: SearchProps) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const [mood, setMood] = useState('Any');
  const [bpmRange, setBpmRange] = useState('Any');
  const [sortBy, setSortBy] = useState<'relevance' | 'bpm-asc' | 'bpm-desc' | 'duration'>(
    'relevance'
  );
  const [showFilters, setShowFilters] = useState(false);

  const resetFilters = () => {
    setQuery('');
    setGenre('All');
    setMood('Any');
    setBpmRange('Any');
    setSortBy('relevance');
  };

  const hasActiveFilters =
    query !== '' ||
    genre !== 'All' ||
    mood !== 'Any' ||
    bpmRange !== 'Any' ||
    sortBy !== 'relevance';

  const filteredTracks = tracks
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#F5F5FA]">
            Search Library
          </h1>
          <p className="text-slate-400 text-sm font-light mt-0.5">
            Search songs and playlists imported from your device
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
            showFilters
              ? 'accent-soft-bg border accent-ring text-[#F5F5FA]'
              : 'surface-card text-[#F5F5FA] hover:border-[var(--accent-border)]'
          }`}
        >
          <SlidersHorizontal size={14} className="accent-text icon-glow" />
          <span>Filters</span>
        </button>
      </div>

      <div className="relative">
        <SearchIcon
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search local songs, artists, or playlists..."
          aria-label="Search local music"
          className="w-full min-h-[50px] surface-card rounded-2xl py-3 pl-11 pr-11 text-sm text-[#F5F5FA] placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search query"
            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-[#F5F5FA]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showFilters && (
        <section aria-label="Search filters" className="surface-card rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="label-caps text-xs text-[#F5F5FA]">Filters</h2>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <label htmlFor="filter-genre" className="text-slate-400 text-xs block mb-1.5">
                Genre
              </label>
              <select
                id="filter-genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-2xl px-3 py-2 text-xs text-[#F5F5FA] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="All">All Genres</option>
                <option value="Local">Local Device</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-mood" className="text-slate-400 text-xs block mb-1.5">
                Mood
              </label>
              <select
                id="filter-mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-2xl px-3 py-2 text-xs text-[#F5F5FA] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="Any">Any Mood</option>
                <option value="Chill">Chill</option>
                <option value="Energetic">Energetic</option>
                <option value="Melancholic">Melancholic</option>
                <option value="Focus">Focus</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-bpm" className="text-slate-400 text-xs block mb-1.5">
                Tempo (BPM)
              </label>
              <select
                id="filter-bpm"
                value={bpmRange}
                onChange={(e) => setBpmRange(e.target.value)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-2xl px-3 py-2 text-xs text-[#F5F5FA] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="Any">Any BPM</option>
                <option value="60-90">60–90 BPM</option>
                <option value="90-120">90–120 BPM</option>
                <option value="120+">120+ BPM</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-sort" className="text-slate-400 text-xs block mb-1.5">
                Sort By
              </label>
              <select
                id="filter-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-2xl px-3 py-2 text-xs text-[#F5F5FA] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="relevance">Relevance</option>
                <option value="bpm-asc">BPM: Low to High</option>
                <option value="bpm-desc">BPM: High to Low</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-bold text-[#F5F5FA]">Local Device Songs</h2>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {filteredTracks.length} {filteredTracks.length === 1 ? 'song' : 'songs'}
          </span>
        </div>

        {isLoading ? (
          <SkeletonLoader variant="tracks" count={4} />
        ) : tracks.length === 0 ? (
          <EmptyState
            illustration="music"
            title="No songs in your library"
            description="Import MP3, M4A, WAV, FLAC, or OGG files from your device to search and play them here."
            action={
              <button
                type="button"
                onClick={onOpenLibraryLocal}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl accent-bg text-xs font-semibold inline-flex items-center gap-2"
              >
                <FolderOpen size={15} />
                <span>Import Local Music</span>
              </button>
            }
          />
        ) : filteredTracks.length === 0 ? (
          <EmptyState
            illustration="search"
            title="No matching songs found"
            description="Try a different keyword or reset your active filters."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl accent-bg text-xs font-semibold"
              >
                Reset Filters
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredTracks.map((track) => (
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

      {matchingPlaylists.length > 0 && (
        <section>
          <h2 className="font-display text-base font-bold text-[#F5F5FA] mb-3">Playlists</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {matchingPlaylists.slice(0, 4).map((pl) => (
              <div key={pl.id} className="surface-card rounded-2xl p-3.5 flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onInspectPlaylist(pl)}
                  className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                >
                  <CoverArt
                    src={pl.coverUrl}
                    alt={pl.title}
                    fallbackGradient={pl.fallbackGradient}
                    glow={true}
                    glowSeed={pl.id}
                    className="w-14 h-14 rounded-2xl"
                  />
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm text-[#F5F5FA] truncate">
                      {pl.title}
                    </p>
                    <p className="text-xs font-light text-slate-400 truncate mt-0.5">
                      {pl.category} · {pl.trackIds.length} tracks
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onPlayPlaylist(pl)}
                  aria-label={`Play ${pl.title}`}
                  className="min-h-[42px] min-w-[42px] rounded-2xl surface-elevated text-[#F5F5FA] flex items-center justify-center hover:bg-white/10 shrink-0"
                >
                  <Play size={15} className="fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
