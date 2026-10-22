import React, { useState } from 'react';
import { X, UserCheck, UserPlus, Trash2, ShieldCheck, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EnrolledFaceRecord } from '../types';
import { getApiUrl } from '../utils/api';

interface FaceWhitelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  faces: EnrolledFaceRecord[];
  onEnrollFace: (name: string) => Promise<boolean>;
  onDeleteFace: (id: string) => Promise<void>;
}

export const FaceWhitelistModal: React.FC<FaceWhitelistModalProps> = ({
  isOpen,
  onClose,
  faces,
  onEnrollFace,
  onDeleteFace,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a name or role for this person (e.g. Owner, Family).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const ok = await onEnrollFace(name.trim());
      if (ok) {
        setSuccessMsg(`Successfully enrolled ${name.trim()}! Face is now authorized.`);
        setName('');
      } else {
        setErrorMsg('No face was clearly detected in the live camera frame. Look directly into the camera with good lighting and retry.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Face enrollment failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                Authorized Face Whitelist
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  {faces.length} Enrolled
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                AI Deep Learning Face Recognition (YuNet + SFace)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Information Banner */}
          <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-200">Alarm Suppression Enabled:</span>{' '}
              When registered residents or family members are recognized in the camera feed, the AI verifies their identity, lights up a green authorized badge, and suppresses intruder sirens!
            </div>
          </div>

          {/* Enrollment Form */}
          <div className="p-4 bg-neutral-950 border border-neutral-800/90 rounded-xl space-y-3">
            <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={14} className="text-emerald-400" />
              Enroll Face from Current Camera View
            </h3>
            <p className="text-xs text-neutral-400">
              Look directly into your webcam and tap below to extract your 128-dimensional biometric face embedding.
            </p>

            <form onSubmit={handleEnroll} className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Person Name (e.g. Owner, Aravind, Mom)"
                className="flex-1 bg-neutral-900 border border-neutral-700/80 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-900/30"
              >
                <UserPlus size={15} />
                <span>{isSubmitting ? 'Scanning Face...' : 'Enroll Face'}</span>
              </button>
            </form>

            {errorMsg && (
              <div className="p-2.5 bg-red-950/60 border border-red-800/80 text-red-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={15} className="text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* Enrolled Profiles List */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">
              Enrolled Authorized Profiles ({faces.length})
            </h3>

            {faces.length === 0 ? (
              <div className="h-32 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-center p-4 text-neutral-500">
                <UserCheck size={28} className="mb-2 opacity-40 text-neutral-400" />
                <p className="text-xs font-medium text-neutral-300">No Authorized Faces Enrolled</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Type your name above and click "Enroll Face" to register yourself.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {faces.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl flex items-center justify-between gap-3 group hover:border-emerald-500/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                        <img
                          src={getApiUrl(f.thumbnail_url)}
                          alt={f.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(f.name) + '&background=10b981&color=fff';
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                          {f.name}
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                          Enrolled: {f.enrolled_at}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteFace(f.id)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title={`Remove ${f.name} from whitelist`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
