import {
  Bell,
  Check,
  Cloud,
  Globe,
  Palette,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Smartphone,
} from 'lucide-react';
import {
  AudioQuality,
  DensityMode,
  EqBands,
  EqPresetId,
  LanguageCode,
  SurfaceMode,
  ThemeId,
  UserPreferences,
} from '../types';
import { EQ_PRESETS } from '../data/catalog';
import { getAndroidPermissionReport } from '../utils/androidPermissions';

interface SettingsProps {
  preferences: UserPreferences;
  localTrackCount: number;
  cachedStreamCount: number;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void;
  onSelectEqPreset: (preset: EqPresetId) => void;
  onChangeEqBand: (band: keyof EqBands, value: number) => void;
  onResetEq: () => void;
  onRequestLocalPermission: () => void;
  onRescanLocalMusic: () => void;
  onRequestNotificationPermission: () => void;
  onSyncNow: () => void;
  onResetPreferences: () => void;
}

const THEMES: { id: ThemeId; name: string; swatch: string }[] = [
  { id: 'neon', name: 'Neon Noir', swatch: 'from-purple-600 to-cyan-400' },
  { id: 'cyber', name: 'Cyber', swatch: 'from-cyan-400 to-pink-500' },
  { id: 'ember', name: 'Ember', swatch: 'from-orange-500 to-red-600' },
  { id: 'void', name: 'Void', swatch: 'from-violet-600 to-purple-400' },
];

