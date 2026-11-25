import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Headphones,
  Play,
  Plus,
  Send,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { FriendActivity, Playlist, ThemeId, Track } from '../types';
import { formatDuration } from '../data/catalog';
import CoverArt from './CoverArt';

interface SocialProps {
  friends: FriendActivity[];
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track;
  queueTracks: Track[];
  theme: ThemeId;
  onPlayTrack: (trackId: string) => void;
  onToggleFollow: (friendId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onInspectPlaylist: (playlist: Playlist) => void;
  onShowFeedback: (message: string) => void;
}

type SocialTab = 'friends' | 'vibecard' | 'foryou' | 'activity';

interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  trackId: string;
  note?: string;
  vibeLabel?: string;
  timeAgo: string;
}

const VIBE_OPTIONS = [
  { id: 'late-night', label: 'Late Night Drive', colors: ['#7C3AED', '#06B6D4'] },
  { id: 'deep-focus', label: 'Deep Focus', colors: ['#2563EB', '#0F172A'] },
  { id: 'midnight-bass', label: 'Midnight Bass', colors: ['#DB2777', '#6D28D9'] },
  { id: 'morning-reset', label: 'Morning Reset', colors: ['#EA580C', '#F59E0B'] },
  { id: 'afterhours', label: 'Afterhours', colors: ['#4F46E5', '#1E1B4B'] },
] as const;

function sourceShort(source?: Track['source']): string {
  if (source === 'local') return 'Local';
  if (source === 'youtube') return 'YouTube';
  if (source === 'google') return 'Google';
  if (source === 'audius') return 'Audius';
  if (source === 'itunes') return 'iTunes';
  if (source === 'jamendo') return 'Jamendo';
  if (source === 'custom') return 'Custom';
  return 'Catalog';
}

