import { useState } from 'react';
import {
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

interface PlayerProps {
  track: Track;
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
  isCachedStream: boolean;
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

function getSourceDescriptor(track: Track, preferences: UserPreferences): string {
  if (track.source === 'youtube') return 'YouTube Direct Stream';
  if (track.source === 'google') return 'Google Direct Stream';
  if (track.source === 'audius') return 'Audius Direct Stream';
  if (track.source === 'jamendo') return 'Jamendo Direct Stream';
  if (track.source === 'itunes') return 'iTunes Search Preview';
  if (track.source === 'custom') return 'Custom Stream URL';
  if (track.source === 'local') return 'Local Device Storage';
  if (preferences.audioQuality === 'lossless') return 'FLAC Lossless';
  if (preferences.audioQuality === 'high') return '320 kbps High';
  return '128 kbps Standard';
}

function getShortSource(source?: Track['source']): string {
  if (source === 'local') return 'Local';
  if (source === 'youtube') return 'YouTube';
  if (source === 'google') return 'Google';
  if (source === 'audius') return 'Audius';
  if (source === 'jamendo') return 'Jamendo';
  if (source === 'itunes') return 'iTunes';
  if (source === 'custom') return 'Custom URL';
  return 'Catalog';
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
  isCachedStream,
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
            className="surface-elevated md:rounded-2xl border-t md:border border-white/10 px-3 py-1.5 md:px-4 md:py-2 flex items-center justify-between gap-3 cursor-pointer relative overflow-hidden"
          >
            <div
              className="absolute bottom-0 left-0 h-0.5 accent-bg transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />

            <div className="flex items-center gap-3 min-w-0 flex-1">
              <CoverArt
                src={track.coverUrl}
                alt={track.title}
                fallbackGradient={track.fallbackGradient}
                className="w-10 h-10 rounded-lg"
              />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">{track.title}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {track.artist} · {formatDuration(progressSec)} / {formatDuration(durationSafe)}
                  {isCachedStream ? ' · Cached' : ''}
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
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white"
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
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onToggleLike(track.id)}
                aria-label={isLiked ? 'Unlike track' : 'Like track'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white"
              >
                <Heart size={18} className={isLiked ? 'accent-text fill-current' : ''} />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="min-h-[44px] min-w-[44px] rounded-xl accent-bg text-white flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause size={18} className="fill-white" />
                ) : (
                  <Play size={18} className="fill-white ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                aria-label="Next track"
                className="hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-300 hover:text-white"
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
      className="fixed inset-0 z-50 bg-[var(--canvas-bg)] flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Full music player"
    >
      <AmbientGlow
        coverUrl={track.coverUrl}
        trackKey={track.id}
        fallbackGradient={track.fallbackGradient}
        variant="player"
      />
      <div className="relative z-10 flex-1 flex flex-col">
      <div className="max-w-3xl w-full mx-auto px-5 py-4 flex items-center justify-between gap-4 border-b border-white/10">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Minimize player"
          className="min-h-[44px] min-w-[44px] rounded-xl surface-card flex items-center justify-center text-slate-200 hover:text-white"
        >
          <ChevronDown size={20} />
        </button>

        <div className="text-center min-w-0">
          <p className="text-[11px] text-slate-400">Playing from {sourceTitle}</p>
          <p className="text-xs font-mono text-slate-300 truncate mt-0.5">
            {getSourceDescriptor(track, preferences)}
            {isCachedStream ? ' · Cached' : ''}
            {preferences.lowDataMode ? ' · Low-Data' : ''}
            {preferences.spatialAudio ? ' · Spatial' : ''}
            {sleepTimerRemainingSec > 0 ? ` · Sleep ${formatDuration(sleepTimerRemainingSec)}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenTrackMenu(track)}
          aria-label="Track options"
          className="min-h-[44px] min-w-[44px] rounded-xl surface-card flex items-center justify-center text-slate-200 hover:text-white"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="max-w-3xl w-full mx-auto px-5 pt-4">
        <div className="grid grid-cols-4 gap-1 p-1 surface-card rounded-xl">
          {(
            [
              { id: 'playing', label: 'Player' },
              { id: 'queue', label: `Queue (${queueTracks.length})` },
              { id: 'audio', label: 'Audio & EQ' },
              { id: 'lyrics', label: 'Lyrics & Specs' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPlayerTab(t.id)}
              className={`min-h-[38px] rounded-lg text-xs font-medium whitespace-nowrap px-2 transition-colors ${
                playerTab === t.id
                  ? 'accent-bg text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto px-5 py-6 flex-1 flex flex-col justify-between">
        {playerTab === 'playing' && (
          <div className="flex flex-col items-center my-auto w-full max-w-md mx-auto">
            <CoverArt
              src={track.coverUrl}
              alt={track.title}
              fallbackGradient={track.fallbackGradient}
              className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl shadow-2xl mb-7"
              iconSize={48}
            />

            <div className="w-full flex items-end justify-between gap-4 mb-5">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold text-white truncate">
                  {track.title}
                </h2>
                <p className="text-sm text-slate-400 truncate mt-0.5">
                  {track.artist} · {track.album}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleDownload(track.id)}
                  aria-label={isDownloaded ? 'Remove offline download' : 'Download track'}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl surface-card text-slate-300 hover:text-white"
                >
                  <Download size={18} className={isDownloaded ? 'accent-text' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLike(track.id)}
                  aria-label={isLiked ? 'Unlike track' : 'Like track'}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl surface-card text-slate-300 hover:text-white"
                >
                  <Heart size={18} className={isLiked ? 'accent-text fill-current' : ''} />
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
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl ${
                  shuffle ? 'accent-text' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shuffle size={20} />
              </button>

              <button
                type="button"
                onClick={onPrevious}
                aria-label="Previous track"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-white hover:bg-white/5"
              >
                <SkipBack size={26} />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-16 h-16 rounded-full accent-bg text-white flex items-center justify-center shadow-lg"
              >
                {isPlaying ? (
                  <Pause size={26} className="fill-white" />
                ) : (
                  <Play size={26} className="fill-white ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                aria-label="Next track"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-white hover:bg-white/5"
              >
                <SkipForward size={26} />
              </button>

              <button
                type="button"
                onClick={onCycleRepeat}
                aria-label={`Repeat mode: ${repeatMode}`}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl ${
                  repeatMode !== 'off' ? 'accent-text' : 'text-slate-400 hover:text-white'
                }`}
              >
                {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
              </button>
            </div>

            <div className="w-full flex items-center justify-between gap-4 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white"
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
                className="min-h-[40px] px-3 py-1.5 rounded-xl surface-card text-xs font-medium text-slate-200 flex items-center gap-1.5 shrink-0"
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>
            </div>
          </div>
        )}

        {playerTab === 'queue' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-white flex items-center gap-2">
                <ListMusic size={17} className="accent-text" />
                <span>Mixed Up Next Queue</span>
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {queueTracks.length} tracks
              </span>
            </div>
            {queueTracks.length === 0 ? (
              <div className="surface-card rounded-2xl p-8 text-center text-sm text-slate-400">
                Your queue is empty. Mix local files and online streams via any track’s options menu.
              </div>
            ) : (
              <div className="surface-card rounded-2xl divide-y divide-white/[0.06]">
                {queueTracks.map((qt, i) => (
                  <button
                    key={`${qt.id}-${i}`}
                    type="button"
                    onClick={() => onPlayFromQueue(qt.id)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="w-5 text-xs font-mono tabular-nums text-slate-500">
                      {i + 1}
                    </span>
                    <CoverArt
                      src={qt.coverUrl}
                      alt={qt.title}
                      fallbackGradient={qt.fallbackGradient}
                      className="w-10 h-10 rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{qt.title}</p>
                      <p className="text-xs text-slate-400 truncate">
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
            <div className="surface-card rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="accent-text" />
                  <h3 className="text-sm font-semibold text-white">Equalizer & Tone</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({ eqBypassed: !preferences.eqBypassed })
                    }
                    aria-pressed={preferences.eqBypassed}
                    className={`min-h-[34px] px-3 rounded-lg text-xs font-medium transition-colors ${
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
                    className="min-h-[34px] px-3 rounded-lg surface-elevated text-xs font-medium text-slate-300 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(EQ_PRESETS) as EqPresetId[]).map((presetKey) => (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => onSelectEqPreset(presetKey)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium ${
                      !preferences.eqBypassed && preferences.eqPreset === presetKey
                        ? 'accent-bg text-white'
                        : 'surface-elevated text-slate-300'
                    }`}
                  >
                    {EQ_PRESETS[presetKey].label}
                  </button>
                ))}
              </div>
              <div className={`space-y-3 transition-opacity ${preferences.eqBypassed ? 'opacity-50' : 'opacity-100'}`}>
                {(['bass', 'mids', 'treble'] as const).map((band) => (
                  <div key={band}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-slate-400">{band}</span>
                      <span className="font-mono tabular-nums text-white">
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
              {track.source === 'youtube' && (
                <p className="text-[11px] text-slate-400">
                  Equalizer applies to Audius, iTunes, Jamendo, and local files; YouTube plays via YouTube’s official player.
                </p>
              )}
            </div>

            <div className="surface-card rounded-2xl p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-2">Crossfade Between Tracks</p>
                <div className="grid grid-cols-4 gap-2">
                  {([0, 3, 6, 12] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdatePreferences({ crossfadeSec: sec })}
                      className={`min-h-[42px] rounded-xl text-xs font-mono tabular-nums font-medium ${
                        preferences.crossfadeSec === sec
                          ? 'accent-bg text-white'
                          : 'surface-elevated text-slate-300'
                      }`}
                    >
                      {sec === 0 ? 'Off' : `${sec}s`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-2">Playback Speed</p>
                <div className="grid grid-cols-4 gap-2">
                  {[0.75, 1, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => onChangeSpeed(speed)}
                      className={`min-h-[42px] rounded-xl text-xs font-mono tabular-nums font-medium ${
                        playbackSpeed === speed
                          ? 'accent-bg text-white'
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
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
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
                      className={`min-h-[42px] rounded-xl text-xs font-mono tabular-nums font-medium ${
                        sleepTimerMinutes === mins
                          ? 'accent-bg text-white'
                          : 'surface-elevated text-slate-300'
                      }`}
                    >
                      {mins === 0 ? 'Off' : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
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
                      preferences.lowDataMode ? 'accent-bg justify-end' : 'bg-white/15 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white" />
                  </span>
                </label>

                <label className="flex items-center justify-between min-h-[40px] cursor-pointer">
                  <span className="text-xs text-slate-200 flex items-center gap-1.5">
                    <Radio size={14} className="accent-text" /> Background Playback
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.backgroundPlayback}
                    onChange={(e) => onUpdatePreferences({ backgroundPlayback: e.target.checked })}
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
                    <span className="w-5 h-5 rounded-full bg-white" />
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {playerTab === 'lyrics' && (
          <div className="space-y-5 max-w-lg mx-auto w-full">
            <div className="surface-card rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-semibold text-white">Lyrics & Notes</h3>
              <div className="space-y-2.5">
                {track.lyrics.map((line, i) => (
                  <p key={i} className="text-base text-slate-200 leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="surface-card rounded-2xl p-5 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400">Tempo</p>
                <p className="font-mono tabular-nums text-sm font-semibold text-white mt-0.5">
                  {track.bpm} BPM
                </p>
              </div>
              <div>
                <p className="text-slate-400">Source</p>
                <p className="font-mono text-sm font-semibold text-white mt-0.5">
                  {getShortSource(track.source)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Genre & Mood</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {track.genre} · {track.mood}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Key Signature</p>
                <p className="text-sm font-semibold text-white mt-0.5">{track.keySignature}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
