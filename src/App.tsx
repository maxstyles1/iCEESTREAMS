import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  COVERS,
  DEFAULT_PREFERENCES,
  EQ_PRESETS,
  INITIAL_FRIENDS,
  INITIAL_NOTIFICATIONS,
} from './data/catalog';
import {
  EqBands,
  EqPresetId,
  FriendActivity,
  NotificationItem,
  Playlist,
  RepeatMode,
  ScreenId,
  Track,
  UserPreferences,
} from './types';
import { globalPlayer } from './services/globalPlayerService';
import {
  detectAndroidApiProfile,
  requestAndroidAudioAndMediaPermissions,
  requestMediaNotificationPermission,
} from './utils/androidPermissions';
import { clearAllCachedStreams } from './utils/streamCache';
import {
  clearAllLocalTracksFromStorage,
  loadSavedLocalTracks,
  pickDirectoryViaFileSystemApi,
  removeLocalTrackFromStorage,
  rescanSavedMusicDirectory,
  saveLocalFilesToLibrary,
} from './utils/localMusicStorage';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Home from './components/Home';
import Search from './components/Search';
import Library from './components/Library';
import Social from './components/Social';
import Settings from './components/Settings';
import Player from './components/Player';
import QueueAudioPanel from './components/QueueAudioPanel';
import TrackActionSheet from './components/TrackActionSheet';
import PlaylistDetailModal from './components/PlaylistDetailModal';
import LocalPermissionModal from './components/LocalPermissionModal';
import AmbientGlow from './components/AmbientGlow';