export default function Social({
  friends,
  tracks,
  playlists,
  currentTrack,
  queueTracks,
  theme,
  onPlayTrack,
  onToggleFollow,
  onAddTrackToPlaylist,
  onInspectPlaylist,
  onShowFeedback,
}: SocialProps) {
  const [activeTab, setActiveTab] = useState<SocialTab>('friends');
  const [shareNote, setShareNote] = useState('');
  const [shareTarget, setShareTarget] = useState<'feed' | 'dm' | 'collab'>('feed');
  const [selectedFriendId, setSelectedFriendId] = useState(friends[0]?.id || '');
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [selectedVibeId, setSelectedVibeId] = useState<string>(VIBE_OPTIONS[0].id);
  const [includeQueueInCard, setIncludeQueueInCard] = useState(true);
  const [vibeCaption, setVibeCaption] = useState('Late-night rotation on iCEE Streams');
  const [copiedVibeLink, setCopiedVibeLink] = useState(false);

  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([
    {
      id: 'act-1',
      actor: 'Ava_Music',
      action: 'added to rotation',
      trackId: 't-glass-horizon',
      note: 'Best late-night R&B mix this month.',
      timeAgo: '8m ago',
    },
    {
      id: 'act-2',
      actor: 'JAYSON',
      action: 'shared a vibe card',
      trackId: 't-midnight-drive',
      vibeLabel: 'Late Night Drive',
      timeAgo: '24m ago',
    },
    {
      id: 'act-3',
      actor: 'Luna.exe',
      action: 'updated Late Night Collab',
      trackId: 't-sable-clair',
      timeAgo: '1h ago',
    },
  ]);

  const followedFriends = friends.filter((f) => f.isFollowing);
  const collabPlaylists = playlists.filter((p) => p.category === 'Collaborative');
  const activeVibe = VIBE_OPTIONS.find((v) => v.id === selectedVibeId) || VIBE_OPTIONS[0];
  const cardQueuePreview = includeQueueInCard ? queueTracks.slice(0, 3) : [];

  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shareTarget === 'collab' && collabPlaylists[0]) {
      onAddTrackToPlaylist(collabPlaylists[0].id, currentTrack.id);
    }
    const targetLabel =
      shareTarget === 'dm'
        ? `Sent "${currentTrack.title}" to ${
            friends.find((f) => f.id === selectedFriendId)?.handle || 'friend'
          }`
        : shareTarget === 'collab'
        ? `Added "${currentTrack.title}" to ${collabPlaylists[0]?.title || 'Collaborative Playlist'}`
        : `Shared "${currentTrack.title}" to your activity feed`;

    setActivityFeed((prev) => [
      {
        id: `act-${Date.now()}`,
        actor: 'You',
        action: shareTarget === 'dm' ? 'sent a track' : 'shared now playing',
        trackId: currentTrack.id,
        note: shareNote.trim() || undefined,
        timeAgo: 'Just now',
      },
      ...prev,
    ]);
    setShareNote('');
    onShowFeedback(targetLabel);
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/?track=${encodeURIComponent(currentTrack.id)}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    onShowFeedback(`Copied link for "${currentTrack.title}"`);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyVibeLink = () => {
    const params = new URLSearchParams({
      track: currentTrack.id,
      vibe: activeVibe.id,
    });
    if (cardQueuePreview.length > 0) {
      params.set('queue', cardQueuePreview.map((t) => t.id).join(','));
    }
    const shareUrl = `${window.location.origin}/?${params.toString()}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedVibeLink(true);
    onShowFeedback(`Copied ${activeVibe.label} queue card link`);
    setTimeout(() => setCopiedVibeLink(false), 2200);
  };

  const handlePostVibeCardToFeed = () => {
    setActivityFeed((prev) => [
      {
        id: `act-${Date.now()}`,
        actor: 'You',
        action: 'shared a queue vibe card',
        trackId: currentTrack.id,
        vibeLabel: activeVibe.label,
        note: vibeCaption.trim() || undefined,
        timeAgo: 'Just now',
      },
      ...prev,
    ]);
    setActiveTab('activity');
    onShowFeedback(`Posted ${activeVibe.label} card to Activity Feed`);
  };

  const handleDownloadVibePng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, activeVibe.colors[0]);
    grad.addColorStop(0.55, '#11111B');
    grad.addColorStop(1, activeVibe.colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.fillStyle = 'rgba(10, 10, 16, 0.72)';
    ctx.beginPath();
    ctx.roundRect(64, 64, 952, 952, 42);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 24px sans-serif';
    ctx.fillText(`iCEE STREAMS · ${activeVibe.label.toUpperCase()}`, 112, 136);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 52px sans-serif';
    ctx.fillText(currentTrack.title.slice(0, 28), 112, 232);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 30px sans-serif';
    ctx.fillText(
      `${currentTrack.artist} · ${sourceShort(currentTrack.source)} · ${formatDuration(
        currentTrack.durationSec
      )}`,
      112,
      284
    );

    if (vibeCaption.trim()) {
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'italic 26px sans-serif';
      ctx.fillText(`“${vibeCaption.trim().slice(0, 56)}”`, 112, 356);
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 22px sans-serif';
    ctx.fillText(
      cardQueuePreview.length > 0 ? 'UP NEXT MIXED QUEUE' : 'CURRENT VIBE SNAPSHOT',
      112,
      446
    );

    if (cardQueuePreview.length > 0) {
      cardQueuePreview.forEach((qt, idx) => {
        const y = 500 + idx * 124;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        ctx.roundRect(112, y, 856, 100, 20);
        ctx.fill();

        ctx.fillStyle = '#A855F7';
        ctx.font = '700 26px monospace';
        ctx.fillText(`0${idx + 1}`, 142, y + 60);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '600 28px sans-serif';
        ctx.fillText(qt.title.slice(0, 32), 204, y + 46);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '400 22px sans-serif';
        ctx.fillText(`${qt.artist} · ${sourceShort(qt.source)}`, 204, y + 78);
      });
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.roundRect(112, 492, 856, 140, 22);
      ctx.fill();
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '500 26px sans-serif';
      ctx.fillText(
        `${currentTrack.genre} · ${currentTrack.bpm} BPM · Theme: ${theme}`,
        148,
        572
      );
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 22px monospace';
    ctx.fillText('iceestreams.app · Shared Queue & Vibe Card', 112, 956);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `icee-vibe-${activeVibe.id}.png`;
    link.click();
    onShowFeedback('Downloaded shareable Vibe Card PNG');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Social</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Listen along, share queue vibe cards, and build collaborative playlists
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddFriends(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl accent-bg text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <UserPlus size={15} />
          <span>Find Friends</span>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Social view"
        className="flex flex-wrap items-center gap-1.5 p-1 surface-card rounded-xl w-fit"
      >
        {(
          [
            { id: 'friends', label: 'Friends' },
            { id: 'vibecard', label: 'Queue & Vibe Cards' },
            { id: 'foryou', label: 'For You' },
            { id: 'activity', label: 'Activity Feed' },
          ] as { id: SocialTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'accent-bg text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'friends' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Headphones size={15} className="accent-text" />
              <span>Friends Listening Now</span>
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {followedFriends.length} connected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {followedFriends.map((friend) => {
              const friendTrack = tracks.find((t) => t.id === friend.trackId);
              return (
                <div
                  key={friend.id}
                  className="surface-card rounded-2xl p-3.5 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full accent-gradient p-0.5 shrink-0">
                      <div className="w-full h-full rounded-full bg-[var(--surface-bg)] flex items-center justify-center text-xs font-bold text-white">
                        {friend.initials}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{friend.handle}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {friend.status} · {friend.updatedAt}
                      </p>
                    </div>
                  </div>

                  {friendTrack && (
                    <div className="surface-elevated rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{friendTrack.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{friendTrack.artist}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onPlayTrack(friendTrack.id);
                          onShowFeedback(`Listening along with ${friend.handle}`);
                        }}
                        aria-label={`Listen along to ${friendTrack.title} with ${friend.handle}`}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg accent-soft-bg accent-text text-xs font-medium flex items-center gap-1 shrink-0"
                      >
                        <Play size={12} className="fill-current" />
                        <span>Join</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'vibecard' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="surface-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="accent-text" />
              <h2 className="font-display text-base font-semibold text-white">
                Shareable Queue & Vibe Card
              </h2>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2">Choose Vibe Aesthetic</p>
              <div className="flex flex-wrap gap-1.5">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVibeId(v.id)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      selectedVibeId === v.id
                        ? 'accent-bg text-white'
                        : 'surface-elevated text-slate-300 hover:text-white'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="vibe-caption-input" className="text-xs text-slate-400 block mb-1.5">
                Card Caption
              </label>
              <input
                id="vibe-caption-input"
                type="text"
                value={vibeCaption}
                onChange={(e) => setVibeCaption(e.target.value)}
                placeholder="Describe this listening session..."
                className="w-full min-h-[42px] bg-black/45 border border-white/15 rounded-xl px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <label className="flex items-center justify-between min-h-[40px] cursor-pointer">
              <div>
                <p className="text-xs font-medium text-white">Include Mixed Up Next Queue</p>
                <p className="text-[11px] text-slate-400">
                  Shows {Math.min(3, queueTracks.length)} queued local & online tracks
                </p>
              </div>
              <input
                type="checkbox"
                checked={includeQueueInCard}
                onChange={(e) => setIncludeQueueInCard(e.target.checked)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                  includeQueueInCard ? 'accent-bg justify-end' : 'bg-white/15 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white" />
              </span>
            </label>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleDownloadVibePng}
                className="min-h-[42px] px-4 py-2 rounded-xl accent-bg text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Download Card PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyVibeLink}
                className="min-h-[42px] px-3.5 py-2 rounded-xl surface-elevated text-white text-xs font-medium flex items-center gap-1.5"
              >
                {copiedVibeLink ? <Check size={14} className="accent-text" /> : <Copy size={14} />}
                <span>{copiedVibeLink ? 'Link Copied' : 'Copy Queue Link'}</span>
              </button>

              <button
                type="button"
                onClick={handlePostVibeCardToFeed}
                className="min-h-[42px] px-3.5 py-2 rounded-xl surface-elevated text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Send size={14} className="accent-text" />
                <span>Post to Feed</span>
              </button>
            </div>
          </div>

          <div
            className="rounded-2xl p-5 border border-white/15 flex flex-col justify-between gap-4"
            style={{
              background: `linear-gradient(135deg, ${activeVibe.colors[0]}33 0%, rgba(15,15,24,0.96) 55%, ${activeVibe.colors[1]}33 100%)`,
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span>iCEE STREAMS · {activeVibe.label.toUpperCase()}</span>
                <span>{sourceShort(currentTrack.source)}</span>
              </div>

              <div className="flex items-center gap-3.5">
                <CoverArt
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  fallbackGradient={currentTrack.fallbackGradient}
                  className="w-16 h-16 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold text-white truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-slate-300 truncate mt-0.5">
                    {currentTrack.artist} · {currentTrack.genre} · {formatDuration(currentTrack.durationSec)}
                  </p>
                </div>
              </div>

              {vibeCaption.trim() && (
                <p className="text-xs text-slate-200 italic">“{vibeCaption.trim()}”</p>
              )}

              {cardQueuePreview.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <p className="text-[11px] font-mono text-slate-400">UP NEXT IN QUEUE</p>
                  {cardQueuePreview.map((qt, idx) => (
                    <div
                      key={`${qt.id}-${idx}`}
                      className="bg-black/35 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          0{idx + 1} · {qt.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {qt.artist} · {sourceShort(qt.source)}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                        {formatDuration(qt.durationSec)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/10">
              <span>Live Queue Snapshot</span>
              <span>{currentTrack.bpm} BPM</span>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'foryou' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Recommended From Your Circle</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tracks.slice(3, 7).map((track) => (
              <div
                key={track.id}
                className="surface-card rounded-2xl p-3 flex items-center gap-3"
              >
                <CoverArt
                  src={track.coverUrl}
                  alt={track.title}
                  fallbackGradient={track.fallbackGradient}
                  className="w-12 h-12 rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{track.title}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {track.artist} · Popular with friends
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPlayTrack(track.id)}
                  aria-label={`Play ${track.title}`}
                  className="min-h-[40px] min-w-[40px] rounded-xl accent-bg text-white flex items-center justify-center shrink-0"
                >
                  <Play size={15} className="fill-white ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'activity' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          <div className="surface-card rounded-2xl divide-y divide-white/[0.06]">
            {activityFeed.map((entry) => {
              const t = tracks.find((item) => item.id === entry.trackId) || currentTrack;
              return (
                <div key={entry.id} className="p-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <CoverArt
                      src={t.coverUrl}
                      alt={t.title}
                      fallbackGradient={t.fallbackGradient}
                      className="w-11 h-11 rounded-xl mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-semibold">{entry.actor}</span>{' '}
                        <span className="text-slate-400">{entry.action}</span>{' '}
                        <span className="font-medium accent-text">{t.title}</span>
                        {entry.vibeLabel && (
                          <span className="text-slate-300"> · {entry.vibeLabel}</span>
                        )}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-slate-300 mt-1">“{entry.note}”</p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">{entry.timeAgo}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlayTrack(t.id)}
                    aria-label={`Play ${t.title}`}
                    className="min-h-[38px] min-w-[38px] rounded-xl surface-elevated text-white flex items-center justify-center shrink-0"
                  >
                    <Play size={14} className="fill-white ml-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="surface-card rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Share What You’re Listening To</h2>
          <button
            type="button"
            onClick={handleCopyLink}
            className="min-h-[36px] px-3 py-1 rounded-lg surface-elevated text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            {copiedLink ? <Check size={13} className="accent-text" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 surface-elevated rounded-xl">
          <CoverArt
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            fallbackGradient={currentTrack.fallbackGradient}
            className="w-12 h-12 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-slate-400 truncate">
              {currentTrack.artist} · {currentTrack.genre} · {sourceShort(currentTrack.source)}
            </p>
          </div>
        </div>

        <form onSubmit={handleShareSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'feed', label: 'Post to Feed' },
                { id: 'dm', label: 'Send to Friend' },
                { id: 'collab', label: 'Add to Collab Playlist' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setShareTarget(opt.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  shareTarget === opt.id
                    ? 'accent-soft-bg accent-text border accent-ring'
                    : 'surface-elevated text-slate-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {shareTarget === 'dm' && (
            <div>
              <label htmlFor="share-friend-select" className="text-xs text-slate-400 block mb-1">
                Recipient
              </label>
              <select
                id="share-friend-select"
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                className="w-full min-h-[42px] bg-black/40 border border-white/15 rounded-xl px-3 text-xs text-white focus:outline-none"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.handle} ({f.displayName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={shareNote}
              onChange={(e) => setShareNote(e.target.value)}
              placeholder="Add an optional note..."
              aria-label="Optional note"
              className="flex-1 min-h-[44px] bg-black/40 border border-white/15 rounded-xl px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl accent-bg text-white text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Send size={15} />
              <span>Share</span>
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-white">Collaborative Playlists</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collabPlaylists.map((pl) => (
            <div
              key={pl.id}
              className="surface-card rounded-2xl p-3.5 flex items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => onInspectPlaylist(pl)}
                className="flex items-center gap-3 min-w-0 text-left flex-1"
              >
                <CoverArt
                  src={pl.coverUrl}
                  alt={pl.title}
                  fallbackGradient={pl.fallbackGradient}
                  className="w-12 h-12 rounded-xl"
                />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-white truncate">{pl.title}</p>
                  <p className="text-xs font-mono tabular-nums text-slate-400 mt-0.5">
                    {pl.trackIds.length} tracks · {pl.collaborators || 2} collaborators
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddTrackToPlaylist(pl.id, currentTrack.id);
                  onShowFeedback(`Added "${currentTrack.title}" to ${pl.title}`);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl surface-elevated text-xs font-medium text-white hover:bg-white/10 flex items-center gap-1 shrink-0"
              >
                <Plus size={14} className="accent-text" />
                <span>Add Track</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {showAddFriends && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddFriends(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Find Friends"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md surface-elevated rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="accent-text" />
                <h2 className="font-display text-lg font-bold text-white">Find Friends</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFriends(false)}
                aria-label="Close find friends"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Search by handle or name..."
              className="w-full min-h-[44px] bg-black/45 border border-white/15 rounded-xl px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent)]"
            />

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {friends
                .filter(
                  (f) =>
                    f.handle.toLowerCase().includes(friendSearch.toLowerCase()) ||
                    f.displayName.toLowerCase().includes(friendSearch.toLowerCase())
                )
                .map((friend) => (
                  <div
                    key={friend.id}
                    className="surface-card rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full accent-gradient p-0.5 shrink-0">
                        <div className="w-full h-full rounded-full bg-[var(--surface-bg)] flex items-center justify-center text-xs font-bold">
                          {friend.initials}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{friend.handle}</p>
                        <p className="text-xs text-slate-400 truncate">{friend.displayName}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleFollow(friend.id)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 ${
                        friend.isFollowing
                          ? 'surface-elevated text-slate-200'
                          : 'accent-bg text-white'
                      }`}
                    >
                      {friend.isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                      <span>{friend.isFollowing ? 'Following' : 'Follow'}</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
