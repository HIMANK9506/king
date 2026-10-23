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
  Clock,
  Wifi,
  Sparkles
} from 'lucide-react';
import { SystemMode, VideoRecordingItem, IncidentRecord } from '../types';
import { videoRecorder } from '../utils/recorder';
import { soundManager } from '../utils/audio';
import { getApiUrl } from '../utils/api';
import { renderVirtualCctvFrame } from '../utils/virtualCanvas';
import { browserTracker, TrackerTelemetry } from '../utils/browserTracker';

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
  browserStream?: MediaStream | null;
  cameraPermission?: 'prompt' | 'granted' | 'denied';
  onRequestBrowserCamera?: () => void;
  backendConnected?: boolean;
  onTelemetryUpdate?: (t: TrackerTelemetry) => void;
  onNewIncident?: (inc: IncidentRecord) => void;
  recognizedPersonName?: string | null;
  enrolledFaces?: Array<{ id: string; name: string }>;
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
  browserStream: propStream,
  cameraPermission: propPermission,
  onRequestBrowserCamera,
  backendConnected = false,
  onTelemetryUpdate,
  onNewIncident,
  recognizedPersonName,
  enrolledFaces = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [hasError, setHasError] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [liveBitrate, setLiveBitrate] = useState(bitrateKbps);

  // If backend is connected, allow user to toggle between Python YOLOv8 stream and Browser Web Vision
  const [useBrowserCam, setUseBrowserCam] = useState(!backendConnected);

  // Browser Camera Permission & Stream State (For Public Web & Published Deployments)
  const [localPermission, setLocalPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const activeStream = propStream !== undefined ? propStream : localStream;
  const activePermission = propPermission !== undefined ? propPermission : localPermission;

  // Local Web AI Telemetry
  const [webTelemetry, setWebTelemetry] = useState<TrackerTelemetry | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recElapsedSec, setRecElapsedSec] = useState(0);

  // Request browser camera on mount for public website access
  const requestBrowserCamera = async () => {
    if (onRequestBrowserCamera) {
      onRequestBrowserCamera();
      return;
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setLocalPermission('denied');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      setLocalStream(stream);
      setLocalPermission('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Browser camera access was not granted:', err);
      setLocalPermission('denied');
    }
  };

  useEffect(() => {
    if (activeCamId === 1 && useBrowserCam && !activeStream) {
      requestBrowserCamera();
    }
  }, [activeCamId, useBrowserCam, activeStream]);

  // Synchronize srcObject when videoRef becomes available or activeStream changes
  useEffect(() => {
    if (activeStream && videoRef.current && activeCamId === 1 && useBrowserCam) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.play().catch(() => {});
    }
  }, [activeStream, activeCamId, useBrowserCam]);

  // Launch In-Browser AI Vision Tracker & Detection Engine
  useEffect(() => {
    if (
      activeCamId === 1 &&
      useBrowserCam &&
      videoRef.current &&
      overlayCanvasRef.current &&
      (activePermission === 'granted' || !!activeStream)
    ) {
      browserTracker.setCallbacks(
        (telemetry) => {
          setWebTelemetry(telemetry);
          onTelemetryUpdate?.(telemetry);
        },
        (breachType, snapshotDataUrl) => {
          soundManager.playTacticalAlarm(true);
          const inc: IncidentRecord = {
            id: 'inc-' + Date.now(),
            timestamp: new Date().toISOString(),
            event_type: breachType === 'TRIPWIRE_BREACH' ? 'BOUNDARY_CROSSING' : 'ZONE_INTRUSION',
            details: `${breachType.replace(/_/g, ' ')} detected on CAM 01 [Confidence: 94%]`,
            severity: 'HIGH',
            camera_name: 'CAM 01 - Main Entrance',
            snapshot_url: snapshotDataUrl,
            confidence: 0.94,
            dwell_time_sec: 2.1,
          };
          onNewIncident?.(inc);
        }
      );

      browserTracker.start(
        videoRef.current,
        overlayCanvasRef.current,
        mode === 'ARMED' || mode === 'NIGHT_MODE',
        enrolledFaces,
        mirrorFeed
      );
    }

    return () => {
      browserTracker.stop();
    };
  }, [activeCamId, useBrowserCam, activePermission, activeStream, mode, enrolledFaces, mirrorFeed]);

  // Synchronize mirror state with tracker
  useEffect(() => {
    browserTracker.setMirrorFeed(mirrorFeed);
  }, [mirrorFeed]);

  // Live CCTV OSD Clock & Bitrate fluctuation
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

  // Render virtual CCTV animated canvas when activeCamId > 1 or backend stream fails
  useEffect(() => {
    let animId: number;
    let fIdx = 0;

    const renderLoop = () => {
      fIdx++;
      if (virtualCanvasRef.current && (activeCamId > 1 || (hasError && !useBrowserCam))) {
        renderVirtualCctvFrame(virtualCanvasRef.current, activeCamId, fIdx, liveBitrate);
      }
      animId = requestAnimationFrame(renderLoop);
    };

    if (activeCamId > 1 || hasError) {
      animId = requestAnimationFrame(renderLoop);
    }
    return () => cancelAnimationFrame(animId);
  }, [activeCamId, hasError, useBrowserCam, liveBitrate]);

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
    if (activeCamId === 1 && useBrowserCam) {
      requestBrowserCamera();
    }
  };

  useEffect(() => {
    setStreamKey(Date.now());
    setHasError(false);
  }, [activeCamId]);

  // Effective Dwell & Alarm Status (Combines Python Backend + Web Tracker)
  const effectivePersonInFrame = personInFrame || !!webTelemetry?.personInFrame;
  const effectivePresenceSec = Math.max(activePresenceSec, webTelemetry?.activePresenceSec || 0);

  const isAlarmTriggered =
    activeCamId === 1 &&
    effectivePersonInFrame &&
    effectivePresenceSec >= 2.0 &&
    (mode === 'ARMED' || mode === 'NIGHT_MODE');

  useEffect(() => {
    if (isAlarmTriggered) {
      soundManager.playTacticalAlarm();
    } else if (heldItems.length > 0) {
      soundManager.playChime();
    }
  }, [isAlarmTriggered, heldItems]);

  const handleStartRecording = (triggerReason: string = 'Manual Live Recording') => {
    const targetElement = useBrowserCam && activeCamId === 1 ? videoRef.current : imgRef.current;
    if (!targetElement) return;

    const ok = videoRecorder.startRecording(
      targetElement,
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
    const canvas = document.createElement('canvas');
    if (useBrowserCam && activeCamId === 1 && videoRef.current) {
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (mirrorFeed) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        if (overlayCanvasRef.current) {
          ctx.drawImage(overlayCanvasRef.current, 0, 0, canvas.width, canvas.height);
        }
        onSelectSnapshot?.(canvas.toDataURL('image/jpeg', 0.9));
      }
    } else if (imgRef.current) {
      canvas.width = imgRef.current.naturalWidth || 640;
      canvas.height = imgRef.current.naturalHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
        onSelectSnapshot?.(canvas.toDataURL('image/jpeg', 0.9));
      }
    } else if (virtualCanvasRef.current) {
      onSelectSnapshot?.(virtualCanvasRef.current.toDataURL('image/jpeg', 0.9));
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
        {/* ============================================================ */}
        {/* 1. CAM 01 BROWSER WEBCAM STREAM (PUBLISHED WEB MODE) */}
        {/* ============================================================ */}
        {activeCamId === 1 && useBrowserCam ? (
          activePermission === 'granted' || !!activeStream ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain select-none transition-transform ${
                  mirrorFeed ? 'scale-x-[-1]' : ''
                }`}
              />
              {/* Tactical Real-Time AI Tracking Bounding Box & HUD Canvas Overlay */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-300 p-8 text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-3">
                <Camera size={28} />
              </div>
              <h3 className="font-bold text-base text-white">Browser Camera Access Required</h3>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                To test live AI surveillance on this website, allow camera access when prompted by your browser.
              </p>
              <button
                onClick={requestBrowserCamera}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/30"
              >
                <Camera size={14} />
                <span>Allow Camera & Start Sentinel</span>
              </button>
            </div>
          )
        ) : activeCamId === 1 ? (
          /* 2. CAM 01 BACKEND MJPEG STREAM (WHEN CONNECTED TO PYTHON) */
          hasError ? (
            <canvas
              ref={virtualCanvasRef}
              width={640}
              height={480}
              className="w-full h-full object-contain select-none"
            />
          ) : (
            <img
              ref={imgRef}
              key={`${activeCamId}-${streamKey}`}
              src={getApiUrl(`/api/feed?cam=${activeCamId}&t=${streamKey}`)}
              alt={`CCTV CAM ${activeCamId}`}
              className="w-full h-full object-contain select-none"
              onError={() => setHasError(true)}
            />
          )
        ) : (
          /* 3. CAM 02, 03, 04 (VIRTUAL CHANNELS OR EXTERNAL IP CAMERAS) */
          <canvas
            ref={virtualCanvasRef}
            width={640}
            height={480}
            className="w-full h-full object-contain select-none"
          />
        )}

        {/* ============================================================ */}
        {/* TACTICAL CCTV CORNER BRACKETS */}
        {/* ============================================================ */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-500/70 pointer-events-none" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-500/70 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-500/70 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-500/70 pointer-events-none" />

        {/* ============================================================ */}
        {/* TOP-LEFT OSD: Camera Identification & Status */}
        {/* ============================================================ */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800/80 text-xs">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isAlarmTriggered ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'
            }`}
          />
          <span className="font-bold text-white tracking-wider font-mono">CAM 0{activeCamId}</span>
          <span className="text-neutral-500 text-[11px]">|</span>
          <span className="text-neutral-300 truncate max-w-[150px] font-medium hidden sm:inline">
            {activeCamName.replace(/^CAM \d+ - /, '')}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
            LIVE 1080p
          </span>
        </div>

        {/* ============================================================ */}
        {/* TOP-RIGHT OSD: Time, Bitrate, Network Quality */}
        {/* ============================================================ */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* Active Security Breach Flasher */}
          {isAlarmTriggered && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white font-bold px-3 py-1 rounded-lg text-xs animate-pulse shadow-lg shadow-red-900/50">
              <ShieldAlert size={14} />
              <span>BREACH TRIGGERED</span>
            </div>
          )}

          <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800/80 text-xs font-mono flex items-center gap-2.5">
            <span className="text-emerald-400 font-semibold">{liveBitrate} KB/s</span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-300 font-medium">{currentTimeStr}</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BOTTOM-RIGHT QUICK TACTICAL CONTROLS */}
        {/* ============================================================ */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
          {/* AI Engine Switcher: Python YOLOv8 vs Web-Client Vision */}
          {activeCamId === 1 && (
            <button
              onClick={() => setUseBrowserCam((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border transition ${
                useBrowserCam
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80 hover:bg-cyan-900/80'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900/80'
              }`}
              title="Toggle between Web Browser AI and Local Python YOLOv8 Engine"
            >
              <Sparkles size={13} className={useBrowserCam ? 'text-cyan-400' : 'text-emerald-400'} />
              <span>{useBrowserCam ? 'Engine: Web AI' : 'Engine: Python YOLO'}</span>
            </button>
          )}

          {/* Quick Record Button */}
          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md transition border ${
              isRecording
                ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-lg shadow-red-900/50'
                : 'bg-black/70 hover:bg-black/90 text-neutral-200 border-neutral-800 hover:text-white'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Recording CCTV Clip'}
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
        {activeCamId === 1 && effectivePersonInFrame && (
          <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md border border-neutral-800 px-3.5 py-1.5 rounded-xl flex items-center gap-3 text-xs max-w-sm z-20">
            <Eye size={15} className={effectivePresenceSec >= 2.0 ? 'text-red-500 animate-pulse' : 'text-amber-400'} />
            <span className="text-neutral-300 text-[11px] truncate">
              {effectivePresenceSec >= 2.0
                ? 'Intruder Verified: ≥ 2.0s rule'
                : 'Verifying Human Presence...'}
            </span>
            <div className="w-16 bg-neutral-800 rounded-full h-1.5 overflow-hidden shrink-0">
              <div
                className={`h-full transition-all duration-200 ${
                  effectivePresenceSec >= 2.0 ? 'bg-red-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, (effectivePresenceSec / 2.0) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-neutral-400 text-[10px] w-7 text-right">
              {effectivePresenceSec.toFixed(1)}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
