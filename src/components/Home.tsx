import { useState } from 'react';
import {
  Bell,
  CheckCheck,
  FolderOpen,
  HardDrive,
  Play,
  Search as SearchIcon,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import {
  DensityMode,
  LocalStoragePermissionState,
  NotificationItem,
  Playlist,
  ScreenId,
  Track,
} from '../types';
import CoverArt from './CoverArt';
import TrackRow from './TrackRow';
import SkeletonLoader from './SkeletonLoader';
import EmptyState from './EmptyState';

interface HomeProps {
  playlists: Playlist[];
  tracks: Track[];
  notifications: NotificationItem[];
  currentTrackId: string;
  isPlaying: boolean;
  isLoading: boolean;
  likedTrackIds: string[];
  downloadedTrackIds: string[];
  density: DensityMode;
  localStoragePermission: LocalStoragePermissionState;
  onNavigate: (screen: ScreenId) => void;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onInspectPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (trackId: string) => void;
  onToggleLike: (trackId: string) => void;
  onToggleDownload: (trackId: string) => void;
  onOpenTrackMenu: (track: Track) => void;
  onMarkNotificationsRead: () => void;
  onRequestLocalPermission: () => void;
  onDenyLocalPermission: () => void;
}

export default function Home({
  playlists,
  tracks,
  notifications,
  currentTrackId,
  isPlaying,
  isLoading,
  likedTrackIds,
  downloadedTrackIds,
  density,
  localStoragePermission,
  onNavigate,
  onPlayPlaylist,
  onInspectPlaylist,
  onPlayTrack,
  onToggleLike,
  onToggleDownload,
  onOpenTrackMenu,
  onMarkNotificationsRead,
  onRequestLocalPermission,
  onDenyLocalPermission,
}: HomeProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const heroPlaylist = playlists[0];

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-[#F5F5FA]">
          Ready to dive into your sound?
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('search')}
            aria-label="Open search"
            className="min-h-[44px] min-w-[44px] rounded-2xl surface-card flex items-center justify-center text-slate-300 hover:text-[#F5F5FA] hover:border-[var(--accent-border)] transition-colors"
          >
            <SearchIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Notifications"
            className="relative min-h-[44px] min-w-[44px] rounded-2xl surface-card flex items-center justify-center text-slate-300 hover:text-[#F5F5FA] hover:border-[var(--accent-border)] transition-colors"
          >
            <Bell size={18} className={showNotifications ? 'accent-text icon-glow' : ''} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full accent-bg text-[10px] font-mono font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showNotifications && (
        <section aria-label="Notifications" className="surface-elevated rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="label-caps text-xs text-[#F5F5FA]">Updates</h2>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onMarkNotificationsRead}
                className="text-xs accent-text hover:underline flex items-center gap-1 min-h-[36px] px-2"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs font-light text-slate-400 py-2">No notifications yet.</p>
          ) : (
            <div className="divide-y divide-[#F5F5FA]/10">
              {notifications.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${item.read ? 'text-slate-300' : 'text-[#F5F5FA]'}`}>
                      {item.title}
                    </p>
                    <p className="text-xs font-light text-slate-400 mt-0.5">
                      {item.detail} · {item.timeAgo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {localStoragePermission === 'prompt' && (
        <section
          aria-label="Local Storage Permission"
          className="surface-card rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl accent-soft-bg accent-text flex items-center justify-center shrink-0">
              <HardDrive size={20} className="icon-glow" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-[#F5F5FA]">
                Play music from your device’s local storage?
              </h2>
              <p className="text-xs font-light text-slate-400 mt-1">
                Allow access to local storage to import and play MP3, WAV, FLAC, or M4A songs stored on your device.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onDenyLocalPermission}
              className="min-h-[42px] px-4 py-2 rounded-2xl surface-elevated text-xs font-medium text-slate-300 hover:text-[#F5F5FA] whitespace-nowrap"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={onRequestLocalPermission}
              className="min-h-[42px] px-5 py-2 rounded-2xl accent-bg text-xs font-semibold whitespace-nowrap"
            >
              Allow Access
            </button>
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <SkeletonLoader variant="hero" />
          <SkeletonLoader variant="tracks" count={4} />
        </div>
      ) : tracks.length === 0 && playlists.length === 0 ? (
        <EmptyState
          illustration="music"
          title="Your stage is quiet"
          description="All external music servers and starter tracks are cleared. Import audio files from your device to unlock ambient glow, custom EQ, and mixes."
          action={
            <button
              type="button"
              onClick={onRequestLocalPermission}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl accent-bg text-sm font-semibold inline-flex items-center gap-2 transition-transform active:scale-95"
            >
              <FolderOpen size={16} />
              <span>Import Local Music</span>
            </button>
          }
          secondaryAction={
            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl surface-elevated text-[#F5F5FA] text-sm font-medium hover:border-[var(--accent-border)] transition-colors"
            >
              Open Library
            </button>
          }
        />
      ) : (
        <>
          {heroPlaylist && (
            <section className="surface-card rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-6">
              <CoverArt
                src={heroPlaylist.coverUrl}
                alt={heroPlaylist.title}
                fallbackGradient={heroPlaylist.fallbackGradient}
                glow={true}
                glowStrength="strong"
                glowSeed={heroPlaylist.id}
                className="w-full sm:w-44 md:w-48 aspect-square rounded-2xl"
                iconSize={42}
              />
              <div className="flex-1 min-w-0">
                <p className="label-caps text-[10px] accent-text flex items-center gap-1.5">
                  <Sparkles size={13} className="icon-glow" />
                  <span>Local Collection · {heroPlaylist.moodTag}</span>
                </p>
                <h2 className="font-display text-2xl md:text-3xl font-extrabold text-[#F5F5FA] mt-1.5">
                  {heroPlaylist.title}
                </h2>
                <p className="text-sm font-light text-slate-300 mt-1">{heroPlaylist.subtitle}</p>
                <p className="text-xs font-mono tabular-nums text-slate-400 mt-2">
                  {heroPlaylist.trackIds.length} tracks
                </p>
                <div className="flex flex-wrap items-center gap-2.5 mt-5">
                  <button
                    type="button"
                    onClick={() => onPlayPlaylist(heroPlaylist, false)}
                    className="min-h-[44px] px-5 py-2.5 rounded-2xl accent-bg text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-transform active:scale-95"
                  >
                    <Play size={16} className="fill-current" />
                    <span>Play Mix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlayPlaylist(heroPlaylist, true)}
                    className="min-h-[44px] px-4 py-2.5 rounded-2xl surface-elevated text-[#F5F5FA] text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Shuffle size={15} />
                    <span>Shuffle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onInspectPlaylist(heroPlaylist)}
                    className="min-h-[44px] px-4 py-2.5 rounded-2xl text-sm font-medium text-slate-300 hover:text-[#F5F5FA] transition-colors whitespace-nowrap shrink-0"
                  >
                    Inspect Tracks
                  </button>
                </div>
              </div>
            </section>
          )}

          {playlists.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3.5">
                <h2 className="font-display text-lg font-bold text-[#F5F5FA]">Your Playlists</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('library')}
                  className="label-caps text-[10px] accent-text hover:underline min-h-[36px] px-2"
                >
                  Open Library
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="surface-card rounded-2xl p-3.5 flex flex-col hover:border-[#F5F5FA]/20 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onInspectPlaylist(pl)}
                      className="text-left w-full group focus-visible:outline-none"
                    >
                      <div className="relative mb-3 overflow-hidden rounded-2xl">
                        <CoverArt
                          src={pl.coverUrl}
                          alt={pl.title}
                          fallbackGradient={pl.fallbackGradient}
                          glow={true}
                          glowSeed={pl.id}
                          className="w-full aspect-square rounded-2xl group-hover:scale-[1.03] transition-transform duration-200"
                          iconSize={36}
                        />
                      </div>
                      <p className="font-display font-semibold text-sm text-[#F5F5FA] truncate">
                        {pl.title}
                      </p>
                      <p className="text-xs font-light text-slate-400 truncate mt-0.5">
                        {pl.subtitle}
                      </p>
                    </button>
                    <div className="mt-3 pt-3 border-t border-[#F5F5FA]/10 flex items-center justify-between">
                      <span className="text-[11px] font-mono tabular-nums text-slate-400">
                        {pl.trackIds.length} tracks
                      </span>
                      <button
                        type="button"
                        onClick={() => onPlayPlaylist(pl, false)}
                        aria-label={`Play ${pl.title}`}
                        className="min-h-[38px] min-w-[38px] rounded-2xl accent-soft-bg accent-text flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        <Play size={14} className="fill-current ml-0.5 icon-glow" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tracks.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3.5">
                <h2 className="font-display text-lg font-bold text-[#F5F5FA]">Your Songs</h2>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {tracks.length} tracks
                </span>
              </div>
              <div className="space-y-3">
                {tracks.slice(0, 8).map((track) => (
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
            </section>
          )}
        </>
      )}
    </div>
  );
}
