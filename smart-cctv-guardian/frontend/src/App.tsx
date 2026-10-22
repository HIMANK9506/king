import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MainCameraStage } from './components/MainCameraStage';
import { CameraThumbnailRow } from './components/CameraThumbnailRow';
import { FourCamGrid } from './components/FourCamGrid';
import { RightStation } from './components/RightStation';
import { MetricsBar } from './components/MetricsBar';
import { SettingsModal } from './components/SettingsModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { FaceWhitelistModal } from './components/FaceWhitelistModal';
import { MobilePairModal } from './components/MobilePairModal';
import { ConnectCameraModal } from './components/ConnectCameraModal';
import { MobileView } from './components/MobileView';
import {
  SystemMode,
  SystemStatus,
  IncidentRecord,
  SecurityRulesConfig,
  EventType,
  VideoRecordingItem,
  EnrolledFaceRecord,
  CameraChannelInfo,
} from './types';
import { X, ShieldAlert, Download, FlipHorizontal, Radio, Shield, LayoutGrid } from 'lucide-react';
import { soundManager } from './utils/audio';
import { getApiUrl } from './utils/api';

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [mode, setMode] = useState<SystemMode>('ARMED');
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [recordings, setRecordings] = useState<VideoRecordingItem[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<VideoRecordingItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTriggeringTest, setIsTriggeringTest] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [mirrorFeed, setMirrorFeed] = useState<boolean>(true);
  const [isFacesOpen, setIsFacesOpen] = useState(false);
  const [enrolledFaces, setEnrolledFaces] = useState<EnrolledFaceRecord[]>([]);
  const [isMobilePairOpen, setIsMobilePairOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Multi-Cam NVR State (Matching User Wireframe & Ref Images)
  const [activeCamId, setActiveCamId] = useState<number>(1);
  const [isGridView, setIsGridView] = useState<boolean>(false);

  // 3-Way System State (Software Desktop / Mobile App / Web Remote IP Connect)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isMobileViewMode, setIsMobileViewMode] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const fetchFaces = async () => {
    try {
      const res = await fetch(getApiUrl('/api/faces'));
      if (res.ok) {
        const data: EnrolledFaceRecord[] = await res.json();
        setEnrolledFaces(data);
      }
    } catch (err) {
      // Backend offline or starting
    }
  };

  const pollBackend = async () => {
    try {
      const [resStatus, resIncidents] = await Promise.all([
        fetch(getApiUrl('/api/status')),
        fetch(getApiUrl('/api/incidents')),
      ]);

      if (resStatus.ok) {
        const dataStatus: SystemStatus = await resStatus.json();
        setStatus(dataStatus);
        setMode(dataStatus.mode);
        if (dataStatus.mirror_feed !== undefined) {
          setMirrorFeed(dataStatus.mirror_feed);
        }
      }

      if (resIncidents.ok) {
        const dataIncidents: IncidentRecord[] = await resIncidents.json();
        setIncidents(dataIncidents);
      }
    } catch (err) {
      // Backend starting or offline
    }
  };

  useEffect(() => {
    pollBackend();
    fetchFaces();
    const interval = setInterval(pollBackend, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleEnrollFace = async (name: string): Promise<boolean> => {
    try {
      const res = await fetch(getApiUrl('/api/faces/enroll'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchFaces();
        await pollBackend();
        return !!(data.id || data.success);
      }
      const errData = await res.json().catch(() => null);
      throw new Error(
        errData?.detail ||
          'No face was clearly detected in the live camera frame. Look directly into the camera with good lighting and retry.'
      );
    } catch (e: any) {
      console.error('Failed to enroll face', e);
      throw e;
    }
  };

  const handleDeleteFace = async (id: string) => {
    try {
      await fetch(getApiUrl(`/api/faces/${id}`), { method: 'DELETE' });
      await fetchFaces();
      await pollBackend();
    } catch (e) {
      console.error('Failed to delete face', e);
    }
  };

  const handleModeChange = async (newMode: SystemMode) => {
    setMode(newMode);
    try {
      await fetch(getApiUrl('/api/mode'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      pollBackend();
    } catch (e) {
      console.error('Failed to change mode', e);
    }
  };

  const handleToggleMirror = async () => {
    const nextVal = !mirrorFeed;
    setMirrorFeed(nextVal);
    try {
      await fetch(getApiUrl('/api/mirror'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextVal }),
      });
      pollBackend();
    } catch (e) {
      console.error('Failed to toggle camera mirror', e);
    }
  };

  const handleToggleSound = () => {
    const nextVal = soundManager.toggle();
    setSoundEnabled(nextVal);
  };

  const handleSaveCamera = async (source: string, name: string) => {
    try {
      await fetch(getApiUrl('/api/camera'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, name }),
      });
      pollBackend();
    } catch (e) {
      console.error('Failed to update camera source', e);
    }
  };

  const handleSaveRules = async (newRules: SecurityRulesConfig) => {
    try {
      await fetch(getApiUrl('/api/rules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRules),
      });
      pollBackend();
    } catch (e) {
      console.error('Failed to update rules', e);
    }
  };

  const handleSaveEmail = async (enable: boolean, recipient: string, sender: string, pass: string) => {
    try {
      await fetch(getApiUrl('/api/email-config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enable,
          recipient_email: recipient,
          sender_email: sender,
          sender_app_password: pass,
        }),
      });
      pollBackend();
    } catch (e) {
      console.error('Failed to update email config', e);
    }
  };

  const handleTriggerTestAlert = async (eventType: EventType = 'ZONE_INTRUSION') => {
    setIsTriggeringTest(true);
    try {
      await fetch(getApiUrl(`/api/trigger-test-alert?event_type=${eventType}`), { method: 'POST' });
      await pollBackend();
      soundManager.playTacticalAlarm(true);
    } catch (e) {
      console.error('Failed to trigger test alert', e);
    } finally {
      setIsTriggeringTest(false);
    }
  };

  const handleNewRecording = (item: VideoRecordingItem) => {
    setRecordings((prev) => [item, ...prev]);
  };

  const handleDeleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const isBreached = status?.person_in_frame && (mode === 'ARMED' || mode === 'NIGHT_MODE');

  const activeCamInfo = status?.cameras?.find((c) => c.id === activeCamId);
  const activeCamName =
    activeCamInfo?.name ||
    (activeCamId === 1 ? status?.camera_name || 'Main Entrance' : `CAM 0${activeCamId}`);
  const activeCamBitrate = activeCamInfo?.bitrate_kbps || 297;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {isMobileViewMode ? (
        <MobileView
          status={status}
          mode={mode}
          onModeChange={handleModeChange}
          incidents={incidents}
          recordings={recordings}
          cameras={status?.cameras || []}
          mirrorFeed={mirrorFeed}
          onToggleMirror={handleToggleMirror}
          onNewRecording={handleNewRecording}
          onSelectSnapshot={setSelectedSnapshot}
          onSelectRecording={setSelectedRecording}
          onDeleteRecording={handleDeleteRecording}
          onTriggerTestAlert={handleTriggerTestAlert}
          isTriggeringTest={isTriggeringTest}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
          onOpenFacesModal={() => setIsFacesOpen(true)}
          onSaveRules={handleSaveRules}
          onSwitchToDesktop={() => setIsMobileViewMode(false)}
        />
      ) : (
        <>
          {/* Top Navbar */}
          <Header
            mode={mode}
            onModeChange={handleModeChange}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isConnected={status?.is_connected || false}
            activeBreach={!!isBreached}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            recordingsCount={recordings.length}
            onOpenRecordings={() => {
              if (recordings.length > 0) {
                setSelectedRecording(recordings[0]);
              }
            }}
            authorizedFacesCount={enrolledFaces.length}
            onOpenFacesModal={() => setIsFacesOpen(true)}
            onOpenMobilePair={() => setIsMobilePairOpen(true)}
            installPrompt={deferredPrompt}
            onInstallApp={handleInstallApp}
            onOpenConnectCamera={() => setIsConnectModalOpen(true)}
            onToggleMobileView={() => setIsMobileViewMode(true)}
          />

          {/* Main Content Layout */}
          <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-5">
            {/* Top Telemetry Metrics Bar */}
            <MetricsBar
              status={status}
              totalIncidents={incidents.length}
              onOpenFacesModal={() => setIsFacesOpen(true)}
            />

            {/* 2-Column NVR Workspace (Matching User Wireframe) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
              {/* ============================================================ */}
              {/* LEFT COLUMN: Main Camera Stage + v1, v2, v3 Sub-Streams */}
              {/* (Or 4-Camera Synchronous 2x2 Grid View) */}
              {/* ============================================================ */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {isGridView ? (
                  <FourCamGrid
                    cameras={status?.cameras || []}
                    onSelectCamera={(id) => {
                      setActiveCamId(id);
                      setIsGridView(false);
                    }}
                    onExitGridView={() => setIsGridView(false)}
                    personInFrame={status?.person_in_frame || false}
                    activePresenceSec={status?.active_presence_sec || 0}
                    isAlarmTriggered={!!isBreached}
                  />
                ) : (
                  <>
                    {/* 1. Focused Main Camera Stage */}
                    <MainCameraStage
                      activeCamId={activeCamId}
                      activeCamName={activeCamName}
                      mode={mode}
                      fps={activeCamId === 1 ? status?.fps || 30 : 15}
                      activePresenceSec={activeCamId === 1 ? status?.active_presence_sec || 0 : 0}
                      personInFrame={activeCamId === 1 ? status?.person_in_frame || false : false}
                      mirrorFeed={mirrorFeed}
                      onToggleMirror={handleToggleMirror}
                      onNewRecording={handleNewRecording}
                      heldItems={activeCamId === 1 ? status?.detected_held_items || [] : []}
                      onToggleGridView={() => setIsGridView(true)}
                      onSelectSnapshot={setSelectedSnapshot}
                      bitrateKbps={activeCamBitrate}
                    />

                    {/* 2. Sub-Streams Row: v1, v2, v3 */}
                    <CameraThumbnailRow
                      activeCamId={activeCamId}
                      cameras={status?.cameras || []}
                      onSelectCamera={(id) => setActiveCamId(id)}
                      onToggleGridView={() => setIsGridView(true)}
                    />
                  </>
                )}

                {/* Tactical Status Guidance Strip */}
                <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Channel Selected: <strong className="text-white">CAM 0{activeCamId}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Radio size={13} className="text-cyan-400" />
                    Network Mode:{' '}
                    <strong className="text-neutral-200">
                      {isGridView ? '4-Channel Synchronous NVR' : 'Focused Stage + 3 Sub-Streams'}
                    </strong>
                  </span>
                  <span>
                    Tripwire: <strong className="text-neutral-200">{status?.rules?.boundary?.enabled ? 'Active' : 'Disabled'}</strong>
                  </span>
                  <span>
                    Zone: <strong className="text-neutral-200">{status?.rules?.zone?.enabled ? 'Armed' : 'Disabled'}</strong>
                  </span>
                  <span>
                    Residents: <strong className="text-emerald-400">{enrolledFaces.length} Authorized</strong>
                  </span>
                </div>
              </div>

              {/* ============================================================ */}
              {/* RIGHT COLUMN: Wireframe Tri-Section Station */}
              {/* Top: LOGs | Bottom-Left: Snapshots | Bottom-Right: Controls */}
              {/* ============================================================ */}
              <div className="lg:col-span-4 h-full">
                <RightStation
                  incidents={incidents}
                  recordings={recordings}
                  onSelectSnapshot={setSelectedSnapshot}
                  onSelectRecording={setSelectedRecording}
                  onDeleteRecording={handleDeleteRecording}
                  onTriggerTestAlert={handleTriggerTestAlert}
                  isTriggeringTest={isTriggeringTest}
                  rules={status?.rules}
                  onSaveRules={handleSaveRules}
                  mode={mode}
                  onModeChange={handleModeChange}
                  authorizedFacesCount={enrolledFaces.length}
                  onOpenFacesModal={() => setIsFacesOpen(true)}
                />
              </div>
            </div>
          </main>
        </>
      )}

      {/* Snapshot Evidence Modal */}
      {selectedSnapshot && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 max-w-2xl w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <ShieldAlert size={18} />
                <span>Security Intrusion Snapshot Evidence</span>
              </div>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black aspect-video flex items-center justify-center">
              <img
                src={selectedSnapshot}
                alt="Enlarged Intruder Frame"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
              <span>Timestamped security evidence frame</span>
              <a
                href={selectedSnapshot}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
              >
                <Download size={13} />
                <span>Save Frame</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Sentinel Interactive Video Player Modal */}
      <VideoPlayerModal
        recording={selectedRecording}
        onClose={() => setSelectedRecording(null)}
        onDelete={handleDeleteRecording}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSource={status?.camera_source || '1'}
        currentName={status?.camera_name || 'Integrated Laptop Webcam (CAM-01)'}
        emailEnabled={status?.email_alerts_enabled || false}
        currentRules={status?.rules}
        onSaveCamera={handleSaveCamera}
        onSaveEmail={handleSaveEmail}
        onSaveRules={handleSaveRules}
      />

      {/* Face Whitelist & Resident Enrollment Modal */}
      <FaceWhitelistModal
        isOpen={isFacesOpen}
        onClose={() => setIsFacesOpen(false)}
        faces={enrolledFaces}
        onEnrollFace={handleEnrollFace}
        onDeleteFace={handleDeleteFace}
      />

      {/* Mobile & PC App Multi-Platform Setup Modal */}
      <MobilePairModal
        isOpen={isMobilePairOpen}
        onClose={() => setIsMobilePairOpen(false)}
        mobileUrl={status?.mobile_app_url || ''}
        installPrompt={deferredPrompt}
        onInstallApp={handleInstallApp}
      />

      {/* Connect CCTV / External Camera Modal via IP & Unique Code (Way 3) */}
      <ConnectCameraModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        cameras={status?.cameras || []}
        onCameraConnected={pollBackend}
      />
    </div>
  );
}
