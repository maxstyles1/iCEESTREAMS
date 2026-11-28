import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Gauge,
  ListMusic,
  Radio,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import { EqBands, EqPresetId, Track, UserPreferences } from '../types';
import { EQ_PRESETS, formatDuration } from '../data/catalog';
import CoverArt from './CoverArt';
import EqualizerBars from './EqualizerBars';
import EmptyState from './EmptyState';

interface QueueAudioPanelProps {
  isOpen: boolean;
  isPlaying: boolean;
  onClose?: () => void;
  currentTrack: Track | null;
  queueTrackIds: string[];
  allTracks: Track[];
  playbackSpeed: number;
  sleepTimerMinutes: number;
  sleepTimerRemainingSec: number;
  volume: number;
  preferences: UserPreferences;
  onPlayFromQueue: (trackId: string) => void;
  onMoveQueueItem: (index: number, direction: 'up' | 'down') => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onChangeSpeed: (speed: number) => void;
  onChangeSleepTimer: (minutes: number) => void;
  onChangeVolume: (vol: number) => void;
  onSelectEqPreset: (preset: EqPresetId) => void;
  onChangeEqBand: (band: keyof EqBands, value: number) => void;
  onResetEq: () => void;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void;
}

function formatSourceLabel(source?: Track['source']): string {
  if (source === 'local') return 'Local';
  return 'Device';
}

