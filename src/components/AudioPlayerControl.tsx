import { useEffect, useRef, useState } from 'react';
import aiAgentIcon from '../assets/ai-agent-icon.png';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25] as const;

type AudioPlayerControlProps = {
  allowSeek?: boolean;
  className?: string;
  durationSeconds?: number;
  isPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onProgressChange?: (progressPercent: number) => void;
  onRateChange?: (playbackRate: number) => void;
  playbackRate?: number;
  progressPercent?: number;
  showSpeedMenu?: boolean;
  showWaveform?: boolean;
  showVolume?: boolean;
  src?: string | null;
  title?: string;
};

export function AudioPlayerControl({
  allowSeek = true,
  className = '',
  durationSeconds = 127,
  isPlaying,
  onPlayingChange,
  onProgressChange,
  onRateChange,
  playbackRate,
  progressPercent,
  showSpeedMenu = true,
  showWaveform = true,
  showVolume = true,
  src,
  title = 'Audio',
}: AudioPlayerControlProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [internalRate, setInternalRate] = useState(1);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState(0);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(Boolean(src));
  const [hasAudioError, setHasAudioError] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const activePlaying = isPlaying ?? internalPlaying;
  const activeRate = playbackRate ?? internalRate;
  const activeDuration = loadedDuration || durationSeconds;
  const activeProgress = progressPercent ?? (activeDuration ? (currentSeconds / activeDuration) * 100 : 0);
  const displayCurrentSeconds = Math.round((Math.max(0, Math.min(100, activeProgress)) / 100) * activeDuration);
  const controlClassName = [
    'audio-player-control',
    className,
    showVolume ? '' : 'audio-player-control-no-volume',
    showSpeedMenu ? '' : 'audio-player-control-no-speed',
    showWaveform ? '' : 'audio-player-control-no-waveform',
  ].filter(Boolean).join(' ');

  useEffect(() => {
    setCurrentSeconds(0);
    setLoadedDuration(0);
    setIsLoadingMetadata(Boolean(src));
    setHasAudioError(false);
  }, [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = activeRate;
    }
  }, [activeRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) {
      return;
    }

    if (activePlaying) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [activePlaying, src]);

  const setPlaying = (nextPlaying: boolean) => {
    if (nextPlaying && !src) {
      setInternalPlaying(false);
      onPlayingChange?.(false);
      return;
    }

    setInternalPlaying(nextPlaying);
    onPlayingChange?.(nextPlaying);
  };

  const setRate = (nextRate: number) => {
    setInternalRate(nextRate);
    onRateChange?.(nextRate);
    setIsSpeedMenuOpen(false);
  };

  const setProgress = (nextProgress: number) => {
    const safeProgress = Math.max(0, Math.min(100, nextProgress));
    if (audioRef.current && loadedDuration) {
      audioRef.current.currentTime = (safeProgress / 100) * loadedDuration;
    }
    setCurrentSeconds((safeProgress / 100) * activeDuration);
    onProgressChange?.(safeProgress);
  };

  return (
    <div className={controlClassName}>
      {src && (
        <audio
          ref={audioRef}
          preload="metadata"
          src={src}
          onCanPlay={() => {
            setHasAudioError(false);
            setIsLoadingMetadata(false);
          }}
          onDurationChange={(event) => setLoadedDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setHasAudioError(true);
            setIsLoadingMetadata(false);
          }}
          onLoadedMetadata={(event) => {
            setLoadedDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
            setHasAudioError(false);
            setIsLoadingMetadata(false);
          }}
          onTimeUpdate={(event) => {
            const duration = event.currentTarget.duration;
            const currentTime = event.currentTarget.currentTime;
            setCurrentSeconds(currentTime);
            if (Number.isFinite(duration) && duration > 0) {
              onProgressChange?.((currentTime / duration) * 100);
            }
          }}
        />
      )}
      <span className="audio-player-loading-slot" aria-live="polite">
        {src && (isLoadingMetadata || hasAudioError) && (
          <span className={`audio-player-loading-spinner ${hasAudioError ? 'audio-player-loading-error' : ''}`} aria-label={hasAudioError ? `${title} failed to load` : `Loading ${title}`}>
            <img src={aiAgentIcon} alt="" />
          </span>
        )}
      </span>
      <button
        aria-label={activePlaying ? `Pause ${title}` : `Play ${title}`}
        className="audio-player-play"
        disabled={!src}
        type="button"
        onClick={() => setPlaying(!activePlaying)}
      >
        <span aria-hidden="true" className={activePlaying ? 'audio-player-icon-pause' : 'audio-player-icon-play'} />
      </button>
      <span className="audio-player-time">
        {formatAudioTime(displayCurrentSeconds)} / {formatAudioTime(activeDuration)}
      </span>
      {showWaveform && <span className="audio-player-waveform" aria-hidden="true" />}
      <input
        aria-label={`${title} progress`}
        className="audio-player-range"
        disabled={!allowSeek}
        max="100"
        min="0"
        type="range"
        value={Math.max(0, Math.min(100, activeProgress))}
        onChange={(event) => {
          if (allowSeek) {
            setProgress(Number(event.target.value));
          }
        }}
      />
      {showVolume && (
        <button aria-label="Volume" className="audio-player-volume" type="button">
          <span aria-hidden="true" />
        </button>
      )}
      {showSpeedMenu && (
        <div className="audio-player-menu-wrap">
          <button
            aria-expanded={isSpeedMenuOpen}
            aria-label="Playback speed"
            className="audio-player-menu-button"
            type="button"
            onClick={() => setIsSpeedMenuOpen((current) => !current)}
          >
            <span aria-hidden="true">...</span>
          </button>
          {isSpeedMenuOpen && (
            <div className="audio-player-speed-menu">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  className={rate === activeRate ? 'audio-player-speed-active' : ''}
                  type="button"
                  onClick={() => setRate(rate)}
                >
                  {rate}x
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatAudioTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
