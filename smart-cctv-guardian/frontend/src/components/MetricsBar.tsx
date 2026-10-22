import React from 'react';
import { Zap, Shield, Bell, Users, UserCheck, Activity } from 'lucide-react';
import { SystemStatus } from '../types';

interface MetricsBarProps {
  status: SystemStatus | null;
  totalIncidents: number;
  onOpenFacesModal?: () => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ status, totalIncidents, onOpenFacesModal }) => {
  const isAuthorized = !!status?.recognized_person_name;
  const isSuspiciousBehavior =
    status?.detected_behavior &&
    ['HANDS_RAISED', 'CROUCHING_OR_SNEAKING', 'FALL_DETECTED'].includes(status.detected_behavior);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Metric 1: Inference Latency */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-xl flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <Zap size={16} />
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium block truncate">AI Latency</span>
          <p className="text-sm sm:text-base font-bold text-white font-mono truncate">
            {status?.inference_latency_ms ? `${status.inference_latency_ms} ms` : '~48 ms'}
          </p>
        </div>
      </div>

      {/* Metric 2: Multi-Object Tracks */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-xl flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
          <Users size={16} />
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium block truncate">Subjects</span>
          <p className="text-sm sm:text-base font-bold text-blue-400 font-mono truncate">
            {status?.tracked_persons_count ? `${status.tracked_persons_count} Person(s)` : '0 Active'}
          </p>
        </div>
      </div>

      {/* Metric 3: AI Face Recognition (Option 3) */}
      <div
        onClick={onOpenFacesModal}
        className="bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 p-3 rounded-xl flex items-center gap-2.5 cursor-pointer transition group"
        title="Click to manage authorized resident faces"
      >
        <div className={`p-2 rounded-lg border shrink-0 transition ${
          isAuthorized
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
            : (status?.person_in_frame && !isAuthorized)
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
        }`}>
          <UserCheck size={16} />
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium block truncate">AI Identity</span>
          <p className="text-xs sm:text-sm font-bold truncate">
            {isAuthorized ? (
              <span className="text-emerald-400">🟢 {status?.recognized_person_name}</span>
            ) : status?.person_in_frame ? (
              <span className="text-red-400">🚨 Unknown Subject</span>
            ) : (
              <span className="text-neutral-300 font-mono">{status?.authorized_faces_count || 0} Whitelisted</span>
            )}
          </p>
        </div>
      </div>

      {/* Metric 4: AI Pose & Behavior (Option 2) */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-xl flex items-center gap-2.5">
        <div className={`p-2 rounded-lg border shrink-0 ${
          isSuspiciousBehavior
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        }`}>
          <Activity size={16} />
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium block truncate">AI Pose / Posture</span>
          <p className={`text-xs sm:text-sm font-bold truncate ${
            isSuspiciousBehavior ? 'text-amber-400' : 'text-neutral-200'
          }`}>
            {status?.detected_behavior ? status.detected_behavior.replace('_', ' ') : 'Standing (Upright)'}
          </p>
        </div>
      </div>

      {/* Metric 5: Total Breaches */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-xl flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
          <Bell size={16} />
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium block truncate">Security Alerts</span>
          <p className="text-sm sm:text-base font-bold text-red-400 font-mono truncate">
            {totalIncidents} Logged
          </p>
        </div>
      </div>
    </div>
  );
};
