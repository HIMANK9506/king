import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Bell,
  Camera,
  Film,
  Wifi,
  Sliders,
  Maximize2,
  FlipHorizontal,
  Circle,
  Square,
  Play,
  Download,
  Trash2,
  Tv,
  CheckCircle2,
  Eye,
  Activity,
  Users,
  Grid,
  Monitor
} from 'lucide-react';
import {
  SystemMode,
  SystemStatus,
  IncidentRecord,
  VideoRecordingItem,
  SecurityRulesConfig,
  CameraChannelInfo,
  EventType
} from '../types';
import { videoRecorder } from '../utils/recorder';
import { getApiUrl } from '../utils/api';
import { VirtualCctvCanvas } from '../utils/virtualCanvas';

interface MobileViewProps {
  status: SystemStatus | null;
  mode: SystemMode;
  onModeChange: (mode: SystemMode) => void;
  incidents: IncidentRecord[];
  recordings: VideoRecordingItem[];
  cameras: CameraChannelInfo[];
  mirrorFeed: boolean;
  onToggleMirror: () => void;
  onNewRecording: (rec: VideoRecordingItem) => void;
  onSelectSnapshot: (url: string) => void;
  onSelectRecording: (rec: VideoRecordingItem) => void;
  onDeleteRecording: (id: string) => void;
  onTriggerTestAlert: (eventType?: EventType) => void;
  isTriggeringTest: boolean;
  onOpenConnectModal: () => void;
  onOpenFacesModal: () => void;
  onSaveRules: (rules: SecurityRulesConfig) => void;
  onSwitchToDesktop: () => void;
  browserStream?: MediaStream | null;
  cameraPermission?: 'prompt' | 'granted' | 'denied';
  onRequestBrowserCamera?: () => void;
}

const MobileCamCardItem: React.FC<{
  cam: CameraChannelInfo;
  isCam1Alarm: boolean;
  recState?: { isRec: boolean; elapsed: number };
  mirrorFeed: boolean;
  onToggleMirror: () => void;
  onToggleRecord: (camId: number, camName: string, el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null) => void;
  onTakeSnapshot: (el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null) => void;
  browserStream?: MediaStream | null;
  cameraPermission?: 'prompt' | 'granted' | 'denied';
  onRequestCamera?: () => void;
}> = ({
  cam,
  isCam1Alarm,
  recState,
  mirrorFeed,
  onToggleMirror,
  onToggleRecord,
  onTakeSnapshot,
  browserStream,
  cameraPermission,
  onRequestCamera,
}) => {
  const [imgError, setImgError] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (cam.id === 1 && browserStream && videoRef.current) {
      videoRef.current.srcObject = browserStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cam.id, browserStream]);

  const activeElement =
    cam.id === 1 && browserStream
      ? videoRef.current
      : !imgError
      ? imgRef.current
      : canvasRef.current;

  return (
    <div
      className={`rounded-2xl overflow-hidden border bg-neutral-900/90 shadow-xl transition ${
        isCam1Alarm
          ? 'border-red-600 ring-2 ring-red-600/60 shadow-red-950/60'
          : 'border-neutral-800'
      }`}
    >
      {/* Camera Card Top Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-neutral-800/80 bg-neutral-950/80">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isCam1Alarm ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span className="font-bold text-xs text-white tracking-wide">
            CAM 0{cam.id}
          </span>
          <span className="text-[11px] text-neutral-400 truncate max-w-[140px]">
            {cam.name.replace(/^CAM \d+ - /, '')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
          <span>{cam.bitrate_kbps || 295} KB/s</span>
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none">
        {cam.id === 1 && browserStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${mirrorFeed ? 'scale-x-[-1]' : ''}`}
          />
        ) : cam.id === 1 && !browserStream ? (
          <div className="relative w-full h-full flex items-center justify-center bg-neutral-950">
            <VirtualCctvCanvas channelId={1} bitrate={cam.bitrate_kbps || 295} />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
              <Camera size={26} className="text-cyan-400 mb-1.5 animate-bounce" />
              <p className="text-xs font-bold text-white">Browser Camera Offline</p>
              <button
                onClick={onRequestCamera}
                className="mt-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg"
              >
                Allow Camera
              </button>
            </div>
          </div>
        ) : !imgError ? (
          <img
            ref={imgRef}
            src={getApiUrl(`/api/feed?cam=${cam.id}`)}
            alt={cam.name}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <VirtualCctvCanvas channelId={cam.id} bitrate={cam.bitrate_kbps || 295} />
        )}

        {/* Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-500/70 pointer-events-none z-10" />
        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-500/70 pointer-events-none z-10" />
        <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-500/70 pointer-events-none z-10" />
        <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-500/70 pointer-events-none z-10" />

        {/* Live REC indicator */}
        {recState?.isRec && (
          <div className="absolute top-2 left-2 bg-red-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded animate-pulse flex items-center gap-1 shadow-md z-10">
            <Square size={8} className="fill-white" />
            <span>REC {recState.elapsed}s</span>
          </div>
        )}
      </div>

      {/* Mobile Tactical Action Bar (Below Camera) */}
      <div className="p-2.5 bg-neutral-950 flex items-center justify-between text-xs border-t border-neutral-800/80">
        <div className="flex items-center gap-2">
          {/* Record Button */}
          <button
            onClick={() => onToggleRecord(cam.id, cam.name, activeElement)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition text-xs ${
              recState?.isRec
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-neutral-800 text-neutral-200 hover:text-white'
            }`}
          >
            {recState?.isRec ? <Square size={12} className="fill-white" /> : <Circle size={10} className="fill-red-500 text-red-500" />}
            <span>{recState?.isRec ? 'Stop' : 'Record'}</span>
          </button>

          {/* Snapshot Button */}
          <button
            onClick={() => onTakeSnapshot(activeElement)}
            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl font-medium transition"
            title="Snapshot"
          >
            <Camera size={13} />
            <span>Snap</span>
          </button>

          {/* Mirror (Cam 1) */}
          {cam.id === 1 && (
            <button
              onClick={onToggleMirror}
              className={`p-1.5 rounded-xl border transition ${
                mirrorFeed
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
              title="Mirror Feed"
            >
              <FlipHorizontal size={14} />
            </button>
          )}
        </div>

        <span className="text-[10px] text-neutral-500 font-mono">
          {cam.fps || 15} FPS &bull; {cam.location}
        </span>
      </div>
    </div>
  );
};

