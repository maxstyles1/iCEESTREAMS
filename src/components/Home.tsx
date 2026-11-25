import { useState } from 'react';
import { Bell, CheckCheck, HardDrive, Play, Search as SearchIcon, Shuffle, Sparkles } from 'lucide-react';
import {
  DensityMode,
  LanguageCode,
  LocalStoragePermissionState,
  NotificationItem,
  Playlist,
  ScreenId,
  Track,
} from '../types';
import CoverArt from './CoverArt';
import TrackRow from './TrackRow';

interface HomeProps {
  playlists: Playlist[];
  tracks: Track[];
  notifications: NotificationItem[];
  currentTrackId: string;
  isPlaying: boolean;
  likedTrackIds: string[];
  downloadedTrackIds: string[];
  density: DensityMode;
  language: LanguageCode;
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

const GREETINGS: Record<LanguageCode, string> = {
  en: 'Good evening, Alex',
  es: 'Buenas noches, Alex',
  fr: 'Bonsoir, Alex',
  de: 'Guten Abend, Alex',
  pt: 'Boa noite, Alex',
};

const MOOD_FILTERS = ['All', 'Chill', 'Focus', 'Night Drive', 'High Energy'] as const;

export default function Home({
  playlists,
  tracks,
  notifications,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  downloadedTrackIds,
  density,
  language,
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
  const [moodFilter, setMoodFilter] = useState<(typeof MOOD_FILTERS)[number]>('All');
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredPlaylists =
    moodFilter === 'All'
      ? playlists
      : playlists.filter((p) => p.moodTag === moodFilter);

  const madeForYou = filteredPlaylists.filter(
    (p) => p.category === 'Made for you' || p.isUserCreated
  );
  const trending = filteredPlaylists.filter((p) => p.category === 'Trending');
  const heroPlaylist = filteredPlaylists[0] || playlists[0];

  const quickPickTracks =
    moodFilter === 'All'
      ? tracks.slice(0, 4)
      : tracks
          .filter((t) =>
            moodFilter === 'Night Drive'
              ? t.bpm >= 95 && t.bpm <= 125
              : moodFilter === 'High Energy'
              ? t.mood === 'Energetic'
              : t.mood === moodFilter
          )
          .slice(0, 4);

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{GREETINGS[language]}</p>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white mt-0.5">
            Ready to dive into your sound?
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('search')}
            aria-label="Open search"
            className="min-h-[44px] min-w-[44px] rounded-xl surface-card flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <SearchIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Notifications"
            className="relative min-h-[44px] min-w-[44px] rounded-xl surface-card flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full accent-bg text-[10px] font-mono font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showNotifications && (
        <section
          aria-label="Notifications"
          className="surface-elevated rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Updates & Releases</h2>
            <button
              type="button"
              onClick={onMarkNotificationsRead}
              className="text-xs accent-text hover:underline flex items-center gap-1 min-h-[36px] px-2"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          </div>
          <div className="divide-y divide-white/10">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${item.read ? 'text-slate-300' : 'text-white'}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.detail} · {item.timeAgo}
                  </p>
                </div>
                {item.trackId && (
                  <button
                    type="button"
                    onClick={() => onPlayTrack(item.trackId!)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg surface-card text-xs font-medium text-white hover:bg-white/10 shrink-0 flex items-center gap-1.5"
                  >
                    <Play size={12} className="fill-white" />
                    <span>Play</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {localStoragePermission === 'prompt' && (
        <section
          aria-label="Local Storage Permission"
          className="surface-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl accent-soft-bg accent-text flex items-center justify-center shrink-0">
              <HardDrive size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Play music from your device’s local storage?
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Allow access to local storage to import and play MP3, WAV, FLAC, or M4A songs stored on your device.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDenyLocalPermission}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl surface-elevated text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={onRequestLocalPermission}
              className="min-h-[40px] px-4 py-1.5 rounded-xl accent-bg text-white text-xs font-medium whitespace-nowrap"
            >
              Allow Access
            </button>
          </div>
        </section>
      )}

      <div
        role="tablist"
        aria-label="Mood filter"
        className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1"
      >
        {MOOD_FILTERS.map((mood) => {
          const active = moodFilter === mood;
          return (
            <button
              key={mood}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMoodFilter(mood)}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'accent-bg text-white'
                  : 'surface-card text-slate-300 hover:text-white'
              }`}
            >
              {mood === 'All' ? 'All Mixes' : mood}
            </button>
          );
        })}
      </div>

      {heroPlaylist && (
        <section className="surface-card rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
          <CoverArt
            src={heroPlaylist.coverUrl}
            alt={heroPlaylist.title}
            fallbackGradient={heroPlaylist.fallbackGradient}
            className="w-full sm:w-36 md:w-40 aspect-square rounded-xl"
            iconSize={36}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} className="accent-text" />
              <span>Featured Selection · {heroPlaylist.moodTag}</span>
            </p>
            <h2 className="font-display text-xl md:text-2xl font-bold text-white mt-1">
              {heroPlaylist.title}
            </h2>
            <p className="text-sm text-slate-300 mt-1">{heroPlaylist.subtitle}</p>
            <p className="text-xs font-mono tabular-nums text-slate-400 mt-2">
              {heroPlaylist.trackIds.length} tracks · Curated for your rotation
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => onPlayPlaylist(heroPlaylist, false)}
                className="min-h-[44px] px-5 py-2 rounded-xl accent-bg text-white text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Play size={16} className="fill-white" />
                <span>Play Mix</span>
              </button>
              <button
                type="button"
                onClick={() => onPlayPlaylist(heroPlaylist, true)}
                className="min-h-[44px] px-4 py-2 rounded-xl surface-elevated text-white text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
              >
                <Shuffle size={15} />
                <span>Shuffle</span>
              </button>
              <button
                type="button"
                onClick={() => onInspectPlaylist(heroPlaylist)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Inspect Tracks
              </button>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-lg font-semibold text-white">Made for you</h2>
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className="text-xs font-medium accent-text hover:underline min-h-[36px] px-2"
          >
            Open Library
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(madeForYou.length > 0 ? madeForYou : playlists.slice(0, 3)).map((pl) => (
            <div
              key={pl.id}
              className="surface-card rounded-2xl p-3 flex flex-col hover:border-white/20 transition-colors"
            >
              <button
                type="button"
                onClick={() => onInspectPlaylist(pl)}
                className="text-left w-full group focus-visible:outline-none"
              >
                <div className="relative mb-2.5 overflow-hidden rounded-xl">
                  <CoverArt
                    src={pl.coverUrl}
                    alt={pl.title}
                    fallbackGradient={pl.fallbackGradient}
                    className="w-full aspect-square rounded-xl group-hover:scale-[1.03] transition-transform duration-200"
                    iconSize={32}
                  />
                </div>
                <p className="font-medium text-sm text-white truncate">{pl.title}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{pl.subtitle}</p>
              </button>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {pl.trackIds.length} tracks
                </span>
                <button
                  type="button"
                  onClick={() => onPlayPlaylist(pl, false)}
                  aria-label={`Play ${pl.title}`}
                  className="min-h-[36px] min-w-[36px] rounded-lg accent-soft-bg accent-text flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Play size={14} className="fill-current ml-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {trending.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-display text-lg font-semibold text-white">Trending Playlists</h2>
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="text-xs font-medium accent-text hover:underline min-h-[36px] px-2"
            >
              Explore All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trending.map((pl) => (
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
                      {pl.trackIds.length} songs · {pl.moodTag}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onPlayPlaylist(pl, false)}
                  aria-label={`Play ${pl.title}`}
                  className="min-h-[44px] min-w-[44px] rounded-xl accent-bg text-white flex items-center justify-center shrink-0"
                >
                  <Play size={16} className="fill-white ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-display text-lg font-semibold text-white">Quick Picks</h2>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {quickPickTracks.length} tracks
          </span>
        </div>
        <div className="surface-card rounded-2xl p-2 divide-y divide-white/[0.06]">
          {quickPickTracks.map((track) => (
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
    </div>
  );
}
