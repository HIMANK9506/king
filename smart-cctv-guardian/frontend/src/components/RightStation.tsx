import React, { useState } from 'react';
import {
  Bell,
  Clock,
  ShieldAlert,
  Zap,
  Film,
  Camera,
  Download,
  Trash2,
  Play,
  Sliders,
  CheckCircle2,
  Users,
  Shield,
  Eye,
  Activity,
  Layers,
  Crosshair
} from 'lucide-react';
import {
  IncidentRecord,
  EventType,
  EventSeverity,
  VideoRecordingItem,
  SecurityRulesConfig,
  SystemMode
} from '../types';
import { getApiUrl } from '../utils/api';

interface RightStationProps {
  incidents: IncidentRecord[];
  recordings: VideoRecordingItem[];
  onSelectSnapshot: (url: string) => void;
  onSelectRecording: (recording: VideoRecordingItem) => void;
  onDeleteRecording: (id: string) => void;
  onTriggerTestAlert: (eventType?: EventType) => void;
  isTriggeringTest: boolean;
  rules?: SecurityRulesConfig;
  onSaveRules: (rules: SecurityRulesConfig) => void;
  mode: SystemMode;
  onModeChange: (mode: SystemMode) => void;
  authorizedFacesCount: number;
  onOpenFacesModal: () => void;
}

