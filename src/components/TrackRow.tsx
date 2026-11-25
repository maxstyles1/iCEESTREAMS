import { CheckCircle2, Download, Heart, MoreHorizontal, Pause, Play } from 'lucide-react';
import { DensityMode, Track } from '../types';
import { formatDuration } from '../data/catalog';
import CoverArt from './CoverArt';

interface TrackRowProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  isDownloaded: boolean;
  density: DensityMode;
  onPlay: (trackId: string) => void;
  onToggleLike: (trackId: string) => void;
  onToggleDownload: (trackId: string) => void;
  onOpenMenu: (track: Track) => void;
  index?: number;
}

export default function TrackRow({
  track,
  isCurrent,
  isPlaying,
  isLiked,
  isDownloaded,
  density,
  onPlay,
  onToggleLike,
  onToggleDownload,
  onOpenMenu,
  index,
}: TrackRowProps) {
  const isCompact = density === 'compact';

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl transition-colors ${
        isCompact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'
      } ${
        isCurrent
          ? 'accent-soft-bg border accent-ring'
          : 'hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      {typeof index === 'number' && (
        <span className="w-5 text-center text-xs font-mono tabular-nums text-slate-500 hidden sm:inline-block">
          {index + 1}
        </span>
      )}

      <button
        type="button"
        onClick={() => onPlay(track.id)}
        aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        className="relative shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <CoverArt
          src={track.coverUrl}
          alt={track.title}
          fallbackGradient={track.fallbackGradient}
          className={isCompact ? 'w-10 h-10 rounded-lg' : 'w-11 h-11 rounded-lg'}
          iconSize={18}
        />
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause size={16} className="text-white fill-white" />
          ) : (
            <Play size={16} className="text-white fill-white ml-0.5" />
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onPlay(track.id)}
        className="flex-1 min-w-0 text-left focus-visible:outline-none"
      >
        <p className={`font-medium truncate ${isCompact ? 'text-xs' : 'text-sm'} ${isCurrent ? 'accent-text' : 'text-white'}`}>
          {track.title}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {track.artist}
          <span aria-hidden="true"> · </span>
          {track.genre}
          <span aria-hidden="true"> · </span>
          <span className="font-mono tabular-nums">{track.bpm} BPM</span>
          {track.explicit && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="text-slate-300 font-medium">Explicit</span>
            </>
          )}
        </p>
      </button>

      <div className="flex items-center gap-0.5 shrink-0">
        <span className="text-xs font-mono tabular-nums text-slate-400 mr-1.5 hidden sm:inline">
          {formatDuration(track.durationSec)}
        </span>

        <button
          type="button"
          onClick={() => onToggleLike(track.id)}
          aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <Heart size={16} className={isLiked ? 'accent-text fill-current' : ''} />
        </button>

        <button
          type="button"
          onClick={() => onToggleDownload(track.id)}
          aria-label={isDownloaded ? `Remove offline copy of ${track.title}` : `Download ${track.title}`}
          className="min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {isDownloaded ? (
            <CheckCircle2 size={16} className="accent-text" />
          ) : (
            <Download size={16} />
          )}
        </button>

        <button
          type="button"
          onClick={() => onOpenMenu(track)}
          aria-label={`More options for ${track.title}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
