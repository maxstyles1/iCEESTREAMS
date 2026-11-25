import { AndroidApiProfile } from '../types';

export interface AndroidPermissionReport {
  isAndroidDevice: boolean;
  apiProfile: AndroidApiProfile;
  audioPermissionName: 'READ_MEDIA_AUDIO' | 'READ_EXTERNAL_STORAGE';
  audioManifestPermission: string;
  backgroundPermissions: string[];
}

interface NativeAndroidBridge {
  requestPermissions?: (perms: string[]) => Promise<Record<string, string>> | boolean;
  hasPermission?: (perm: string) => boolean;
}

export function detectAndroidApiProfile(): AndroidApiProfile {
  if (typeof navigator === 'undefined') return 'android13+';
  const ua = navigator.userAgent || '';
  const match = /Android\s+(\d+)/i.exec(ua);
  if (match) {
    const major = parseInt(match[1], 10);
    return major >= 13 ? 'android13+' : 'android12-';
  }
  return 'android13+';
}

export function getAndroidPermissionReport(profile: AndroidApiProfile): AndroidPermissionReport {
  const isAndroidDevice =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

  const isApi33Plus = profile === 'android13+';
  const audioPermissionName = isApi33Plus ? 'READ_MEDIA_AUDIO' : 'READ_EXTERNAL_STORAGE';
  const audioManifestPermission = isApi33Plus
    ? 'android.permission.READ_MEDIA_AUDIO'
    : 'android.permission.READ_EXTERNAL_STORAGE';

  const backgroundPermissions = [
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'android.permission.WAKE_LOCK',
    ...(isApi33Plus ? ['android.permission.POST_NOTIFICATIONS'] : []),
  ];

  return {
    isAndroidDevice,
    apiProfile: profile,
    audioPermissionName,
    audioManifestPermission,
    backgroundPermissions,
  };
}

export async function requestAndroidAudioAndMediaPermissions(
  profile: AndroidApiProfile
): Promise<{
  storageGranted: boolean;
  notificationsState: 'granted' | 'denied' | 'prompt';
}> {
  const report = getAndroidPermissionReport(profile);
  const win = window as unknown as {
    AndroidPermissions?: NativeAndroidBridge;
    Capacitor?: {
      Plugins?: {
        Permissions?: NativeAndroidBridge;
      };
    };
  };

  const nativeBridge = win.AndroidPermissions || win.Capacitor?.Plugins?.Permissions;
  if (nativeBridge?.requestPermissions) {
    try {
      await nativeBridge.requestPermissions([
        report.audioManifestPermission,
        ...report.backgroundPermissions,
      ]);
    } catch {
      // continue to web permissions
    }
  }

  let notificationsState: 'granted' | 'denied' | 'prompt' = 'prompt';
  if (typeof Notification !== 'undefined') {
    try {
      if (Notification.permission === 'granted') {
        notificationsState = 'granted';
      } else if (Notification.permission === 'denied') {
        notificationsState = 'denied';
      } else {
        const res = await Notification.requestPermission();
        notificationsState = res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'prompt';
      }
    } catch {
      notificationsState = 'prompt';
    }
  }

  let storageGranted = true;
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      await navigator.storage.persist();
    }
  } catch {
    storageGranted = true;
  }

  return { storageGranted, notificationsState };
}

export async function requestMediaNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (typeof Notification === 'undefined') return 'granted';
  try {
    if (Notification.permission === 'granted') return 'granted';
    const res = await Notification.requestPermission();
    return res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'prompt';
  }
}