export const RightStation: React.FC<RightStationProps> = ({
  incidents,
  recordings,
  onSelectSnapshot,
  onSelectRecording,
  onDeleteRecording,
  onTriggerTestAlert,
  isTriggeringTest,
  rules,
  onSaveRules,
  mode,
  onModeChange,
  authorizedFacesCount,
  onOpenFacesModal,
}) => {
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [mediaTab, setMediaTab] = useState<'SNAPSHOTS' | 'CLIPS'>('SNAPSHOTS');

  // Filtered incidents for top LOGs box
  const filteredIncidents = incidents.filter((inc) => {
    if (logFilter === 'ALL') return true;
    if (logFilter === 'BREACHES') return inc.event_type === 'ZONE_INTRUSION' || inc.event_type === 'BOUNDARY_CROSSING';
    if (logFilter === 'HELD') return inc.event_type === 'HANDHELD_ITEM_DETECTED' || inc.event_type === 'WEAPON_DETECTED';
    if (logFilter === 'POSE') return inc.event_type === 'SUSPICIOUS_POSE';
    return true;
  });

  const getSeverityBadge = (severity: EventSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-600/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-600/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-blue-600/20 text-blue-400 border-blue-500/40';
    }
  };

  const formatEventType = (type: string) => {
    switch (type) {
      case 'ZONE_INTRUSION':
        return 'Zone Breach';
      case 'BOUNDARY_CROSSING':
        return 'Tripwire Line Crossing';
      case 'SUSPICIOUS_LOITERING':
        return 'Suspicious Loitering';
      case 'WEAPON_DETECTED':
        return '🚨 Weapon Detected';
      case 'HANDHELD_ITEM_DETECTED':
        return 'Held Item Detected';
      case 'SUSPICIOUS_POSE':
        return 'Suspicious Pose / Sneaking';
      default:
        return type.replace('_', ' ');
    }
  };

  const handleToggleZone = () => {
    if (!rules) return;
    onSaveRules({
      ...rules,
      zone: { ...rules.zone, enabled: !rules.zone.enabled },
    });
  };

  const handleToggleTripwire = () => {
    if (!rules) return;
    onSaveRules({
      ...rules,
      boundary: { ...rules.boundary, enabled: !rules.boundary.enabled },
    });
  };

  const handleTogglePoseAI = () => {
    if (!rules) return;
    onSaveRules({
      ...rules,
      pose_detection_enabled: !rules.pose_detection_enabled,
    });
  };

  const handleToggleHeldItems = () => {
    if (!rules) return;
    onSaveRules({
      ...rules,
      handheld_detection_enabled: !rules.handheld_detection_enabled,
    });
  };

  const formatClipTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ============================================================ */}
      {/* 1. TOP WIREFRAME BOX: LOGs (Threat & AI Telemetry Stream) */}
      {/* ============================================================ */}
      <div className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-4 flex flex-col shadow-xl flex-1 min-h-[310px] max-h-[350px]">
        {/* LOGs Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <Bell size={14} />
            </div>
            <div>
              <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                LOGS: Event & Threat Stream
              </span>
              <span className="text-[10px] text-neutral-400 ml-1.5 font-mono">
                ({filteredIncidents.length})
              </span>
            </div>
          </div>

          <button
            onClick={() => onTriggerTestAlert('ZONE_INTRUSION')}
            disabled={isTriggeringTest}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 rounded-lg text-xs font-medium transition border border-neutral-700"
            title="Simulate intrusion event"
          >
            <Zap size={12} className="text-amber-400" />
            <span>{isTriggeringTest ? 'Capturing...' : 'Test Alert'}</span>
          </button>
        </div>

        {/* LOGs Filter Pills */}
        <div className="flex gap-1.5 my-2.5 text-[11px] overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'ALL', label: 'All Logs' },
            { id: 'BREACHES', label: 'Breaches' },
            { id: 'HELD', label: 'Held Items' },
            { id: 'POSE', label: 'Poses' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setLogFilter(f.id)}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                logFilter === f.id
                  ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* LOGs Scrollable Event Feed */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
          {filteredIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-center py-8">
              <CheckCircle2 size={32} className="text-neutral-600 mb-2" />
              <p className="text-xs font-semibold text-neutral-400">All Security Sectors Normal</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                AI continuously monitoring all 4 cameras for unauthorized presence.
              </p>
            </div>
          ) : (
            filteredIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-2.5 bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 rounded-xl flex items-center justify-between gap-2 transition group text-xs"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {/* Snapshot Thumbnail Preview */}
                  <div
                    onClick={() => onSelectSnapshot(getApiUrl(inc.snapshot_url))}
                    className="w-12 h-9 rounded-lg bg-black border border-neutral-800 overflow-hidden shrink-0 cursor-pointer hover:border-red-500 transition"
                    title="Click to zoom snapshot evidence"
                  >
                    <img
                      src={getApiUrl(inc.snapshot_url)}
                      alt="Evidence"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-neutral-200 truncate">
                        {formatEventType(inc.event_type)}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold ${getSeverityBadge(
                          inc.severity
                        )}`}
                      >
                        {inc.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5 font-mono">
                      <span>{inc.timestamp.slice(11, 19)}</span>
                      <span>&bull;</span>
                      <span className="text-neutral-500">{inc.camera_name}</span>
                      {inc.held_item_name && (
                        <span className="text-cyan-400 font-semibold truncate">
                          [{inc.held_item_name}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectSnapshot(getApiUrl(inc.snapshot_url))}
                  className="p-1 text-neutral-500 hover:text-white rounded transition"
                  title="View Snapshot"
                >
                  <Eye size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. BOTTOM WIREFRAME SPLIT: Left (Snapshots) + Right (Controls) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* ========================================================== */}
        {/* BOTTOM-LEFT BOX: Snapshots and Records */}
        {/* ========================================================== */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-3.5 flex flex-col shadow-xl min-h-[260px]">
          {/* Header & Tabs */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2.5">
            <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
              <button
                onClick={() => setMediaTab('SNAPSHOTS')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition ${
                  mediaTab === 'SNAPSHOTS'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Camera size={11} />
                <span>Snapshots</span>
              </button>

              <button
                onClick={() => setMediaTab('CLIPS')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition ${
                  mediaTab === 'CLIPS'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Film size={11} />
                <span>Clips ({recordings.length})</span>
              </button>
            </div>

            <span className="text-[10px] text-neutral-500 font-mono">EVIDENCE</span>
          </div>

          {/* Media Content */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
            {mediaTab === 'SNAPSHOTS' ? (
              incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-center py-6 text-[11px]">
                  <Camera size={24} className="text-neutral-600 mb-1.5" />
                  <span>No security snapshot captures yet</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {incidents.slice(0, 6).map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => onSelectSnapshot(getApiUrl(inc.snapshot_url))}
                      className="group relative rounded-lg overflow-hidden border border-neutral-800 hover:border-cyan-500/60 aspect-video cursor-pointer bg-black"
                    >
                      <img
                        src={getApiUrl(inc.snapshot_url)}
                        alt="Evidence"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1 text-[9px] font-mono text-neutral-300 truncate">
                        {inc.timestamp.slice(11, 19)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : recordings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-center py-6 text-[11px]">
                <Film size={24} className="text-neutral-600 mb-1.5" />
                <span>No Sentinel video recordings</span>
              </div>
            ) : (
              recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between text-xs group"
                >
                  <div
                    onClick={() => onSelectRecording(rec)}
                    className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden"
                  >
                    <div className="p-1 rounded bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white transition">
                      <Play size={12} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[11px] font-semibold text-neutral-200 truncate">
                        {rec.triggerEvent || 'Live Recording'}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-mono">
                        {formatClipTime(rec.durationSec)} &bull; {(rec.sizeBytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={rec.blobUrl}
                      download={`cctv-${rec.id}.webm`}
                      className="p-1 text-neutral-400 hover:text-white transition"
                      title="Download Clip"
                    >
                      <Download size={12} />
                    </a>
                    <button
                      onClick={() => onDeleteRecording(rec.id)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition"
                      title="Delete Clip"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========================================================== */}
        {/* BOTTOM-RIGHT BOX: Controls & Rules */}
        {/* ========================================================== */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-3.5 flex flex-col shadow-xl min-h-[260px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sliders size={13} className="text-cyan-400" />
              <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                Controls & Rules
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">TACTICAL PAD</span>
          </div>

          {/* System Mode Pills */}
          <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 mb-3 text-[11px] font-semibold">
            <button
              onClick={() => onModeChange('ARMED')}
              className={`py-1 rounded-lg transition text-center ${
                mode === 'ARMED'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ARMED
            </button>
            <button
              onClick={() => onModeChange('NIGHT_MODE')}
              className={`py-1 rounded-lg transition text-center ${
                mode === 'NIGHT_MODE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              NIGHT
            </button>
            <button
              onClick={() => onModeChange('DISARMED')}
              className={`py-1 rounded-lg transition text-center ${
                mode === 'DISARMED'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              DISARM
            </button>
          </div>

          {/* Tactical Switches List */}
          <div className="flex-1 space-y-1.5 text-xs">
            {/* Restricted Zone Switch */}
            <div className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded-lg border border-neutral-800/80">
              <div className="flex items-center gap-1.5">
                <Crosshair size={13} className="text-amber-400" />
                <span className="text-neutral-300 text-[11px]">Restricted Zone</span>
              </div>
              <button
                onClick={handleToggleZone}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  rules?.zone?.enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                }`}
              >
                {rules?.zone?.enabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* Perimeter Tripwire Switch */}
            <div className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded-lg border border-neutral-800/80">
              <div className="flex items-center gap-1.5">
                <Layers size={13} className="text-cyan-400" />
                <span className="text-neutral-300 text-[11px]">Perimeter Tripwire</span>
              </div>
              <button
                onClick={handleToggleTripwire}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  rules?.boundary?.enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                }`}
              >
                {rules?.boundary?.enabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* AI Pose / Sneak Analysis */}
            <div className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded-lg border border-neutral-800/80">
              <div className="flex items-center gap-1.5">
                <Activity size={13} className="text-purple-400" />
                <span className="text-neutral-300 text-[11px]">AI Pose / Sneak</span>
              </div>
              <button
                onClick={handleTogglePoseAI}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  rules?.pose_detection_enabled !== false
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                }`}
              >
                {rules?.pose_detection_enabled !== false ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* Handheld Item / Weapon Filter */}
            <div className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded-lg border border-neutral-800/80">
              <div className="flex items-center gap-1.5">
                <Eye size={13} className="text-blue-400" />
                <span className="text-neutral-300 text-[11px]">Weapon/Item Scan</span>
              </div>
              <button
                onClick={handleToggleHeldItems}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  rules?.handheld_detection_enabled !== false
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                }`}
              >
                {rules?.handheld_detection_enabled !== false ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* Resident Whitelist */}
            <div className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded-lg border border-neutral-800/80">
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-emerald-400" />
                <span className="text-neutral-300 text-[11px]">Resident Faces</span>
              </div>
              <button
                onClick={onOpenFacesModal}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
              >
                {authorizedFacesCount} Profiles &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
