import React, { useState } from 'react';
import {
  Bell,
  Clock,
  ShieldAlert,
  ExternalLink,
  Zap,
  Filter,
  Film,
  Play,
  Download,
  Trash2
} from 'lucide-react';
import { IncidentRecord, EventType, EventSeverity, VideoRecordingItem } from '../types';
import { getApiUrl } from '../utils/api';

interface IncidentLogProps {
  incidents: IncidentRecord[];
  recordings: VideoRecordingItem[];
  onSelectSnapshot: (url: string) => void;
  onSelectRecording: (recording: VideoRecordingItem) => void;
  onDeleteRecording: (id: string) => void;
  onTriggerTestAlert: (eventType?: EventType) => void;
  isTriggeringTest: boolean;
}

export const IncidentLog: React.FC<IncidentLogProps> = ({
  incidents,
  recordings,
  onSelectSnapshot,
  onSelectRecording,
  onDeleteRecording,
  onTriggerTestAlert,
  isTriggeringTest,
}) => {
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'RECORDINGS'>('INCIDENTS');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    if (filterType === 'ALL') return true;
    return inc.event_type === filterType;
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
        return 'Restricted Zone Breach';
      case 'BOUNDARY_CROSSING':
        return 'Tripwire Line Crossing';
      case 'SUSPICIOUS_LOITERING':
        return 'Suspicious Loitering';
      case 'REPEATED_APPROACH':
        return 'Repeated Approach';
      case 'WEAPON_DETECTED':
        return '🚨 Weapon Detected';
      case 'HANDHELD_ITEM_DETECTED':
        return 'Handheld Object Detected';
      default:
        return type.replace('_', ' ');
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col h-full max-h-[720px] shadow-xl">
      {/* Header & Main Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('INCIDENTS')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'INCIDENTS'
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bell size={13} />
            <span>Incidents ({incidents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('RECORDINGS')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'RECORDINGS'
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Film size={13} />
            <span>Recordings ({recordings.length})</span>
          </button>
        </div>

        {/* Test Alert Trigger */}
        <div className="relative group">
          <button
            onClick={() => onTriggerTestAlert('ZONE_INTRUSION')}
            disabled={isTriggeringTest}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 rounded-lg text-xs font-medium transition border border-neutral-700/60"
            title="Simulate intrusion event"
          >
            <Zap size={13} className="text-amber-400" />
            <span className="hidden sm:inline">{isTriggeringTest ? 'Capturing...' : 'Test Alert'}</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: INCIDENTS ===================== */}
      {activeTab === 'INCIDENTS' && (
        <>
          {/* Subfilter Tabs */}
          <div className="flex gap-1.5 mt-3 pb-2 overflow-x-auto text-[11px] scrollbar-none">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filterType === 'ALL'
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({incidents.length})
            </button>
            <button
              onClick={() => setFilterType('ZONE_INTRUSION')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filterType === 'ZONE_INTRUSION'
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Zone Breaches
            </button>
            <button
              onClick={() => setFilterType('HANDHELD_ITEM_DETECTED')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filterType === 'HANDHELD_ITEM_DETECTED'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Items & Weapons
            </button>
            <button
              onClick={() => setFilterType('SUSPICIOUS_LOITERING')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filterType === 'SUSPICIOUS_LOITERING'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Loitering
            </button>
          </div>

          {/* Incidents List */}
          <div className="flex-1 overflow-y-auto mt-2 space-y-2.5 pr-1 custom-scrollbar">
            {filteredIncidents.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                <ShieldAlert size={36} className="mb-2 opacity-30 text-neutral-400" />
                <p className="text-xs font-medium text-neutral-400">No Events Logged</p>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
                  When an intrusion rule triggers or an object is held, an evidence card will appear here.
                </p>
              </div>
            ) : (
              filteredIncidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => onSelectSnapshot(getApiUrl(incident.snapshot_url))}
                  className="group p-2.5 bg-neutral-950/70 hover:bg-neutral-950 border border-neutral-800/80 hover:border-red-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-neutral-800 shrink-0 bg-neutral-900">
                      <img
                        src={getApiUrl(incident.snapshot_url)}
                        alt="Intruder Snapshot"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-red-600/10 group-hover:bg-transparent transition-colors" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${getSeverityBadge(
                            incident.severity
                          )}`}
                        >
                          {incident.severity}
                        </span>
                        <p className="text-xs font-semibold text-white group-hover:text-red-400 transition-colors">
                          {formatEventType(incident.event_type)}
                        </p>
                      </div>

                      <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-1">
                        <Clock size={11} />
                        <span>{incident.timestamp}</span>
                        {incident.track_id && (
                          <span className="text-[10px] text-neutral-500 ml-1">
                            (Track #{incident.track_id})
                          </span>
                        )}
                      </p>

                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {incident.details} • Conf: {(incident.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="text-neutral-500 group-hover:text-red-400 p-1.5 rounded-lg transition-colors">
                    <ExternalLink size={14} />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ===================== TAB 2: VIDEO RECORDINGS (SENTINEL) ===================== */}
      {activeTab === 'RECORDINGS' && (
        <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 pr-1 custom-scrollbar">
          {recordings.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <Film size={36} className="mb-2 opacity-30 text-neutral-400" />
              <p className="text-xs font-medium text-neutral-400">No Video Clips Recorded</p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
                Click <strong>● Record</strong> on the live feed, or let the AI automatically capture 8-second clips upon intrusion!
              </p>
            </div>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.id}
                onClick={() => onSelectRecording(rec)}
                className="group p-2.5 bg-neutral-950/70 hover:bg-neutral-950 border border-neutral-800/80 hover:border-red-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-neutral-800 shrink-0 bg-neutral-900 flex items-center justify-center">
                    <Film size={22} className="text-neutral-500 group-hover:text-red-400 transition" />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono px-1 rounded text-neutral-300">
                      {formatTime(rec.durationSec)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase bg-red-950 text-red-300 border-red-800">
                        {rec.triggerEvent?.includes('Auto') ? 'AUTO-CLIP' : 'MANUAL'}
                      </span>
                      <p className="text-xs font-semibold text-white group-hover:text-red-400 transition-colors">
                        {rec.triggerEvent || 'CCTV Video Clip'}
                      </p>
                    </div>

                    <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-1">
                      <Clock size={11} />
                      <span>{new Date(rec.createdAt).toLocaleTimeString()}</span>
                      <span className="text-neutral-500 text-[10px] ml-1">
                        ({formatBytes(rec.sizeBytes)})
                      </span>
                    </p>

                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {rec.cameraName} • {rec.durationSec}s duration
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-neutral-500 group-hover:text-white">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecording(rec);
                    }}
                    className="p-1.5 hover:bg-neutral-800 rounded-lg text-red-400"
                    title="Play Video"
                  >
                    <Play size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRecording(rec.id);
                    }}
                    className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-red-400"
                    title="Delete clip"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
