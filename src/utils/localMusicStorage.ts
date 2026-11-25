import { Track } from '../types';
import { COVERS } from '../data/catalog';

const DB_NAME = 'icee_local_music_v2';
const TRACKS_STORE = 'local_tracks';
const HANDLES_STORE = 'dir_handles';
const SAVED_DIR_KEY = 'primary_music_dir';
const AUDIO_EXTENSIONS = /\.(mp3|m4a|wav|flac|ogg|aac|opus|webm)$/i;

interface StoredLocalTrackRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  sizeMb: number;
  fileName: string;
  mimeType: string;
  blob: Blob;
  addedAt: number;
}

interface DirectoryHandleLike {
  name: string;
  values: () => AsyncIterable<{
    kind: 'file' | 'directory';
    name: string;
    getFile?: () => Promise<File>;
    values?: () => AsyncIterable<unknown>;
  }>;
  queryPermission?: (desc: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (desc: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HANDLES_STORE)) {
        db.createObjectStore(HANDLES_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open local music store.'));
  });
}

function parseFilenameMetadata(fileName: string): { title: string; artist: string } {
  const base = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').trim();
  const dashSplit = base.split(' - ');
  if (dashSplit.length >= 2) {
    return {
      artist: dashSplit[0].trim() || 'Local Artist',
      title: dashSplit.slice(1).join(' - ').trim() || base,
    };
  }
  return {
    title: base || 'Untitled Local Track',
    artist: 'Local Device',
  };
}

function probeAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'metadata';
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.src = '';
    };
    audio.onloadedmetadata = () => {
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : 180;
      cleanup();
      resolve(dur);
    };
    audio.onerror = () => {
      cleanup();
      resolve(180);
    };
    audio.src = url;
  });
}

function toTrack(rec: StoredLocalTrackRecord): Track {
  return {
    id: rec.id,
    title: rec.title,
    artist: rec.artist,
    album: rec.album,
    genre: 'Local',
    mood: 'Chill',
    bpm: 110,
    language: 'English',
    explicit: false,
    durationSec: rec.durationSec,
    sizeMb: rec.sizeMb,
    keySignature: 'Local Audio',
    coverUrl: COVERS.chillVibes,
    fallbackGradient: 'from-cyan-900 via-slate-900 to-black',
    lyrics: [`Playing directly from local file: ${rec.fileName}`],
    chordHz: [174.61, 220.0, 261.63],
    source: 'local',
    localFileName: rec.fileName,
  };
}

async function saveDirectoryHandle(handle: DirectoryHandleLike): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLES_STORE, 'readwrite');
      tx.objectStore(HANDLES_STORE).put(handle, SAVED_DIR_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Some browsers don't allow cloning FileSystemDirectoryHandle in IDB
  }
}

async function getSavedDirectoryHandle(): Promise<DirectoryHandleLike | null> {
  try {
    const db = await openDb();
    return await new Promise<DirectoryHandleLike | null>((resolve) => {
      const tx = db.transaction(HANDLES_STORE, 'readonly');
      const req = tx.objectStore(HANDLES_STORE).get(SAVED_DIR_KEY);
      req.onsuccess = () => resolve((req.result as DirectoryHandleLike) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function collectAudioFilesFromDirectory(
  dirHandle: DirectoryHandleLike,
  depth = 0
): Promise<File[]> {
  if (depth > 3) return [];
  const files: File[] = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.getFile) {
      const f = await entry.getFile();
      if (f.type.startsWith('audio/') || AUDIO_EXTENSIONS.test(f.name)) {
        files.push(f);
      }
    } else if (entry.kind === 'directory' && entry.values) {
      const nested = await collectAudioFilesFromDirectory(
        entry as unknown as DirectoryHandleLike,
        depth + 1
      );
      files.push(...nested);
    }
  }
  return files;
}

export async function saveLocalFilesToLibrary(files: File[]): Promise<Track[]> {
  const audioFiles = files.filter(
    (f) => f.type.startsWith('audio/') || AUDIO_EXTENSIONS.test(f.name)
  );
  if (audioFiles.length === 0) return [];

  const db = await openDb();
  const imported: Track[] = [];

  for (const file of audioFiles) {
    const { title, artist } = parseFilenameMetadata(file.name);
    const durationSec = await probeAudioDuration(file);
    const id = `local-${file.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${file.size}`;
    const record: StoredLocalTrackRecord = {
      id,
      title,
      artist,
      album: 'Local Device Storage',
      durationSec,
      sizeMb: Math.max(0.1, parseFloat((file.size / (1024 * 1024)).toFixed(2))),
      fileName: file.name,
      mimeType: file.type || 'audio/mpeg',
      blob: file,
      addedAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, 'readwrite');
      tx.objectStore(TRACKS_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to store local audio file.'));
    });

    imported.push(toTrack(record));
  }

  return imported;
}

export async function loadSavedLocalTracks(): Promise<Track[]> {
  try {
    const db = await openDb();
    const records = await new Promise<StoredLocalTrackRecord[]>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, 'readonly');
      const req = tx.objectStore(TRACKS_STORE).getAll();
      req.onsuccess = () => resolve((req.result as StoredLocalTrackRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    return records.sort((a, b) => b.addedAt - a.addedAt).map(toTrack);
  } catch {
    return [];
  }
}

export async function getLocalTrackBlobUrl(trackId: string): Promise<string | null> {
  try {
    const db = await openDb();
    const rec = await new Promise<StoredLocalTrackRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, 'readonly');
      const req = tx.objectStore(TRACKS_STORE).get(trackId);
      req.onsuccess = () => resolve(req.result as StoredLocalTrackRecord | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!rec?.blob) return null;
    return URL.createObjectURL(rec.blob);
  } catch {
    return null;
  }
}

export async function removeLocalTrackFromStorage(trackId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, 'readwrite');
      tx.objectStore(TRACKS_STORE).delete(trackId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function clearAllLocalTracksFromStorage(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, 'readwrite');
      tx.objectStore(TRACKS_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function pickDirectoryViaFileSystemApi(): Promise<{
  supported: boolean;
  cancelled: boolean;
  files: File[];
  folderName?: string;
}> {
  const win = window as unknown as {
    showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<DirectoryHandleLike>;
  };

  if (typeof win.showDirectoryPicker !== 'function') {
    return { supported: false, cancelled: false, files: [] };
  }

  try {
    const dirHandle = await win.showDirectoryPicker({ mode: 'read' });
    await saveDirectoryHandle(dirHandle);
    const files = await collectAudioFilesFromDirectory(dirHandle);
    return { supported: true, cancelled: false, files, folderName: dirHandle.name };
  } catch (err) {
    const domErr = err as DOMException;
    if (domErr?.name === 'AbortError') {
      return { supported: true, cancelled: true, files: [] };
    }
    return { supported: false, cancelled: false, files: [] };
  }
}

export async function rescanSavedMusicDirectory(): Promise<{
  hasSavedHandle: boolean;
  files: File[];
  folderName?: string;
}> {
  const handle = await getSavedDirectoryHandle();
  if (!handle) {
    return { hasSavedHandle: false, files: [] };
  }
  try {
    let status = handle.queryPermission ? await handle.queryPermission({ mode: 'read' }) : 'granted';
    if (status !== 'granted' && handle.requestPermission) {
      status = await handle.requestPermission({ mode: 'read' });
    }
    if (status !== 'granted') {
      return { hasSavedHandle: false, files: [] };
    }
    const files = await collectAudioFilesFromDirectory(handle);
    return { hasSavedHandle: true, files, folderName: handle.name };
  } catch {
    return { hasSavedHandle: false, files: [] };
  }
}
