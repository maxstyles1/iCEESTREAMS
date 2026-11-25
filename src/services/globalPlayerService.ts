import { EqBands, Track } from '../types';
import { getLocalTrackBlobUrl } from '../utils/localMusicStorage';
import { cacheStreamInBackground, resolveCachedStreamBlobUrl } from '../utils/streamCache';

export interface PlaybackCallbacks {
  onTimeUpdate: (currentSec: number, durationSec: number) => void;
  onEnded: () => void;
  onRemotePlay: () => void;
  onRemotePause: () => void;
  onRemoteNext: () => void;
  onRemotePrev: () => void;
  onRemoteSeek: (sec: number) => void;
  onError: (message: string) => void;
  onStreamCached: (trackId: string) => void;
}

export interface PlayTrackOptions {
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  eqBands: EqBands;
  eqBypassed: boolean;
  crossfadeSec: number;
  lowDataMode: boolean;
  cacheRecentStreams: boolean;
  soundPreview: boolean;
  backgroundPlayback: boolean;
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
}

interface YTGlobal {
  Player: new (
    elementId: string,
    config: {
      height?: string;
      width?: string;
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void;
        onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayerInstance;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
  };
}

let ytApiPromise: Promise<YTGlobal> | null = null;

function loadYouTubeIframeApi(): Promise<YTGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube Player requires browser context.'));
  }
  const win = window as unknown as {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  };

  if (win.YT && typeof win.YT.Player === 'function') {
    return Promise.resolve(win.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<YTGlobal>((resolve, reject) => {
    const prevCallback = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === 'function') prevCallback();
      if (win.YT && typeof win.YT.Player === 'function') {
        resolve(win.YT);
      } else {
        reject(new Error('YouTube IFrame API failed to initialize.'));
      }
    };

    const existing = document.querySelector('script[data-icee-yt-api="1"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.iceeYtApi = '1';
      script.onerror = () => {
        ytApiPromise = null;
        reject(new Error('Failed to load YouTube Player script.'));
      };
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}

function createSilentWavBlobUrl(): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * 2;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function isAudioElementSource(source?: Track['source']): boolean {
  return (
    source === 'local' ||
    source === 'audius' ||
    source === 'jamendo' ||
    source === 'itunes' ||
    source === 'google' ||
    source === 'custom'
  );
}

class GlobalPlayerService {
  private deckA: HTMLAudioElement | null = null;
  private deckB: HTMLAudioElement | null = null;
  private nonCorsDeck: HTMLAudioElement | null = null;
  private keepAliveDeck: HTMLAudioElement | null = null;
  private keepAliveUrl: string | null = null;
  private activeDeck: 'A' | 'B' | 'NONCORS' = 'A';
  private activeMode: 'audio' | 'youtube' | 'synth' = 'synth';
  private preloadEl: HTMLAudioElement | null = null;

  private ytPlayer: YTPlayerInstance | null = null;
  private ytReady = false;
  private ytCurrentVideoId: string | null = null;
  private ytProgressTimer: number | null = null;
  private ytLoadToken = 0;

  private audioCtx: AudioContext | null = null;
  private lowShelf: BiquadFilterNode | null = null;
  private midPeak: BiquadFilterNode | null = null;
  private highShelf: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private deckAConnected = false;
  private deckBConnected = false;

  private synthOscs: OscillatorNode[] = [];
  private synthGain: GainNode | null = null;

  private activeBlobUrls = new Map<'A' | 'B', string>();
  private currentTrack: Track | null = null;
  private isPlaying = false;
  private playbackSpeed = 1;
  private targetVolume = 0.8;
  private isMuted = false;
  private backgroundPlayback = true;
  private crossfadeTimer: number | null = null;
  private preloadedTrackId: string | null = null;
  private visibilityBound = false;

  private callbacks: PlaybackCallbacks | null = null;

  public init(callbacks: PlaybackCallbacks) {
    this.callbacks = callbacks;
    if (typeof window === 'undefined') return;

    if (!this.deckA) {
      this.deckA = this.createDeck('A');
    }
    if (!this.deckB) {
      this.deckB = this.createDeck('B');
    }
    if (!this.nonCorsDeck) {
      this.nonCorsDeck = this.createNonCorsDeck();
    }
    if (!this.keepAliveDeck) {
      this.keepAliveDeck = new Audio();
      this.keepAliveDeck.loop = true;
      this.keepAliveDeck.volume = 0.001;
      this.keepAliveUrl = createSilentWavBlobUrl();
      this.keepAliveDeck.src = this.keepAliveUrl;
    }
    if (!this.preloadEl) {
      this.preloadEl = new Audio();
      this.preloadEl.preload = 'auto';
      this.preloadEl.crossOrigin = 'anonymous';
    }

    this.bindMediaSessionHandlers();
    this.bindVisibilityKeepAlive();
  }

  private bindVisibilityKeepAlive() {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;

    document.addEventListener('visibilitychange', () => {
      if (!this.isPlaying || !this.backgroundPlayback) return;
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.activeMode === 'youtube' && this.ytPlayer && this.ytReady) {
        try {
          if (this.ytPlayer.getPlayerState() !== 1) {
            this.ytPlayer.playVideo();
          }
        } catch {
          // ignore
        }
        return;
      }
      const deck = this.getActiveHtmlDeck();
      if (deck && deck.src && deck.paused && isAudioElementSource(this.currentTrack?.source)) {
        deck.play().catch(() => {});
      } else if (this.activeMode === 'synth' && this.keepAliveDeck?.paused) {
        this.keepAliveDeck.play().catch(() => {});
      }
    });
  }

  private createDeck(deckId: 'A' | 'B'): HTMLAudioElement {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    audio.addEventListener('timeupdate', () => {
      if (this.activeMode !== 'audio' || this.activeDeck !== deckId) return;
      if (audio.duration && Number.isFinite(audio.duration)) {
        this.callbacks?.onTimeUpdate(audio.currentTime, audio.duration);
        this.updateMediaPositionState(audio.currentTime, audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeMode !== 'audio' || this.activeDeck !== deckId) return;
      this.callbacks?.onEnded();
    });

    audio.addEventListener('error', () => {
      if (this.activeMode !== 'audio' || this.activeDeck !== deckId || !audio.src) return;
      if (
        (this.currentTrack?.source === 'custom' || this.currentTrack?.source === 'google') &&
        this.nonCorsDeck
      ) {
        const retryUrl = audio.src;
        const resumeAt = audio.currentTime || 0;
        this.activeDeck = 'NONCORS';
        this.nonCorsDeck.src = retryUrl;
        this.nonCorsDeck.playbackRate = this.playbackSpeed;
        this.nonCorsDeck.volume = this.isMuted ? 0 : this.targetVolume;
        this.nonCorsDeck.muted = this.isMuted;
        if (resumeAt > 0) this.nonCorsDeck.currentTime = resumeAt;
        this.nonCorsDeck.play().catch(() => {
          this.callbacks?.onError('Unable to stream this audio URL directly.');
        });
        return;
      }
      this.callbacks?.onError('Audio stream unavailable or interrupted.');
    });

    return audio;
  }

  private createNonCorsDeck(): HTMLAudioElement {
    const audio = new Audio();
    audio.preload = 'auto';

    audio.addEventListener('timeupdate', () => {
      if (this.activeMode !== 'audio' || this.activeDeck !== 'NONCORS') return;
      if (audio.duration && Number.isFinite(audio.duration)) {
        this.callbacks?.onTimeUpdate(audio.currentTime, audio.duration);
        this.updateMediaPositionState(audio.currentTime, audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeMode !== 'audio' || this.activeDeck !== 'NONCORS') return;
      this.callbacks?.onEnded();
    });

    audio.addEventListener('error', () => {
      if (this.activeMode !== 'audio' || this.activeDeck !== 'NONCORS' || !audio.src) return;
      this.callbacks?.onError('Direct stream URL could not be played. Ensure the link is publicly playable audio.');
    });

    return audio;
  }

  private ensureYouTubeHostElement(): string {
    const hostId = 'icee-yt-player-host';
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      host.setAttribute('aria-hidden', 'true');
      host.style.position = 'fixed';
      host.style.width = '240px';
      host.style.height = '135px';
      host.style.bottom = '-999px';
      host.style.left = '-999px';
      host.style.opacity = '0';
      host.style.pointerEvents = 'none';
      document.body.appendChild(host);
    }
    return hostId;
  }

  private stopYouTubePolling() {
    if (this.ytProgressTimer !== null) {
      window.clearInterval(this.ytProgressTimer);
      this.ytProgressTimer = null;
    }
  }

  private startYouTubePolling() {
    this.stopYouTubePolling();
    this.ytProgressTimer = window.setInterval(() => {
      if (!this.isPlaying || this.activeMode !== 'youtube' || !this.ytPlayer || !this.ytReady) {
        return;
      }
      try {
        const cur = this.ytPlayer.getCurrentTime();
        const dur = this.ytPlayer.getDuration();
        if (Number.isFinite(cur) && Number.isFinite(dur) && dur > 0) {
          this.callbacks?.onTimeUpdate(cur, dur);
          this.updateMediaPositionState(cur, dur);
        }
      } catch {
        // ignore transient player read errors
      }
    }, 300);
  }

  private pauseYouTube() {
    this.stopYouTubePolling();
    if (this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.pauseVideo();
      } catch {
        // ignore
      }
    }
  }

  private applyYouTubeAudioSettings() {
    if (!this.ytPlayer || !this.ytReady) return;
    try {
      if (this.isMuted || this.targetVolume === 0) {
        this.ytPlayer.mute();
      } else {
        this.ytPlayer.unMute();
        this.ytPlayer.setVolume(Math.round(this.targetVolume * 100));
      }
      this.ytPlayer.setPlaybackRate(this.playbackSpeed);
    } catch {
      // ignore if rate/volume unsupported temporarily
    }
  }

  private async playYouTubeTrack(
    videoId: string,
    options: PlayTrackOptions,
    resumeFromSec: number
  ) {
    const token = ++this.ytLoadToken;
    this.activeMode = 'youtube';
    this.pauseHtmlDecks();
    this.keepAliveDeck?.pause();
    this.stopSynth();

    let YT: YTGlobal;
    try {
      YT = await loadYouTubeIframeApi();
    } catch {
      if (token === this.ytLoadToken) {
        this.callbacks?.onError('YouTube player could not load. Check your network connection.');
      }
      return;
    }

    if (token !== this.ytLoadToken || !this.isPlaying || this.activeMode !== 'youtube') return;

    this.ytCurrentVideoId = videoId;

    if (this.ytPlayer && this.ytReady) {
      this.applyYouTubeAudioSettings();
      this.ytPlayer.loadVideoById({ videoId, startSeconds: Math.max(0, resumeFromSec) });
      this.ytPlayer.playVideo();
      this.startYouTubePolling();
      return;
    }

    const hostId = this.ensureYouTubeHostElement();
    this.ytReady = false;
    this.ytPlayer = new YT.Player(hostId, {
      height: '135',
      width: '240',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        start: Math.max(0, Math.floor(resumeFromSec)),
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          this.ytReady = true;
          this.ytPlayer = event.target;
          if (token !== this.ytLoadToken || this.activeMode !== 'youtube') return;
          this.applyYouTubeAudioSettings();
          if (this.isPlaying) {
            event.target.playVideo();
            this.startYouTubePolling();
          } else {
            event.target.pauseVideo();
          }
        },
        onStateChange: (event) => {
          if (this.activeMode !== 'youtube') return;
          if (event.data === YT.PlayerState.ENDED) {
            this.stopYouTubePolling();
            this.callbacks?.onEnded();
          } else if (event.data === YT.PlayerState.PLAYING) {
            this.startYouTubePolling();
          }
        },
        onError: (event) => {
          if (this.activeMode !== 'youtube') return;
          this.stopYouTubePolling();
          if (event.data === 101 || event.data === 150) {
            this.callbacks?.onError(
              'This YouTube upload blocks embedded playback. Try another result or an Audius/iTunes stream.'
            );
          } else {
            this.callbacks?.onError('YouTube stream could not be played.');
          }
        },
      },
    });
  }

  private ensureAudioContext(eqBands: EqBands, eqBypassed: boolean) {
    if (typeof window === 'undefined') return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    if (!this.audioCtx) {
      this.audioCtx = new Ctx();

      const low = this.audioCtx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 140;
      low.gain.value = eqBypassed ? 0 : eqBands.bass;

      const mid = this.audioCtx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 0.9;
      mid.gain.value = eqBypassed ? 0 : eqBands.mids;

      const high = this.audioCtx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 4200;
      high.gain.value = eqBypassed ? 0 : eqBands.treble;

      const comp = this.audioCtx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 18;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;

      low.connect(mid);
      mid.connect(high);
      high.connect(comp);
      comp.connect(this.audioCtx.destination);

      this.lowShelf = low;
      this.midPeak = mid;
      this.highShelf = high;
      this.compressor = comp;
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    this.connectDeckToEq('A');
    this.connectDeckToEq('B');
  }

  private connectDeckToEq(deckId: 'A' | 'B') {
    if (!this.audioCtx || !this.lowShelf) return;
    const el = deckId === 'A' ? this.deckA : this.deckB;
    const alreadyConnected = deckId === 'A' ? this.deckAConnected : this.deckBConnected;
    if (!el || alreadyConnected) return;

    try {
      const node = this.audioCtx.createMediaElementSource(el);
      node.connect(this.lowShelf);
      if (deckId === 'A') this.deckAConnected = true;
      else this.deckBConnected = true;
    } catch {
      // ignore if already attached
    }
  }

  private getCorsDeck(deckId: 'A' | 'B'): HTMLAudioElement | null {
    return deckId === 'A' ? this.deckA : this.deckB;
  }

  private getActiveHtmlDeck(): HTMLAudioElement | null {
    if (this.activeDeck === 'NONCORS') return this.nonCorsDeck;
    return this.getCorsDeck(this.activeDeck);
  }

  private clearCrossfadeTimer() {
    if (this.crossfadeTimer !== null) {
      window.clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
  }

  private stopSynth() {
    this.synthOscs.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    this.synthOscs = [];
    if (this.synthGain) {
      try {
        this.synthGain.disconnect();
      } catch {
        // ignore
      }
      this.synthGain = null;
    }
  }

  private startSynth(track: Track, options: PlayTrackOptions) {
    this.stopSynth();
    if (options.backgroundPlayback && this.keepAliveDeck) {
      this.keepAliveDeck.play().catch(() => {});
    }
    if (!options.soundPreview && !options.backgroundPlayback) return;

    this.ensureAudioContext(options.eqBands, options.eqBypassed);
    if (!this.audioCtx || !this.lowShelf) return;

    const gain = this.audioCtx.createGain();
    const effectiveLevel = options.soundPreview
      ? Math.max(0.0005, (options.isMuted ? 0 : options.volume) * 0.08)
      : 0.0001;
    gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(effectiveLevel, this.audioCtx.currentTime + 0.25);
    gain.connect(this.lowShelf);
    this.synthGain = gain;

    this.synthOscs = track.chordHz.map((hz, idx) => {
      const osc = this.audioCtx!.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.value = hz * (0.98 + (options.playbackSpeed - 1) * 0.15);
      const voiceGain = this.audioCtx!.createGain();
      voiceGain.gain.value = idx === 0 ? 0.55 : 0.25;
      osc.connect(voiceGain);
      voiceGain.connect(gain);
      osc.start();
      return osc;
    });
  }

  public async playTrack(track: Track, options: PlayTrackOptions, resumeFromSec = 0) {
    this.currentTrack = track;
    this.isPlaying = true;
    this.playbackSpeed = options.playbackSpeed;
    this.targetVolume = options.volume;
    this.isMuted = options.isMuted;
    this.backgroundPlayback = options.backgroundPlayback;

    this.updateMediaSessionMetadata(track, true);

    if (track.source === 'youtube' && track.youtubeVideoId) {
      await this.playYouTubeTrack(track.youtubeVideoId, options, resumeFromSec);
      return;
    }

    this.pauseYouTube();

    const effectiveVol = options.isMuted ? 0 : options.volume;
    if (!isAudioElementSource(track.source)) {
      this.activeMode = 'synth';
      this.pauseHtmlDecks();
      this.startSynth(track, options);
      return;
    }

    this.activeMode = 'audio';
    this.stopSynth();
    this.keepAliveDeck?.pause();
    this.ensureAudioContext(options.eqBands, options.eqBypassed);

    let resolvedUrl: string | null = null;
    let isObjectUrl = false;
    const rawStreamUrl =
      options.lowDataMode && track.lowDataStreamUrl
        ? track.lowDataStreamUrl
        : track.streamUrl || '';

    if (track.source === 'local') {
      resolvedUrl = await getLocalTrackBlobUrl(track.id);
      isObjectUrl = true;
      if (!resolvedUrl) {
        this.callbacks?.onError('Local audio file could not be read from device storage.');
        return;
      }
    } else if (rawStreamUrl) {
      if (track.source !== 'google') {
        const cachedBlobUrl = await resolveCachedStreamBlobUrl(rawStreamUrl);
        if (cachedBlobUrl) {
          resolvedUrl = cachedBlobUrl;
          isObjectUrl = true;
        } else {
          resolvedUrl = rawStreamUrl;
        }
      } else {
        resolvedUrl = rawStreamUrl;
      }
    }

    if (!resolvedUrl) {
      this.callbacks?.onError('No playable stream URL available for this track.');
      return;
    }

    // Google Drive links redirect across domains without ACAO headers; use nonCorsDeck directly
    if (track.source === 'google' && this.nonCorsDeck) {
      this.pauseHtmlDecks();
      this.activeDeck = 'NONCORS';
      this.nonCorsDeck.src = resolvedUrl;
      this.nonCorsDeck.playbackRate = options.playbackSpeed;
      this.nonCorsDeck.volume = effectiveVol;
      this.nonCorsDeck.muted = options.isMuted;
      if (resumeFromSec > 0) this.nonCorsDeck.currentTime = resumeFromSec;
      this.nonCorsDeck.play().catch(() => {
        this.callbacks?.onError('Google audio link could not be streamed directly.');
      });
      return;
    }

    const outgoingDeckId = this.activeDeck === 'NONCORS' ? 'A' : this.activeDeck;
    const incomingDeckId: 'A' | 'B' = outgoingDeckId === 'A' ? 'B' : 'A';
    const outgoingDeck = this.getActiveHtmlDeck();
    const incomingDeck = this.getCorsDeck(incomingDeckId);
    if (!incomingDeck) return;

    const shouldCrossfade =
      options.crossfadeSec > 0 &&
      outgoingDeck &&
      !outgoingDeck.paused &&
      Boolean(outgoingDeck.src);

    const oldBlob = this.activeBlobUrls.get(incomingDeckId);
    if (oldBlob) {
      URL.revokeObjectURL(oldBlob);
      this.activeBlobUrls.delete(incomingDeckId);
    }
    if (isObjectUrl) {
      this.activeBlobUrls.set(incomingDeckId, resolvedUrl);
    }

    this.activeDeck = incomingDeckId;
    incomingDeck.crossOrigin = 'anonymous';
    incomingDeck.src = resolvedUrl;
    incomingDeck.playbackRate = options.playbackSpeed;
    incomingDeck.muted = options.isMuted;
    if (resumeFromSec > 0) {
      incomingDeck.currentTime = resumeFromSec;
    }

    this.clearCrossfadeTimer();

    if (shouldCrossfade && outgoingDeck) {
      const fadeMs = Math.min(options.crossfadeSec, 8) * 1000;
      const steps = 20;
      const stepMs = Math.max(40, Math.round(fadeMs / steps));
      let step = 0;

      incomingDeck.volume = 0;
      incomingDeck.play().catch(() => {
        this.callbacks?.onError('Tap play again to start audio playback.');
      });

      const startOutgoingVol = outgoingDeck.volume;
      this.crossfadeTimer = window.setInterval(() => {
        step++;
        const ratio = Math.min(1, step / steps);
        incomingDeck.volume = effectiveVol * ratio;
        outgoingDeck.volume = startOutgoingVol * (1 - ratio);

        if (ratio >= 1) {
          this.clearCrossfadeTimer();
          outgoingDeck.pause();
          outgoingDeck.volume = effectiveVol;
        }
      }, stepMs);
    } else {
      if (outgoingDeck && !outgoingDeck.paused) {
        outgoingDeck.pause();
      }
      incomingDeck.volume = effectiveVol;
      incomingDeck.play().catch(() => {
        this.callbacks?.onError('Tap play again to start audio playback.');
      });
    }

    if (
      track.source !== 'local' &&
      track.source !== 'custom' &&
      !isObjectUrl &&
      rawStreamUrl
    ) {
      cacheStreamInBackground(track, rawStreamUrl, {
        lowDataMode: options.lowDataMode,
        cacheEnabled: options.cacheRecentStreams,
      }).then((cached) => {
        if (cached) {
          this.callbacks?.onStreamCached(track.id);
        }
      });
    }
  }

  private pauseHtmlDecks() {
    this.clearCrossfadeTimer();
    this.deckA?.pause();
    this.deckB?.pause();
    this.nonCorsDeck?.pause();
  }

  public pause() {
    this.isPlaying = false;
    this.pauseHtmlDecks();
    this.pauseYouTube();
    this.keepAliveDeck?.pause();
    this.stopSynth();
    if (this.currentTrack) {
      this.updateMediaSessionMetadata(this.currentTrack, false);
    }
  }

  public resume(track: Track, options: PlayTrackOptions, currentSec: number) {
    this.isPlaying = true;
    this.backgroundPlayback = options.backgroundPlayback;

    if (track.source === 'youtube' && track.youtubeVideoId) {
      if (
        this.activeMode === 'youtube' &&
        this.ytPlayer &&
        this.ytReady &&
        this.ytCurrentVideoId === track.youtubeVideoId
      ) {
        this.applyYouTubeAudioSettings();
        this.ytPlayer.playVideo();
        this.startYouTubePolling();
        this.updateMediaSessionMetadata(track, true);
      } else {
        this.playTrack(track, options, currentSec);
      }
      return;
    }

    if (!isAudioElementSource(track.source)) {
      this.activeMode = 'synth';
      this.startSynth(track, options);
      this.updateMediaSessionMetadata(track, true);
      return;
    }

    const deck = this.getActiveHtmlDeck();
    if (deck && deck.src && this.currentTrack?.id === track.id) {
      this.activeMode = 'audio';
      this.ensureAudioContext(options.eqBands, options.eqBypassed);
      deck.playbackRate = options.playbackSpeed;
      deck.volume = options.isMuted ? 0 : options.volume;
      deck.muted = options.isMuted;
      deck.play().catch(() => {});
      this.updateMediaSessionMetadata(track, true);
    } else {
      this.playTrack(track, options, currentSec);
    }
  }

  public seek(seconds: number) {
    const safeSec = Math.max(0, seconds);
    if (this.activeMode === 'youtube' && this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.seekTo(safeSec, true);
      } catch {
        // ignore
      }
      return;
    }
    const deck = this.getActiveHtmlDeck();
    if (deck && deck.src) {
      deck.currentTime = safeSec;
    }
  }

  public updateAudioSettings(options: {
    volume: number;
    isMuted: boolean;
    playbackSpeed: number;
    eqBands: EqBands;
    eqBypassed: boolean;
    soundPreview: boolean;
    backgroundPlayback: boolean;
  }) {
    this.targetVolume = options.volume;
    this.isMuted = options.isMuted;
    this.playbackSpeed = options.playbackSpeed;
    this.backgroundPlayback = options.backgroundPlayback;

    if (this.activeMode === 'youtube') {
      this.applyYouTubeAudioSettings();
    }

    const effectiveVol = options.isMuted ? 0 : options.volume;
    const deck = this.getActiveHtmlDeck();
    if (deck) {
      deck.volume = effectiveVol;
      deck.muted = options.isMuted;
      deck.playbackRate = options.playbackSpeed;
    }

    if (this.audioCtx && this.lowShelf && this.midPeak && this.highShelf) {
      const now = this.audioCtx.currentTime;
      const targetBass = options.eqBypassed ? 0 : options.eqBands.bass;
      const targetMids = options.eqBypassed ? 0 : options.eqBands.mids;
      const targetTreble = options.eqBypassed ? 0 : options.eqBands.treble;

      this.lowShelf.gain.setTargetAtTime(targetBass, now, 0.08);
      this.midPeak.gain.setTargetAtTime(targetMids, now, 0.08);
      this.highShelf.gain.setTargetAtTime(targetTreble, now, 0.08);

      if (this.synthGain) {
        const level = options.soundPreview ? Math.max(0.0005, effectiveVol * 0.08) : 0.0001;
        this.synthGain.gain.setTargetAtTime(level, now, 0.08);
      }
    }
  }

  public async preloadNextTrack(
    nextTrack: Track | undefined,
    options: { lowDataMode: boolean; preloadNextTrack: boolean; cacheRecentStreams: boolean }
  ) {
    if (!nextTrack || options.lowDataMode || !options.preloadNextTrack) return;
    if (this.preloadedTrackId === nextTrack.id) return;
    if (
      !nextTrack.streamUrl ||
      nextTrack.source === 'local' ||
      nextTrack.source === 'catalog' ||
      nextTrack.source === 'youtube' ||
      nextTrack.source === 'google'
    ) {
      return;
    }

    this.preloadedTrackId = nextTrack.id;
    if (this.preloadEl) {
      this.preloadEl.src = nextTrack.streamUrl;
      this.preloadEl.load();
    }

    if (options.cacheRecentStreams) {
      const cached = await cacheStreamInBackground(nextTrack, nextTrack.streamUrl, {
        lowDataMode: options.lowDataMode,
        cacheEnabled: true,
      });
      if (cached) {
        this.callbacks?.onStreamCached(nextTrack.id);
      }
    }
  }

  private updateMediaSessionMetadata(track: Track, playing: boolean) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const artworkUrl = track.coverUrl
        ? new URL(track.coverUrl, window.location.origin).toString()
        : undefined;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'iCEE Streams',
        artwork: artworkUrl
          ? [
              { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
              { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch {
      // ignore on browsers without MediaMetadata support
    }
  }

  public updateMediaPositionState(positionSec: number, durationSec: number) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== 'function') return;
    if (!durationSec || !Number.isFinite(durationSec) || durationSec <= 0) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: durationSec,
        playbackRate: this.playbackSpeed || 1,
        position: Math.min(durationSec, Math.max(0, positionSec)),
      });
    } catch {
      // ignore invalid position state errors
    }
  }

  private bindMediaSessionHandlers() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler('play', () => this.callbacks?.onRemotePlay());
      ms.setActionHandler('pause', () => this.callbacks?.onRemotePause());
      ms.setActionHandler('previoustrack', () => this.callbacks?.onRemotePrev());
      ms.setActionHandler('nexttrack', () => this.callbacks?.onRemoteNext());
      ms.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          this.callbacks?.onRemoteSeek(details.seekTime);
        }
      });
      ms.setActionHandler('seekbackward', (details) => {
        const cur =
          this.activeMode === 'youtube' && this.ytPlayer && this.ytReady
            ? this.ytPlayer.getCurrentTime()
            : this.getActiveHtmlDeck()?.currentTime || 0;
        this.callbacks?.onRemoteSeek(Math.max(0, cur - (details.seekOffset || 10)));
      });
      ms.setActionHandler('seekforward', (details) => {
        const cur =
          this.activeMode === 'youtube' && this.ytPlayer && this.ytReady
            ? this.ytPlayer.getCurrentTime()
            : this.getActiveHtmlDeck()?.currentTime || 0;
        this.callbacks?.onRemoteSeek(cur + (details.seekOffset || 10));
      });
    } catch {
      // some handlers may not be supported on older browsers
    }
  }
}

export const globalPlayer = new GlobalPlayerService();
