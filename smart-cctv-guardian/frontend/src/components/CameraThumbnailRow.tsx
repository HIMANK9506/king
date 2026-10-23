import React, { useState } from 'react';
import { LayoutGrid, ArrowUpRight, Radio, Shield } from 'lucide-react';
import { CameraChannelInfo } from '../types';
import { getApiUrl } from '../utils/api';
import { VirtualCctvCanvas } from '../utils/virtualCanvas';

interface CameraThumbnailRowProps {
  activeCamId: number;
  cameras: CameraChannelInfo[];
  onSelectCamera: (id: number) => void;
  onToggleGridView: () => void;
}

const SubCamItem: React.FC<{
  cam: CameraChannelInfo;
  wireframeTag: string;
  onSelect: () => void;
}> = ({ cam, wireframeTag, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onSelect}
      className="group relative rounded-xl overflow-hidden border border-neutral-800 hover:border-cyan-500/70 bg-neutral-950 aspect-video cursor-pointer transition shadow-lg hover:shadow-cyan-950/40"
      title={`Promote ${cam.name} to Main Stage`}
    >
      {/* Feed Rendering: Live MJPEG or Fallback Virtual Canvas */}
      {!imgError ? (
        <img
          src={getApiUrl(`/api/feed?cam=${cam.id}`)}
          alt={cam.name}
          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      ) : (
        <VirtualCctvCanvas
          channelId={cam.id}
          bitrate={cam.bitrate_kbps || 295}
          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
        />
      )}

      {/* Wireframe Tag Badge (v1, v2, v3) */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-neutral-700/90 text-[10px] font-mono font-bold text-cyan-300 z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>{wireframeTag.toUpperCase()}</span>
        <span className="text-neutral-400 font-normal">| CAM 0{cam.id}</span>
      </div>

      {/* Top-Right Bitrate */}
      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-neutral-800 text-[10px] font-mono text-emerald-400 z-10">
        {cam.bitrate_kbps || 295} KB/s
      </div>

      {/* Bottom Channel Label */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 flex items-center justify-between text-[11px] z-10">
        <span className="font-medium text-neutral-200 truncate pr-2">
          {cam.name.replace(/^CAM \d+ - /, '')}
        </span>
        <ArrowUpRight
          size={14}
          className="text-neutral-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0"
        />
      </div>

      {/* Hover Highlight Ring */}
      <div className="absolute inset-0 border-2 border-cyan-500 opacity-0 group-hover:opacity-100 transition rounded-xl pointer-events-none z-20" />
    </div>
  );
};

export const CameraThumbnailRow: React.FC<CameraThumbnailRowProps> = ({
  activeCamId,
  cameras,
  onSelectCamera,
  onToggleGridView,
}) => {
  // Fallback camera list if backend returns empty
  const defaultCameras: CameraChannelInfo[] = [
    { id: 1, name: 'CAM 01 - Main Entrance', location: 'Front Gate', status: 'ONLINE', bitrate_kbps: 295, fps: 30 },
    { id: 2, name: 'CAM 02 - Backyard Perimeter', location: 'Perimeter Fence', status: 'ONLINE', bitrate_kbps: 312, fps: 15 },
    { id: 3, name: 'CAM 03 - Front Porch / Entry', location: 'Doorway & Walkway', status: 'ONLINE', bitrate_kbps: 284, fps: 15 },
    { id: 4, name: 'CAM 04 - Driveway & Street', location: 'Vehicle Access', status: 'ONLINE', bitrate_kbps: 305, fps: 15 },
  ];

  const camList = cameras && cameras.length > 0 ? cameras : defaultCameras;

  // The 3 sub-cameras (excluding the currently active main camera)
  const subCameras = camList.filter((c) => c.id !== activeCamId);

  // Wireframe labels v1, v2, v3
  const wireframeTags = ['v1', 'v2', 'v3'];

  return (
    <div className="flex flex-col gap-2">
      {/* Top Header for Sub-Streams */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Radio size={13} className="text-emerald-500 animate-pulse" />
          <span className="font-semibold text-neutral-200 uppercase tracking-wider text-[11px]">
            Sub-Stream Feeds ({subCameras.length} Channels)
          </span>
          <span className="text-neutral-500 text-[10px]">| Click to promote to Main Stage</span>
        </div>

        {/* 1-Click 2x2 NVR Grid Toggle Button */}
        <button
          onClick={onToggleGridView}
          className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-cyan-500/50 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold transition group shadow-sm"
          title="Toggle 4-Camera Simultaneous 2x2 View"
        >
          <LayoutGrid size={13} className="text-cyan-400 group-hover:scale-110 transition" />
          <span>⊞ 4-Cam Grid (2x2)</span>
        </button>
      </div>

      {/* Sub-Camera Thumbnails Grid */}
      <div className="grid grid-cols-3 gap-3">
        {subCameras.map((cam, idx) => (
          <SubCamItem
            key={cam.id}
            cam={cam}
            wireframeTag={wireframeTags[idx] || `v${idx + 1}`}
            onSelect={() => onSelectCamera(cam.id)}
          />
        ))}
      </div>
    </div>
  );
};
