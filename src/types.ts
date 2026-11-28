export type ScreenId = 'home' | 'search' | 'library' | 'social' | 'settings';

export type ThemeId =
  | 'icee'
  | 'neon'
  | 'cyber'
  | 'ember'
  | 'void'
  | 'darkest-neon-black'
  | 'neon-canary-yellow'
  | 'aqua-bright-blue'
  | 'candy-pink'
  | 'ocean-night'
  | 'black-gold'
  | 'yellow-orange'
  | 'coral-turquoise'
  | 'pink-mint'
  | 'green-beige'
  | 'navy-white'
  | 'red-yellow'
  | 'peach-teal';
export type SurfaceMode = 'obsidian' | 'oled';
export type DensityMode = 'comfortable' | 'compact';
export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt';
export type AudioQuality = 'standard' | 'high' | 'lossless';
export type RepeatMode = 'off' | 'all' | 'one';
export type EqPresetId = 'flat' | 'bass' | 'chill' | 'vocal' | 'treble';
export type TrackSource =
  | 'catalog'
  | 'local'
  | 'audius'
  | 'jamendo'
  | 'itunes'
  | 'youtube'
  | 'google'
  | 'custom';
export type LocalStoragePermissionState = 'prompt' | 'granted' | 'denied';
export type AndroidApiProfile = 'android13+' | 'android12-';
export type MediaNotificationPermissionState = 'prompt' | 'granted' | 'denied';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  mood: string;
  bpm: number;
  language: 'English' | 'Spanish' | 'French' | 'Instrumental';
  explicit: boolean;
  durationSec: number;
  sizeMb: number;
  keySignature: string;
  coverUrl: string;
  fallbackGradient: string;
  lyrics: string[];
  chordHz: number[];
  source?: TrackSource;
  streamUrl?: string;
  lowDataStreamUrl?: string;
  youtubeVideoId?: string;
  playCount?: string;
  localFileName?: string;
}

export interface Playlist {
  id: string;
  title: string;
  subtitle: string;
  category: 'Made for you' | 'Trending' | 'Collaborative' | 'User';
  moodTag: 'Chill' | 'Focus' | 'Night Drive' | 'High Energy';
  coverUrl: string;
  fallbackGradient: string;
  trackIds: string[];
  collaborators?: number;
  isUserCreated?: boolean;
}

export interface FriendActivity {
  id: string;
  handle: string;
  displayName: string;
  initials: string;
  status: string;
  trackId: string;
  updatedAt: string;
  isFollowing: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timeAgo: string;
  read: boolean;
  trackId?: string;
}

export interface EqBands {
  bass: number;
  mids: number;
  treble: number;
}

export interface UserPreferences {
  theme: ThemeId;
  surface: SurfaceMode;
  density: DensityMode;
  language: LanguageCode;
  audioQuality: AudioQuality;
  offlineQuality: AudioQuality;
  wifiOnlyDownloads: boolean;
  lowDataMode: boolean;
  backgroundPlayback: boolean;
  preloadNextTrack: boolean;
  cacheRecentStreams: boolean;
  allowExplicit: boolean;
  normalizeVolume: boolean;
  autoplaySimilar: boolean;
  shareListeningActivity: boolean;
  crossfadeSec: 0 | 3 | 6 | 12;
  eqPreset: EqPresetId;
  eqBands: EqBands;
  eqBypassed: boolean;
  spatialAudio: boolean;
  soundPreview: boolean;
  showVisualizer: boolean;
  lastSynced: string;
  localStoragePermission: LocalStoragePermissionState;
  androidApiProfile: AndroidApiProfile;
  notificationPermission: MediaNotificationPermissionState;
}
