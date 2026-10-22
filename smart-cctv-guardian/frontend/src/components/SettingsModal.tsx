import React, { useState } from 'react';
import { X, Camera, Mail, Shield, Save, Check, Sliders } from 'lucide-react';
import { SecurityRulesConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSource: string;
  currentName: string;
  emailEnabled: boolean;
  currentRules?: SecurityRulesConfig;
  onSaveCamera: (source: string, name: string) => Promise<void>;
  onSaveEmail: (enable: boolean, recipient: string, sender: string, pass: string) => Promise<void>;
  onSaveRules: (rules: SecurityRulesConfig) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSource,
  currentName,
  emailEnabled,
  currentRules,
  onSaveCamera,
  onSaveEmail,
  onSaveRules,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'rules' | 'alerts'>('rules');

  const [source, setSource] = useState(currentSource);
  const [name, setName] = useState(currentName);
  const [enableEmail, setEnableEmail] = useState(emailEnabled);
  const [recipient, setRecipient] = useState('');
  const [sender, setSender] = useState('');
  const [password, setPassword] = useState('');

  // Rules state
  const [zoneEnabled, setZoneEnabled] = useState(currentRules?.zone?.enabled ?? true);
  const [boundaryEnabled, setBoundaryEnabled] = useState(currentRules?.boundary?.enabled ?? true);
  const [loiterSec, setLoiterSec] = useState(currentRules?.loitering_threshold_sec ?? 5.0);
  const [petFilter, setPetFilter] = useState(currentRules?.pet_filtering_enabled ?? true);
  const [poseEnabled, setPoseEnabled] = useState(currentRules?.pose_detection_enabled ?? true);
  const [faceEnabled, setFaceEnabled] = useState(currentRules?.face_recognition_enabled ?? true);
  const [suppressAuthorized, setSuppressAuthorized] = useState(currentRules?.suppress_authorized_faces ?? true);

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const applyZonePreset = (type: 'doorway' | 'gate' | 'full') => {
    setZoneEnabled(true);
  };

  const handleSave = async () => {
    await onSaveCamera(source, name);
    
    if (recipient || sender) {
      await onSaveEmail(enableEmail, recipient, sender, password);
    }

    if (currentRules) {
      const updatedRules: SecurityRulesConfig = {
        ...currentRules,
        zone: {
          ...currentRules.zone,
          enabled: zoneEnabled,
        },
        boundary: {
          ...currentRules.boundary,
          enabled: boundaryEnabled,
        },
        loitering_threshold_sec: loiterSec,
        pet_filtering_enabled: petFilter,
        pose_detection_enabled: poseEnabled,
        face_recognition_enabled: faceEnabled,
        suppress_authorized_faces: suppressAuthorized,
      };
      await onSaveRules(updatedRules);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg transition"
        >
          <X size={18} />
        </button>

        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
          Surveillance Engine Settings
        </h2>
        <p className="text-xs text-neutral-400 mb-4">
          Configure security rules, restricted zones, and stream endpoints.
        </p>

        {/* Tab Switcher */}
        <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 mb-4">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'rules' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Security Rules
          </button>
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'camera' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Video Sources
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'alerts' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Alerts
          </button>
        </div>

        {/* TAB 1: SECURITY RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {/* Restricted Zone */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Shield size={14} className="text-red-400" />
                  <span>Restricted Zone Detection</span>
                </div>
                <input
                  type="checkbox"
                  checked={zoneEnabled}
                  onChange={(e) => setZoneEnabled(e.target.checked)}
                  className="rounded bg-neutral-900 border-neutral-700 text-red-600 focus:ring-0"
                />
              </div>
              <p className="text-[11px] text-neutral-400">
                Detects when a tracked human enters the configured doorway/restricted area.
              </p>
            </div>

            {/* Virtual Tripwire */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Sliders size={14} className="text-amber-400" />
                  <span>Virtual Tripwire Boundary</span>
                </div>
                <input
                  type="checkbox"
                  checked={boundaryEnabled}
                  onChange={(e) => setBoundaryEnabled(e.target.checked)}
                  className="rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0"
                />
              </div>
              <p className="text-[11px] text-neutral-400">
                Detects when a person's trajectory line crosses the virtual perimeter line.
              </p>
            </div>

            {/* Loitering Timer */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
                <span>Loitering Dwell Threshold</span>
                <span className="font-mono text-purple-400">{loiterSec}s</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="15.0"
                step="1.0"
                value={loiterSec}
                onChange={(e) => setLoiterSec(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <p className="text-[10px] text-neutral-500">
                Triggers a loitering event if a person dwells inside the zone longer than this duration.
              </p>
            </div>

            {/* Pet Filter */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">Pet & Animal Filter</span>
                <span className="text-[11px] text-neutral-400">Suppresses alarms for dogs and cats.</span>
              </div>
              <input
                type="checkbox"
                checked={petFilter}
                onChange={(e) => setPetFilter(e.target.checked)}
                className="rounded bg-neutral-900 border-neutral-700 text-blue-600 focus:ring-0"
              />
            </div>

            {/* AI Human Pose & Behavior (Option 2) */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">AI Pose & Behavior Analysis</span>
                <span className="text-[11px] text-neutral-400">Detects hands raised, crawling/crouching, and fall hazards via 17 keypoints.</span>
              </div>
              <input
                type="checkbox"
                checked={poseEnabled}
                onChange={(e) => setPoseEnabled(e.target.checked)}
                className="rounded bg-neutral-900 border-neutral-700 text-purple-600 focus:ring-0"
              />
            </div>

            {/* AI Facial Recognition (Option 3) */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">AI Facial Recognition</span>
                <span className="text-[11px] text-neutral-400">Identifies authorized family members vs unknown intruders using YuNet + SFace.</span>
              </div>
              <input
                type="checkbox"
                checked={faceEnabled}
                onChange={(e) => setFaceEnabled(e.target.checked)}
                className="rounded bg-neutral-900 border-neutral-700 text-emerald-600 focus:ring-0"
              />
            </div>

            {/* Suppress Alarms for Authorized Residents */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-300 block">Resident Alarm Suppression</span>
                <span className="text-[11px] text-neutral-400">Automatically suppress sirens & zone breach alarms when recognized residents walk by.</span>
              </div>
              <input
                type="checkbox"
                checked={suppressAuthorized}
                onChange={(e) => setSuppressAuthorized(e.target.checked)}
                className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0"
              />
            </div>
          </div>
        )}

        {/* TAB 2: CAMERA SOURCES */}
        {activeTab === 'camera' && (
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
              <Camera size={14} className="text-blue-400" />
              <span>Camera Stream Source</span>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Preset Cameras</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setSource('0'); setName('Integrated Laptop Webcam (CAM-00)'); }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                    source === '0'
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Webcam (0)
                </button>
                <button
                  type="button"
                  onClick={() => { setSource('1'); setName('Secondary / USB Cam (CAM-01)'); }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                    source === '1'
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Webcam (1)
                </button>
                <button
                  type="button"
                  onClick={() => { setSource('SIMULATED'); setName('Synthetic CCTV Simulation'); }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                    source === 'SIMULATED'
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Synthetic Feed
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Device Index or RTSP Stream URL</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="0 or rtsp://admin:pass@ip:port/stream"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* TAB 3: EMAIL ALERTS */}
        {activeTab === 'alerts' && (
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                <Mail size={14} className="text-red-400" />
                <span>Gmail SMTP Notifications</span>
              </div>
              <input
                type="checkbox"
                checked={enableEmail}
                onChange={(e) => setEnableEmail(e.target.checked)}
                className="rounded bg-neutral-900 border-neutral-700 text-red-600 focus:ring-0"
              />
            </div>

            {enableEmail && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Recipient Alert Email</label>
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="security@yourdomain.com"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Gmail Sender Address</label>
                  <input
                    type="email"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="cctv.alerts@gmail.com"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Google App Password (16 chars)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-red-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-5 flex items-center justify-between">
          {savedSuccess ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <Check size={14} /> Settings Saved & Active!
            </span>
          ) : <span />}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-lg transition shadow-md shadow-red-600/30"
            >
              <Save size={13} />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
