import React, { useRef, useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  Video,
  RefreshCw,
  Eye,
  ShieldAlert,
  FlipHorizontal,
  Circle,
  Square,
  Film
} from 'lucide-react';
import { SystemMode, VideoRecordingItem } from '../types';
import { videoRecorder } from '../utils/recorder';
import { soundManager } from '../utils/audio';
import { getApiUrl } from '../utils/api';

interface VideoStreamProps {
  mode: SystemMode;
  cameraName: string;
  fps: number;
  activePresenceSec: number;
  personInFrame: boolean;
  mirrorFeed: boolean;
  onToggleMirror: () => void;
  onNewRecording: (rec: VideoRecordingItem) => void;
  heldItems?: string[];
}

export const VideoStream: React.FC<VideoStreamProps> = ({
  mode,
  cameraName,
  fps,
  activePresenceSec,
  personInFrame,
  mirrorFeed,
  onToggleMirror,
  onNewRecording,
  heldItems = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [hasError, setHasError] = useState(false);

  // Recording State (MediaRecorder engine from Sentinel)
  const [isRecording, setIsRecording] = useState(false);
  const [recElapsedSec, setRecElapsedSec] = useState(0);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const reloadStream = () => {
    setHasError(false);
    setStreamKey(Date.now());
  };

  // Auto-retry connection if temporarily disconnected
  useEffect(() => {
    if (hasError) {
      const retryTimer = setTimeout(() => {
        setHasError(false);
        setStreamKey(Date.now());
      }, 3000);
      return () => clearTimeout(retryTimer);
    }
  }, [hasError]);

  const isAlarmTriggered =
    personInFrame && activePresenceSec >= 2.0 && (mode === 'ARMED' || mode === 'NIGHT_MODE');

  // Trigger Sentinel Web Audio Chime on security breach or held items
  useEffect(() => {
    if (isAlarmTriggered) {
      soundManager.playTacticalAlarm();
    } else if (heldItems.length > 0) {
      soundManager.playChime();
    }
  }, [isAlarmTriggered, heldItems]);

  // Sentinel Auto-Record on Intrusion Feature
  useEffect(() => {
    if (isAlarmTriggered && !isRecording && imgRef.current) {
      handleStartRecording('🚨 Auto-Recorded Intrusion Breach');
      // Automatically stop after 8 seconds
      const autoStopTimer = setTimeout(() => {
        handleStopRecording();
      }, 8000);
      return () => clearTimeout(autoStopTimer);
    }
  }, [isAlarmTriggered]);

  const handleStartRecording = (triggerReason: string = 'Manual Live Recording') => {
    if (!imgRef.current) return;
    const ok = videoRecorder.startRecording(
      imgRef.current,
      cameraName,
      triggerReason,
      (elapsed) => setRecElapsedSec(elapsed),
      (newItem) => {
        setIsRecording(false);
        setRecElapsedSec(0);
        onNewRecording(newItem);
      }
    );
    if (ok) {
      setIsRecording(true);
      setRecElapsedSec(0);
    }
  };

  const handleStopRecording = () => {
    videoRecorder.stopRecording();
    setIsRecording(false);
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden border bg-neutral-950 flex flex-col items-center justify-center shadow-2xl transition-all ${
        isAlarmTriggered
          ? 'border-red-600 ring-2 ring-red-600/50 shadow-red-900/30'
          : 'border-neutral-800'
      }`}
    >
      {/* CCTV Canvas Viewport */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        {hasError ? (
          <div className="flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
            <Video size={48} className="text-neutral-600 mb-3" />
            <p className="text-sm font-semibold text-neutral-300">Live Stream Offline or Connecting</p>
            <p className="text-xs text-neutral-500 max-w-sm mt-1">
              Ensure the Python backend is running on port 8000.
            </p>
            <button
              onClick={reloadStream}
              className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition"
            >
              <RefreshCw size={13} /> Reconnect
            </button>
          </div>
        ) : (
          <img
            ref={imgRef}
            key={streamKey}
            src={getApiUrl(`/api/feed?t=${streamKey}`)}
            alt="CCTV Live Stream"
            className="w-full h-full object-contain select-none"
            onError={() => setHasError(true)}
          />
        )}

        {/* Top-Left: Camera metadata & live beacon */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800/80 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-white tracking-wider">{cameraName}</span>
          <span className="text-neutral-400 font-mono text-[11px] ml-1">({fps} FPS)</span>
          {mirrorFeed && (
            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700">
              Mirrored
            </span>
          )}
        </div>

        {/* Top-Right: Security HUD & Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {isAlarmTriggered && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs animate-bounce shadow-lg shadow-red-600/50">
              <ShieldAlert size={14} /> INTRUSION ACTIVE
            </div>
          )}

          {/* MediaRecorder Button (Sentinel) */}
          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 backdrop-blur-md rounded-lg text-xs font-medium border transition ${
              isRecording
                ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/40 animate-pulse'
                : 'bg-black/60 hover:bg-black/80 text-neutral-200 border-neutral-800 hover:text-white'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Video Recording (MediaRecorder)'}
          >
            {isRecording ? (
              <>
                <Square size={12} className="fill-white" />
                <span className="font-mono text-[11px] font-bold">REC {formatRecTime(recElapsedSec)}</span>
              </>
            ) : (
              <>
                <Circle size={11} className="fill-red-500 text-red-500" />
                <span>Record</span>
              </>
            )}
          </button>

          {/* Mirror Flip Toggle (Fixes left/right direction) */}
          <button
            onClick={onToggleMirror}
            className={`p-1.5 backdrop-blur-md border rounded-lg transition ${
              mirrorFeed
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-black/60 hover:bg-black/80 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title={mirrorFeed ? 'Mirror Mode ON (Left is Right - Mirror Reflection)' : 'Mirror Mode OFF (Natural CCTV)'}
          >
            <FlipHorizontal size={14} />
          </button>

          <button
            onClick={reloadStream}
            className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-neutral-800 rounded-lg text-neutral-300 hover:text-white transition"
            title="Reload Video Stream"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-neutral-800 rounded-lg text-neutral-300 hover:text-white transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {/* Bottom Banner: Temporal presence confirmation progress */}
        {personInFrame && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/85 backdrop-blur-md border border-neutral-800 px-4 py-2 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Eye size={15} className={activePresenceSec >= 2.0 ? 'text-red-500' : 'text-amber-400'} />
              <span className="text-neutral-300">
                {activePresenceSec >= 2.0
                  ? 'Intruder Verified: Duration exceeded 2.0s rule'
                  : 'Verifying Human Presence (Filtering Pets/False Alarms)...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-28 bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    activePresenceSec >= 2.0 ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, (activePresenceSec / 2.0) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-neutral-400 text-[11px] w-9 text-right">
                {activePresenceSec.toFixed(1)}s
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
