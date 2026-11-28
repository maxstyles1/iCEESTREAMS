import { Download, Play, Shuffle, X } from 'lucide-react';
import { DensityMode, Playlist, Track } from '../types';
import { formatDuration } from '../data/catalog';
import CoverArt from './CoverArt';
import TrackRow from './TrackRow';

interface PlaylistDetailModalProps {
  playlist: Playlist | null;
  tracks: Track[];
  currentTrackId: string;
  isPlaying: boolean;
  likedTrackIds: string[];
  downloadedTrackIds: string[];
  density: DensityMode;
  onClose: () => void;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onPlayTrack: (trackId: string) => void;
  onToggleLike: (trackId: string) => void;
  onToggleDownload: (trackId: string) => void;
  onDownloadAll: (trackIds: string[]) => void;
  onOpenTrackMenu: (track: Track) => void;
}

export default function PlaylistDetailModal({
  playlist,
  tracks,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  downloadedTrackIds,
  density,
  onClose,
  onPlayPlaylist,
  onPlayTrack,
  onToggleLike,
  onToggleDownload,
  onDownloadAll,
  onOpenTrackMenu,
}: PlaylistDetailModalProps) {
  if (!playlist) return null;

  const playlistTracks = playlist.trackIds
    .map((id) => tracks.find((t) => t.id === id))
    .filter((t): t is Track => Boolean(t));

  const totalSec = playlistTracks.reduce((sum, t) => sum + t.durationSec, 0);
  const allDownloaded =
    playlistTracks.length > 0 && playlistTracks.every((t) => downloadedTrackIds.includes(t.id));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={playlist.title}
    >
      <div
        className="w-full md:max-w-2xl surface-elevated rounded-t-3xl md:rounded-3xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[#F5F5FA]/10 flex items-start gap-4">
          <CoverArt
            src={playlist.coverUrl}
            alt={playlist.title}
            fallbackGradient={playlist.fallbackGradient}
            glow={true}
            glowSeed={playlist.id}
            className="w-24 h-24 md:w-28 md:h-28 rounded-2xl"
            iconSize={32}
          />
          <div className="flex-1 min-w-0">
            <p className="label-caps text-[10px] accent-text">
              {playlist.category} · {playlist.moodTag}
            </p>
            <h2 className="font-display text-xl md:text-2xl font-extrabold text-[#F5F5FA] truncate mt-1">
              {playlist.title}
            </h2>
            <p className="text-sm font-light text-slate-300 mt-1 line-clamp-2">
              {playlist.subtitle}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-400 mt-2">
              {playlistTracks.length} tracks · {formatDuration(totalSec)} total
              {playlist.collaborators ? ` · ${playlist.collaborators} collaborators` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close playlist details"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-slate-400 hover:text-[#F5F5FA] hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-3.5 border-b border-[#F5F5FA]/10 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onPlayPlaylist(playlist, false)}
            disabled={playlistTracks.length === 0}
            className="min-h-[44px] px-5 py-2 rounded-2xl accent-bg text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-40"
          >
            <Play size={16} className="fill-current" />
            <span>Play All</span>
          </button>

          <button
            type="button"
            onClick={() => onPlayPlaylist(playlist, true)}
            disabled={playlistTracks.length === 0}
            className="min-h-[44px] px-4 py-2 rounded-2xl surface-card text-[#F5F5FA] text-sm font-medium flex items-center gap-2 hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
          >
            <Shuffle size={16} />
            <span>Shuffle</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadAll(playlistTracks.map((t) => t.id))}
            disabled={playlistTracks.length === 0}
            className="min-h-[44px] px-4 py-2 rounded-2xl surface-card text-slate-200 text-sm font-medium flex items-center gap-2 hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
          >
            <Download size={16} className={allDownloaded ? 'accent-text icon-glow' : ''} />
            <span>{allDownloaded ? 'Saved Offline' : 'Download All'}</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {playlistTracks.length === 0 ? (
            <div className="py-10 text-center text-sm font-light text-slate-400">
              No tracks in this playlist yet. Use the options menu on any track to add songs here.
            </div>
          ) : (
            playlistTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
