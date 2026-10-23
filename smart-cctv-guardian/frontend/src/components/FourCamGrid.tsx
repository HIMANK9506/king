import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Maximize2, ShieldAlert, Radio, ArrowLeft, Clock } from 'lucide-react';
import { CameraChannelInfo } from '../types';
import { getApiUrl } from '../utils/api';
import { VirtualCctvCanvas } from '../utils/virtualCanvas';

interface FourCamGridProps {
  cameras: CameraChannelInfo[];
  onSelectCamera: (id: number) => void;
  onExitGridView: () => void;
  personInFrame: boolean;
  activePresenceSec: number;
  isAlarmTriggered: boolean;
  browserStream?: MediaStream | null;
  mirrorFeed?: boolean;
}

const GridCamCard: React.FC<{
  cam: CameraChannelInfo;
  isCam1Alarm: boolean;
  timeStr: string;
  onSelect: () => void;
  browserStream?: MediaStream | null;
  mirrorFeed?: boolean;
}> = ({ cam, isCam1Alarm, timeStr, onSelect, browserStream, mirrorFeed }) => {
  const [imgError, setImgError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (cam.id === 1 && browserStream && videoRef.current) {
      videoRef.current.srcObject = browserStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cam.id, browserStream]);

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl overflow-hidden border bg-neutral-950 aspect-video cursor-pointer transition shadow-xl ${
        isCam1Alarm
          ? 'border-red-600 ring-2 ring-red-600/60 shadow-red-950/60'
          : 'border-neutral-800 hover:border-cyan-500/70 hover:shadow-cyan-950/40'
      }`}
      title={`Click to switch to CAM 0${cam.id} Main Stage`}
    >
      {/* Live Video Feed / Stream */}
      {cam.id === 1 && browserStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain select-none ${mirrorFeed ? 'scale-x-[-1]' : ''}`}
        />
      ) : !imgError ? (
        <img
          src={getApiUrl(`/api/feed?cam=${cam.id}`)}
          alt={cam.name}
          className="w-full h-full object-contain select-none"
          onError={() => setImgError(true)}
        />
      ) : (
        <VirtualCctvCanvas
          channelId={cam.id}
          bitrate={cam.bitrate_kbps || 295}
          className="w-full h-full object-contain select-none"
        />
      )}

      {/* Tactical Corner Brackets */}
      <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-500/60 pointer-events-none z-10" />
      <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-500/60 pointer-events-none z-10" />
      <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-500/60 pointer-events-none z-10" />
      <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-500/60 pointer-events-none z-10" />

      {/* Top-Left OSD: Channel Label */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-1 rounded-md border border-neutral-800 text-[11px] font-mono font-bold z-10">
        <span
          className={`w-2 h-2 rounded-full ${
            isCam1Alarm ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'
          }`}
        />
        <span className="text-white">CAM 0{cam.id}</span>
        <span className="text-neutral-400 font-normal hidden md:inline">
          {cam.name.replace(/^CAM \d+ - /, '')}
        </span>
      </div>

      {/* Top-Right OSD: Live Bitrate & Timestamp */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        {isCam1Alarm && (
          <div className="flex items-center gap-1 bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px] animate-pulse">
            <ShieldAlert size={11} /> BREACH
          </div>
        )}
        <div className="bg-black/75 backdrop-blur-md px-2 py-1 rounded-md border border-neutral-800 text-[10px] font-mono flex items-center gap-1.5">
          <span className="text-emerald-400 font-semibold">{cam.bitrate_kbps || 295} KB/s</span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-200">{timeStr}</span>
        </div>
      </div>

      {/* Hover Fullscreen Prompt Banner */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none z-20">
        <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md border border-cyan-500/50 rounded-lg text-cyan-300 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
          <Maximize2 size={13} />
          <span>Click to Focus Stage</span>
        </div>
      </div>
    </div>
  );
};

export const FourCamGrid: React.FC<FourCamGridProps> = ({
  cameras,
  onSelectCamera,
  onExitGridView,
  personInFrame,
  activePresenceSec,
  isAlarmTriggered,
  browserStream,
  mirrorFeed = true,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const day = pad(now.getDate());
      const month = pad(now.getMonth() + 1);
      const year = now.getFullYear();
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      setTimeStr(`${day}/${month}/${year} ${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const defaultCameras: CameraChannelInfo[] = [
    { id: 1, name: 'CAM 01 - Main Entrance', location: 'Front Gate', status: 'ONLINE', bitrate_kbps: 297, fps: 30, active_breach: isAlarmTriggered },
    { id: 2, name: 'CAM 02 - Backyard Perimeter', location: 'Perimeter Fence', status: 'ONLINE', bitrate_kbps: 312, fps: 15 },
    { id: 3, name: 'CAM 03 - Front Porch / Entry', location: 'Doorway & Walkway', status: 'ONLINE', bitrate_kbps: 284, fps: 15 },
    { id: 4, name: 'CAM 04 - Driveway & Street', location: 'Vehicle Access', status: 'ONLINE', bitrate_kbps: 305, fps: 15 },
  ];

  const camList = cameras && cameras.length >= 4 ? cameras.slice(0, 4) : defaultCameras;

  return (
    <div className="flex flex-col gap-3">
      {/* Top Multi-View Action Bar */}
      <div className="flex items-center justify-between p-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <LayoutGrid size={15} />
          </div>
          <div>
            <span className="font-bold text-white text-xs sm:text-sm tracking-wide">
              4-CHANNEL SYNCHRONOUS NVR MULTI-VIEW
            </span>
            <span className="text-[11px] text-neutral-400 hidden sm:inline ml-2">
              (Live Synchronized OSD Feeds — Click any camera to focus)
            </span>
          </div>
        </div>

        <button
          onClick={onExitGridView}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition border border-neutral-700 shadow-sm"
        >
          <ArrowLeft size={13} />
          <span>Single Stage View</span>
        </button>
      </div>

      {/* 2x2 Quadrant Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {camList.map((cam) => (
          <GridCamCard
            key={cam.id}
            cam={cam}
            isCam1Alarm={cam.id === 1 && isAlarmTriggered}
            timeStr={timeStr}
            onSelect={() => onSelectCamera(cam.id)}
            browserStream={browserStream}
            mirrorFeed={mirrorFeed}
          />
        ))}
      </div>
    </div>
  );
};
