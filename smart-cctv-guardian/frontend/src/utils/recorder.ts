/**
 * Sentinel Stream Video Recorder Engine
 * Captures live frames, encodes via MediaRecorder, and stores clips locally.
 */
import { VideoRecordingItem } from '../types';

export class VideoRecorderManager {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private animFrameId: number | null = null;
  private startTime: number = 0;
  private timerInterval: any = null;
  public isRecording: boolean = false;

  private onTickCallback?: (elapsedSec: number) => void;
  private onFinishedCallback?: (item: VideoRecordingItem) => void;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
  }

  public getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'video/webm';
  }

  public startRecording(
    imgElement: HTMLImageElement,
    cameraName: string,
    triggerEvent?: string,
    onTick?: (elapsedSec: number) => void,
    onFinished?: (item: VideoRecordingItem) => void
  ): boolean {
    if (this.isRecording) return false;
    if (!imgElement || !imgElement.complete) return false;

    this.onTickCallback = onTick;
    this.onFinishedCallback = onFinished;
    this.recordedChunks = [];

    try {
      const mimeType = this.getSupportedMimeType();
      const stream = (this.canvas as any).captureStream ? (this.canvas as any).captureStream(25) : null;
      if (!stream) {
        console.warn('captureStream not supported in this browser.');
        return false;
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps crisp video
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this._finalizeRecording(cameraName, triggerEvent);
      };

      // Start render loop to draw live img frames into canvas
      const renderLoop = () => {
        if (!this.isRecording) return;
        if (this.ctx && imgElement.naturalWidth > 0) {
          this.ctx.drawImage(imgElement, 0, 0, this.canvas.width, this.canvas.height);
        }
        this.animFrameId = requestAnimationFrame(renderLoop);
      };

      this.isRecording = true;
      this.startTime = Date.now();
      this.mediaRecorder.start(1000); // 1-second chunks
      renderLoop();

      this.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.onTickCallback) {
          this.onTickCallback(elapsed);
        }
      }, 500);

      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      this.isRecording = false;
      return false;
    }
  }

  public stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.isRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  private _finalizeRecording(cameraName: string, triggerEvent?: string) {
    const mimeType = this.getSupportedMimeType();
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const durationSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
    const blobUrl = URL.createObjectURL(blob);

    const recordingItem: VideoRecordingItem = {
      id: 'rec_' + Date.now().toString(36),
      createdAt: Date.now(),
      cameraName,
      durationSec,
      blob,
      blobUrl,
      triggerEvent: triggerEvent || 'Manual Recording',
      sizeBytes: blob.size
    };

    if (this.onFinishedCallback) {
      this.onFinishedCallback(recordingItem);
    }
  }
}

export const videoRecorder = new VideoRecorderManager();
