import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Wifi,
  ShieldCheck,
  Check,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Tv,
  Key,
  Globe,
  RefreshCw,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { CameraChannelInfo, CameraConnectRequest, SystemDeviceCodeInfo } from '../types';
import { getApiUrl } from '../utils/api';

interface ConnectCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: CameraChannelInfo[];
  onCameraConnected?: () => void;
}

export const ConnectCameraModal: React.FC<ConnectCameraModalProps> = ({
  isOpen,
  onClose,
  cameras,
  onCameraConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'ADD_CAMERA' | 'PAIR_DEVICE'>('ADD_CAMERA');

  // Add Camera form state
  const [channelId, setChannelId] = useState<number>(1);
  const [cameraName, setCameraName] = useState<string>('Perimeter IP Camera');
  const [ipAddress, setIpAddress] = useState<string>('192.168.1.120');
  const [port, setPort] = useState<number>(554);
  const [uniqueCode, setUniqueCode] = useState<string>('admin123');
  const [protocol, setProtocol] = useState<'RTSP' | 'HTTP_MJPEG' | 'CUSTOM'>('RTSP');
  const [streamPath, setStreamPath] = useState<string>('h264Preview_01_main');
  const [username, setUsername] = useState<string>('admin');

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Device Code state (Way 3)
  const [deviceInfo, setDeviceInfo] = useState<SystemDeviceCodeInfo | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Verification test
  const [inputVerifyCode, setInputVerifyCode] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  const fetchDeviceInfo = async () => {
    try {
      const res = await fetch(getApiUrl('/api/system/device-code'));
      if (res.ok) {
        const data: SystemDeviceCodeInfo = await res.json();
        setDeviceInfo(data);
      }
    } catch (e) {
      // Backend starting or offline
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeviceInfo();
      setTestResult(null);
      setVerifyStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const payload: CameraConnectRequest = {
      channel_id: channelId,
      ip_address: ipAddress,
      port: Number(port),
      unique_code: uniqueCode,
      camera_name: cameraName,
      protocol: protocol,
      stream_path: streamPath || undefined,
      username: username || 'admin',
    };

    try {
      const res = await fetch(getApiUrl('/api/cameras/connect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: data.success,
          message: data.message,
        });
        if (onCameraConnected) {
          onCameraConnected();
        }
      } else {
        const err = await res.json().catch(() => null);
        setTestResult({
          success: false,
          message: err?.detail || 'Failed to establish camera stream connection.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Network error or backend unreachable.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async (cid: number) => {
    try {
      await fetch(getApiUrl(`/api/cameras/disconnect/${cid}`), { method: 'POST' });
      if (onCameraConnected) {
        onCameraConnected();
      }
    } catch (e) {
      console.error('Failed to disconnect camera channel', e);
    }
  };

  const handleCopyCode = () => {
    if (deviceInfo?.device_code) {
      navigator.clipboard.writeText(deviceInfo.device_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    if (deviceInfo?.web_url) {
      navigator.clipboard.writeText(deviceInfo.web_url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleTestVerifyCode = async () => {
    if (!inputVerifyCode) return;
    try {
      const res = await fetch(getApiUrl('/api/system/verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputVerifyCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerifyStatus(data.verified ? 'VERIFIED' : 'FAILED');
      }
    } catch (e) {
      setVerifyStatus('FAILED');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wifi size={18} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Network Camera & IP Connection System</h2>
              <p className="text-xs text-neutral-400">
                Connect external CCTV cameras using IP address & unique verification code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('ADD_CAMERA')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'ADD_CAMERA'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Tv size={13} />
            <span>1. Connect IP / CCTV Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('PAIR_DEVICE')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'PAIR_DEVICE'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Key size={13} />
            <span>2. NVR Station Unique Code</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'ADD_CAMERA' ? (
            <form onSubmit={handleConnectCamera} className="space-y-4">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Select NVR Target Channel
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setChannelId(id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition flex flex-col items-center gap-0.5 ${
                        channelId === id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span>CAM 0{id}</span>
                      <span className="text-[10px] font-normal text-neutral-500">
                        {id === 1 ? 'Primary AI' : 'Channel'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Name & Protocol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Camera Display Name
                  </label>
                  <input
                    type="text"
                    value={cameraName}
                    onChange={(e) => setCameraName(e.target.value)}
                    required
                    placeholder="e.g. Backyard PTZ Camera"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Stream Protocol
                  </label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-sans"
                  >
                    <option value="RTSP">RTSP (Real-Time Streaming Protocol - CCTV Standard)</option>
                    <option value="HTTP_MJPEG">HTTP / MJPEG Network Camera</option>
                    <option value="CUSTOM">Direct Stream URL</option>
                  </select>
                </div>
              </div>

              {/* IP Address & Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Camera IP Address / Hostname
                  </label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    required
                    placeholder="e.g. 192.168.1.120"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Unique Code / Verification Password & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Unique Device Code / Security Password
                  </label>
                  <input
                    type="password"
                    value={uniqueCode}
                    onChange={(e) => setUniqueCode(e.target.value)}
                    placeholder="e.g. SEC-8821-X9 or admin password"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Found on camera sticker, ONVIF verification code, or RTSP pass.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Stream Path (Optional)
                  </label>
                  <input
                    type="text"
                    value={streamPath}
                    onChange={(e) => setStreamPath(e.target.value)}
                    placeholder="e.g. h264Preview_01_main or live.sdp"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Default RTSP sub-channel or MJPEG endpoint.
                  </p>
                </div>
              </div>

              {/* Test / Feedback Alert Banner */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{testResult.success ? 'Camera Verified!' : 'Notice'}</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{testResult.message}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-600/30"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Probing IP Stream...</span>
                    </>
                  ) : (
                    <>
                      <Wifi size={13} />
                      <span>Bind Camera to CAM 0{channelId}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================== */
            /* TAB 2: NVR Station Unique Device Code (Way 3 Remote Access) */
            /* ========================================================== */
            <div className="space-y-4">
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                    Station Unique Verification Code
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                    ONLINE &bull; 4 CHANNELS
                  </span>
                </div>

                <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded-xl">
                  <span className="font-mono text-xl sm:text-2xl font-extrabold text-cyan-400 tracking-wider">
                    {deviceInfo?.device_code || 'GRD-4212-BC38'}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Enter this unique code in any remote web browser or mobile client to pair with this NVR.
                </p>
              </div>

              {/* Direct Web Station URL */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                  Local Network Access URL
                </span>
                <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl font-mono text-xs">
                  <span className="text-neutral-200 truncate pr-2">
                    {deviceInfo?.web_url || 'http://192.168.31.109:5173'}
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    className="p-1.5 text-neutral-400 hover:text-white rounded transition shrink-0"
                    title="Copy URL"
                  >
                    {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {/* Test Code Verification Box */}
              <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-neutral-300">
                  Test Remote Code Verification
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputVerifyCode}
                    onChange={(e) => setInputVerifyCode(e.target.value)}
                    placeholder="Enter Unique Code to test handshake..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                  />
                  <button
                    onClick={handleTestVerifyCode}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Verify Handshake
                  </button>
                </div>
                {verifyStatus === 'VERIFIED' && (
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Unique Code verified! Access granted.
                  </p>
                )}
                {verifyStatus === 'FAILED' && (
                  <p className="text-xs text-red-400 font-semibold flex items-center gap-1">
                    <AlertTriangle size={13} /> Code mismatch. Check code above.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
