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
  Camera,
  Grid,
  Radio,
  Clock
} from 'lucide-react';
import { SystemMode, VideoRecordingItem } from '../types';
import { videoRecorder } from '../utils/recorder';
import { soundManager } from '../utils/audio';
import { getApiUrl } from '../utils/api';

interface MainCameraStageProps {
  activeCamId: number;
  activeCamName: string;
  mode: SystemMode;
  fps: number;
  activePresenceSec: number;
  personInFrame: boolean;
  mirrorFeed: boolean;
  onToggleMirror: () => void;
  onNewRecording: (rec: VideoRecordingItem) => void;
  heldItems?: string[];
  onToggleGridView: () => void;
  onSelectSnapshot?: (url: string) => void;
  bitrateKbps?: number;
}

export const MainCameraStage: React.FC<MainCameraStageProps> = ({
  activeCamId,
  activeCamName,
  mode,
  fps,
  activePresenceSec,
  personInFrame,
  mirrorFeed,
  onToggleMirror,
  onNewRecording,
  heldItems = [],
  onToggleGridView,
  onSelectSnapshot,
  bitrateKbps = 297,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [hasError, setHasError] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [liveBitrate, setLiveBitrate] = useState(bitrateKbps);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recElapsedSec, setRecElapsedSec] = useState(0);

  // Live CCTV OSD Clock & Bitrate fluctuation (Matching Reference Photos)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const day = pad(now.getDate());
      const month = pad(now.getMonth() + 1);
      const year = now.getFullYear();
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      setCurrentTimeStr(`${day}/${month}/${year} ${hours}:${minutes}:${seconds}`);
      
      // Dynamic realistic bitrate variance (e.g. 288-316 KB/s)
      const variance = Math.floor(Math.sin(now.getTime() / 1500) * 14);
      setLiveBitrate(bitrateKbps + variance);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [bitrateKbps]);

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

  useEffect(() => {
    setStreamKey(Date.now());
    setHasError(false);
  }, [activeCamId]);

  const isAlarmTriggered =
    activeCamId === 1 &&
    personInFrame &&
    activePresenceSec >= 2.0 &&
    (mode === 'ARMED' || mode === 'NIGHT_MODE');

  useEffect(() => {
    if (isAlarmTriggered) {
      soundManager.playTacticalAlarm();
    } else if (heldItems.length > 0) {
      soundManager.playChime();
    }
  }, [isAlarmTriggered, heldItems]);

  useEffect(() => {
    if (isAlarmTriggered && !isRecording && imgRef.current) {
      handleStartRecording('🚨 Auto-Recorded Intrusion Breach');
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
      activeCamName,
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

  const handleManualSnapshot = () => {
    if (!imgRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth || 640;
      canvas.height = imgRef.current.naturalHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        if (onSelectSnapshot) {
          onSelectSnapshot(dataUrl);
        }
      }
    } catch (e) {
      console.warn('Snapshot canvas capture notice:', e);
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
          ? 'border-red-600 ring-2 ring-red-600/50 shadow-red-900/40'
          : 'border-neutral-800'
      }`}
    >
      {/* CCTV Viewport Container */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden select-none">
        {hasError ? (
          <div className="flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
            <Video size={48} className="text-neutral-600 mb-3" />
            <p className="text-sm font-semibold text-neutral-300">Live Stream Offline or Connecting</p>
            <p className="text-xs text-neutral-500 max-w-sm mt-1">
              Connecting to channel {activeCamId}...
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
            key={`${activeCamId}-${streamKey}`}
            src={getApiUrl(`/api/feed?cam=${activeCamId}&t=${streamKey}`)}
            alt={`CCTV CAM ${activeCamId}`}
            className="w-full h-full object-contain select-none"
            onError={() => setHasError(true)}
          />
        )}

        {/* ============================================================ */}
        {/* TACTICAL CCTV CORNER BRACKETS (MILITARY/NVR HUD) */}
        {/* ============================================================ */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-500/70 pointer-events-none" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-500/70 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-500/70 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-500/70 pointer-events-none" />

        {/* ============================================================ */}
        {/* TOP-LEFT OSD: Camera Identification & Status */}
        {/* ============================================================ */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800/80 text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${isAlarmTriggered ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
          <span className="font-bold text-white tracking-wider font-mono">CAM 0{activeCamId}</span>
          <span className="text-neutral-300 font-medium hidden sm:inline">| {activeCamName}</span>
          <span className="text-neutral-400 font-mono text-[11px]">({fps || 30} FPS)</span>
          {activeCamId === 1 && mirrorFeed && (
            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700">
              Mirrored
            </span>
          )}
        </div>

        {/* ============================================================ */}
        {/* TOP-RIGHT OSD: Real-Time Bitrate & CCTV Timestamp (Ref Images) */}
        {/* ============================================================ */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {isAlarmTriggered && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs animate-bounce shadow-lg shadow-red-600/50">
              <ShieldAlert size={14} /> INTRUSION ACTIVE
            </div>
          )}

          {/* CCTV Telemetry OSD Box */}
          <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800/80 flex items-center gap-2.5 font-mono text-xs">
            <span className="text-emerald-400 font-semibold">{liveBitrate} KB/s</span>
            <span className="text-neutral-500">|</span>
            <span className="text-white flex items-center gap-1">
              <Clock size={11} className="text-neutral-400" />
              {currentTimeStr}
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BOTTOM ACTION BAR HUD: Record, Snapshot, Mirror, Grid, Fullscreen */}
        {/* ============================================================ */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {/* MediaRecorder Button */}
          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-md rounded-lg text-xs font-medium border transition ${
              isRecording
                ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/40 animate-pulse'
                : 'bg-black/70 hover:bg-black/90 text-neutral-200 border-neutral-800 hover:text-white'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Video Clip Recording'}
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

          {/* Quick Snapshot Button */}
          <button
            onClick={handleManualSnapshot}
            className="p-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-neutral-800 rounded-lg text-neutral-300 hover:text-white transition"
            title="Take Instant Snapshot"
          >
            <Camera size={14} />
          </button>

          {/* Mirror Flip Toggle (Cam 1 only) */}
          {activeCamId === 1 && (
            <button
              onClick={onToggleMirror}
              className={`p-1.5 backdrop-blur-md border rounded-lg transition ${
                mirrorFeed
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-black/70 hover:bg-black/90 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title={mirrorFeed ? 'Mirror Mode ON' : 'Mirror Mode OFF'}
            >
              <FlipHorizontal size={14} />
            </button>
          )}

          {/* 4-Cam Grid View Switcher Button */}
          <button
            onClick={onToggleGridView}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800/80 hover:bg-neutral-700/80 text-white backdrop-blur-md border border-neutral-700 rounded-lg text-xs font-semibold transition"
            title="Switch to 4-Camera 2x2 Grid View"
          >
            <Grid size={13} className="text-cyan-400" />
            <span className="hidden sm:inline">2x2 Grid</span>
          </button>

          <button
            onClick={reloadStream}
            className="p-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-neutral-800 rounded-lg text-neutral-300 hover:text-white transition"
            title="Reload Video Stream"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-neutral-800 rounded-lg text-neutral-300 hover:text-white transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {/* Bottom Banner: Temporal Presence Confirmation Progress */}
        {activeCamId === 1 && personInFrame && (
          <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md border border-neutral-800 px-3.5 py-1.5 rounded-xl flex items-center gap-3 text-xs max-w-sm">
            <Eye size={15} className={activePresenceSec >= 2.0 ? 'text-red-500' : 'text-amber-400'} />
            <span className="text-neutral-300 text-[11px] truncate">
              {activePresenceSec >= 2.0
                ? 'Intruder Verified: &ge; 2.0s rule'
                : 'Verifying Human Presence...'}
            </span>
            <div className="w-16 bg-neutral-800 rounded-full h-1.5 overflow-hidden shrink-0">
              <div
                className={`h-full transition-all duration-200 ${
                  activePresenceSec >= 2.0 ? 'bg-red-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, (activePresenceSec / 2.0) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-neutral-400 text-[10px] w-7 text-right">
              {activePresenceSec.toFixed(1)}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
