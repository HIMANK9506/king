import React, { useRef, useEffect } from 'react';

// Lightweight animated HTML5 canvas generator for CCTV channels 1, 2, 3, 4
// Ensures the 4-channel NVR runs flawlessly on published web deployments (Netlify, Vercel, PWA)

export function renderVirtualCctvFrame(
  canvas: HTMLCanvasElement,
  channelId: number,
  frameIdx: number,
  bitrateKbps: number = 300
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const now = new Date();
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  const timeStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  if (channelId === 1) {
    // CAM 01: Main Entrance - Tactical Scan & Reticle
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(0, 0, w, h);

    // Subtle Grid Background
    ctx.strokeStyle = '#1b2330';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Scanning sweep line
    const sweepY = (frameIdx * 3) % h;
    const gradSweep = ctx.createLinearGradient(0, sweepY - 30, 0, sweepY);
    gradSweep.addColorStop(0, 'rgba(0, 200, 255, 0)');
    gradSweep.addColorStop(1, 'rgba(0, 200, 255, 0.25)');
    ctx.fillStyle = gradSweep;
    ctx.fillRect(0, Math.max(0, sweepY - 30), w, 30);

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, sweepY);
    ctx.lineTo(w, sweepY);
    ctx.stroke();

    // Center Crosshair Reticle
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = 'rgba(0, 240, 140, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 60, cy);
    ctx.lineTo(cx - 15, cy);
    ctx.moveTo(cx + 15, cy);
    ctx.lineTo(cx + 60, cy);
    ctx.moveTo(cx, cy - 60);
    ctx.lineTo(cx, cy - 15);
    ctx.moveTo(cx, cy + 15);
    ctx.lineTo(cx, cy + 60);
    ctx.stroke();

    // Subject Tracking Simulation Box
    const boxX = cx - 70 + Math.sin(frameIdx / 40) * 40;
    const boxY = cy - 60 + Math.cos(frameIdx / 50) * 20;
    ctx.strokeStyle = '#ff3344';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, 140, 150);

    ctx.fillStyle = '#ff3344';
    ctx.font = '10px monospace';
    ctx.fillText('[TARGET ACQUIRED: HUMAN]', boxX, boxY - 6);

    // OSD Header
    ctx.fillStyle = '#00f08c';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('[CAM 01] MAIN ENTRANCE - STANDALONE', 12, 22);

    ctx.fillStyle = '#e6e6e6';
    ctx.font = '11px monospace';
    ctx.fillText(`[${bitrateKbps} KB/s]  ${timeStr}`, w - 210, 22);

    ctx.fillStyle = '#8caaa0';
    ctx.font = '10px monospace';
    ctx.fillText('RADAR SCANNER ACTIVE | 1080p', 12, h - 12);

    ctx.fillStyle = '#00e678';
    ctx.fillText('STATUS: ONLINE', w - 120, h - 12);
  } else if (channelId === 2) {
    // CAM 02: Backyard Perimeter (IR Night Vision Theme)
    ctx.fillStyle = '#141a16';
    ctx.fillRect(0, 0, w, h);

    // Fence & Lawn
    ctx.strokeStyle = '#233728';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.lineTo(w, h * 0.65);
    ctx.stroke();

    for (let x = 0; x < w + 30; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.5);
      ctx.lineTo(x, h * 0.65);
      ctx.stroke();
    }

    // Security Perimeter Tripwire line
    ctx.strokeStyle = '#00b4e6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, h * 0.78);
    ctx.lineTo(w - 30, h * 0.78);
    ctx.stroke();

    ctx.fillStyle = '#00b4e6';
    ctx.font = '10px monospace';
    ctx.fillText('[PERIMETER TRIPWIRE ACTIVE - NO BREACH]', 40, h * 0.76);

    // OSD Header
    ctx.fillStyle = '#00f08c';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('[CAM 02] BACKYARD PERIMETER', 12, 22);

    ctx.fillStyle = '#e6e6e6';
    ctx.font = '11px monospace';
    ctx.fillText(`[${bitrateKbps} KB/s]  ${timeStr}`, w - 210, 22);

    ctx.fillStyle = '#8caaa0';
    ctx.font = '10px monospace';
    ctx.fillText('IR NIGHT VISION | 1080p [SIMULATED]', 12, h - 12);

    ctx.fillStyle = '#00e678';
    ctx.fillText('STATUS: SECURE', w - 120, h - 12);
  } else if (channelId === 3) {
    // CAM 03: Front Porch / Entryway (Slate Architectural Tone)
    ctx.fillStyle = '#1e2024';
    ctx.fillRect(0, 0, w, h);

    // Doorway & Steps
    ctx.fillStyle = '#2c3038';
    ctx.fillRect(w * 0.38, h * 0.25, w * 0.24, h * 0.5);
    ctx.strokeStyle = '#505560';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.38, h * 0.25, w * 0.24, h * 0.5);

    // Porch light glow
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.22, 10, w * 0.5, h * 0.22, 120);
    grad.addColorStop(0, 'rgba(255, 230, 160, 0.25)');
    grad.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.22, 120, 0, Math.PI * 2);
    ctx.fill();

    // Zone box
    ctx.strokeStyle = '#008cff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w * 0.28, h * 0.55, w * 0.44, h * 0.3);

    ctx.fillStyle = '#00a0ff';
    ctx.font = '10px monospace';
    ctx.fillText('[ZONE 1: PORCH ENTRY - ARMED]', w * 0.3, h * 0.59);

    // OSD Header
    ctx.fillStyle = '#00f08c';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('[CAM 03] FRONT PORCH / ENTRY', 12, 22);

    ctx.fillStyle = '#e6e6e6';
    ctx.font = '11px monospace';
    ctx.fillText(`[${bitrateKbps} KB/s]  ${timeStr}`, w - 210, 22);

    ctx.fillStyle = '#9696a0';
    ctx.font = '10px monospace';
    ctx.fillText('WIDE-ANGLE 140° | 1080p [SIMULATED]', 12, h - 12);

    ctx.fillStyle = '#00e678';
    ctx.fillText('STATUS: MONITORING', w - 140, h - 12);
  } else {
    // CAM 04: Driveway & Street (Roadway Surveillance)
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(0, 0, w, h);

    // Road curb
    ctx.strokeStyle = '#4b4b50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.lineTo(w, h * 0.65);
    ctx.stroke();

    // Parked Car Silhouette
    ctx.fillStyle = '#2c2c30';
    ctx.fillRect(w * 0.3, h * 0.48, w * 0.25, h * 0.16);
    ctx.fillRect(w * 0.35, h * 0.38, w * 0.15, h * 0.1);

    ctx.fillStyle = '#141416';
    ctx.beginPath();
    ctx.arc(w * 0.35, h * 0.64, 14, 0, Math.PI * 2);
    ctx.arc(w * 0.5, h * 0.64, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a0a0aa';
    ctx.font = '10px monospace';
    ctx.fillText('[VEHICLE: STATIONARY]', w * 0.31, h * 0.46);

    // OSD Header
    ctx.fillStyle = '#00f08c';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('[CAM 04] DRIVEWAY & STREET', 12, 22);

    ctx.fillStyle = '#e6e6e6';
    ctx.font = '11px monospace';
    ctx.fillText(`[${bitrateKbps} KB/s]  ${timeStr}`, w - 210, 22);

    ctx.fillStyle = '#9696a0';
    ctx.font = '10px monospace';
    ctx.fillText('VEHICLE AI SCAN | 1080p [SIMULATED]', 12, h - 12);

    ctx.fillStyle = '#00e678';
    ctx.fillText('STATUS: SECURE', w - 120, h - 12);
  }

  // Draw corner brackets
  ctx.strokeStyle = 'rgba(0, 230, 140, 0.7)';
  ctx.lineWidth = 2;
  const clen = 16;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(8, 8 + clen);
  ctx.lineTo(8, 8);
  ctx.lineTo(8 + clen, 8);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(w - 8 - clen, 8);
  ctx.lineTo(w - 8, 8);
  ctx.lineTo(w - 8, 8 + clen);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(8, h - 8 - clen);
  ctx.lineTo(8, h - 8);
  ctx.lineTo(8 + clen, h - 8);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(w - 8 - clen, h - 8);
  ctx.lineTo(w - 8, h - 8);
  ctx.lineTo(w - 8, h - 8 - clen);
  ctx.stroke();
}

/**
 * Reusable animated CCTV Canvas Component for sub-views, grids, and mobile view
 */
export const VirtualCctvCanvas: React.FC<{
  channelId: number;
  bitrate?: number;
  className?: string;
}> = ({ channelId, bitrate = 295, className = 'w-full h-full object-cover' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;
    let fIdx = 0;
    const render = () => {
      fIdx++;
      if (canvasRef.current) {
        renderVirtualCctvFrame(canvasRef.current, channelId, fIdx, bitrate);
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [channelId, bitrate]);

  return <canvas ref={canvasRef} width={640} height={480} className={className} />;
};
