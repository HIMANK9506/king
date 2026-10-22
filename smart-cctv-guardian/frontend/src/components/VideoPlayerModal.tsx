import React, { useRef, useState, useEffect } from 'react';
import { X, Play, Pause, Download, Trash2, Volume2, VolumeX, Maximize2, Clock, Film } from 'lucide-react';
import { VideoRecordingItem } from '../types';

interface VideoPlayerModalProps {
  recording: VideoRecordingItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  recording,
  onClose,
  onDelete
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (recording && videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [recording]);

  if (!recording) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (!duration && videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = recording.blobUrl;
    const dateStr = new Date(recording.createdAt).toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `CCTV_Clip_${recording.cameraName.replace(/\s+/g, '_')}_${dateStr}.webm`;
    a.click();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
              <Film size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                {recording.triggerEvent || 'CCTV Security Clip'}
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                  {formatFileSize(recording.sizeBytes)}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                {recording.cameraName} • {new Date(recording.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Canvas */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            src={recording.blobUrl}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) setDuration(videoRef.current.duration || recording.durationSec);
            }}
            onEnded={() => setIsPlaying(false)}
          />

          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute p-4 rounded-full bg-red-600/90 text-white hover:bg-red-500 hover:scale-105 transition shadow-xl"
            >
              <Play size={28} className="translate-x-0.5" />
            </button>
          )}
        </div>

        {/* Player Controls Bar */}
        <div className="p-4 bg-neutral-950/80 flex flex-col gap-2.5 border-t border-neutral-800">
          {/* Timeline Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-neutral-400 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || recording.durationSec}
              step={0.1}
              value={currentTime}
              onChange={handleScrub}
              className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <span className="text-xs font-mono text-neutral-400 w-10">
              {formatTime(duration || recording.durationSec)}
            </span>
          </div>

          {/* Buttons & Tools */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              {/* Speed selector */}
              <div className="flex items-center gap-1 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded-lg">
                <span>Speed:</span>
                <select
                  value={playbackRate}
                  onChange={handleSpeedChange}
                  className="bg-transparent text-white font-medium outline-none cursor-pointer"
                >
                  <option value={0.5} className="bg-neutral-900">0.5x</option>
                  <option value={1} className="bg-neutral-900">1.0x</option>
                  <option value={1.5} className="bg-neutral-900">1.5x</option>
                  <option value={2} className="bg-neutral-900">2.0x</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                title="Download video file"
              >
                <Download size={14} /> Download
              </button>

              <button
                onClick={() => {
                  onDelete(recording.id);
                  onClose();
                }}
                className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                title="Delete recording"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
