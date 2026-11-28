import { EqBands, Track } from '../types';
import { getLocalTrackBlobUrl } from '../utils/localMusicStorage';

export interface PlaybackCallbacks {
  onTimeUpdate: (currentSec: number, durationSec: number) => void;
  onEnded: () => void;
  onRemotePlay: () => void;
  onRemotePause: () => void;
  onRemoteNext: () => void;
  onRemotePrev: () => void;
  onRemoteSeek: (sec: number) => void;
  onError: (message: string) => void;
}

export interface PlayTrackOptions {
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  eqBands: EqBands;
  eqBypassed: boolean;
  crossfadeSec: number;
  backgroundPlayback: boolean;
}

class GlobalPlayerService {
  private deckA: HTMLAudioElement | null = null;
  private deckB: HTMLAudioElement | null = null;
  private activeDeck: 'A' | 'B' = 'A';

  private audioCtx: AudioContext | null = null;
  private lowShelf: BiquadFilterNode | null = null;
  private midPeak: BiquadFilterNode | null = null;
  private highShelf: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private deckAConnected = false;
  private deckBConnected = false;

  private activeBlobUrls = new Map<'A' | 'B', string>();
  private currentTrack: Track | null = null;
  private isPlaying = false;
  private playbackSpeed = 1;
  private targetVolume = 0.8;
  private isMuted = false;
  private backgroundPlayback = true;
  private crossfadeTimer: number | null = null;
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
      const deck = this.getActiveHtmlDeck();
      if (deck && deck.src && deck.paused) {
        deck.play().catch(() => {});
      }
    });
  }

  private createDeck(deckId: 'A' | 'B'): HTMLAudioElement {
    const audio = new Audio();
    audio.preload = 'auto';

    audio.addEventListener('timeupdate', () => {
      if (this.activeDeck !== deckId) return;
      if (audio.duration && Number.isFinite(audio.duration)) {
        this.callbacks?.onTimeUpdate(audio.currentTime, audio.duration);
        this.updateMediaPositionState(audio.currentTime, audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeDeck !== deckId) return;
      this.callbacks?.onEnded();
    });

    audio.addEventListener('error', () => {
      if (this.activeDeck !== deckId || !audio.src) return;
      this.callbacks?.onError('Local audio file could not be played.');
    });

    return audio;
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

      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.78;

      low.connect(mid);
      mid.connect(high);
      high.connect(comp);
      comp.connect(analyser);
      analyser.connect(this.audioCtx.destination);

      this.lowShelf = low;
      this.midPeak = mid;
      this.highShelf = high;
      this.compressor = comp;
      this.analyser = analyser;
      this.analyserData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
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
    return this.getCorsDeck(this.activeDeck);
  }

  private clearCrossfadeTimer() {
    if (this.crossfadeTimer !== null) {
      window.clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
  }

  public async playTrack(track: Track, options: PlayTrackOptions, resumeFromSec = 0) {
    this.currentTrack = track;
    this.isPlaying = true;
    this.playbackSpeed = options.playbackSpeed;
    this.targetVolume = options.volume;
    this.isMuted = options.isMuted;
    this.backgroundPlayback = options.backgroundPlayback;

    this.updateMediaSessionMetadata(track, true);
    this.ensureAudioContext(options.eqBands, options.eqBypassed);

    let resolvedUrl: string | null = null;
    if (track.source === 'local') {
      resolvedUrl = await getLocalTrackBlobUrl(track.id);
    }

    if (!resolvedUrl) {
      this.callbacks?.onError('Local audio file could not be read from device storage.');
      return;
    }

    const outgoingDeckId = this.activeDeck;
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
    this.activeBlobUrls.set(incomingDeckId, resolvedUrl);

    this.activeDeck = incomingDeckId;
    incomingDeck.src = resolvedUrl;
    incomingDeck.playbackRate = options.playbackSpeed;
    incomingDeck.muted = options.isMuted;
    if (resumeFromSec > 0) {
      incomingDeck.currentTime = resumeFromSec;
    }

    this.clearCrossfadeTimer();
    const effectiveVol = options.isMuted ? 0 : options.volume;

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
  }

  private pauseHtmlDecks() {
    this.clearCrossfadeTimer();
    this.deckA?.pause();
    this.deckB?.pause();
  }

  public pause() {
    this.isPlaying = false;
    this.pauseHtmlDecks();
    if (this.currentTrack) {
      this.updateMediaSessionMetadata(this.currentTrack, false);
    }
  }

  public stopAndReset() {
    this.isPlaying = false;
    this.currentTrack = null;
    this.pauseHtmlDecks();
    if (this.deckA) this.deckA.removeAttribute('src');
    if (this.deckB) this.deckB.removeAttribute('src');
    for (const url of this.activeBlobUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.activeBlobUrls.clear();
  }

  public resume(track: Track, options: PlayTrackOptions, currentSec: number) {
    this.isPlaying = true;
    this.backgroundPlayback = options.backgroundPlayback;

    const deck = this.getActiveHtmlDeck();
    if (deck && deck.src && this.currentTrack?.id === track.id) {
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
    backgroundPlayback: boolean;
  }) {
    this.targetVolume = options.volume;
    this.isMuted = options.isMuted;
    this.playbackSpeed = options.playbackSpeed;
    this.backgroundPlayback = options.backgroundPlayback;

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
        const cur = this.getActiveHtmlDeck()?.currentTime || 0;
        this.callbacks?.onRemoteSeek(Math.max(0, cur - (details.seekOffset || 10)));
      });
      ms.setActionHandler('seekforward', (details) => {
        const cur = this.getActiveHtmlDeck()?.currentTime || 0;
        this.callbacks?.onRemoteSeek(cur + (details.seekOffset || 10));
      });
    } catch {
      // some handlers may not be supported on older browsers
    }
  }
  public getVisualizerBars(barCount = 16): number[] {
    if (!this.isPlaying || !this.analyser || !this.analyserData) {
      return Array.from({ length: barCount }, () => 0.14);
    }
    this.analyser.getByteFrequencyData(this.analyserData);
    const len = this.analyserData.length;
    const result: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const idx = Math.min(len - 1, Math.floor((i / barCount) * Math.min(len, 22)));
      const normalized = this.analyserData[idx] / 255;
      result.push(Math.max(0.14, Math.min(1, normalized)));
    }
    return result;
  }

  public getAudioEnergy(): number {
    if (!this.isPlaying || !this.analyser || !this.analyserData) return 0;
    this.analyser.getByteFrequencyData(this.analyserData);
    let sum = 0;
    const count = Math.min(12, this.analyserData.length);
    for (let i = 0; i < count; i++) {
      sum += this.analyserData[i];
    }
    return count > 0 ? sum / (count * 255) : 0;
  }
}

export const globalPlayer = new GlobalPlayerService();
