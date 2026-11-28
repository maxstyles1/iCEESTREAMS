import { useState } from 'react';
import {
  Check,
  Download,
  Heart,
  ListEnd,
  ListPlus,
  Play,
  Plus,
  Share2,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import { Playlist, Track } from '../types';
import { formatDuration } from '../data/catalog';
import CoverArt from './CoverArt';

interface TrackActionSheetProps {
  track: Track | null;
  onClose: () => void;
  isLiked: boolean;
  isDownloaded: boolean;
  playlists: Playlist[];
  onPlayNow: (trackId: string) => void;
  onPlayNext: (trackId: string) => void;
  onAddToQueue: (trackId: string) => void;
  onToggleLike: (trackId: string) => void;
  onToggleDownload: (trackId: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onCreatePlaylistWithTrack: (title: string, trackId: string) => void;
  onShareTrack: (track: Track) => void;
}

export default function TrackActionSheet({
  track,
  onClose,
  isLiked,
  isDownloaded,
  playlists,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onToggleLike,
  onToggleDownload,
  onAddToPlaylist,
  onCreatePlaylistWithTrack,
  onShareTrack,
}: TrackActionSheetProps) {
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!track) return null;

  const userPlaylists = playlists.filter((p) => p.isUserCreated || p.category === 'Collaborative');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Options for ${track.title}`}
    >
      <div
        className="w-full md:max-w-md surface-elevated rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 md:hidden" />

        <div className="flex items-center gap-3.5 pb-4 border-b border-white/10">
          <CoverArt
            src={track.coverUrl}
            alt={track.title}
            fallbackGradient={track.fallbackGradient}
            glow={true}
            glowSeed={track.id}
            className="w-16 h-16 rounded-2xl"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base text-[#F5F5FA] truncate">
              {track.title}
            </h3>
            <p className="text-xs font-light text-slate-400 truncate mt-0.5">
              {track.artist} · {track.album}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-1">
              {track.genre} · {track.bpm} BPM · {track.keySignature} · {formatDuration(track.durationSec)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close options"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-slate-400 hover:text-[#F5F5FA] hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!showPlaylistPicker ? (
          <div className="mt-3 space-y-1.5">
            <button
              type="button"
              onClick={() => {
                onPlayNow(track.id);
                onClose();
              }}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-[#F5F5FA] hover:bg-white/5 transition-colors text-left"
            >
              <Play size={18} className="accent-text shrink-0" />
              <span>Play Now</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onPlayNext(track.id);
                onClose();
              }}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-[#F5F5FA] hover:bg-white/5 transition-colors text-left"
            >
              <SkipForward size={18} className="text-slate-300 shrink-0" />
              <span>Play Next</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onAddToQueue(track.id);
                onClose();
              }}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-[#F5F5FA] hover:bg-white/5 transition-colors text-left"
            >
              <ListEnd size={18} className="text-slate-300 shrink-0" />
              <span>Add to Queue</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPlaylistPicker(true)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-[#F5F5FA] hover:bg-white/5 transition-colors text-left"
            >
              <ListPlus size={18} className="text-slate-300 shrink-0" />
              <span>Add to Playlist</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleLike(track.id);
                onClose();
              }}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-[#F5F5FA] hover:bg-white/5 transition-colors text-left"
            >
              <Heart
                size={18}
                fill={isLiked ? 'currentColor' : 'none'}
                className={
                  isLiked ? 'text-[var(--accent2)] icon-glow shrink-0' : 'text-slate-300 shrink-0'
                }
              />
              <span>{isLiked ? 'Remove from Liked' : 'Save to Liked'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleDownload(track.id);
                onClose();
              }}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-[#F5F5FA] hover:bg-white/5 transition-colors text-left"
            >
              {isDownloaded ? (
                <>
                  <Trash2 size={18} className="text-rose-400 shrink-0" />
                  <span>Remove Offline Download ({track.sizeMb.toFixed(1)} MB)</span>
                </>
              ) : (
                <>
                  <Download size={18} className="text-slate-300 shrink-0" />
                  <span>Download for Offline ({track.sizeMb.toFixed(1)} MB)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onShareTrack(track);
                onClose();
              }}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-[#F5F5FA] hover:bg-white/5 transition-colors text-left"
            >
              <Share2 size={18} className="text-slate-300 shrink-0" />
              <span>Share Track</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#F5F5FA]">Choose Playlist</p>
              <button
                type="button"
                onClick={() => setShowPlaylistPicker(false)}
                className="text-xs accent-text hover:underline min-h-[36px] px-2"
              >
                Back
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {userPlaylists.map((pl) => {
                const alreadyIn = pl.trackIds.includes(track.id);
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      onAddToPlaylist(pl.id, track.id);
                      onClose();
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl surface-card flex items-center justify-between text-left hover:border-white/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F5F5FA] truncate">{pl.title}</p>
                      <p className="text-xs text-slate-400 tabular-nums">
                        {pl.trackIds.length} tracks
                      </p>
                    </div>
                    {alreadyIn ? (
                      <span className="text-xs accent-text flex items-center gap-1 shrink-0">
                        <Check size={14} /> Added
                      </span>
                    ) : (
                      <Plus size={16} className="text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPlaylistName.trim()) return;
                onCreatePlaylistWithTrack(newPlaylistName.trim(), track.id);
                setNewPlaylistName('');
                onClose();
              }}
              className="pt-2 border-t border-white/10 flex gap-2"
            >
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="flex-1 min-h-[44px] bg-black/40 border border-white/15 rounded-2xl px-3.5 text-sm text-[#F5F5FA] placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-2xl accent-bg text-sm font-semibold whitespace-nowrap shrink-0"
              >
                Create
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
