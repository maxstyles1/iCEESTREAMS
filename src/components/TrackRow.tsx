import { CheckCircle2, Download, Heart, MoreHorizontal, Pause, Play } from 'lucide-react';
import { DensityMode, Track } from '../types';
import { formatDuration } from '../data/catalog';
import CoverArt from './CoverArt';
import EqualizerBars from './EqualizerBars';

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
      className={`group flex items-center gap-3.5 rounded-2xl transition-all duration-200 ${
        isCompact ? 'px-3 py-2' : 'px-3.5 py-3'
      } ${
        isCurrent
          ? 'surface-elevated border accent-ring accent-glow-ring'
          : 'surface-card hover:border-[#F5F5FA]/15'
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
        className="relative shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <CoverArt
          src={track.coverUrl}
          alt={track.title}
          fallbackGradient={track.fallbackGradient}
          glow={true}
          glowSeed={track.id}
          className={isCompact ? 'w-12 h-12 rounded-2xl' : 'w-14 h-14 rounded-2xl'}
          iconSize={20}
        />
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/55 rounded-2xl transition-opacity duration-200 ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause size={18} className="text-[#F5F5FA] fill-[#F5F5FA] icon-glow" />
          ) : (
            <Play size={18} className="text-[#F5F5FA] fill-[#F5F5FA] ml-0.5" />
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onPlay(track.id)}
        className="flex-1 min-w-0 text-left focus-visible:outline-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCurrent && <EqualizerBars active={isPlaying} />}
          <p
            className={`font-display font-semibold truncate ${
              isCompact ? 'text-xs' : 'text-sm'
            } ${isCurrent ? 'accent-text' : 'text-[#F5F5FA]'}`}
          >
            {track.title}
          </p>
        </div>
        <p className="text-xs font-light text-slate-400 truncate mt-1">
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
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-slate-400 hover:text-[#F5F5FA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Heart
            size={17}
            strokeWidth={isLiked ? 2.2 : 1.75}
            fill={isLiked ? 'currentColor' : 'none'}
            className={isLiked ? 'text-[var(--accent2)] icon-glow' : ''}
          />
        </button>

        <button
          type="button"
          onClick={() => onToggleDownload(track.id)}
          aria-label={
            isDownloaded ? `Remove offline copy of ${track.title}` : `Download ${track.title}`
          }
          className="min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center rounded-2xl text-slate-400 hover:text-[#F5F5FA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {isDownloaded ? (
            <CheckCircle2 size={17} className="accent-text icon-glow" />
          ) : (
            <Download size={17} strokeWidth={1.75} />
          )}
        </button>

        <button
          type="button"
          onClick={() => onOpenMenu(track)}
          aria-label={`More options for ${track.title}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-slate-400 hover:text-[#F5F5FA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
