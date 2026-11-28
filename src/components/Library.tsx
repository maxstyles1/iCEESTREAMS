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
import CoverArt from './CoverArt';
import TrackRow from './TrackRow';
import SkeletonLoader from './SkeletonLoader';
import EmptyState from './EmptyState';

interface LibraryProps {
  tracks: Track[];
  localTracks: Track[];
  playlists: Playlist[];
  likedTrackIds: string[];
  downloadedTrackIds: string[];
  currentTrackId: string;
  isPlaying: boolean;
  isLoading: boolean;
  isScanning: boolean;
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
  playlists,
  likedTrackIds,
  downloadedTrackIds,
  currentTrackId,
  isPlaying,
  isLoading,
  isScanning,
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
  const qualityMultiplier =
    preferences.offlineQuality === 'lossless'
      ? 3.1
      : preferences.offlineQuality === 'high'
      ? 1
      : 0.45;
  const totalUsedGb = ((downloadedMb * qualityMultiplier + localMb) / 1024).toFixed(2);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#F5F5FA]">Library</h1>
          <p className="text-slate-400 text-sm font-light mt-0.5">
            Local device audio, favorites, playlists, and storage
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="min-h-[44px] px-4 py-2 rounded-2xl accent-bg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-transform active:scale-95"
        >
          <Plus size={16} />
          <span>New Playlist</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
              label: 'Storage',
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
              className={`min-h-[82px] rounded-2xl p-3.5 text-left transition-all duration-200 ${
                active
                  ? 'accent-soft-bg border accent-ring accent-glow-ring'
                  : 'surface-card hover:border-[#F5F5FA]/20'
              }`}
            >
              <span
                key={active ? `${id}-active` : `${id}-idle`}
                className={`inline-block mb-2 ${active ? 'animate-tab-bounce' : ''}`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.75}
                  fill={active ? 'currentColor' : 'none'}
                  fillOpacity={active ? 0.24 : 0}
                  className={active ? 'accent-text icon-glow' : 'text-slate-400'}
                />
              </span>
              <p className="label-caps text-[10px] text-[#F5F5FA]">{label}</p>
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

          <div className="surface-card rounded-3xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl accent-soft-bg accent-text flex items-center justify-center shrink-0">
                {permissionGranted ? (
                  <ShieldCheck size={20} className="icon-glow" />
                ) : (
                  <Lock size={20} />
                )}
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-[#F5F5FA]">
                  {permissionGranted
                    ? `${permissionReport.audioPermissionName} Granted`
                    : preferences.localStoragePermission === 'denied'
                    ? `${permissionReport.audioPermissionName} Denied`
                    : `${permissionReport.audioPermissionName} Required`}
                </h2>
                <p className="text-xs font-light text-slate-400 mt-0.5">
                  Scans MP3, M4A, WAV, FLAC, and OGG files from your device folders.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onRescanLocalMusic}
                disabled={isScanning}
                className="min-h-[42px] px-4 py-2 rounded-2xl surface-elevated text-[#F5F5FA] hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
              >
                <RefreshCw
                  size={14}
                  className={`accent-text ${isScanning ? 'animate-spin' : ''}`}
                />
                <span>{isScanning ? 'Scanning…' : 'Rescan'}</span>
              </button>

              <button
                type="button"
                onClick={() => folderFallbackRef.current?.click()}
                className="min-h-[42px] px-4 py-2 rounded-2xl surface-elevated text-[#F5F5FA] hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <FolderOpen size={14} className="accent-text" />
                <span>Folder Picker</span>
              </button>

              <button
                type="button"
                onClick={onRequestLocalPermission}
                className="min-h-[42px] px-4 py-2 rounded-2xl accent-bg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus size={14} />
                <span>{permissionGranted ? 'Import Audio' : 'Grant Access'}</span>
              </button>

