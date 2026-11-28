import { useState } from 'react';
import {
  Activity,
  ChevronDown,
  Clock,
  Download,
  Heart,
  ListMusic,
  MoreHorizontal,
  Pause,
  Play,
  Radio,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Sliders,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react';
import { EqBands, EqPresetId, RepeatMode, Track, UserPreferences } from '../types';
import { EQ_PRESETS, formatDuration } from '../data/catalog';
import CoverArt from './CoverArt';
import AmbientGlow from './AmbientGlow';
import EqualizerBars from './EqualizerBars';
import MiniVisualizer from './MiniVisualizer';
import EmptyState from './EmptyState';

interface PlayerProps {
  track: Track | null;
  sourceTitle: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isPlaying: boolean;
  progressSec: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playbackSpeed: number;
  sleepTimerMinutes: number;
  sleepTimerRemainingSec: number;
  isLiked: boolean;
  isDownloaded: boolean;
  queueTracks: Track[];
  preferences: UserPreferences;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onChangeSpeed: (speed: number) => void;
  onChangeSleepTimer: (mins: number) => void;
  onToggleLike: (trackId: string) => void;
  onToggleDownload: (trackId: string) => void;
  onPlayFromQueue: (trackId: string) => void;
  onSelectEqPreset: (preset: EqPresetId) => void;
  onChangeEqBand: (band: keyof EqBands, value: number) => void;
  onResetEq: () => void;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void;
  onOpenTrackMenu: (track: Track) => void;
  onShareTrack: (track: Track) => void;
}

function getSourceDescriptor(track: Track): string {
  if (track.source === 'local') return 'Local Device Storage';
  return 'Device Audio';
}

function getShortSource(source?: Track['source']): string {
  if (source === 'local') return 'Local';
  return 'Device';
}

export default function Player({
  track,
  sourceTitle,
  isOpen,
  setIsOpen,
  isPlaying,
  progressSec,
  volume,
  isMuted,
  shuffle,
  repeatMode,
  playbackSpeed,
  sleepTimerMinutes,
  sleepTimerRemainingSec,
  isLiked,
  isDownloaded,
  queueTracks,
  preferences,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onChangeVolume,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onChangeSpeed,
  onChangeSleepTimer,
  onToggleLike,
  onToggleDownload,
  onPlayFromQueue,
  onSelectEqPreset,
  onChangeEqBand,
  onResetEq,
  onUpdatePreferences,
  onOpenTrackMenu,
  onShareTrack,
}: PlayerProps) {
  const [playerTab, setPlayerTab] = useState<'playing' | 'queue' | 'audio' | 'lyrics'>('playing');

  if (!track) return null;

  const durationSafe = Math.max(1, track.durationSec || 180);

  if (!isOpen) {
    const progressPct = Math.min(100, Math.round((progressSec / durationSafe) * 100));

    return (
      <div className="fixed bottom-16 md:bottom-3 left-0 right-0 md:left-4 md:right-4 z-30">
        <div className="max-w-7xl mx-auto">
          <div
            onClick={() => setIsOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
              }
            }}
            aria-label={`Open full player for ${track.title}`}
            className="surface-elevated rounded-t-2xl md:rounded-2xl border-t md:border border-[#F5F5FA]/10 px-3.5 py-2 md:px-4 md:py-2.5 flex items-center justify-between gap-3.5 cursor-pointer relative overflow-hidden accent-glow-ring"
          >
            <div
              className="absolute bottom-0 left-0 h-0.5 accent-gradient transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />

            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <CoverArt
                src={track.coverUrl}
                alt={track.title}
                fallbackGradient={track.fallbackGradient}
                glow={true}
                glowSeed={track.id}
                className="w-12 h-12 rounded-2xl"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <EqualizerBars active={isPlaying} />
                  <p className="font-display text-xs sm:text-sm font-bold text-[#F5F5FA] truncate">
                    {track.title}
                  </p>
                </div>
                <p className="text-[11px] font-light text-slate-400 truncate mt-0.5">
                  {track.artist} · {formatDuration(progressSec)} / {formatDuration(durationSafe)}
                </p>
              </div>
            </div>

            <div
              className="hidden lg:flex items-center gap-2 w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-[#F5F5FA]"
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                className="w-full range-slider"
              />
            </div>

            <div
              className="flex items-center gap-1.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onToggleLike(track.id)}
                aria-label={isLiked ? 'Unlike track' : 'Like track'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-slate-300 hover:text-[#F5F5FA]"
              >
                <Heart
                  size={18}
                  strokeWidth={isLiked ? 2.2 : 1.75}
                  fill={isLiked ? 'currentColor' : 'none'}
                  className={isLiked ? 'text-[var(--accent2)] icon-glow' : ''}
                />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="min-h-[44px] min-w-[44px] rounded-2xl accent-bg flex items-center justify-center transition-transform active:scale-95"
              >
                {isPlaying ? (
                  <Pause size={18} className="fill-current" />
                ) : (
                  <Play size={18} className="fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                aria-label="Next track"
                className="hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-slate-300 hover:text-[#F5F5FA]"
              >
                <SkipForward size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[var(--canvas-bg)] flex flex-col overflow-y-auto page-transition"
      role="dialog"
      aria-modal="true"
      aria-label="Full music player"
    >
      <AmbientGlow
        coverUrl={track.coverUrl}
        trackKey={track.id}
        fallbackGradient={track.fallbackGradient}
        variant="player"
        isPlaying={isPlaying}
      />
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="max-w-3xl w-full mx-auto px-5 py-4 flex items-center justify-between gap-4 border-b border-[#F5F5FA]/10">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Minimize player"
            className="min-h-[44px] min-w-[44px] rounded-2xl surface-card flex items-center justify-center text-slate-200 hover:text-[#F5F5FA]"
          >
            <ChevronDown size={20} />
          </button>

          <div className="text-center min-w-0">
            <p className="label-caps text-[10px] accent-text">Now Playing</p>
            <p className="text-xs font-light text-slate-300 truncate mt-0.5">
              {sourceTitle} · {getSourceDescriptor(track)}
              {preferences.spatialAudio ? ' · Spatial' : ''}
              {sleepTimerRemainingSec > 0 ? ` · Sleep ${formatDuration(sleepTimerRemainingSec)}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenTrackMenu(track)}
            aria-label="Track options"
            className="min-h-[44px] min-w-[44px] rounded-2xl surface-card flex items-center justify-center text-slate-200 hover:text-[#F5F5FA]"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="max-w-3xl w-full mx-auto px-5 pt-4">
          <div className="grid grid-cols-4 gap-1.5 p-1.5 surface-card rounded-2xl">
            {(
              [
                { id: 'playing', label: 'Player' },
                { id: 'queue', label: `Queue (${queueTracks.length})` },
                { id: 'audio', label: 'Audio & EQ' },
                { id: 'lyrics', label: 'Lyrics' },
              ] as const
            ).map((t) => {
              const active = playerTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPlayerTab(t.id)}
                  className={`min-h-[40px] rounded-2xl label-caps text-[10px] whitespace-nowrap px-2 transition-all duration-200 ${
                    active
                      ? 'accent-bg animate-tab-bounce'
                      : 'text-slate-400 hover:text-[#F5F5FA]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-w-3xl w-full mx-auto px-5 py-6 flex-1 flex flex-col justify-between">
          {playerTab === 'playing' && (
            <div className="flex flex-col items-center my-auto w-full max-w-md mx-auto">
              <div className="relative mb-6 flex items-center justify-center">
                <div
                  aria-hidden="true"
                  className={`absolute -inset-3 rounded-[28px] border border-[var(--accent)]/25 opacity-60 vinyl-ring-spin ${
                    isPlaying ? '' : 'album-motion-paused'
                  }`}
                  style={{
                    background:
                      'conic-gradient(from 0deg, rgba(0,229,255,0.16), transparent 35%, rgba(255,79,216,0.16), transparent 75%)',
                  }}
                />
                <div
                  className={`relative album-motion ${
                    isPlaying ? '' : 'album-motion-paused'
                  }`}
                >
                  <CoverArt
                    src={track.coverUrl}
                    alt={track.title}
                    fallbackGradient={track.fallbackGradient}
                    glow={true}
                    glowStrength="strong"
                    glowSeed={track.id}
                    className="w-68 h-68 sm:w-84 sm:h-84 rounded-3xl"
                    iconSize={56}
                  />
                </div>
              </div>

              <MiniVisualizer
                isPlaying={isPlaying}
                enabled={preferences.showVisualizer}
              />

              <div className="w-full flex items-end justify-between gap-4 mb-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    {isPlaying && <EqualizerBars active={true} />}
                    <h2 className="font-display text-2xl font-extrabold text-[#F5F5FA] truncate">
                      {track.title}
                    </h2>
                  </div>
                  <p className="text-sm font-light text-slate-400 truncate mt-1">
                    {track.artist} · {track.album}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({ showVisualizer: !preferences.showVisualizer })
                    }
                    aria-label={preferences.showVisualizer ? 'Hide audio visualizer' : 'Show audio visualizer'}
                    aria-pressed={preferences.showVisualizer}
                    title="Toggle mini audio visualizer"
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl surface-card transition-colors ${
                      preferences.showVisualizer
                        ? 'accent-text border accent-ring'
                        : 'text-slate-400 hover:text-[#F5F5FA]'
                    }`}
                  >
                    <Activity
                      size={18}
                      className={preferences.showVisualizer ? 'icon-glow' : ''}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleDownload(track.id)}
                    aria-label={isDownloaded ? 'Remove offline download' : 'Download track'}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl surface-card text-slate-300 hover:text-[#F5F5FA]"
                  >
                    <Download
                      size={18}
                      className={isDownloaded ? 'accent-text icon-glow' : ''}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleLike(track.id)}
                    aria-label={isLiked ? 'Unlike track' : 'Like track'}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl surface-card text-slate-300 hover:text-[#F5F5FA]"
                  >
                    <Heart
                      size={18}
                      strokeWidth={isLiked ? 2.2 : 1.75}
                      fill={isLiked ? 'currentColor' : 'none'}
                      className={isLiked ? 'text-[var(--accent2)] icon-glow' : ''}
                    />
                  </button>
                </div>
              </div>

              <div className="w-full mb-6">
                <input
                  type="range"
                  min={0}
                  max={durationSafe}
                  step={1}
                  value={Math.min(progressSec, durationSafe)}
                  onChange={(e) => onSeek(parseInt(e.target.value, 10))}
                  aria-label="Track progress"
                  className="w-full range-slider"
                />
                <div className="flex justify-between text-xs font-mono tabular-nums text-slate-400 mt-2">
                  <span>{formatDuration(progressSec)}</span>
                  <span>{formatDuration(durationSafe)}</span>
                </div>
              </div>

              <div className="w-full flex items-center justify-between mb-6">
                <button
                  type="button"
                  onClick={onToggleShuffle}
                  aria-label="Toggle shuffle"
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl transition-colors ${
                    shuffle ? 'accent-text icon-glow' : 'text-slate-400 hover:text-[#F5F5FA]'
                  }`}
                >
                  <Shuffle size={20} />
                </button>

                <button
                  type="button"
                  onClick={onPrevious}
                  aria-label="Previous track"
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl text-[#F5F5FA] hover:bg-white/5"
                >
                  <SkipBack size={26} />
                </button>

                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="w-16 h-16 rounded-3xl accent-bg flex items-center justify-center transition-transform active:scale-95"
                >
                  {isPlaying ? (
                    <Pause size={26} className="fill-current" />
                  ) : (
                    <Play size={26} className="fill-current ml-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  aria-label="Next track"
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl text-[#F5F5FA] hover:bg-white/5"
                >
                  <SkipForward size={26} />
                </button>

                <button
                  type="button"
                  onClick={onCycleRepeat}
                  aria-label={`Repeat mode: ${repeatMode}`}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl transition-colors ${
                    repeatMode !== 'off'
                      ? 'accent-text icon-glow'
                      : 'text-slate-400 hover:text-[#F5F5FA]'
                  }`}
                >
                  {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                </button>
              </div>

              <div className="w-full flex items-center justify-between gap-4 pt-3 border-t border-[#F5F5FA]/10">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-[#F5F5FA]"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                    aria-label="Player volume"
                    className="w-full range-slider"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onShareTrack(track)}
                  className="min-h-[40px] px-4 py-2 rounded-2xl surface-card text-xs font-medium text-[#F5F5FA] flex items-center gap-1.5 shrink-0"
                >
                  <Share2 size={14} className="accent-text" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          )}

          {playerTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#F5F5FA] flex items-center gap-2">
                  <ListMusic size={17} className="accent-text icon-glow" />
                  <span className="label-caps text-xs">Up Next Queue</span>
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {queueTracks.length} tracks
                </span>
              </div>
              {queueTracks.length === 0 ? (
                <EmptyState
                  illustration="queue"
                  title="Your queue is empty"
                  description="Add local songs from your library or search results using any track’s options menu."
                />
              ) : (
                <div className="space-y-3">
                  {queueTracks.map((qt, i) => (
                    <button
                      key={`${qt.id}-${i}`}
                      type="button"
                      onClick={() => onPlayFromQueue(qt.id)}
                      className="w-full surface-card rounded-2xl p-3 flex items-center gap-3.5 text-left hover:border-[#F5F5FA]/20 transition-colors"
                    >
                      <span className="w-5 text-xs font-mono tabular-nums text-slate-500">
                        {i + 1}
                      </span>
                      <CoverArt
                        src={qt.coverUrl}
                        alt={qt.title}
                        fallbackGradient={qt.fallbackGradient}
                        glow={true}
                        glowSeed={qt.id}
                        className="w-12 h-12 rounded-2xl"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm font-semibold text-[#F5F5FA] truncate">
                          {qt.title}
                        </p>
                        <p className="text-xs font-light text-slate-400 truncate mt-0.5">
                          {qt.artist} · {getShortSource(qt.source)}
                        </p>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-400">
                        {formatDuration(qt.durationSec)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {playerTab === 'audio' && (
            <div className="space-y-5 max-w-lg mx-auto w-full">
              <div className="surface-card rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="accent-text icon-glow" />
                    <h3 className="font-display text-sm font-bold text-[#F5F5FA]">
                      Equalizer & Tone
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePreferences({ eqBypassed: !preferences.eqBypassed })
                      }
                      aria-pressed={preferences.eqBypassed}
                      className={`min-h-[36px] px-3 rounded-2xl text-xs font-medium transition-colors ${
                        preferences.eqBypassed
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                          : 'accent-soft-bg accent-text border accent-ring'
                      }`}
                    >
                      {preferences.eqBypassed ? 'Bypassed' : 'EQ Active'}
                    </button>
                    <button
                      type="button"
                      onClick={onResetEq}
                      className="min-h-[36px] px-3 rounded-2xl surface-elevated text-xs font-medium text-slate-300 hover:text-[#F5F5FA]"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(EQ_PRESETS) as EqPresetId[]).map((presetKey) => (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => onSelectEqPreset(presetKey)}
                      className={`min-h-[40px] px-3.5 py-2 rounded-2xl text-xs font-medium transition-all ${
                        !preferences.eqBypassed && preferences.eqPreset === presetKey
                          ? 'accent-bg'
                          : 'surface-elevated text-slate-300 hover:text-[#F5F5FA]'
                      }`}
                    >
                      {EQ_PRESETS[presetKey].label}
                    </button>
                  ))}
                </div>
                <div
                  className={`space-y-3 transition-opacity ${
                    preferences.eqBypassed ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {(['bass', 'mids', 'treble'] as const).map((band) => (
                    <div key={band}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize text-slate-400">{band}</span>
                        <span className="font-mono tabular-nums text-[#F5F5FA]">
                          {preferences.eqBands[band] > 0
                            ? `+${preferences.eqBands[band]}`
                            : preferences.eqBands[band]}{' '}
                          dB
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-10}
                        max={10}
                        step={1}
                        value={preferences.eqBands[band]}
                        onChange={(e) => onChangeEqBand(band, parseInt(e.target.value, 10))}
                        className="w-full range-slider"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-card rounded-3xl p-5 space-y-4">
                <div>
                  <p className="label-caps text-[10px] text-slate-400 mb-2">
                    Crossfade Between Tracks
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {([0, 3, 6, 12] as const).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => onUpdatePreferences({ crossfadeSec: sec })}
                        className={`min-h-[42px] rounded-2xl text-xs font-mono tabular-nums font-medium ${
                          preferences.crossfadeSec === sec
                            ? 'accent-bg'
                            : 'surface-elevated text-slate-300'
                        }`}
                      >
                        {sec === 0 ? 'Off' : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label-caps text-[10px] text-slate-400 mb-2">Playback Speed</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.75, 1, 1.25, 1.5].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => onChangeSpeed(speed)}
                        className={`min-h-[42px] rounded-2xl text-xs font-mono tabular-nums font-medium ${
                          playbackSpeed === speed
                            ? 'accent-bg'
                            : 'surface-elevated text-slate-300'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="label-caps text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Clock size={14} className="accent-text" /> Sleep Timer
                    </p>
                    {sleepTimerRemainingSec > 0 && (
                      <span className="text-xs font-mono tabular-nums accent-text">
                        {formatDuration(sleepTimerRemainingSec)} left
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => onChangeSleepTimer(mins)}
                        className={`min-h-[42px] rounded-2xl text-xs font-mono tabular-nums font-medium ${
                          sleepTimerMinutes === mins
                            ? 'accent-bg'
                            : 'surface-elevated text-slate-300'
                        }`}
                      >
                        {mins === 0 ? 'Off' : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#F5F5FA]/10">
                  <label className="flex items-center justify-between min-h-[40px] cursor-pointer">
                    <span className="text-xs text-slate-200 flex items-center gap-1.5">
                      <Wifi size={14} className="accent-text" /> Low-Data Mode
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences.lowDataMode}
                      onChange={(e) => onUpdatePreferences({ lowDataMode: e.target.checked })}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                        preferences.lowDataMode
                          ? 'accent-bg justify-end'
                          : 'bg-white/15 justify-start'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-[#F5F5FA]" />
                    </span>
                  </label>

                  <label className="flex items-center justify-between min-h-[40px] cursor-pointer">
                    <span className="text-xs text-slate-200 flex items-center gap-1.5">
                      <Radio size={14} className="accent-text" /> Background Playback
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences.backgroundPlayback}
                      onChange={(e) =>
                        onUpdatePreferences({ backgroundPlayback: e.target.checked })
                      }
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                        preferences.backgroundPlayback
                          ? 'accent-bg justify-end'
                          : 'bg-white/15 justify-start'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-[#F5F5FA]" />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {playerTab === 'lyrics' && (
            <div className="space-y-5 max-w-lg mx-auto w-full">
              <div className="surface-card rounded-3xl p-5 space-y-3">
                <h3 className="font-display text-base font-bold text-[#F5F5FA]">
                  Lyrics & Notes
                </h3>
                <div className="space-y-2.5">
                  {track.lyrics.map((line, i) => (
                    <p key={i} className="text-base font-light text-slate-200 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              <div className="surface-card rounded-3xl p-5 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">Tempo</p>
                  <p className="font-mono tabular-nums text-sm font-semibold text-[#F5F5FA] mt-0.5">
                    {track.bpm} BPM
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Source</p>
                  <p className="font-mono text-sm font-semibold text-[#F5F5FA] mt-0.5">
                    {getShortSource(track.source)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Genre & Mood</p>
                  <p className="text-sm font-semibold text-[#F5F5FA] mt-0.5">
                    {track.genre} · {track.mood}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Key Signature</p>
                  <p className="text-sm font-semibold text-[#F5F5FA] mt-0.5">
                    {track.keySignature}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