export default function Settings({
  preferences,
  localTrackCount,
  cachedStreamCount,
  onUpdatePreferences,
  onSelectEqPreset,
  onChangeEqBand,
  onResetEq,
  onRequestLocalPermission,
  onRescanLocalMusic,
  onRequestNotificationPermission,
  onSyncNow,
  onResetPreferences,
}: SettingsProps) {
  const permissionReport = getAndroidPermissionReport(preferences.androidApiProfile);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Customize themes, audio engine, Low-Data mode, and Android media permissions
          </p>
        </div>
        <button
          type="button"
          onClick={onResetPreferences}
          className="min-h-[44px] px-4 py-2 rounded-xl surface-card text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RotateCcw size={14} />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="surface-card rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Palette size={18} className="accent-text" />
            <h2 className="font-display text-base font-semibold text-white">
              Appearance & Layout
            </h2>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2.5">Accent Theme</p>
            <div className="grid grid-cols-4 gap-2.5">
              {THEMES.map((t) => {
                const active = preferences.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdatePreferences({ theme: t.id })}
                    className={`rounded-xl p-1.5 text-center transition-all border ${
                      active ? 'border-white bg-white/10' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div
                      className={`h-11 rounded-lg bg-gradient-to-br ${t.swatch} flex items-center justify-center`}
                    >
                      {active && <Check size={16} className="text-white drop-shadow" />}
                    </div>
                    <span className="text-[11px] font-medium text-slate-200 block mt-1.5 truncate">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 mb-2">Surface Contrast</p>
              <div className="grid grid-cols-2 gap-1.5 p-1 surface-elevated rounded-xl">
                {(
                  [
                    { id: 'obsidian', label: 'Obsidian' },
                    { id: 'oled', label: 'Pure Black' },
                  ] as { id: SurfaceMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdatePreferences({ surface: mode.id })}
                    className={`min-h-[38px] px-2 rounded-lg text-xs font-medium transition-colors ${
                      preferences.surface === mode.id
                        ? 'accent-bg text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2">List Density</p>
              <div className="grid grid-cols-2 gap-1.5 p-1 surface-elevated rounded-xl">
                {(
                  [
                    { id: 'comfortable', label: 'Comfortable' },
                    { id: 'compact', label: 'Compact' },
                  ] as { id: DensityMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdatePreferences({ density: mode.id })}
                    className={`min-h-[38px] px-2 rounded-lg text-xs font-medium transition-colors ${
                      preferences.density === mode.id
                        ? 'accent-bg text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="settings-language"
              className="text-xs text-slate-400 flex items-center gap-1.5 mb-2"
            >
              <Globe size={14} className="accent-text" /> Interface Language
            </label>
            <select
              id="settings-language"
              value={preferences.language}
              onChange={(e) => onUpdatePreferences({ language: e.target.value as LanguageCode })}
              className="w-full min-h-[44px] bg-black/45 border border-white/15 rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="en">English (UK / US)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
            </select>
          </div>
        </section>

        <section className="surface-card rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="accent-text" />
            <h2 className="font-display text-base font-semibold text-white">
              Audio & Playback Engine
            </h2>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2">Streaming Bitrate</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'standard', label: 'Standard', spec: '128 kbps' },
                  { id: 'high', label: 'High', spec: '320 kbps' },
                  { id: 'lossless', label: 'Lossless', spec: 'FLAC 24-bit' },
                ] as { id: AudioQuality; label: string; spec: string }[]
              ).map((q) => {
                const active = preferences.audioQuality === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onUpdatePreferences({ audioQuality: q.id })}
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

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs text-slate-400">Equalizer Preset</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({ eqBypassed: !preferences.eqBypassed })
                  }
                  aria-pressed={preferences.eqBypassed}
                  className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-colors ${
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
                  className="min-h-[32px] px-2.5 rounded-lg surface-elevated text-xs font-medium text-slate-300 hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(Object.keys(EQ_PRESETS) as EqPresetId[]).map((presetKey) => (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => onSelectEqPreset(presetKey)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !preferences.eqBypassed && preferences.eqPreset === presetKey
                      ? 'accent-bg text-white'
                      : 'surface-elevated text-slate-300 hover:text-white'
                  }`}
                >
                  {EQ_PRESETS[presetKey].label}
                </button>
              ))}
            </div>

            <div className={`grid grid-cols-3 gap-3 transition-opacity ${preferences.eqBypassed ? 'opacity-50' : 'opacity-100'}`}>
              {(['bass', 'mids', 'treble'] as const).map((band) => (
                <div key={band} className="surface-elevated rounded-xl p-2.5">
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="capitalize text-slate-400">{band}</span>
                    <span className="font-mono tabular-nums text-white">
                      {preferences.eqBands[band] > 0
                        ? `+${preferences.eqBands[band]}`
                        : preferences.eqBands[band]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={1}
                    value={preferences.eqBands[band]}
                    onChange={(e) => onChangeEqBand(band, parseInt(e.target.value, 10))}
                    aria-label={`${band} level`}
                    className="w-full range-slider"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2">Crossfade Between Tracks</p>
            <div className="grid grid-cols-4 gap-2">
              {([0, 3, 6, 12] as const).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdatePreferences({ crossfadeSec: sec })}
                  className={`min-h-[40px] rounded-xl text-xs font-mono tabular-nums font-medium transition-colors ${
                    preferences.crossfadeSec === sec
                      ? 'accent-bg text-white'
                      : 'surface-elevated text-slate-300 hover:text-white'
                  }`}
                >
                  {sec === 0 ? 'Off' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-card rounded-2xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="accent-text" />
              <h2 className="font-display text-base font-semibold text-white">
                Streaming, Background Service & Data Controls
              </h2>
            </div>
            <button
              type="button"
              onClick={onSyncNow}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl surface-elevated text-xs font-medium text-white hover:bg-white/10 flex items-center gap-2"
            >
              <Cloud size={14} className="accent-text" />
              <span>Sync Now ({preferences.lastSynced})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {[
              {
                key: 'lowDataMode' as const,
                title: 'Low-Data Mode',
                desc: 'Use lower-bitrate streams and pause preloading & background caching',
              },
              {
                key: 'backgroundPlayback' as const,
                title: 'Background Playback & Media Session',
                desc: 'Keep playback running across tabs & show lock-screen/notification controls',
              },
              {
                key: 'preloadNextTrack' as const,
                title: 'Preload Next Track',
                desc: 'Buffer the upcoming track in your queue ahead of time for instant transitions',
              },
              {
                key: 'cacheRecentStreams' as const,
                title: 'Cache Recently Played Streams',
                desc: `Save up to 15 recent online tracks locally (${cachedStreamCount} cached)`,
              },
              {
                key: 'normalizeVolume' as const,
                title: 'Volume Normalization',
                desc: 'Keep consistent loudness across albums and mixes',
              },
              {
                key: 'autoplaySimilar' as const,
                title: 'Autoplay Similar Tracks',
                desc: 'Continue playing curated tracks when your queue ends',
              },
              {
                key: 'allowExplicit' as const,
                title: 'Allow Explicit Content',
                desc: 'Show and play unedited releases in Search and mixes',
              },
              {
                key: 'wifiOnlyDownloads' as const,
                title: 'Download Over Wi-Fi Only',
                desc: 'Prevent offline audio syncing on cellular networks',
              },
              {
                key: 'shareListeningActivity' as const,
                title: 'Share Listening Activity',
                desc: 'Let followed friends see what you are listening to live',
              },
              {
                key: 'soundPreview' as const,
                title: 'Ambient Synth Audio Preview',
                desc: 'Play synthesized harmonic chords for built-in catalog items',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between gap-4 py-2.5 min-h-[56px] cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences[item.key]}
                  onChange={(e) => onUpdatePreferences({ [item.key]: e.target.checked })}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                    preferences[item.key] ? 'accent-bg justify-end' : 'bg-white/15 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white" />
                </span>
              </label>
            ))}
          </div>

          <div className="pt-4 mt-2 border-t border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Smartphone size={15} className="accent-text" />
                  <span>Android Storage & Foreground Media Permissions</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Active profile: <span className="font-mono text-slate-200">{permissionReport.audioPermissionName}</span> ·{' '}
                  <span className="font-mono text-slate-200">FOREGROUND_SERVICE_MEDIA_PLAYBACK</span>
                </p>
              </div>
              <div className="flex items-center p-1 surface-elevated rounded-xl">
                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ androidApiProfile: 'android13+' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    preferences.androidApiProfile === 'android13+'
                      ? 'accent-bg text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Android 13+ (READ_MEDIA_AUDIO)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ androidApiProfile: 'android12-' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    preferences.androidApiProfile === 'android12-'
                      ? 'accent-bg text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Android 12- (READ_EXTERNAL_STORAGE)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="surface-elevated rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white">Local Device Audio Access</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {preferences.localStoragePermission === 'granted'
                      ? `Granted · ${localTrackCount} local audio files ready`
                      : preferences.localStoragePermission === 'denied'
                      ? 'Denied — grant access to scan MP3, M4A, WAV, FLAC, OGG'
                      : 'Required to scan and play audio stored on device'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onRescanLocalMusic}
                    aria-label="Rescan local music"
                    className="min-h-[38px] px-3 py-1.5 rounded-xl surface-card text-xs font-medium text-white flex items-center gap-1"
                  >
                    <RefreshCw size={13} className="accent-text" />
                    <span>Rescan</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRequestLocalPermission}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl accent-bg text-white text-xs font-medium whitespace-nowrap"
                  >
                    {preferences.localStoragePermission === 'granted' ? 'Manage' : 'Grant'}
                  </button>
                </div>
              </div>

              <div className="surface-elevated rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Bell size={13} className="accent-text" />
                    <span>Lock-Screen Media Notification</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Status:{' '}
                    {preferences.notificationPermission === 'granted'
                      ? 'Enabled (POST_NOTIFICATIONS granted)'
                      : preferences.notificationPermission === 'denied'
                      ? 'Blocked in browser settings'
                      : 'Tap to enable media playback controls'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestNotificationPermission}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl surface-card hover:bg-white/10 text-xs font-medium text-white shrink-0"
                >
                  {preferences.notificationPermission === 'granted' ? 'Active' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