const STORAGE_KEY = 'icee_streams_state_v3';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const detectedProfile = detectAndroidApiProfile();
    const initialNotif =
      typeof Notification !== 'undefined' && Notification.permission === 'granted'
        ? 'granted'
        : typeof Notification !== 'undefined' && Notification.permission === 'denied'
        ? 'denied'
        : 'prompt';
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('icee_streams_state_v2') ||
        localStorage.getItem('icee_streams_state_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.preferences) {
          const savedPreset = parsed.preferences.eqPreset as string | undefined;
          const validPreset: EqPresetId =
            savedPreset && Object.prototype.hasOwnProperty.call(EQ_PRESETS, savedPreset)
              ? (savedPreset as EqPresetId)
              : 'flat';
          return {
            ...DEFAULT_PREFERENCES,
            androidApiProfile: detectedProfile,
            notificationPermission: initialNotif,
            ...parsed.preferences,
            eqPreset: validPreset,
            eqBypassed: Boolean(parsed.preferences.eqBypassed),
            showVisualizer: parsed.preferences.showVisualizer ?? true,
          };
        }
      }
    } catch {
      // ignore storage read errors
    }
    return {
      ...DEFAULT_PREFERENCES,
      androidApiProfile: detectedProfile,
      notificationPermission: initialNotif,
    };
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.playlists)) return parsed.playlists;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.likedTrackIds)) return parsed.likedTrackIds;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [downloadedTrackIds, setDownloadedTrackIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.downloadedTrackIds)) return parsed.downloadedTrackIds;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState<boolean>(true);
  const [isScanningLocal, setIsScanningLocal] = useState<boolean>(false);
  const [pullOffset, setPullOffset] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState<boolean>(false);
  const pullStartYRef = useRef<number | null>(null);
  const [friends, setFriends] = useState<FriendActivity[]>(INITIAL_FRIENDS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const [currentTrackId, setCurrentTrackId] = useState<string>('');
  const [sourceTitle, setSourceTitle] = useState<string>('Local Device');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progressSec, setProgressSec] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number>(0);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number>(0);
  const [playNonce, setPlayNonce] = useState<number>(0);

  const [queueTrackIds, setQueueTrackIds] = useState<string[]>([]);

  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [inspectedPlaylist, setInspectedPlaylist] = useState<Playlist | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const showFeedback = useCallback((msg: string) => {
    setFeedbackMessage(msg);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 3200);
  }, []);

  // Wipe any leftover legacy stream caches or old server/catalog storage on boot
  useEffect(() => {
    try {
      localStorage.removeItem('icee_streams_state_v1');
      localStorage.removeItem('icee_streams_state_v2');
    } catch {
      // ignore
    }
    clearAllCachedStreams().catch(() => {});
  }, []);

  useEffect(() => {
    setIsLibraryLoading(true);
    loadSavedLocalTracks()
      .then((saved) => {
        if (saved.length > 0) {
          setLocalTracks(saved);
        }
      })
      .finally(() => {
        setIsLibraryLoading(false);
      });
  }, []);

  const allKnownTracks = useMemo(() => localTracks, [localTracks]);

  const playlistsWithLocal = useMemo(() => {
    if (localTracks.length === 0) return playlists;
    const localIds = localTracks.map((t) => t.id);
    const existingLocalPl = playlists.find((pl) => pl.id === 'pl-local-device');
    if (existingLocalPl) {
      return playlists.map((pl) =>
        pl.id === 'pl-local-device'
          ? {
              ...pl,
              trackIds: Array.from(new Set([...localIds, ...pl.trackIds])),
              coverUrl: localTracks[0]?.coverUrl || pl.coverUrl,
            }
          : pl
      );
    }
    const localPlaylist: Playlist = {
      id: 'pl-local-device',
      title: 'Local Device Music',
      subtitle: `${localTracks.length} audio ${localTracks.length === 1 ? 'file' : 'files'} from your device`,
      category: 'User',
      moodTag: 'Chill',
      coverUrl: localTracks[0]?.coverUrl || COVERS.chillVibes,
      fallbackGradient: 'from-cyan-700 via-purple-900 to-slate-950',
      trackIds: localIds,
      isUserCreated: true,
    };
    return [localPlaylist, ...playlists];
  }, [playlists, localTracks]);

  const currentTrack: Track | null =
    allKnownTracks.find((t) => t.id === currentTrackId) || null;

  useEffect(() => {
    document.body.className = `theme-${preferences.theme} surface-${preferences.surface} min-h-screen`;
  }, [preferences.theme, preferences.surface]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          preferences,
          playlists,
          likedTrackIds,
          downloadedTrackIds,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [preferences, playlists, likedTrackIds, downloadedTrackIds]);

  const handleNextRef = useRef<() => void>(() => {});
  const handlePrevRef = useRef<() => void>(() => {});
  const progressSecRef = useRef<number>(progressSec);
  progressSecRef.current = progressSec;
  const currentTrackRef = useRef<Track | null>(currentTrack);
  currentTrackRef.current = currentTrack;

  const playTrackById = (trackId: string, customSource?: string) => {
    const target = allKnownTracks.find((t) => t.id === trackId);
    if (!target) return;

    if (target.source === 'local' && preferences.localStoragePermission !== 'granted') {
      setIsPermissionModalOpen(true);
      showFeedback('Grant audio storage access to play local device files.');
      return;
    }

    if (trackId === currentTrackId) {
      setIsPlaying((prev) => !prev);
      return;
    }
    setCurrentTrackId(trackId);
    setProgressSec(0);
    setIsPlaying(true);
    setPlayNonce((n) => n + 1);
    if (customSource) setSourceTitle(customSource);
  };

  const handleNext = () => {
    if (repeatMode === 'one' && currentTrack) {
      setProgressSec(0);
      globalPlayer.seek(0);
      setIsPlaying(true);
      setPlayNonce((n) => n + 1);
      return;
    }
    if (queueTrackIds.length > 0) {
      const [nextId, ...rest] = queueTrackIds;
      setQueueTrackIds(rest);
      setCurrentTrackId(nextId);
      setProgressSec(0);
      setIsPlaying(true);
      setPlayNonce((n) => n + 1);
      return;
    }
    const pool = allKnownTracks;
    if (pool.length === 0) {
      setIsPlaying(false);
      return;
    }
    if (shuffle && pool.length > 1) {
      const others = pool.filter((t) => t.id !== currentTrackId);
      const pick = others[Math.floor(Math.random() * others.length)];
      setCurrentTrackId(pick.id);
      setProgressSec(0);
      setIsPlaying(true);
      setPlayNonce((n) => n + 1);
      return;
    }
    const idx = pool.findIndex((t) => t.id === currentTrackId);
    if (idx === -1 || idx === pool.length - 1) {
      if (repeatMode === 'all' || preferences.autoplaySimilar) {
        setCurrentTrackId(pool[0].id);
        setProgressSec(0);
        setIsPlaying(true);
        setPlayNonce((n) => n + 1);
      } else {
        setIsPlaying(false);
        setProgressSec(0);
      }
      return;
    }
    setCurrentTrackId(pool[idx + 1].id);
    setProgressSec(0);
    setIsPlaying(true);
    setPlayNonce((n) => n + 1);
  };

  handleNextRef.current = handleNext;

  const handlePrevious = () => {
    if (progressSecRef.current > 4) {
      setProgressSec(0);
      globalPlayer.seek(0);
      return;
    }
    const pool = allKnownTracks;
    if (pool.length === 0) return;
    const idx = pool.findIndex((t) => t.id === currentTrackId);
    const prevIdx = idx <= 0 ? pool.length - 1 : idx - 1;
    setCurrentTrackId(pool[prevIdx].id);
    setProgressSec(0);
    setIsPlaying(true);
    setPlayNonce((n) => n + 1);
  };

  handlePrevRef.current = handlePrevious;

  useEffect(() => {
    globalPlayer.init({
      onTimeUpdate: (cur, dur) => {
        setProgressSec(Math.floor(cur));
        const active = currentTrackRef.current;
        if (active && dur > 0 && Math.abs(active.durationSec - Math.round(dur)) > 2) {
          const rounded = Math.round(dur);
          setLocalTracks((prev) =>
            prev.map((t) => (t.id === active.id ? { ...t, durationSec: rounded } : t))
          );
        }
      },
      onEnded: () => handleNextRef.current(),
      onRemotePlay: () => setIsPlaying(true),
      onRemotePause: () => setIsPlaying(false),
      onRemoteNext: () => handleNextRef.current(),
      onRemotePrev: () => handlePrevRef.current(),
      onRemoteSeek: (sec) => {
        setProgressSec(Math.floor(sec));
        globalPlayer.seek(sec);
      },
      onError: (msg) => showFeedback(msg),
    });
  }, [showFeedback]);

  const loadedTrackKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const activeTrack = currentTrackRef.current;
    if (!activeTrack) {
      globalPlayer.stopAndReset();
      return;
    }

    const playOptions = {
      volume,
      isMuted,
      playbackSpeed,
      eqBands: preferences.eqBands,
      eqBypassed: preferences.eqBypassed,
      crossfadeSec: preferences.crossfadeSec,
      backgroundPlayback: preferences.backgroundPlayback,
    };

    if (!isPlaying) {
      globalPlayer.pause();
      return;
    }

    const loadKey = `${currentTrackId}:${playNonce}`;
    if (loadedTrackKeyRef.current !== loadKey) {
      loadedTrackKeyRef.current = loadKey;
      globalPlayer.playTrack(activeTrack, playOptions, progressSecRef.current);
    } else {
      globalPlayer.resume(activeTrack, playOptions, progressSecRef.current);
    }
  }, [isPlaying, currentTrackId, playNonce]);

  useEffect(() => {
    globalPlayer.updateAudioSettings({
      volume,
      isMuted,
      playbackSpeed,
      eqBands: preferences.eqBands,
      eqBypassed: preferences.eqBypassed,
      backgroundPlayback: preferences.backgroundPlayback,
    });
  }, [
    volume,
    isMuted,
    playbackSpeed,
    preferences.eqBands,
    preferences.eqBypassed,
    preferences.backgroundPlayback,
  ]);

  // Live countdown Sleep Timer
  useEffect(() => {
    if (sleepTimerRemainingSec <= 0) return;
    const interval = window.setInterval(() => {
      setSleepTimerRemainingSec((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          setSleepTimerMinutes(0);
          showFeedback('Sleep timer ended playback');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sleepTimerRemainingSec, showFeedback]);

  const handleChangeSleepTimer = (mins: number) => {
    setSleepTimerMinutes(mins);
    setSleepTimerRemainingSec(mins * 60);
    showFeedback(
      mins === 0 ? 'Sleep timer turned off' : `Sleep timer set for ${mins} minutes`
    );
  };

  const handleImportLocalFiles = async (files: File[]) => {
    setIsScanningLocal(true);
    try {
      const permRes = await requestAndroidAudioAndMediaPermissions(preferences.androidApiProfile);
      setPreferences((prev) => ({
        ...prev,
        localStoragePermission: permRes.storageGranted ? 'granted' : prev.localStoragePermission,
        notificationPermission: permRes.notificationsState,
      }));

      const imported = await saveLocalFilesToLibrary(files);
      if (imported.length === 0) {
        showFeedback('No supported audio files (MP3, M4A, WAV, FLAC, OGG) found.');
        setIsPermissionModalOpen(false);
        return;
      }

      setLocalTracks((prev) => {
        const map = new Map<string, Track>();
        for (const t of imported) map.set(t.id, t);
        for (const t of prev) if (!map.has(t.id)) map.set(t.id, t);
        return Array.from(map.values());
      });
      setIsPermissionModalOpen(false);
      setCurrentScreen('library');
      showFeedback(
        `Imported ${imported.length} local audio ${imported.length === 1 ? 'file' : 'files'}`
      );
    } finally {
      setIsScanningLocal(false);
    }
  };

  const handleGrantAndPickFolder = async () => {
    const permRes = await requestAndroidAudioAndMediaPermissions(preferences.androidApiProfile);
    setPreferences((prev) => ({
      ...prev,
      notificationPermission: permRes.notificationsState,
    }));

    const res = await pickDirectoryViaFileSystemApi();
    if (res.cancelled) return;
    if (!res.supported) {
      showFeedback('Folder API unavailable here — use Folder Picker Fallback.');
      return;
    }
    await handleImportLocalFiles(res.files);
  };

  const handleRescanLocalMusic = async () => {
    setIsScanningLocal(true);
    try {
      const res = await rescanSavedMusicDirectory();
      if (res.hasSavedHandle) {
        if (res.files.length === 0) {
          showFeedback(`Rescanned "${res.folderName || 'Music'}" · No audio files found`);
          return;
        }
        const imported = await saveLocalFilesToLibrary(res.files);
        setLocalTracks((prev) => {
          const map = new Map<string, Track>();
          for (const t of imported) map.set(t.id, t);
          for (const t of prev) if (!map.has(t.id)) map.set(t.id, t);
          return Array.from(map.values());
        });
        showFeedback(
          `Rescanned "${res.folderName || 'Music'}" · Synced ${imported.length} audio tracks`
        );
        return;
      }
      setIsPermissionModalOpen(true);
      showFeedback('Select your music folder to scan audio files.');
    } finally {
      setIsScanningLocal(false);
    }
  };

  const handlePullRefresh = useCallback(async () => {
    if (isPullRefreshing) return;
    setIsPullRefreshing(true);
    try {
      const res = await rescanSavedMusicDirectory();
      if (res.hasSavedHandle && res.files.length > 0) {
        const imported = await saveLocalFilesToLibrary(res.files);
        setLocalTracks((prev) => {
          const map = new Map<string, Track>();
          for (const t of imported) map.set(t.id, t);
          for (const t of prev) if (!map.has(t.id)) map.set(t.id, t);
          return Array.from(map.values());
        });
        showFeedback(`Library refreshed · ${imported.length} tracks synced`);
      } else {
        const saved = await loadSavedLocalTracks();
        setLocalTracks(saved);
        showFeedback('Library refreshed');
      }
    } finally {
      window.setTimeout(() => {
        setIsPullRefreshing(false);
        setPullOffset(0);
      }, 280);
    }
  }, [isPullRefreshing, showFeedback]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (
      window.scrollY > 2 ||
      isPlayerOpen ||
      isPermissionModalOpen ||
      Boolean(inspectedPlaylist) ||
      Boolean(menuTrack)
    ) {
      pullStartYRef.current = null;
      return;
    }
    pullStartYRef.current = e.touches[0]?.clientY ?? null;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartYRef.current === null || window.scrollY > 2) return;
    const currentY = e.touches[0]?.clientY ?? pullStartYRef.current;
    const deltaY = currentY - pullStartYRef.current;
    if (deltaY > 0) {
      const damped = Math.min(88, Math.round(deltaY * 0.42));
      setPullOffset(damped);
    } else {
      setPullOffset(0);
    }
  };

  const handleTouchEnd = () => {
    pullStartYRef.current = null;
    setIsPulling(false);
    if (pullOffset >= 64) {
      setPullOffset(48);
      void handlePullRefresh();
    } else {
      setPullOffset(0);
    }
  };

  const handleRequestLocalPermissionAction = async () => {
    const permRes = await requestAndroidAudioAndMediaPermissions(preferences.androidApiProfile);
    setPreferences((prev) => ({
      ...prev,
      localStoragePermission: permRes.storageGranted ? 'granted' : prev.localStoragePermission,
      notificationPermission: permRes.notificationsState,
    }));
    setIsPermissionModalOpen(true);
  };

  const handleDenyLocalPermission = () => {
    setPreferences((prev) => ({ ...prev, localStoragePermission: 'denied' }));
    setIsPermissionModalOpen(false);
    showFeedback('Local audio permission declined. You can grant it anytime in Library or Settings.');
  };

  const handleRequestNotificationPermission = async () => {
    const status = await requestMediaNotificationPermission();
    setPreferences((prev) => ({ ...prev, notificationPermission: status }));
    showFeedback(
      status === 'granted'
        ? 'Lock-screen media notification permission enabled'
        : status === 'denied'
        ? 'Notifications blocked in browser settings'
        : 'Media notification permission pending'
    );
  };

  const handleRemoveLocalTrack = async (trackId: string) => {
    await removeLocalTrackFromStorage(trackId);
    const remaining = localTracks.filter((t) => t.id !== trackId);
    setLocalTracks(remaining);
    if (currentTrackId === trackId) {
      setIsPlaying(false);
      setIsPlayerOpen(false);
      setProgressSec(0);
      setCurrentTrackId(remaining[0]?.id || '');
    }
    showFeedback('Removed local audio file from library');
  };

  const handleClearLocalTracks = async () => {
    await clearAllLocalTracksFromStorage();
    setLocalTracks([]);
    setQueueTrackIds([]);
    setLikedTrackIds([]);
    setDownloadedTrackIds([]);
    setIsPlaying(false);
    setIsPlayerOpen(false);
    setProgressSec(0);
    setCurrentTrackId('');
    globalPlayer.stopAndReset();
    showFeedback('Cleared all audio files');
  };

  const handlePlayPlaylist = (playlist: Playlist, shouldShuffle = false) => {
    if (playlist.trackIds.length === 0) return;
    let ids = [...playlist.trackIds];
    if (shouldShuffle) {
      ids = ids.sort(() => Math.random() - 0.5);
      setShuffle(true);
    }
    const [first, ...rest] = ids;
    setCurrentTrackId(first);
    setQueueTrackIds(rest);
    setSourceTitle(playlist.title);
    setProgressSec(0);
    setIsPlaying(true);
    setPlayNonce((n) => n + 1);
    setInspectedPlaylist(null);
    showFeedback(`${shouldShuffle ? 'Shuffling' : 'Playing'} ${playlist.title}`);
  };

  const handleToggleLike = (trackId: string) => {
    setLikedTrackIds((prev) => {
      const exists = prev.includes(trackId);
      const t = allKnownTracks.find((item) => item.id === trackId);
      showFeedback(
        exists
          ? `Removed "${t?.title || 'Track'}" from Liked`
          : `Saved "${t?.title || 'Track'}" to Liked`
      );
      return exists ? prev.filter((id) => id !== trackId) : [trackId, ...prev];
    });
  };

  const handleToggleDownload = (trackId: string) => {
    setDownloadedTrackIds((prev) => {
      const exists = prev.includes(trackId);
      const t = allKnownTracks.find((item) => item.id === trackId);
      showFeedback(
        exists
          ? `Removed offline copy of "${t?.title || 'Track'}"`
          : `Saved "${t?.title || 'Track'}" to offline list`
      );
      return exists ? prev.filter((id) => id !== trackId) : [trackId, ...prev];
    });
  };

  const handleDownloadAll = (trackIds: string[]) => {
    setDownloadedTrackIds((prev) => Array.from(new Set([...prev, ...trackIds])));
    showFeedback(`Saved ${trackIds.length} tracks to offline list`);
  };

  const handleClearOfflineDownloads = () => {
    setDownloadedTrackIds([]);
    showFeedback('Cleared offline list');
  };

  const handlePlayNext = (trackId: string) => {
    setQueueTrackIds((prev) => [trackId, ...prev]);
    const t = allKnownTracks.find((item) => item.id === trackId);
    showFeedback(`Queued "${t?.title || 'Track'}" to play next`);
  };

  const handleAddToQueue = (trackId: string) => {
    setQueueTrackIds((prev) => [...prev, trackId]);
    const t = allKnownTracks.find((item) => item.id === trackId);
    showFeedback(`Added "${t?.title || 'Track'}" to queue`);
  };

  const handleMoveQueueItem = (index: number, direction: 'up' | 'down') => {
    setQueueTrackIds((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueueTrackIds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const exists = prev.some((pl) => pl.id === playlistId);
      if (!exists && playlistId === 'pl-local-device') {
        const localPl = playlistsWithLocal.find((pl) => pl.id === 'pl-local-device');
        if (localPl) {
          return [
            {
              ...localPl,
              trackIds: localPl.trackIds.includes(trackId)
                ? localPl.trackIds
                : [...localPl.trackIds, trackId],
            },
            ...prev,
          ];
        }
      }
      return prev.map((pl) =>
        pl.id === playlistId && !pl.trackIds.includes(trackId)
          ? { ...pl, trackIds: [...pl.trackIds, trackId] }
          : pl
      );
    });
    const targetPl = playlistsWithLocal.find((p) => p.id === playlistId);
    showFeedback(`Added track to "${targetPl?.title || 'Playlist'}"`);
  };

  const handleCreatePlaylist = (title: string, subtitle: string, initialTrackId?: string) => {
    const newPl: Playlist = {
      id: `pl-user-${Date.now()}`,
      title,
      subtitle,
      category: 'User',
      moodTag: 'Chill',
      coverUrl: COVERS.chillVibes,
      fallbackGradient: 'from-purple-900 to-slate-950',
      trackIds: initialTrackId ? [initialTrackId] : [],
      isUserCreated: true,
    };
    setPlaylists((prev) => [newPl, ...prev]);
    showFeedback(`Created playlist "${title}"`);
  };

  const handleUpdatePreferences = (patch: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectEqPreset = (preset: EqPresetId) => {
    handleUpdatePreferences({
      eqPreset: preset,
      eqBands: { ...EQ_PRESETS[preset].bands },
      eqBypassed: false,
    });
  };

  const handleChangeEqBand = (band: keyof EqBands, value: number) => {
    setPreferences((prev) => ({
      ...prev,
      eqBypassed: false,
      eqBands: { ...prev.eqBands, [band]: value },
    }));
  };

  const handleResetEq = () => {
    handleUpdatePreferences({
      eqPreset: 'flat',
      eqBands: { ...EQ_PRESETS.flat.bands },
      eqBypassed: false,
    });
    showFeedback('Equalizer reset to Flat');
  };

  const handleShareTrack = (track: Track) => {
    const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    showFeedback(`Copied share link for "${track.title}"`);
  };

  const queueTracks = queueTrackIds
    .map((id) => allKnownTracks.find((t) => t.id === id))
    .filter((t): t is Track => Boolean(t));

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AmbientGlow
          coverUrl={currentTrack?.coverUrl || ''}
          trackKey={currentTrack?.id || 'empty'}
          fallbackGradient={currentTrack?.fallbackGradient}
          variant="backdrop"
          isPlaying={isPlaying}
        />
      </div>

      <TopBar
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        onToggleAudioDrawer={() => setIsAudioDrawerOpen((v) => !v)}
      />

      <main
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-5 pb-36 md:pb-28 flex items-start gap-6"
      >
        <div
          className="flex-1 min-w-0"
          style={{
            transform: pullOffset > 0 ? `translate3d(0, ${pullOffset}px, 0)` : undefined,
            transition: isPulling ? 'none' : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {(pullOffset > 12 || isPullRefreshing) && (
            <div className="flex items-center justify-center gap-2 pb-4 text-xs text-[#F5F5FA]/70">
              <RefreshCw
                className={`w-4 h-4 accent-text ${isPullRefreshing ? 'animate-spin' : ''}`}
              />
              <span className="label-caps text-[10px]">
                {isPullRefreshing
                  ? 'Refreshing library...'
                  : pullOffset >= 64
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
              </span>
            </div>
          )}

          <div key={currentScreen} className="page-transition">
            {currentScreen === 'home' && (
              <Home
                playlists={playlistsWithLocal}
                tracks={allKnownTracks}
                notifications={notifications}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                isLoading={isLibraryLoading}
                likedTrackIds={likedTrackIds}
                downloadedTrackIds={downloadedTrackIds}
                density={preferences.density}
                localStoragePermission={preferences.localStoragePermission}
                onNavigate={setCurrentScreen}
                onPlayPlaylist={handlePlayPlaylist}
                onInspectPlaylist={setInspectedPlaylist}
                onPlayTrack={(id) => playTrackById(id, 'Local Device')}
                onToggleLike={handleToggleLike}
                onToggleDownload={handleToggleDownload}
                onOpenTrackMenu={setMenuTrack}
                onMarkNotificationsRead={() =>
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                }
                onRequestLocalPermission={handleRequestLocalPermissionAction}
                onDenyLocalPermission={handleDenyLocalPermission}
              />
            )}

            {currentScreen === 'search' && (
              <Search
                tracks={allKnownTracks}
                playlists={playlistsWithLocal}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                isLoading={isLibraryLoading}
                likedTrackIds={likedTrackIds}
                downloadedTrackIds={downloadedTrackIds}
                density={preferences.density}
                onPlayTrack={(id) => playTrackById(id, 'Search Results')}
                onPlayPlaylist={(pl) => handlePlayPlaylist(pl, false)}
                onInspectPlaylist={setInspectedPlaylist}
                onToggleLike={handleToggleLike}
                onToggleDownload={handleToggleDownload}
                onOpenTrackMenu={setMenuTrack}
                onOpenLibraryLocal={() => setCurrentScreen('library')}
              />
            )}

            {currentScreen === 'library' && (
              <Library
                tracks={allKnownTracks}
                localTracks={localTracks}
                playlists={playlistsWithLocal}
                likedTrackIds={likedTrackIds}
                downloadedTrackIds={downloadedTrackIds}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                isLoading={isLibraryLoading}
                isScanning={isScanningLocal}
                preferences={preferences}
                onPlayTrack={(id) => playTrackById(id, 'Your Library')}
                onAddToQueue={handleAddToQueue}
                onPlayPlaylist={(pl) => handlePlayPlaylist(pl, false)}
                onInspectPlaylist={setInspectedPlaylist}
                onToggleLike={handleToggleLike}
                onToggleDownload={handleToggleDownload}
                onOpenTrackMenu={setMenuTrack}
                onCreatePlaylist={(title, subtitle) => handleCreatePlaylist(title, subtitle)}
                onClearOfflineDownloads={handleClearOfflineDownloads}
                onUpdatePreferences={handleUpdatePreferences}
                onRequestLocalPermission={handleRequestLocalPermissionAction}
                onRescanLocalMusic={handleRescanLocalMusic}
                onPickFolderFallback={handleImportLocalFiles}
                onRemoveLocalTrack={handleRemoveLocalTrack}
                onClearLocalTracks={handleClearLocalTracks}
              />
            )}

            {currentScreen === 'social' && (
              <Social
                friends={friends}
                tracks={allKnownTracks}
                playlists={playlistsWithLocal}
                currentTrack={currentTrack}
                queueTracks={queueTracks}
                theme={preferences.theme}
                onPlayTrack={(id) => playTrackById(id, 'Social')}
                onToggleFollow={(friendId) =>
                  setFriends((prev) =>
                    prev.map((f) =>
                      f.id === friendId ? { ...f, isFollowing: !f.isFollowing } : f
                    )
                  )
                }
                onAddTrackToPlaylist={handleAddToPlaylist}
                onInspectPlaylist={setInspectedPlaylist}
                onShowFeedback={showFeedback}
              />
            )}

            {currentScreen === 'settings' && (
              <Settings
                preferences={preferences}
                localTrackCount={localTracks.length}
                onUpdatePreferences={handleUpdatePreferences}
                onSelectEqPreset={handleSelectEqPreset}
                onChangeEqBand={handleChangeEqBand}
                onResetEq={handleResetEq}
                onRequestLocalPermission={handleRequestLocalPermissionAction}
                onRescanLocalMusic={handleRescanLocalMusic}
                onRequestNotificationPermission={handleRequestNotificationPermission}
                onSyncNow={() => {
                  const now = new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  handleUpdatePreferences({ lastSynced: `Today at ${now}` });
                  showFeedback('Preferences saved');
                }}
                onResetPreferences={() => {
                  setPreferences(DEFAULT_PREFERENCES);
                  showFeedback('Preferences restored to defaults');
                }}
              />
            )}
          </div>
        </div>

        <QueueAudioPanel
          isOpen={isAudioDrawerOpen}
          isPlaying={isPlaying}
          onClose={() => setIsAudioDrawerOpen(false)}
          currentTrack={currentTrack}
          queueTrackIds={queueTrackIds}
          allTracks={allKnownTracks}
          playbackSpeed={playbackSpeed}
          sleepTimerMinutes={sleepTimerMinutes}
          sleepTimerRemainingSec={sleepTimerRemainingSec}
          volume={isMuted ? 0 : volume}
          preferences={preferences}
          onPlayFromQueue={(id) => playTrackById(id, 'Up Next Queue')}
          onMoveQueueItem={handleMoveQueueItem}
          onRemoveFromQueue={handleRemoveFromQueue}
          onClearQueue={() => setQueueTrackIds([])}
          onChangeSpeed={setPlaybackSpeed}
          onChangeSleepTimer={handleChangeSleepTimer}
          onChangeVolume={(val) => {
            setVolume(val);
            if (val > 0 && isMuted) setIsMuted(false);
          }}
          onSelectEqPreset={handleSelectEqPreset}
          onChangeEqBand={handleChangeEqBand}
          onResetEq={handleResetEq}
          onUpdatePreferences={handleUpdatePreferences}
        />
      </main>

      <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />

      <Player
        track={currentTrack}
        sourceTitle={sourceTitle}
        isOpen={isPlayerOpen}
        setIsOpen={setIsPlayerOpen}
        isPlaying={isPlaying}
        progressSec={progressSec}
        volume={volume}
        isMuted={isMuted}
        shuffle={shuffle}
        repeatMode={repeatMode}
        playbackSpeed={playbackSpeed}
        sleepTimerMinutes={sleepTimerMinutes}
        sleepTimerRemainingSec={sleepTimerRemainingSec}
        isLiked={currentTrack ? likedTrackIds.includes(currentTrack.id) : false}
        isDownloaded={currentTrack ? downloadedTrackIds.includes(currentTrack.id) : false}
        queueTracks={queueTracks}
        preferences={preferences}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSeek={(sec) => {
          if (!currentTrack) return;
          setProgressSec(sec);
          globalPlayer.seek(sec);
          globalPlayer.updateMediaPositionState(sec, currentTrack.durationSec);
        }}
        onChangeVolume={(val) => {
          setVolume(val);
          if (val > 0 && isMuted) setIsMuted(false);
        }}
        onToggleMute={() => setIsMuted((m) => !m)}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onCycleRepeat={() =>
          setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'))
        }
        onChangeSpeed={setPlaybackSpeed}
        onChangeSleepTimer={handleChangeSleepTimer}
        onToggleLike={handleToggleLike}
        onToggleDownload={handleToggleDownload}
        onPlayFromQueue={(id) => playTrackById(id, 'Up Next Queue')}
        onSelectEqPreset={handleSelectEqPreset}
        onChangeEqBand={handleChangeEqBand}
        onResetEq={handleResetEq}
        onUpdatePreferences={handleUpdatePreferences}
        onOpenTrackMenu={setMenuTrack}
        onShareTrack={handleShareTrack}
      />

      <TrackActionSheet
        track={menuTrack}
        onClose={() => setMenuTrack(null)}
        isLiked={menuTrack ? likedTrackIds.includes(menuTrack.id) : false}
        isDownloaded={menuTrack ? downloadedTrackIds.includes(menuTrack.id) : false}
        playlists={playlistsWithLocal}
        onPlayNow={(id) => playTrackById(id)}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onToggleLike={handleToggleLike}
        onToggleDownload={handleToggleDownload}
        onAddToPlaylist={handleAddToPlaylist}
        onCreatePlaylistWithTrack={(title, trackId) =>
          handleCreatePlaylist(title, 'Personal mix', trackId)
        }
        onShareTrack={handleShareTrack}
      />

      <PlaylistDetailModal
        playlist={inspectedPlaylist}
        tracks={allKnownTracks}
        currentTrackId={currentTrackId}
        isPlaying={isPlaying}
        likedTrackIds={likedTrackIds}
        downloadedTrackIds={downloadedTrackIds}
        density={preferences.density}
        onClose={() => setInspectedPlaylist(null)}
        onPlayPlaylist={handlePlayPlaylist}
        onPlayTrack={(id) => playTrackById(id, inspectedPlaylist?.title)}
        onToggleLike={handleToggleLike}
        onToggleDownload={handleToggleDownload}
        onDownloadAll={handleDownloadAll}
        onOpenTrackMenu={setMenuTrack}
      />

      <LocalPermissionModal
        isOpen={isPermissionModalOpen}
        permissionState={preferences.localStoragePermission}
        androidApiProfile={preferences.androidApiProfile}
        onChangeAndroidProfile={(profile) =>
          handleUpdatePreferences({ androidApiProfile: profile })
        }
        onClose={() => setIsPermissionModalOpen(false)}
        onGrantAndPickFiles={handleImportLocalFiles}
        onGrantAndPickFolder={handleGrantAndPickFolder}
        onDeny={handleDenyLocalPermission}
      />

      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 right-4 z-50 surface-elevated border accent-ring accent-glow-ring rounded-2xl px-4 py-2.5 text-xs font-medium text-[#F5F5FA] shadow-xl page-transition"
        >
          {feedbackMessage}
        </div>
      )}
    </div>
  );
}
