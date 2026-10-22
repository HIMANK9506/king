import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Download,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Layers
} from 'lucide-react';

interface MobilePairModalProps {
  isOpen: boolean;
  onClose: () => void;
  mobileUrl: string;
  installPrompt: any;
  onInstallApp: () => void;
}

export const MobilePairModal: React.FC<MobilePairModalProps> = ({
  isOpen,
  onClose,
  mobileUrl,
  installPrompt,
  onInstallApp,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'mobile' | 'pc'>('mobile');

  if (!isOpen) return null;

  const resolvedUrl = mobileUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

  const handleCopy = () => {
    navigator.clipboard.writeText(resolvedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Mobile & PC App Setup
                <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full font-mono uppercase">
                  Multi-Platform
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Run Smart CCTV Guardian as an installable app on phones, tablets, or PC
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
        <div className="flex border-b border-neutral-800 bg-neutral-950/30 px-6 pt-3">
          <button
            onClick={() => setActiveTab('mobile')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'mobile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone size={14} />
            Mobile App (Android & iOS)
          </button>
          <button
            onClick={() => setActiveTab('pc')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'pc'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Monitor size={14} />
            PC Desktop App (Electron & PWA)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'mobile' ? (
            <>
              {/* QR Code & Pairing URL Card */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-5">
                <div className="p-3 bg-white rounded-xl shadow-lg shrink-0 flex items-center justify-center">
                  <QRCodeSVG
                    value={resolvedUrl}
                    size={135}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-emerald-400">
                    <Wifi size={14} />
                    <span>Same Wi-Fi Network Connected</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Point your smartphone camera at the QR code to open the live CCTV Guardian monitor instantly on your mobile device.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={resolvedUrl}
                      className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs px-2.5 py-1.5 rounded-lg w-full font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Install instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Android Card */}
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Android App (1-Tap Install)
                  </h4>
                  <ol className="list-decimal list-inside text-neutral-400 space-y-1.5 leading-relaxed">
                    <li>Open link in <strong>Chrome</strong> or <strong>Edge</strong>.</li>
                    <li>Tap the <strong>three dots menu (⋮)</strong> at top right.</li>
                    <li>Select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Launches with its own app icon and zero browser bars!</li>
                  </ol>
                </div>

                {/* iOS Card */}
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    iPhone & iPad (Safari PWA)
                  </h4>
                  <ol className="list-decimal list-inside text-neutral-400 space-y-1.5 leading-relaxed">
                    <li>Scan QR with Camera & open in <strong>Safari</strong>.</li>
                    <li>Tap the <strong>Share button (⎙)</strong> at the bottom.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                    <li>Runs in fullscreen standalone mode with tactical audio!</li>
                  </ol>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* PC Desktop App Options */}
              <div className="space-y-4 text-xs">
                {/* Electron Option */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                      <Monitor size={16} className="text-purple-400" />
                      Option A: Dedicated PC Desktop App (Electron)
                    </h4>
                    <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-800 px-2 py-0.5 rounded-full font-mono">
                      Native Windows App
                    </span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    Runs Smart CCTV Guardian in its own dedicated, native frameless desktop window with hardware acceleration and zero browser toolbars.
                  </p>
                  <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg font-mono text-neutral-300 flex items-center justify-between">
                    <code>npm run desktop</code>
                    <span className="text-[11px] text-neutral-400">Run in terminal</span>
                  </div>
                </div>

                {/* Browser PWA Desktop App */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                      <Layers size={16} className="text-emerald-400" />
                      Option B: Install as Chrome / Edge Desktop App
                    </h4>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                      1-Click PWA
                    </span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    Click the <strong>Install</strong> icon in your browser's address bar (on Chrome, Edge, or Brave) to create a Windows Desktop and Start Menu shortcut.
                  </p>

                  {installPrompt && (
                    <button
                      onClick={onInstallApp}
                      className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      <Download size={15} />
                      <span>Install Smart CCTV Guardian onto this PC</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Encrypted local P2P telemetry stream</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
