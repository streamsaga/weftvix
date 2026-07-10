import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, Settings, Loader2,
  SkipBack, SkipForward, ChevronRight, Gauge,
} from 'lucide-react';

interface Quality {
  label: string;
  url: string;
  bitrate?: number;
  index?: number;
}

interface StreamPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  qualities?: Quality[];
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function StreamPlayer({ src, poster, title, qualities = [] }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideCtrlTimerRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hlsQualities, setHlsQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState<number>(0);

  // Build quality list: custom qualities override HLS levels
  const allQualities = qualities.length > 0 ? qualities : hlsQualities;

  // ─── Initialize HLS.js ─────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError('');
    setIsLoading(true);

    let hls: Hls | null = null;

    if (src.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        // Build quality list from HLS levels
        const levels: Quality[] = [{ label: 'Auto', url: src, index: -1 }];
        data.levels.forEach((lvl, i) => {
          const height = lvl.height || 0;
          if (height) levels.push({ label: `${height}p`, url: src, bitrate: lvl.bitrate, index: i });
        });
        setHlsQualities(levels);
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setError('Playback error. The video may not be available yet.');
          setIsLoading(false);
        }
      });

      hls.on(Hls.Events.BUFFER_APPENDING, () => setIsLoading(false));
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
      setIsLoading(false);
    } else {
      // Direct MP4 or other format
      video.src = src;
      setIsLoading(false);
    }

    return () => {
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  // ─── Video Event Listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Update buffered progress
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => setPlaying(false);
    const onVolumeChange = () => { setVolume(video.volume); setMuted(video.muted); };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, []);

  // ─── Fullscreen change handler ─────────────────────────────────────────────
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  // ─── Controls auto-hide ────────────────────────────────────────────────────
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideCtrlTimerRef.current) clearTimeout(hideCtrlTimerRef.current);
    hideCtrlTimerRef.current = window.setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const video = videoRef.current;
      if (!video) return;

      showControlsTemporarily();

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          playing ? video.pause() : video.play();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(duration, video.currentTime + 10);
          break;
        case 'arrowup':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        case 'm':
          video.muted = !video.muted;
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'j':
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'l':
          video.currentTime = Math.min(duration, video.currentTime + 10);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, duration, showControlsTemporarily]);

  // ─── Control Handlers ──────────────────────────────────────────────────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    playing ? video.pause() : video.play();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const setVolumeLevel = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    video.muted = v === 0;
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const setSpeed = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const setQuality = (q: Quality) => {
    const hls = hlsRef.current;
    if (hls && q.index !== undefined) {
      hls.currentLevel = q.index; // -1 = auto
      setCurrentQuality(q.label);
    } else if (q.url && q.url !== src) {
      // External quality URL
      const video = videoRef.current;
      if (!video) return;
      const time = video.currentTime;
      const wasPlaying = !video.paused;
      if (hls) { hls.destroy(); hlsRef.current = null; }
      // Load new URL
      const newHls = new Hls({ enableWorker: true });
      hlsRef.current = newHls;
      newHls.loadSource(q.url);
      newHls.attachMedia(video);
      newHls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.currentTime = time;
        if (wasPlaying) video.play();
      });
      setCurrentQuality(q.label);
    }
    setShowQualityMenu(false);
  };

  // ─── Progress Bar Interaction ──────────────────────────────────────────────
  const getProgressFromEvent = (e: MouseEvent | React.MouseEvent<HTMLDivElement>): number => {
    const bar = progressRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return ratio * 100;
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const startProgress = getProgressFromEvent(e);
    setDragProgress(startProgress);

    const onMove = (ev: MouseEvent) => {
      const currentPct = getProgressFromEvent(ev);
      setDragProgress(currentPct);
    };

    const onUp = (ev: MouseEvent) => {
      setIsDragging(false);
      const finalPct = getProgressFromEvent(ev);
      const video = videoRef.current;
      if (video && duration) {
        video.currentTime = (finalPct / 100) * duration;
      }
      setDragProgress(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * duration);
    setHoverPct(ratio * 100);
  };

  // ─── Derived state ─────────────────────────────────────────────────────────
  const progress = dragProgress !== null ? dragProgress : (duration ? (currentTime / duration) * 100 : 0);
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div
      ref={containerRef}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={() => showControlsTemporarily()}
      style={{
        position: 'relative',
        width: '100%',
        background: '#000',
        borderRadius: isFullscreen ? 0 : 'var(--radius)',
        overflow: 'hidden',
        userSelect: 'none',
        cursor: showControls ? 'default' : 'none',
        boxShadow: isFullscreen ? 'none' : '0 24px 80px rgba(0,0,0,0.8)',
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        style={{ width: '100%', display: 'block', maxHeight: isFullscreen ? '100vh' : '75vh', objectFit: 'contain', background: '#000' }}
        playsInline
        onClick={togglePlay}
      />

      {/* Loading Spinner */}
      {isLoading && !error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, maxWidth: 360 }}>{error}</p>
        </div>
      )}

      {/* Big Play button center */}
      {!playing && !isLoading && !error && (
        <div
          onClick={togglePlay}
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(229,9,20,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(229,9,20,0.5)', transition: 'transform 0.15s', animation: 'scaleIn 0.2s ease' }}>
            <Play size={30} fill="white" color="white" style={{ marginLeft: 4 }} />
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
        padding: '48px 20px 16px',
        transition: 'opacity 0.3s ease',
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'auto' : 'none',
      }}>
        {/* Title */}
        {title && (
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        )}

        {/* Progress Bar */}
        <div
          ref={progressRef}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={handleProgressMouseMove}
          style={{ height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 999, cursor: 'pointer', marginBottom: 14, position: 'relative', transition: 'height 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.height = '6px')}
          onMouseLeave={(e) => {
            if (!isDragging) e.currentTarget.style.height = '4px';
            setHoverTime(null);
          }}
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: `${hoverPct}%`,
              transform: 'translateX(-50%)',
              background: 'rgba(10,10,16,0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              padding: '4px 8px',
              color: '#fff',
              fontSize: 11,
              fontFamily: 'monospace',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}>
              {formatTime(hoverTime)}
            </div>
          )}
          {/* Buffered */}
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bufferedPct}%`, background: 'rgba(255,255,255,0.25)', borderRadius: 999, transition: 'width 0.3s' }} />
          {/* Progress */}
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 999, transition: isDragging ? 'none' : 'width 0.1s' }} />
          {/* Thumb */}
          <div style={{ position: 'absolute', top: '50%', left: `${progress}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(229,9,20,0.6)', opacity: isDragging ? 1 : 0, transition: 'opacity 0.15s' }} />
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Skip back 10s */}
          <PlayerBtn title="Back 10s" onClick={() => { const v = videoRef.current; if (v) v.currentTime -= 10; }}>
            <SkipBack size={17} />
          </PlayerBtn>

          {/* Play/Pause */}
          <PlayerBtn title={playing ? 'Pause (K)' : 'Play (K)'} onClick={togglePlay} large>
            {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginLeft: 2 }} />}
          </PlayerBtn>

          {/* Skip forward 10s */}
          <PlayerBtn title="Forward 10s" onClick={() => { const v = videoRef.current; if (v) v.currentTime += 10; }}>
            <SkipForward size={17} />
          </PlayerBtn>

          {/* Volume */}
          <PlayerBtn title="Toggle Mute (M)" onClick={toggleMute}>
            <VolumeIcon size={17} />
          </PlayerBtn>

          {/* Volume Slider */}
          <div style={{ width: 80 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVolumeLevel(Number(e.target.value))}
              style={sliderStyle('var(--accent)', `${(muted ? 0 : volume) * 100}%`)}
            />
          </div>

          {/* Time */}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', flexShrink: 0 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Quality Settings */}
          <div style={{ position: 'relative' }}>
            <PlayerBtn title="Quality" onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }}>
              <Settings size={17} style={{ transition: 'transform 0.3s', transform: showQualityMenu ? 'rotate(30deg)' : 'none' }} />
            </PlayerBtn>

            {showQualityMenu && (
              <div style={{
                position: 'absolute',
                bottom: 44,
                right: 0,
                background: 'rgba(10,10,16,0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '12px 0',
                minWidth: 160,
                boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
                animation: 'fadeUp 0.15s ease',
                zIndex: 100,
              }}>
                <div style={{ padding: '4px 16px 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quality</div>
                {(allQualities.length > 0 ? allQualities : [{ label: 'Auto', url: src, index: -1 }]).map((q) => (
                  <SettingsItem key={q.label} active={currentQuality === q.label} onClick={() => { setQuality(q); setShowQualityMenu(false); }}>
                    {q.label}
                    {q.bitrate && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>{Math.round(q.bitrate / 1000)}kbps</span>}
                  </SettingsItem>
                ))}
              </div>
            )}
          </div>

          {/* Speed Settings */}
          <div style={{ position: 'relative' }}>
            <PlayerBtn title="Playback Speed" onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }}>
              <Gauge size={17} />
            </PlayerBtn>

            {showSpeedMenu && (
              <div style={{
                position: 'absolute',
                bottom: 44,
                right: 0,
                background: 'rgba(10,10,16,0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '12px 0',
                minWidth: 140,
                boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
                animation: 'fadeUp 0.15s ease',
                zIndex: 100,
              }}>
                <div style={{ padding: '4px 16px 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Speed</div>
                {SPEEDS.map((s) => (
                  <SettingsItem key={s} active={playbackRate === s} onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}>
                    {s === 1 ? 'Normal' : `${s}×`}
                  </SettingsItem>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <PlayerBtn title="Fullscreen (F)" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </PlayerBtn>
        </div>
      </div>
    </div>
  );
}

// ─── Small Components ──────────────────────────────────────────────────────────
function PlayerBtn({
  children, onClick, title, large,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.85)',
        padding: large ? 8 : 6,
        borderRadius: 8,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.15s, background 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'none'; }}
    >
      {children}
    </button>
  );
}

function SettingsItem({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '8px 16px',
        background: active ? 'rgba(229,9,20,0.18)' : 'none',
        border: 'none',
        color: active ? 'var(--accent)' : 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'none'; }}
    >
      {children}
      {active && <ChevronRight size={13} />}
    </button>
  );
}

function sliderStyle(color: string, progress: string): React.CSSProperties {
  return {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: 4,
    borderRadius: 999,
    background: `linear-gradient(to right, ${color} 0%, ${color} ${progress}, rgba(255,255,255,0.2) ${progress}, rgba(255,255,255,0.2) 100%)`,
    outline: 'none',
    cursor: 'pointer',
  };
}