export default function QueueAudioPanel({
  isOpen,
  isPlaying,
  onClose,
  currentTrack,
  queueTrackIds,
  allTracks,
  playbackSpeed,
  sleepTimerMinutes,
  sleepTimerRemainingSec,
  volume,
  preferences,
  onPlayFromQueue,
  onMoveQueueItem,
  onRemoveFromQueue,
  onClearQueue,
  onChangeSpeed,
  onChangeSleepTimer,
  onChangeVolume,
  onSelectEqPreset,
  onChangeEqBand,
  onResetEq,
  onUpdatePreferences,
}: QueueAudioPanelProps) {
  const [tab, setTab] = useState<'queue' | 'audio'>('audio');

  const queueTracks = queueTrackIds
    .map((id) => allTracks.find((t) => t.id === id))
    .filter((t): t is Track => Boolean(t));

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F5F5FA]/10">
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-[#F5F5FA]/10 flex-1">
          <button
            type="button"
            onClick={() => setTab('audio')}
            className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-2xl label-caps text-[10px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'audio' ? 'accent-bg animate-tab-bounce' : 'text-slate-400 hover:text-[#F5F5FA]'
            }`}
          >
            <Sliders size={14} />
            <span>Audio & EQ</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('queue')}
            className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-2xl label-caps text-[10px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'queue' ? 'accent-bg animate-tab-bounce' : 'text-slate-400 hover:text-[#F5F5FA]'
            }`}
          >
            <ListMusic size={14} />
            <span className="tabular-nums">Queue ({queueTracks.length})</span>
          </button>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audio options"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {tab === 'audio' ? (
        <div className="pt-4 space-y-5 overflow-y-auto flex-1 pr-1">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Volume2 size={14} className="accent-text" /> Output Volume
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              aria-label="Output volume"
              className="w-full range-slider"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Sparkles size={14} className="accent-text" /> Equalizer
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({ eqBypassed: !preferences.eqBypassed })
                  }
                  aria-pressed={preferences.eqBypassed}
                  className={`min-h-[30px] px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
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
                  className="min-h-[30px] px-2.5 rounded-lg surface-elevated text-[11px] font-medium text-slate-300 hover:text-white whitespace-nowrap"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {(Object.keys(EQ_PRESETS) as EqPresetId[]).map((presetKey) => {
                const active = !preferences.eqBypassed && preferences.eqPreset === presetKey;
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => onSelectEqPreset(presetKey)}
                    className={`min-h-[38px] px-2 py-1.5 rounded-2xl text-xs font-medium whitespace-nowrap transition-colors ${
                      active
                        ? 'accent-soft-bg accent-text border accent-ring'
                        : 'surface-elevated text-slate-300 hover:text-[#F5F5FA]'
                    }`}
                  >
                    {EQ_PRESETS[presetKey].label}
                  </button>
                );
              })}
            </div>

            <div className={`space-y-2.5 pt-1 transition-opacity ${preferences.eqBypassed ? 'opacity-50' : 'opacity-100'}`}>
              {(['bass', 'mids', 'treble'] as const).map((band) => (
                <div key={band}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="capitalize text-slate-400">{band}</span>
                    <span className="font-mono tabular-nums text-slate-300">
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
                    aria-label={`${band} equalizer`}
                    className="w-full range-slider"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-300 font-medium mb-2 flex items-center gap-1.5">
              <Gauge size={14} className="accent-text" /> Playback Speed
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.75, 1, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => onChangeSpeed(speed)}
                  className={`min-h-[38px] rounded-2xl text-xs font-mono tabular-nums font-medium transition-colors ${
                    playbackSpeed === speed
                      ? 'accent-bg'
                      : 'surface-elevated text-slate-300 hover:text-[#F5F5FA]'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Clock size={14} className="accent-text" /> Sleep Timer
              </p>
              {sleepTimerRemainingSec > 0 && (
                <span className="text-[11px] font-mono tabular-nums accent-text">
                  {formatDuration(sleepTimerRemainingSec)} left
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeSleepTimer(mins)}
                  className={`min-h-[38px] rounded-2xl text-xs font-mono tabular-nums font-medium transition-colors ${
                    sleepTimerMinutes === mins
                      ? 'accent-bg'
                      : 'surface-elevated text-slate-300 hover:text-[#F5F5FA]'
                  }`}
                >
                  {mins === 0 ? 'Off' : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-300 font-medium mb-2">Crossfade Transition</p>
            <div className="grid grid-cols-4 gap-1.5">
              {([0, 3, 6, 12] as const).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdatePreferences({ crossfadeSec: sec })}
                  className={`min-h-[38px] rounded-2xl text-xs font-mono tabular-nums font-medium transition-colors ${
                    preferences.crossfadeSec === sec
                      ? 'accent-bg'
                      : 'surface-elevated text-slate-300 hover:text-[#F5F5FA]'
                  }`}
                >
                  {sec === 0 ? 'Off' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <label className="flex items-center justify-between gap-3 min-h-[40px] cursor-pointer">
              <div>
                <span className="text-xs text-slate-200 flex items-center gap-1.5">
                  <Wifi size={13} className="accent-text" /> Low-Data Mode
                </span>
                <p className="text-[11px] text-slate-400">Lower bitrate & skip preloading</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.lowDataMode}
                onChange={(e) => onUpdatePreferences({ lowDataMode: e.target.checked })}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                  preferences.lowDataMode ? 'accent-bg justify-end' : 'bg-white/15 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white" />
              </span>
            </label>

            <label className="flex items-center justify-between gap-3 min-h-[40px] cursor-pointer">
              <div>
                <span className="text-xs text-slate-200 flex items-center gap-1.5">
                  <Radio size={13} className="accent-text" /> Background Playback
                </span>
                <p className="text-[11px] text-slate-400">Keep media controls on lock screen</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.backgroundPlayback}
                onChange={(e) => onUpdatePreferences({ backgroundPlayback: e.target.checked })}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                  preferences.backgroundPlayback
                    ? 'accent-bg justify-end'
                    : 'bg-white/15 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white" />
              </span>
            </label>

            <label className="flex items-center justify-between min-h-[40px] cursor-pointer">
              <span className="text-xs text-slate-200">Spatial Audio Depth</span>
              <input
                type="checkbox"
                checked={preferences.spatialAudio}
                onChange={(e) => onUpdatePreferences({ spatialAudio: e.target.checked })}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                  preferences.spatialAudio ? 'accent-bg justify-end' : 'bg-white/15 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white" />
              </span>
            </label>

            <label className="flex items-center justify-between min-h-[40px] cursor-pointer">
              <span className="text-xs text-slate-200">Ambient Preview Synth</span>
              <input
                type="checkbox"
                checked={preferences.soundPreview}
                onChange={(e) => onUpdatePreferences({ soundPreview: e.target.checked })}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                  preferences.soundPreview ? 'accent-bg justify-end' : 'bg-white/15 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white" />
              </span>
            </label>
          </div>
        </div>
      ) : (
        <div className="pt-4 flex-1 flex flex-col overflow-hidden">
          <div className="mb-3 pb-3 border-b border-[#F5F5FA]/10">
            <p className="label-caps text-[10px] accent-text mb-2">Now Playing</p>
            {currentTrack ? (
              <div className="flex items-center gap-3">
                <CoverArt
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  fallbackGradient={currentTrack.fallbackGradient}
                  glow={true}
                  glowSeed={currentTrack.id}
                  className="w-12 h-12 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <EqualizerBars active={isPlaying} />
                    <p className="font-display text-xs font-bold accent-text truncate">
                      {currentTrack.title}
                    </p>
                  </div>
                  <p className="text-[11px] font-light text-slate-400 truncate mt-0.5">
                    {currentTrack.artist} · {formatSourceLabel(currentTrack.source)}
                  </p>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {formatDuration(currentTrack.durationSec)}
                </span>
              </div>
            ) : (
              <p className="text-xs font-light text-slate-400">No track playing</p>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="label-caps text-[10px] text-slate-400">Up Next Queue</p>
            {queueTracks.length > 0 && (
              <button
                type="button"
                onClick={onClearQueue}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors min-h-[32px] px-2"
              >
                Clear Queue
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {queueTracks.length === 0 ? (
              <EmptyState
                illustration="queue"
                title="Queue is empty"
                description="Add imported local songs from Library or Search."
              />
            ) : (
              queueTracks.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className="surface-elevated rounded-2xl p-2.5 flex items-center gap-2.5"
                >
                  <button
                    type="button"
                    onClick={() => onPlayFromQueue(track.id)}
                    aria-label={`Play ${track.title}`}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <CoverArt
                      src={track.coverUrl}
                      alt={track.title}
                      fallbackGradient={track.fallbackGradient}
                      glow={true}
                      glowSeed={track.id}
                      className="w-11 h-11 rounded-2xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#F5F5FA] truncate">
                        {track.title}
                      </p>
                      <p className="text-[11px] font-light text-slate-400 truncate">
                        {track.artist} · {formatSourceLabel(track.source)}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMoveQueueItem(idx, 'up')}
                      disabled={idx === 0}
                      aria-label={`Move ${track.title} up`}
                      className="min-h-[36px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-[#F5F5FA] disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveQueueItem(idx, 'down')}
                      disabled={idx === queueTracks.length - 1}
                      aria-label={`Move ${track.title} down`}
                      className="min-h-[36px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-[#F5F5FA] disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFromQueue(idx)}
                      aria-label={`Remove ${track.title} from queue`}
                      className="min-h-[36px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden xl:flex xl:w-80 shrink-0 surface-card rounded-3xl p-4 h-[calc(100vh-148px)] sticky top-20 flex-col">
        {content}
      </aside>

      {isOpen && (
        <div
          className="xl:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Audio Options and Queue"
        >
          <div
            className="w-full max-w-sm surface-elevated h-full p-5 flex flex-col rounded-l-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}
