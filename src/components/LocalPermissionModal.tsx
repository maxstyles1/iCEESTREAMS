import { useRef } from 'react';
import { Bell, FolderOpen, HardDrive, Music2, ShieldCheck, Smartphone, X } from 'lucide-react';
import { AndroidApiProfile, LocalStoragePermissionState } from '../types';
import { getAndroidPermissionReport } from '../utils/androidPermissions';

interface LocalPermissionModalProps {
  isOpen: boolean;
  permissionState: LocalStoragePermissionState;
  androidApiProfile: AndroidApiProfile;
  onChangeAndroidProfile: (profile: AndroidApiProfile) => void;
  onClose: () => void;
  onGrantAndPickFiles: (files: File[]) => void;
  onGrantAndPickFolder: () => void;
  onDeny: () => void;
}

export default function LocalPermissionModal({
  isOpen,
  permissionState,
  androidApiProfile,
  onChangeAndroidProfile,
  onClose,
  onGrantAndPickFiles,
  onGrantAndPickFolder,
  onDeny,
}: LocalPermissionModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const report = getAndroidPermissionReport(androidApiProfile);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Audio Storage and Media Service Permissions"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg surface-elevated rounded-t-3xl sm:rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl accent-soft-bg accent-text flex items-center justify-center shrink-0">
              <HardDrive size={22} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Audio Storage & Background Media Access
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Status: {permissionState === 'granted' ? 'Granted' : permissionState === 'denied' ? 'Denied' : 'Not set'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close permission dialog"
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Allow iCEE Streams to scan audio files on your device (MP3, M4A, WAV, FLAC, OGG) and enable background playback controls on your lock screen and media notifications.
        </p>

        <div className="surface-card rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <Smartphone size={14} className="accent-text" />
              <span>Android Storage Permission Target</span>
            </span>
            <div className="flex items-center p-0.5 bg-black/40 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => onChangeAndroidProfile('android13+')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  androidApiProfile === 'android13+'
                    ? 'accent-bg text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Android 13+
              </button>
              <button
                type="button"
                onClick={() => onChangeAndroidProfile('android12-')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  androidApiProfile === 'android12-'
                    ? 'accent-bg text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Android 12 & Older
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 pt-1 border-t border-white/10">
            <p className="flex items-center gap-2">
              <ShieldCheck size={14} className="accent-text shrink-0" />
              <span>
                Audio access: <code className="font-mono text-white">{report.audioPermissionName}</code>
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Bell size={14} className="accent-text shrink-0" />
              <span>
                Background media: <code className="font-mono text-white">FOREGROUND_SERVICE_MEDIA_PLAYBACK</code>
              </span>
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.aac,.opus"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files || []);
            if (list.length > 0) {
              onGrantAndPickFiles(list);
            }
            e.target.value = '';
          }}
        />

        <input
          ref={folderInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.aac,.opus"
          multiple
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files || []);
            if (list.length > 0) {
              onGrantAndPickFiles(list);
            }
            e.target.value = '';
          }}
        />

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={async () => {
              const win = window as unknown as { showDirectoryPicker?: unknown };
              if (typeof win.showDirectoryPicker === 'function') {
                onGrantAndPickFolder();
              } else {
                folderInputRef.current?.click();
              }
            }}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl accent-bg text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <FolderOpen size={16} />
            <span>Allow {report.audioPermissionName} & Scan Music Folder</span>
          </button>

          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl surface-card hover:bg-white/5 text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <FolderOpen size={16} className="accent-text" />
            <span>Folder Picker Fallback</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl surface-card hover:bg-white/5 text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <Music2 size={16} className="accent-text" />
            <span>Select Individual Audio Files</span>
          </button>

          <button
            type="button"
            onClick={onDeny}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Don’t Allow Local Storage Access
          </button>
        </div>
      </div>
    </div>
  );
}
