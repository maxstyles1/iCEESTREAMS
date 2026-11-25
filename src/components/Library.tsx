import { useRef, useState } from 'react';
import {
  Download,
  FolderOpen,
  HardDrive,
  Heart,
  ListMusic,
  Lock,
  Music2,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { AudioQuality, DensityMode, Playlist, Track, UserPreferences } from '../types';
import { formatDuration } from '../data/catalog';
import { getAndroidPermissionReport } from '../utils/androidPermissions';
import { CachedStreamEntry } from '../utils/streamCache';
import CoverArt from './CoverArt';
import TrackRow from './TrackRow';

interface LibraryProps {
  tracks: Track[];
  localTracks: Track[];
  cachedStreams: CachedStreamEntry[];
  playlists: Playlist[];
  likedTrackIds: string[];
  downloadedTrackIds: string[];
  currentTrackId: string;
  isPlaying: boolean;
  preferences: UserPreferences;
  onPlayTrack: (trackId: string) => void;
  onAddToQueue: (trackId: string) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onInspectPlaylist: (playlist: Playlist) => void;
  onToggleLike: (trackId: string) => void;
  onToggleDownload: (trackId: string) => void;
  onOpenTrackMenu: (track: Track) => void;
  onCreatePlaylist: (title: string, subtitle: string) => void;
  onClearOfflineDownloads: () => void;
  onClearStreamCache: () => void;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void;
  onRequestLocalPermission: () => void;
  onRescanLocalMusic: () => void;
  onPickFolderFallback: (files: File[]) => void;
  onRemoveLocalTrack: (trackId: string) => void;
  onClearLocalTracks: () => void;
}

type LibraryTab = 'local' | 'downloaded' | 'liked' | 'playlists' | 'storage';
type SortOption = 'recent' | 'title' | 'artist' | 'duration';

export default function Library({
  tracks,
  localTracks,
  cachedStreams,
  playlists,
  likedTrackIds,
  downloadedTrackIds,
  currentTrackId,
  isPlaying,
  preferences,
  onPlayTrack,
  onAddToQueue,
  onPlayPlaylist,
  onInspectPlaylist,
  onToggleLike,
  onToggleDownload,
  onOpenTrackMenu,
  onCreatePlaylist,
  onClearOfflineDownloads,
  onClearStreamCache,
  onUpdatePreferences,
  onRequestLocalPermission,
  onRescanLocalMusic,
  onPickFolderFallback,
  onRemoveLocalTrack,
  onClearLocalTracks,
}: LibraryProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('local');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const folderFallbackRef = useRef<HTMLInputElement | null>(null);

  const downloadedTracks = tracks.filter((t) => downloadedTrackIds.includes(t.id));
  const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));
  const permissionReport = getAndroidPermissionReport(preferences.androidApiProfile);

  const sortTracks = (list: Track[]) => {
    const copy = [...list];
    if (sortBy === 'title') return copy.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'artist') return copy.sort((a, b) => a.artist.localeCompare(b.artist));
    if (sortBy === 'duration') return copy.sort((a, b) => a.durationSec - b.durationSec);
    return copy;
  };

  const downloadedMb = downloadedTracks.reduce((sum, t) => sum + t.sizeMb, 0);
  const localMb = localTracks.reduce((sum, t) => sum + t.sizeMb, 0);
  const cachedStreamsMb =
    cachedStreams.reduce((sum, s) => sum + s.sizeBytes, 0) / (1024 * 1024);
  const qualityMultiplier =
    preferences.offlineQuality === 'lossless'
      ? 3.1
      : preferences.offlineQuality === 'high'
      ? 1
      : 0.45;
  const totalUsedGb = (
    3.4 +
    (downloadedMb * qualityMultiplier + localMb + cachedStreamsMb) / 1024
  ).toFixed(2);
  const storageLimitGb = 50;
  const usagePercent = Math.min(100, Math.round((parseFloat(totalUsedGb) / storageLimitGb) * 100));

  const displayedTracks = sortTracks(
    activeTab === 'local'
      ? localTracks
      : activeTab === 'downloaded'
      ? downloadedTracks
      : likedTracks
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreatePlaylist(newTitle.trim(), newSubtitle.trim() || 'Personal collection');
    setNewTitle('');
    setNewSubtitle('');
    setShowCreateModal(false);
    setActiveTab('playlists');
  };

  const permissionGranted = preferences.localStoragePermission === 'granted';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Library</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Local device audio, cached online streams, favorites, and mixed queues
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl accent-bg text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus size={16} />
          <span>New Playlist</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {(
          [
            {
              id: 'local',
              label: 'Local Device',
              count: `${localTracks.length} files`,
              Icon: Music2,
            },
            {
              id: 'downloaded',
              label: 'Downloaded',
              count: `${downloadedTracks.length} tracks`,
              Icon: Download,
            },
            {
              id: 'liked',
              label: 'Liked',
              count: `${likedTracks.length} tracks`,
              Icon: Heart,
            },
            {
              id: 'playlists',
              label: 'Playlists',
              count: `${playlists.length} lists`,
              Icon: ListMusic,
            },
            {
              id: 'storage',
              label: 'Storage & Cache',
              count: `${totalUsedGb} GB`,
              Icon: HardDrive,
            },
          ] as const
        ).map(({ id, label, count, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`min-h-[76px] rounded-2xl p-3 text-left transition-colors ${
                active
                  ? 'accent-soft-bg border accent-ring'
                  : 'surface-card hover:border-white/20'
              }`}
            >
              <Icon size={18} className={active ? 'accent-text mb-2' : 'text-slate-400 mb-2'} />
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">{count}</p>
            </button>
          );
        })}
      </div>

      {activeTab === 'local' && (
        <div className="space-y-4">
          <input
            ref={folderFallbackRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.aac,.opus"
            multiple
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            className="hidden"
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              if (list.length > 0) {
                onPickFolderFallback(list);
              }
              e.target.value = '';
            }}
          />

          <div className="surface-card rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl accent-soft-bg accent-text flex items-center justify-center shrink-0 mt-0.5">
                {permissionGranted ? <ShieldCheck size={20} /> : <Lock size={20} />}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {permissionGranted
                    ? `${permissionReport.audioPermissionName} Granted`
                    : preferences.localStoragePermission === 'denied'
                    ? `${permissionReport.audioPermissionName} Denied`
                    : `${permissionReport.audioPermissionName} Required`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scans MP3, M4A, WAV, FLAC, and OGG files from device folders. Mix local files into the same queue as online tracks.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onRescanLocalMusic}
                className="min-h-[42px] px-3.5 py-2 rounded-xl surface-elevated text-white hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <RefreshCw size={14} className="accent-text" />
                <span>Rescan</span>
              </button>

              <button
                type="button"
                onClick={() => folderFallbackRef.current?.click()}
                className="min-h-[42px] px-3.5 py-2 rounded-xl surface-elevated text-white hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <FolderOpen size={14} className="accent-text" />
                <span>Folder Picker</span>
              </button>

              <button
                type="button"
                onClick={onRequestLocalPermission}
                className="min-h-[42px] px-4 py-2 rounded-xl accent-bg text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus size={14} />
                <span>{permissionGranted ? 'Import Audio' : 'Grant Access'}</span>
              </button>

              {localTracks.length > 0 && (
                <button
                  type="button"
                  onClick={onClearLocalTracks}
                  aria-label="Clear all imported local tracks"
                  className="min-h-[42px] px-3 py-2 rounded-xl surface-elevated text-rose-300 hover:bg-rose-500/15 text-xs font-medium flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {localTracks.length === 0 ? (
            <div className="surface-card rounded-2xl p-8 text-center space-y-3">
              <Music2 size={28} className="mx-auto text-slate-500" />
              <div>
                <p className="text-sm font-medium text-white">No local music scanned yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Grant {permissionReport.audioPermissionName} or use Folder Picker to scan MP3, M4A, WAV, FLAC, or OGG tracks on your device.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onRequestLocalPermission}
                  className="min-h-[44px] px-5 py-2 rounded-xl accent-bg text-white text-xs font-medium"
                >
                  Grant Permission & Scan
                </button>
                <button
                  type="button"
                  onClick={() => folderFallbackRef.current?.click()}
                  className="min-h-[44px] px-4 py-2 rounded-xl surface-elevated text-white text-xs font-medium"
                >
                  Open Folder Picker
                </button>
              </div>
            </div>
          ) : (
            <div className="surface-card rounded-2xl p-2 divide-y divide-white/[0.06]">
              {sortTracks(localTracks).map((track) => (
                <div key={track.id} className="flex items-center gap-1">
                  <div className="flex-1 min-w-0">
                    <TrackRow
                      track={track}
                      isCurrent={track.id === currentTrackId}
                      isPlaying={isPlaying}
                      isLiked={likedTrackIds.includes(track.id)}
                      isDownloaded={true}
                      density={preferences.density}
                      onPlay={onPlayTrack}
                      onToggleLike={onToggleLike}
                      onToggleDownload={() => {}}
                      onOpenMenu={onOpenTrackMenu}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddToQueue(track.id)}
                    aria-label={`Add ${track.title} to queue`}
                    className="hidden sm:flex min-h-[38px] px-2.5 rounded-lg surface-elevated text-xs text-slate-300 hover:text-white items-center gap-1 shrink-0"
                  >
                    <Plus size={12} />
                    <span>Queue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveLocalTrack(track.id)}
                    aria-label={`Remove ${track.title} from local storage`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 shrink-0 mr-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'downloaded' || activeTab === 'liked') && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-mono tabular-nums text-slate-400">
              {activeTab === 'downloaded' ? 'Offline Downloads' : 'Liked Songs'} · {displayedTracks.length} tracks
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="lib-sort" className="sr-only">
                Sort tracks
              </label>
              <select
                id="lib-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-[38px] surface-card rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="recent">Recently Added</option>
                <option value="title">Title (A–Z)</option>
                <option value="artist">Artist (A–Z)</option>
                <option value="duration">Duration</option>
              </select>

              <div className="flex items-center p-0.5 surface-card rounded-xl">
                {(['comfortable', 'compact'] as DensityMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdatePreferences({ density: mode })}
                    className={`min-h-[34px] px-2.5 rounded-lg text-xs capitalize transition-colors ${
                      preferences.density === mode
                        ? 'accent-bg text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {displayedTracks.length === 0 ? (
            <div className="surface-card rounded-2xl p-8 text-center">
              <p className="text-sm font-medium text-white">
                {activeTab === 'downloaded' ? 'No offline downloads yet' : 'No liked tracks yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'downloaded'
                  ? 'Tap the download icon on any track to save it for offline playback.'
                  : 'Tap the heart icon on any song to build your favorites list.'}
              </p>
            </div>
          ) : (
            <div className="surface-card rounded-2xl p-2 divide-y divide-white/[0.06]">
              {displayedTracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isCurrent={track.id === currentTrackId}
                  isPlaying={isPlaying}
                  isLiked={likedTrackIds.includes(track.id)}
                  isDownloaded={downloadedTrackIds.includes(track.id)}
                  density={preferences.density}
                  onPlay={onPlayTrack}
                  onToggleLike={onToggleLike}
                  onToggleDownload={onToggleDownload}
                  onOpenMenu={onOpenTrackMenu}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'playlists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {playlists.map((pl) => {
            const totalDuration = pl.trackIds.reduce((sum, id) => {
              const t = tracks.find((item) => item.id === id);
              return sum + (t ? t.durationSec : 0);
            }, 0);
            return (
              <div
                key={pl.id}
                className="surface-card rounded-2xl p-3 flex items-center gap-3 hover:border-white/20 transition-colors"
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
                    className="w-14 h-14 rounded-xl"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-white truncate">{pl.title}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{pl.subtitle}</p>
                    <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-1">
                      {pl.trackIds.length} tracks · {formatDuration(totalDuration)}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onPlayPlaylist(pl)}
                  aria-label={`Play ${pl.title}`}
                  className="min-h-[44px] min-w-[44px] rounded-xl surface-elevated text-white flex items-center justify-center hover:bg-white/10 shrink-0"
                >
                  <Play size={16} className="fill-white ml-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="surface-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl accent-soft-bg accent-text flex items-center justify-center">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Local & Cached Stream Storage</h2>
                  <p className="text-xs text-slate-400">
                    {localTracks.length} local files · {cachedStreams.length} cached online streams
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono tabular-nums text-white font-semibold">
                {totalUsedGb} / {storageLimitGb} GB
              </span>
            </div>

            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full accent-gradient rounded-full transition-all duration-300"
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="surface-elevated rounded-xl p-3">
                <p className="text-slate-400">Local Device Audio</p>
                <p className="font-mono tabular-nums text-sm font-semibold text-white mt-1">
                  {localMb.toFixed(1)} MB
                </p>
              </div>
              <div className="surface-elevated rounded-xl p-3">
                <p className="text-slate-400">Recently Cached Streams</p>
                <p className="font-mono tabular-nums text-sm font-semibold text-white mt-1">
                  {cachedStreamsMb.toFixed(1)} MB
                </p>
              </div>
              <div className="surface-elevated rounded-xl p-3">
                <p className="text-slate-400">Offline Catalog Audio</p>
                <p className="font-mono tabular-nums text-sm font-semibold text-white mt-1">
                  {(downloadedMb * qualityMultiplier).toFixed(1)} MB
                </p>
              </div>
            </div>
          </div>

          {cachedStreams.length > 0 && (
            <div className="surface-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Recently Cached Online Streams</h3>
                  <p className="text-xs text-slate-400">
                    Stored locally for instant replay without burning mobile data
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClearStreamCache}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl surface-elevated text-rose-300 hover:bg-rose-500/15 text-xs font-medium"
                >
                  Clear Stream Cache
                </button>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {cachedStreams.map((entry) => (
                  <div
                    key={entry.trackId}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {entry.artist} · {(entry.sizeBytes / (1024 * 1024)).toFixed(1)} MB cached
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayTrack(entry.trackId)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl accent-soft-bg accent-text text-xs font-medium flex items-center gap-1.5 shrink-0"
                    >
                      <Play size={13} className="fill-current" />
                      <span>Play Cached</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="surface-card rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white mb-2">Offline Download Quality</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'standard', label: 'Standard', spec: '128 kbps' },
                    { id: 'high', label: 'High', spec: '320 kbps' },
                    { id: 'lossless', label: 'Lossless', spec: 'FLAC' },
                  ] as { id: AudioQuality; label: string; spec: string }[]
                ).map((q) => {
                  const active = preferences.offlineQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onUpdatePreferences({ offlineQuality: q.id })}
                      className={`min-h-[54px] p-2.5 rounded-xl text-left transition-colors ${
                        active
                          ? 'accent-soft-bg border accent-ring'
                          : 'surface-elevated hover:bg-white/5'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${active ? 'accent-text' : 'text-white'}`}>
                        {q.label}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{q.spec}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={onClearOfflineDownloads}
                disabled={downloadedTracks.length === 0}
                className="min-h-[44px] px-4 py-2 rounded-xl surface-elevated text-rose-300 hover:bg-rose-500/15 text-xs font-medium flex items-center gap-2 disabled:opacity-40"
              >
                <Trash2 size={15} />
                <span>Clear Offline Downloads</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Create playlist"
        >
          <form
            onSubmit={handleCreateSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md surface-elevated rounded-2xl p-5 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-white">Create New Playlist</h2>
            <div>
              <label htmlFor="new-pl-title" className="text-xs text-slate-400 block mb-1">
                Playlist Name
              </label>
              <input
                id="new-pl-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Late Night Coding..."
                className="w-full min-h-[44px] bg-black/45 border border-white/15 rounded-xl px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label htmlFor="new-pl-sub" className="text-xs text-slate-400 block mb-1">
                Description (optional)
              </label>
              <input
                id="new-pl-sub"
                type="text"
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="Deep bass and focus textures"
                className="w-full min-h-[44px] bg-black/45 border border-white/15 rounded-xl px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl surface-card text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-xl accent-bg text-white text-xs font-medium"
              >
                Create Playlist
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
