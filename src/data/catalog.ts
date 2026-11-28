import { EqBands, EqPresetId, FriendActivity, NotificationItem, Playlist, Track, UserPreferences } from '../types';

export const COVERS = {
  midnightDrive: '/src/assets/images/cover_midnight_drive_1795636324996.jpg',
  chillVibes: '/src/assets/images/cover_chill_vibes_1795636323805.jpg',
  oceanicStates: '/src/assets/images/cover_oceanic_states_1795636324681.jpg',
  electricNights: '/src/assets/images/cover_electric_nights_1795636325329.jpg',
};

export const TRACKS: Track[] = [];

export const INITIAL_PLAYLISTS: Playlist[] = [];

export const INITIAL_FRIENDS: FriendActivity[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const EQ_PRESETS: Record<EqPresetId, { label: string; bands: EqBands }> = {
  flat: { label: 'Flat', bands: { bass: 0, mids: 0, treble: 0 } },
  bass: { label: 'Bass Boost', bands: { bass: 7, mids: -1, treble: 1 } },
  chill: { label: 'Chill', bands: { bass: 3, mids: 1, treble: -4 } },
  vocal: { label: 'Vocal', bands: { bass: -3, mids: 6, treble: 3 } },
  treble: { label: 'Treble', bands: { bass: -1, mids: 1, treble: 7 } },
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'icee',
  surface: 'obsidian',
  density: 'comfortable',
  language: 'en',
  audioQuality: 'high',
  offlineQuality: 'high',
  wifiOnlyDownloads: true,
  lowDataMode: false,
  backgroundPlayback: true,
  preloadNextTrack: false,
  cacheRecentStreams: false,
  allowExplicit: true,
  normalizeVolume: true,
  autoplaySimilar: true,
  shareListeningActivity: true,
  crossfadeSec: 3,
  eqPreset: 'flat',
  eqBands: { bass: 0, mids: 0, treble: 0 },
  eqBypassed: false,
  spatialAudio: false,
  soundPreview: false,
  showVisualizer: true,
  lastSynced: 'Just now',
  localStoragePermission: 'prompt',
  androidApiProfile: 'android13+',
  notificationPermission: 'prompt',
};

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