export const MobileView: React.FC<MobileViewProps> = ({
  status,
  mode,
  onModeChange,
  incidents,
  recordings,
  cameras,
  mirrorFeed,
  onToggleMirror,
  onNewRecording,
  onSelectSnapshot,
  onSelectRecording,
  onDeleteRecording,
  onTriggerTestAlert,
  isTriggeringTest,
  onOpenConnectModal,
  onOpenFacesModal,
  onSaveRules,
  onSwitchToDesktop,
  browserStream,
  cameraPermission,
  onRequestBrowserCamera,
}) => {
  const [mobileTab, setMobileTab] = useState<'DEVICES' | 'ALERTS' | 'CONNECT' | 'RULES'>('DEVICES');
  const [activeCamFilter, setActiveCamFilter] = useState<number | 'ALL'>('ALL');
  const [recordingStates, setRecordingStates] = useState<{ [camId: number]: { isRec: boolean; elapsed: number } }>({});
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      setTimeStr(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const defaultCameras: CameraChannelInfo[] = [
    { id: 1, name: 'CAM 01 - Main Entrance', location: 'Front Gate', status: 'ONLINE', bitrate_kbps: 297, fps: 30 },
    { id: 2, name: 'CAM 02 - Backyard Perimeter', location: 'Perimeter Fence', status: 'ONLINE', bitrate_kbps: 312, fps: 15 },
    { id: 3, name: 'CAM 03 - Front Porch / Entry', location: 'Doorway & Walkway', status: 'ONLINE', bitrate_kbps: 284, fps: 15 },
    { id: 4, name: 'CAM 04 - Driveway & Street', location: 'Vehicle Access', status: 'ONLINE', bitrate_kbps: 305, fps: 15 },
  ];

  const camList = cameras && cameras.length > 0 ? cameras : defaultCameras;

  const handleToggleRecord = (
    camId: number,
    camName: string,
    element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null
  ) => {
    const cur = recordingStates[camId];
    if (cur?.isRec) {
      videoRecorder.stopRecording();
      setRecordingStates((prev) => ({ ...prev, [camId]: { isRec: false, elapsed: 0 } }));
    } else if (element) {
      const ok = videoRecorder.startRecording(
        element,
        camName,
        'Mobile Live Recording',
        (elapsed) => {
          setRecordingStates((prev) => ({ ...prev, [camId]: { isRec: true, elapsed } }));
        },
        (newItem) => {
          setRecordingStates((prev) => ({ ...prev, [camId]: { isRec: false, elapsed: 0 } }));
          onNewRecording(newItem);
        }
      );
      if (ok) {
        setRecordingStates((prev) => ({ ...prev, [camId]: { isRec: true, elapsed: 0 } }));
      }
    }
  };

  const handleTakeSnapshot = (
    el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null
  ) => {
    if (!el) return;
    try {
      const canvas = document.createElement('canvas');
      const w = (el as any).videoWidth || (el as any).naturalWidth || el.width || 640;
      const h = (el as any).videoHeight || (el as any).naturalHeight || el.height || 480;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(el, 0, 0, w, h);
        onSelectSnapshot(canvas.toDataURL('image/jpeg', 0.9));
      }
    } catch (e) {
      console.warn('Mobile snapshot capture notice:', e);
    }
  };

  const isBreached = status?.person_in_frame && (mode === 'ARMED' || mode === 'NIGHT_MODE');

  const displayedCameras = activeCamFilter === 'ALL' ? camList : camList.filter((c) => c.id === activeCamFilter);

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans pb-20 select-none">
      {/* ============================================================ */}
      {/* 1. TOP MOBILE HEADER (Matching Reference Image 3) */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold">
            <Shield size={18} />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wide text-white block">
              GUARDIAN MOBILE
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE &bull; 4 CHANNELS
            </span>
          </div>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Armed Mode Pill */}
          <button
            onClick={() => {
              const modes: SystemMode[] = ['ARMED', 'NIGHT_MODE', 'DISARMED'];
              const next = modes[(modes.indexOf(mode) + 1) % modes.length];
              onModeChange(next);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
              mode === 'ARMED'
                ? 'bg-red-600/20 text-red-400 border-red-500/40'
                : mode === 'NIGHT_MODE'
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            {mode === 'ARMED' ? '🔴 ARMED' : mode === 'NIGHT_MODE' ? '🌙 NIGHT' : '⚪ DISARM'}
          </button>

          {/* Switch to Desktop NVR Stage View */}
          <button
            onClick={onSwitchToDesktop}
            className="p-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-lg transition"
            title="Switch to Desktop NVR Grid"
          >
            <Monitor size={16} />
          </button>
        </div>
      </header>

      {/* Active Breach Alert Banner */}
      {isBreached && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold animate-pulse shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>🚨 INTRUSION BREACH ACTIVE ON CAM 01</span>
          </div>
          <span className="font-mono text-[11px]">{status?.active_presence_sec.toFixed(1)}s</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. QUICK ACTION PILLS (Reference Image 3 Header Row) */}
      {/* ============================================================ */}
      <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none bg-neutral-950/60 border-b border-neutral-900 text-xs">
        <button
          onClick={() => {
            setMobileTab('DEVICES');
            setActiveCamFilter('ALL');
          }}
          className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition ${
            mobileTab === 'DEVICES' && activeCamFilter === 'ALL'
              ? 'bg-cyan-500 text-black font-bold'
              : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
          }`}
        >
          All Feeds (4)
        </button>

        {[1, 2, 3, 4].map((id) => (
          <button
            key={id}
            onClick={() => {
              setMobileTab('DEVICES');
              setActiveCamFilter(id);
            }}
            className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition font-mono ${
              mobileTab === 'DEVICES' && activeCamFilter === id
                ? 'bg-neutral-200 text-black font-bold'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
            }`}
          >
            CAM 0{id}
          </button>
        ))}

        <button
          onClick={onOpenConnectModal}
          className="px-3 py-1 bg-cyan-950/60 text-cyan-400 border border-cyan-800/80 rounded-full font-medium whitespace-nowrap flex items-center gap-1 shrink-0"
        >
          <Wifi size={12} />
          <span>+ Connect IP Cam</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. MAIN MOBILE TAB CONTENT */}
      {/* ============================================================ */}
      <main className="flex-1 p-3.5 space-y-4">
        {/* ========================================================== */}
        {/* TAB 1: DEVICES (Swipeable / Stacked Camera Cards) */}
        {/* ========================================================== */}
        {mobileTab === 'DEVICES' && (
          <div className="space-y-4">
            {displayedCameras.map((cam) => (
              <MobileCamCardItem
                key={cam.id}
                cam={cam}
                isCam1Alarm={cam.id === 1 && isBreached}
                recState={recordingStates[cam.id]}
                mirrorFeed={mirrorFeed}
                onToggleMirror={onToggleMirror}
                onToggleRecord={handleToggleRecord}
                onTakeSnapshot={handleTakeSnapshot}
                browserStream={browserStream}
                cameraPermission={cameraPermission}
                onRequestCamera={onRequestBrowserCamera}
              />
            ))}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: ALERTS & INCIDENT LOGS */}
        {/* ========================================================== */}
        {mobileTab === 'ALERTS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-xl border border-neutral-800">
              <span className="font-bold text-xs uppercase tracking-wider text-white">
                Live Security Threat Stream
              </span>
              <button
                onClick={() => onTriggerTestAlert('ZONE_INTRUSION')}
                disabled={isTriggeringTest}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-700"
              >
                {isTriggeringTest ? 'Simulating...' : 'Test Alert'}
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 bg-neutral-900/40 rounded-xl border border-neutral-800/60">
                <CheckCircle2 size={32} className="mx-auto text-neutral-600 mb-2" />
                <p className="text-xs font-bold text-neutral-300">All Sectors Normal</p>
                <p className="text-[11px] text-neutral-500 mt-1">No security threats detected.</p>
              </div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => onSelectSnapshot(getApiUrl(inc.snapshot_url))}
                  className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer hover:border-neutral-700 transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={getApiUrl(inc.snapshot_url)}
                      alt="Intruder"
                      className="w-14 h-10 object-cover rounded-lg bg-black border border-neutral-800 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate">
                          {inc.event_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-red-600/20 text-red-400 border border-red-500/40 rounded">
                          {inc.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        {inc.timestamp.slice(11, 19)} &bull; {inc.camera_name}
                      </p>
                    </div>
                  </div>
                  <Eye size={14} className="text-neutral-500 shrink-0" />
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: CONNECT IP CAMERA & SYSTEM CODE (Way 3) */}
        {/* ========================================================== */}
        {mobileTab === 'CONNECT' && (
          <div className="space-y-3.5">
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
                  Guardian Station Pair Code
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold">
                  WAY 3 &bull; UNIQUE CODE
                </span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-center">
                <span className="font-mono text-2xl font-extrabold text-cyan-400 tracking-wider">
                  GRD-4212-BC38
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 text-center">
                Use this unique verification code to pair any remote smartphone, tablet, or web browser.
              </p>
            </div>

            <button
              onClick={onOpenConnectModal}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition"
            >
              <Wifi size={15} />
              <span>Connect External CCTV / IP Camera</span>
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: RULES & TACTICAL SWITCHES */}
        {/* ========================================================== */}
        {mobileTab === 'RULES' && (
          <div className="space-y-3">
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                Tactical Security Parameters
              </h3>

              <div className="space-y-2 text-xs">
                {/* Zone Switch */}
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={15} className="text-amber-400" />
                    <div>
                      <p className="font-semibold text-neutral-200">Restricted Zone</p>
                      <p className="text-[10px] text-neutral-500">Doorway boundary protection</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (status?.rules) {
                        onSaveRules({
                          ...status.rules,
                          zone: { ...status.rules.zone, enabled: !status.rules.zone.enabled },
                        });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      status?.rules?.zone?.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {status?.rules?.zone?.enabled ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>

                {/* Tripwire */}
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={15} className="text-cyan-400" />
                    <div>
                      <p className="font-semibold text-neutral-200">Perimeter Tripwire</p>
                      <p className="text-[10px] text-neutral-500">Virtual boundary line crossing</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (status?.rules) {
                        onSaveRules({
                          ...status.rules,
                          boundary: { ...status.rules.boundary, enabled: !status.rules.boundary.enabled },
                        });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      status?.rules?.boundary?.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {status?.rules?.boundary?.enabled ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>

                {/* Resident Face Whitelist */}
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-emerald-400" />
                    <div>
                      <p className="font-semibold text-neutral-200">Resident Face Whitelist</p>
                      <p className="text-[10px] text-neutral-500">Suppress alarms for known family</p>
                    </div>
                  </div>
                  <button
                    onClick={onOpenFacesModal}
                    className="px-3 py-1 rounded-lg text-xs font-mono bg-neutral-800 text-neutral-200 border border-neutral-700"
                  >
                    {status?.authorized_faces_count || 0} Faces &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 4. FIXED BOTTOM NAVIGATION BAR (Matching Reference Image 3) */}
      {/* ============================================================ */}
      <nav className="fixed bottom-0 inset-x-0 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800 px-6 py-2.5 flex items-center justify-around z-40">
        <button
          onClick={() => setMobileTab('DEVICES')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'DEVICES' ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Tv size={18} />
          <span className="text-[10px] font-semibold">Devices</span>
        </button>

        <button
          onClick={() => setMobileTab('ALERTS')}
          className={`flex flex-col items-center gap-1 relative transition ${
            mobileTab === 'ALERTS' ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Bell size={18} />
          {incidents.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
              {Math.min(99, incidents.length)}
            </span>
          )}
          <span className="text-[10px] font-semibold">Alerts</span>
        </button>

        <button
          onClick={() => setMobileTab('CONNECT')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'CONNECT' ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Wifi size={18} />
          <span className="text-[10px] font-semibold">Connect</span>
        </button>

        <button
          onClick={() => setMobileTab('RULES')}
          className={`flex flex-col items-center gap-1 transition ${
            mobileTab === 'RULES' ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Sliders size={18} />
          <span className="text-[10px] font-semibold">Rules</span>
        </button>
      </nav>
    </div>
  );
};