              {localTracks.length > 0 && (
                <button
                  type="button"
                  onClick={onClearLocalTracks}
                  aria-label="Clear all imported local tracks"
                  className="min-h-[42px] px-3.5 py-2 rounded-2xl surface-elevated text-rose-300 hover:bg-rose-500/15 text-xs font-medium flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {isLoading || isScanning ? (
            <SkeletonLoader variant="tracks" count={4} />
          ) : localTracks.length === 0 ? (
            <EmptyState
              illustration="music"
              title="No local music scanned yet"
              description={`Grant ${permissionReport.audioPermissionName} or use Folder Picker to scan MP3, M4A, WAV, FLAC, or OGG tracks on your device.`}
              action={
                <button
                  type="button"
                  onClick={onRequestLocalPermission}
                  className="min-h-[44px] px-5 py-2.5 rounded-2xl accent-bg text-xs font-semibold"
                >
                  Grant Permission & Scan
                </button>
              }
              secondaryAction={
                <button
                  type="button"
                  onClick={() => folderFallbackRef.current?.click()}
                  className="min-h-[44px] px-5 py-2.5 rounded-2xl surface-elevated text-[#F5F5FA] text-xs font-medium"
                >
                  Open Folder Picker
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {sortTracks(localTracks).map((track) => (
                <div key={track.id} className="flex items-center gap-2">
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
                    className="hidden sm:flex min-h-[44px] px-3 rounded-2xl surface-card text-xs text-slate-300 hover:text-[#F5F5FA] items-center gap-1 shrink-0"
                  >
                    <Plus size={13} className="accent-text" />
                    <span>Queue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveLocalTrack(track.id)}
                    aria-label={`Remove ${track.title} from local storage`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl surface-card text-slate-400 hover:text-rose-400 shrink-0"
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
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label-caps text-[11px] text-slate-400 tabular-nums">
              {activeTab === 'downloaded' ? 'Offline Downloads' : 'Liked Songs'} ·{' '}
              {displayedTracks.length} tracks
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="lib-sort" className="sr-only">
                Sort tracks
              </label>
              <select
                id="lib-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-[40px] surface-card rounded-2xl px-3.5 py-1.5 text-xs text-[#F5F5FA] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="recent">Recently Added</option>
                <option value="title">Title (A–Z)</option>
                <option value="artist">Artist (A–Z)</option>
                <option value="duration">Duration</option>
              </select>

              <div className="flex items-center p-1 surface-card rounded-2xl">
                {(['comfortable', 'compact'] as DensityMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdatePreferences({ density: mode })}
                    className={`min-h-[34px] px-3 rounded-xl text-xs capitalize transition-colors ${
                      preferences.density === mode
                        ? 'accent-bg font-semibold'
                        : 'text-slate-400 hover:text-[#F5F5FA]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <SkeletonLoader variant="tracks" count={4} />
          ) : displayedTracks.length === 0 ? (
            <EmptyState
              illustration={activeTab === 'liked' ? 'heart' : 'music'}
              title={
                activeTab === 'downloaded'
                  ? 'No offline downloads yet'
                  : 'No liked tracks yet'
              }
              description={
                activeTab === 'downloaded'
                  ? 'Tap the download icon on any track to save it for offline playback.'
                  : 'Tap the heart icon on any song to build your favorites list.'
              }
            />
          ) : (
            <div className="space-y-3">
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
        isLoading ? (
          <SkeletonLoader variant="grid" count={3} />
        ) : playlists.length === 0 ? (
          <EmptyState
            illustration="playlist"
            title="No playlists created yet"
            description="Create a playlist or import local tracks to automatically build your Local Device mix."
            action={
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl accent-bg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Create Playlist</span>
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {playlists.map((pl) => {
              const totalDuration = pl.trackIds.reduce((sum, id) => {
                const t = tracks.find((item) => item.id === id);
                return sum + (t ? t.durationSec : 0);
              }, 0);
              return (
                <div
                  key={pl.id}
                  className="surface-card rounded-2xl p-4 flex items-center gap-3.5 hover:border-[#F5F5FA]/20 transition-colors"
                >
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
                      className="w-16 h-16 rounded-2xl"
                    />
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-sm text-[#F5F5FA] truncate">
                        {pl.title}
                      </p>
                      <p className="text-xs font-light text-slate-400 truncate mt-0.5">
                        {pl.subtitle}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-1">
                        {pl.trackIds.length} tracks · {formatDuration(totalDuration)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlayPlaylist(pl)}
                    aria-label={`Play ${pl.title}`}
                    className="min-h-[44px] min-w-[44px] rounded-2xl surface-elevated text-[#F5F5FA] flex items-center justify-center hover:bg-white/10 shrink-0"
                  >
                    <Play size={16} className="fill-current ml-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="surface-card rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl accent-soft-bg accent-text flex items-center justify-center">
                  <FolderOpen size={20} className="icon-glow" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-[#F5F5FA]">
                    Local Device Storage
                  </h2>
                  <p className="text-xs font-light text-slate-400">
                    {localTracks.length} imported local audio files
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono tabular-nums text-[#F5F5FA] font-semibold">
                {totalUsedGb} / {storageLimitGb} GB
              </span>
            </div>

            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full accent-gradient rounded-full transition-all duration-300"
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="surface-elevated rounded-2xl p-3.5">
                <p className="text-slate-400">Local Device Audio</p>
                <p className="font-mono tabular-nums text-sm font-semibold text-[#F5F5FA] mt-1">
                  {localMb.toFixed(1)} MB
                </p>
              </div>
              <div className="surface-elevated rounded-2xl p-3.5">
                <p className="text-slate-400">Saved Offline Tracks</p>
                <p className="font-mono tabular-nums text-sm font-semibold text-[#F5F5FA] mt-1">
                  {(downloadedMb * qualityMultiplier).toFixed(1)} MB
                </p>
              </div>
            </div>
          </div>

          <div className="surface-card rounded-3xl p-5 space-y-4">
            <div>
              <p className="font-display text-sm font-bold text-[#F5F5FA] mb-2.5">
                Offline Download Quality
              </p>
              <div className="grid grid-cols-3 gap-2.5">
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
                      className={`min-h-[58px] p-3 rounded-2xl text-left transition-colors ${
                        active
                          ? 'accent-soft-bg border accent-ring accent-glow-ring'
                          : 'surface-elevated hover:bg-white/5'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${active ? 'accent-text' : 'text-[#F5F5FA]'}`}>
                        {q.label}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{q.spec}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#F5F5FA]/10 flex justify-end">
              <button
                type="button"
                onClick={onClearOfflineDownloads}
                disabled={downloadedTracks.length === 0}
                className="min-h-[44px] px-4 py-2 rounded-2xl surface-elevated text-rose-300 hover:bg-rose-500/15 text-xs font-medium flex items-center gap-2 disabled:opacity-40"
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
            className="w-full max-w-md surface-elevated rounded-3xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-[#F5F5FA]">
              Create New Playlist
            </h2>
            <div>
              <label htmlFor="new-pl-title" className="text-xs text-slate-400 block mb-1.5">
                Playlist Name
              </label>
              <input
                id="new-pl-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Late Night Coding..."
                className="w-full min-h-[44px] bg-black/45 border border-white/15 rounded-2xl px-3.5 text-sm text-[#F5F5FA] placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label htmlFor="new-pl-sub" className="text-xs text-slate-400 block mb-1.5">
                Description (optional)
              </label>
              <input
                id="new-pl-sub"
                type="text"
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="Deep bass and focus textures"
                className="w-full min-h-[44px] bg-black/45 border border-white/15 rounded-2xl px-3.5 text-sm text-[#F5F5FA] placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-2xl surface-card text-xs font-medium text-slate-300 hover:text-[#F5F5FA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-2xl accent-bg text-xs font-semibold"
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
