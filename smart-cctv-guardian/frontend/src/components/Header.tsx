import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Moon,
  Settings,
  Radio,
  Volume2,
  VolumeX,
  Film,
  UserCheck,
  Smartphone,
  Download,
  Wifi
} from 'lucide-react';
import { SystemMode } from '../types';

interface HeaderProps {
  mode: SystemMode;
  onModeChange: (mode: SystemMode) => void;
  onOpenSettings: () => void;
  isConnected: boolean;
  activeBreach: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  recordingsCount: number;
  onOpenRecordings: () => void;
  authorizedFacesCount: number;
  onOpenFacesModal: () => void;
  onOpenMobilePair: () => void;
  installPrompt?: any;
  onInstallApp?: () => void;
  onOpenConnectCamera?: () => void;
  onToggleMobileView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  onOpenSettings,
  isConnected,
  activeBreach,
  soundEnabled,
  onToggleSound,
  recordingsCount,
  onOpenRecordings,
  authorizedFacesCount,
  onOpenFacesModal,
  onOpenMobilePair,
  installPrompt,
  onInstallApp,
  onOpenConnectCamera,
  onToggleMobileView,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Live Pulse */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-all ${
            activeBreach
              ? 'bg-red-600/30 text-red-500 border-red-500 shadow-lg shadow-red-600/40 animate-pulse'
              : mode === 'ARMED'
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : mode === 'NIGHT_MODE'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <ShieldAlert size={22} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                SMART CCTV GUARDIAN
              </h1>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  ONLINE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                  CONNECTING
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Ultralytics YOLOv8 Edge Vision & Active Threat Suppression
            </p>
          </div>
        </div>

        {/* State Controls (Image 2: Armed, Disarmed, Home/Night Mode) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 shadow-inner">
            <button
              onClick={() => onModeChange('ARMED')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'ARMED'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <ShieldAlert size={14} />
              <span>Armed</span>
            </button>

            <button
              onClick={() => onModeChange('NIGHT_MODE')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'NIGHT_MODE'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Moon size={14} />
              <span>Night</span>
            </button>

            <button
              onClick={() => onModeChange('DISARMED')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'DISARMED'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Disarmed</span>
            </button>
          </div>

          {/* Web Audio Synthesizer Toggle (Sentinel) */}
          <button
            onClick={onToggleSound}
            className={`p-2 border rounded-xl transition ${
              soundEnabled
                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80 hover:bg-emerald-900/40'
                : 'text-neutral-500 bg-neutral-900 border-neutral-800 hover:text-neutral-300'
            }`}
            title={soundEnabled ? 'Web Audio Alerts Enabled (Sentinel Chime)' : 'Sound Muted'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Authorized Faces Whitelist Trigger (Option 3) */}
          <button
            onClick={onOpenFacesModal}
            className="flex items-center gap-1.5 px-3 py-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold transition"
            title="Manage Authorized Resident Faces (AI Whitelist)"
          >
            <UserCheck size={16} className="text-emerald-400" />
            <span className="hidden sm:inline">Faces</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
              {authorizedFacesCount}
            </span>
          </button>

          {/* Video Recordings Archive Trigger */}
          <button
            onClick={onOpenRecordings}
            className="flex items-center gap-1.5 px-3 py-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold transition"
            title="View Video Recordings Archive"
          >
            <Film size={16} className="text-red-400" />
            <span className="hidden sm:inline">Clips</span>
            {recordingsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-mono">
                {recordingsCount}
              </span>
            )}
          </button>

          {/* Connect IP / CCTV Camera via IP & Code (Way 3) */}
          {onOpenConnectCamera && (
            <button
              onClick={onOpenConnectCamera}
              className="flex items-center gap-1.5 px-3 py-2 text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/80 rounded-xl text-xs font-semibold transition"
              title="Connect External CCTV Camera using IP & Unique Code"
            >
              <Wifi size={15} className="text-cyan-400" />
              <span className="hidden sm:inline">Connect Cam</span>
            </button>
          )}

          {/* Toggle Dedicated Mobile App View (Way 2) */}
          {onToggleMobileView && (
            <button
              onClick={onToggleMobileView}
              className="flex items-center gap-1.5 px-3 py-2 text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/80 rounded-xl text-xs font-semibold transition"
              title="Toggle Native-Style Mobile Smartphone View"
            >
              <Smartphone size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Mobile View</span>
            </button>
          )}

          {/* Direct PWA Install Prompt Button (if browser supports install) */}
          {installPrompt && onInstallApp && (
            <button
              onClick={onInstallApp}
              className="flex items-center gap-1.5 px-3 py-2 text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/80 rounded-xl text-xs font-semibold transition animate-pulse"
              title="Install Smart CCTV Guardian onto this device"
            >
              <Download size={15} className="text-emerald-400" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition"
            title="Configure Camera & Alerts"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
