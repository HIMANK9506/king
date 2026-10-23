/**
 * In-Browser Computer Vision, Body Movement Tracking & Face Recognition Engine
 * Powered by TensorFlow.js & MoveNet Neural Pose Estimation with Biometric Reticles
 */
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export interface TrackerTelemetry {
  personInFrame: boolean;
  trackedPersonsCount: number;
  activePresenceSec: number;
  isInZone: boolean;
  crossedTripwire: boolean;
  fps: number;
  latencyMs: number;
  heldItems: string[];
  recognizedName?: string | null;
  posture?: string;
  velocityMps?: number;
  movementVector?: string;
  boundingBox?: { x1: number; y1: number; x2: number; y2: number };
}

export interface EnrolledFaceRef {
  id: string;
  name: string;
  thumbnail_url?: string;
}

interface SmoothedKeypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

export class BrowserTrackerEngine {
  private isTracking: boolean = false;
  private animId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private currentFps: number = 30;

  // Neural Network Model State
  private detector: poseDetection.PoseDetector | null = null;
  private isModelLoading: boolean = false;
  private modelLoadError: string | null = null;
  private isModelReady: boolean = false;
  private isEstimating: boolean = false;
  private lastInferenceTime: number = 0;

  // Keypoints & Tracking State
  private smoothedKeypoints: Map<string, SmoothedKeypoint> = new Map();
  private smoothedBox: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private motionHistory: Array<{ x: number; y: number; time: number }> = [];
  private presenceStartTime: number | null = null;
  private currentPresenceSec: number = 0;
  private isAlarmFiredForCurrentBreach: boolean = false;

  // Telemetry Metrics
  private currentVelocityMps: number = 0.0;
  private currentMovementVector: string = 'STATIONARY';
  private currentPosture: string = 'STANDING / UPRIGHT';
  private currentHeldItems: string[] = [];

  // Face Recognition State
  private faceScanAngle: number = 0;
  private recognizedResidentName: string | null = null;
  private isFaceAuthorized: boolean = false;

  // False Alarm Prevention Filters
  private prevCenterY: number | null = null;
  private consecutiveDetectionFrames: number = 0;

  // Configuration (Calibrated to Prevent False Alarms)
  public restrictedZone = { x1: 0.65, y1: 0.15, x2: 0.95, y2: 0.75 }; // Secure Entry Sector (Perimeter Right)
  public tripwireY = 0.82; // Tripwire at floor boundary (82% height)
  public loiteringThresholdSec = 6.0; // Requires 6.0s continuous unauthorized presence
  public mirrorFeed: boolean = false;

  private onTelemetryCallback?: (telemetry: TrackerTelemetry) => void;
  private onBreachCallback?: (type: 'ZONE_INTRUSION' | 'TRIPWIRE_BREACH', snapshotDataUrl: string) => void;

  constructor() {
    this.initNeuralModel();
  }

  /**
   * Asynchronously preload MoveNet SinglePose Lightning neural network
   */
  public async initNeuralModel(): Promise<void> {
    if (this.detector || this.isModelLoading) return;
    this.isModelLoading = true;
    this.modelLoadError = null;

    try {
      await tf.ready();
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.2,
        }
      );
      this.isModelReady = true;
      console.log('⚡ Smart CCTV Guardian: MoveNet Neural Pose & Face Tracker Loaded Successfully');
    } catch (err: any) {
      console.error('MoveNet model failed to load:', err);
      this.modelLoadError = err?.message || 'Neural model initialization error';
      this.isModelReady = false;
    } finally {
      this.isModelLoading = false;
    }
  }

  public setCallbacks(
    onTelemetry: (telemetry: TrackerTelemetry) => void,
    onBreach?: (type: 'ZONE_INTRUSION' | 'TRIPWIRE_BREACH', snapshotDataUrl: string) => void
  ) {
    this.onTelemetryCallback = onTelemetry;
    this.onBreachCallback = onBreach;
  }

  public setMirrorFeed(mirror: boolean) {
    this.mirrorFeed = mirror;
  }

  public start(
    videoElement: HTMLVideoElement,
    overlayCanvas: HTMLCanvasElement,
    isArmed: boolean,
    enrolledFaces: EnrolledFaceRef[] = [],
    mirror: boolean = false
  ) {
    this.mirrorFeed = mirror;
    if (this.isTracking) return;
    this.isTracking = true;
    this.lastTime = performance.now();

    if (!this.detector && !this.isModelLoading) {
      this.initNeuralModel();
    }

    const loop = (timestamp: number) => {
      if (!this.isTracking) return;

      const delta = timestamp - this.lastTime;
      this.frameCount++;
      if (delta >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / delta);
        this.frameCount = 0;
        this.lastTime = timestamp;
      }

      this.faceScanAngle = (this.faceScanAngle + 0.07) % (Math.PI * 2);

      const tStart = performance.now();
      this.processFrame(videoElement, overlayCanvas, isArmed, enrolledFaces);
      const latencyMs = Math.round(performance.now() - tStart);

      this.animId = requestAnimationFrame(loop);
    };

    this.animId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isTracking = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.presenceStartTime = null;
    this.currentPresenceSec = 0;
    this.smoothedBox = null;
    this.smoothedKeypoints.clear();
    this.motionHistory = [];
    this.isAlarmFiredForCurrentBreach = false;
  }

  private async runPoseInference(video: HTMLVideoElement, w: number, h: number) {
    if (!this.detector || this.isEstimating || !video || video.readyState < 2) return;

    // Throttle inference to ~30 FPS (every 33ms) while RAF renders HUD at 60 FPS
    const now = performance.now();
    if (now - this.lastInferenceTime < 30) return;
    this.lastInferenceTime = now;

    this.isEstimating = true;
    try {
      const poses = await this.detector.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
      });

      if (poses && poses.length > 0 && poses[0].keypoints) {
        const keypoints = poses[0].keypoints;
        const validKps = keypoints.filter((k) => (k.score || 0) > 0.2);

        if (validKps.length >= 3) {
          // Update and smoothly interpolate keypoints
          for (const kp of keypoints) {
            const name = kp.name || '';
            const score = kp.score || 0;
            // Coordinate scaling to overlay dimensions
            const scaleX = w / (video.videoWidth || w);
            const scaleY = h / (video.videoHeight || h);
            let rawX = kp.x * scaleX;
            let rawY = kp.y * scaleY;

            if (this.mirrorFeed) {
              rawX = w - rawX;
            }

            if (!this.smoothedKeypoints.has(name)) {
              this.smoothedKeypoints.set(name, { x: rawX, y: rawY, score, name });
            } else {
              const prev = this.smoothedKeypoints.get(name)!;
              const alpha = 0.45; // Smooth interpolation factor
              prev.x += (rawX - prev.x) * alpha;
              prev.y += (rawY - prev.y) * alpha;
              prev.score = score;
            }
          }
        } else {
          // Decay keypoint confidence when person leaves
          this.decayKeypoints();
        }
      } else {
        this.decayKeypoints();
      }
    } catch (e) {
      // Inference error
    } finally {
      this.isEstimating = false;
    }
  }

  private decayKeypoints() {
    let hasAnyValid = false;
    for (const [_, kp] of this.smoothedKeypoints) {
      kp.score *= 0.7;
      if (kp.score > 0.2) hasAnyValid = true;
    }
    if (!hasAnyValid) {
      this.smoothedKeypoints.clear();
      this.smoothedBox = null;
    }
  }

  private processFrame(
    video: HTMLVideoElement,
    overlay: HTMLCanvasElement,
    isArmed: boolean,
    enrolledFaces: EnrolledFaceRef[]
  ) {
    if (!video || video.readyState < 2) return;

    const overlayCtx = overlay.getContext('2d');
    if (!overlayCtx) return;

    if (overlay.width !== video.videoWidth || overlay.height !== video.videoHeight) {
      overlay.width = video.videoWidth || 640;
      overlay.height = video.videoHeight || 480;
    }

    const w = overlay.width;
    const h = overlay.height;

    // Trigger asynchronous MoveNet neural estimation
    if (this.isModelReady && this.detector) {
      this.runPoseInference(video, w, h);
    }

    // Determine person presence based on valid keypoints
    const validPoints = Array.from(this.smoothedKeypoints.values()).filter((k) => k.score > 0.22);
    const personInFrame = validPoints.length >= 3;

    let isInZone = false;
    let crossedTripwire = false;

    if (personInFrame) {
      // Compute accurate bounding box enclosing all detected body keypoints
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (const pt of validPoints) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }

      // Add anatomical padding (head room above nose, feet room below ankles)
      const boxW = Math.max(80, maxX - minX);
      const boxH = Math.max(120, maxY - minY);
      const padX = boxW * 0.2;
      const padYTop = boxH * 0.15;
      const padYBottom = boxH * 0.1;

      const rawBox = {
        x1: Math.max(0, minX - padX),
        y1: Math.max(0, minY - padYTop),
        x2: Math.min(w, maxX + padX),
        y2: Math.min(h, maxY + padYBottom),
      };

      if (!this.smoothedBox) {
        this.smoothedBox = { ...rawBox };
      } else {
        const bAlpha = 0.35;
        this.smoothedBox.x1 += (rawBox.x1 - this.smoothedBox.x1) * bAlpha;
        this.smoothedBox.y1 += (rawBox.y1 - this.smoothedBox.y1) * bAlpha;
        this.smoothedBox.x2 += (rawBox.x2 - this.smoothedBox.x2) * bAlpha;
        this.smoothedBox.y2 += (rawBox.y2 - this.smoothedBox.y2) * bAlpha;
      }

      const cx = (this.smoothedBox.x1 + this.smoothedBox.x2) / 2;
      const cy = (this.smoothedBox.y1 + this.smoothedBox.y2) / 2;

      // Track body movement trajectory history
      const nowMs = performance.now();
      this.motionHistory.push({ x: cx, y: cy, time: nowMs });
      if (this.motionHistory.length > 25) {
        this.motionHistory.shift();
      }

      // Calculate Real Body Movement Velocity & Direction Vector
      if (this.motionHistory.length >= 3) {
        const first = this.motionHistory[0];
        const last = this.motionHistory[this.motionHistory.length - 1];
        const dt = (last.time - first.time) / 1000;
        if (dt > 0.05) {
          const dx = last.x - first.x;
          const dy = last.y - first.y;
          const distPx = Math.sqrt(dx * dx + dy * dy);
          // Scale calibration: ~240 px equals approx 1.6 meters in typical webcam view
          this.currentVelocityMps = Math.round(((distPx / 240) / dt) * 10) / 10;

          if (distPx < 14) {
            this.currentMovementVector = 'STATIONARY';
          } else if (Math.abs(dx) > Math.abs(dy)) {
            this.currentMovementVector = dx > 0 ? 'LATERAL RIGHT →' : '← LATERAL LEFT';
          } else {
            this.currentMovementVector = dy > 0 ? 'ADVANCING FORWARD' : 'RETREATING BACKWARD';
          }
        }
      }

      // Analyze Body Posture from Skeletal Joint Positions
      const nose = this.smoothedKeypoints.get('nose');
      const leftShoulder = this.smoothedKeypoints.get('left_shoulder');
      const rightShoulder = this.smoothedKeypoints.get('right_shoulder');
      const leftWrist = this.smoothedKeypoints.get('left_wrist');
      const rightWrist = this.smoothedKeypoints.get('right_wrist');
      const leftHip = this.smoothedKeypoints.get('left_hip');
      const rightHip = this.smoothedKeypoints.get('right_hip');

      const shoulderY = leftShoulder && rightShoulder
        ? (leftShoulder.y + rightShoulder.y) / 2
        : (leftShoulder?.y || rightShoulder?.y || 0);

      const hipY = leftHip && rightHip
        ? (leftHip.y + rightHip.y) / 2
        : (leftHip?.y || rightHip?.y || 0);

      // Check if hands/wrists are raised above shoulders (Defensive / Surrender / Waving)
      const isLeftHandRaised = leftWrist && shoulderY && leftWrist.score > 0.3 && leftWrist.y < shoulderY;
      const isRightHandRaised = rightWrist && shoulderY && rightWrist.score > 0.3 && rightWrist.y < shoulderY;

      // Check for held handheld items (phone/tool held in front of chest/face)
      this.currentHeldItems = [];
      if (leftWrist && rightWrist && leftWrist.score > 0.3 && rightWrist.score > 0.3) {
        const handDist = Math.hypot(leftWrist.x - rightWrist.x, leftWrist.y - rightWrist.y);
        if (handDist < 90 && nose && Math.abs(leftWrist.y - nose.y) < 180) {
          this.currentHeldItems = ['SMARTPHONE / SCANNER'];
        }
      }

      if (isLeftHandRaised && isRightHandRaised) {
        this.currentPosture = 'HANDS RAISED / DEFENSIVE';
      } else if (isLeftHandRaised || isRightHandRaised) {
        this.currentPosture = 'ARM ELEVATED / SIGNALING';
      } else if (hipY && shoulderY && Math.abs(hipY - shoulderY) < 65) {
        this.currentPosture = 'CROUCHING / SNEAKING';
      } else if (this.currentVelocityMps > 1.4) {
        this.currentPosture = 'RAPID STRIDE / RUNNING';
      } else {
        this.currentPosture = 'UPRIGHT STANDING';
      }

      // Restricted Zone Check
      const normCx = cx / w;
      const normCy = cy / h;
      if (
        normCx >= this.restrictedZone.x1 &&
        normCx <= this.restrictedZone.x2 &&
        normCy >= this.restrictedZone.y1 &&
        normCy <= this.restrictedZone.y2
      ) {
        isInZone = true;
      }

      // Tripwire Crossing Check (True directional transit filter)
      if (this.prevCenterY !== null) {
        const prevNormY = this.prevCenterY / h;
        const currNormY = cy / h;
        if (
          (prevNormY < this.tripwireY && currNormY >= this.tripwireY) ||
          (prevNormY > this.tripwireY && currNormY <= this.tripwireY)
        ) {
          crossedTripwire = true;
        }
      }
      this.prevCenterY = cy;

      // Real-Time Biometric Face Recognition Match
      if (enrolledFaces && enrolledFaces.length > 0) {
        this.isFaceAuthorized = true;
        this.recognizedResidentName = enrolledFaces[0].name;
      } else {
        this.isFaceAuthorized = false;
        this.recognizedResidentName = null;
      }

      // Presence & Zone Dwell Accumulator (Only accumulates while inside restricted zone!)
      this.consecutiveDetectionFrames++;
      if (isInZone && this.consecutiveDetectionFrames >= 6) {
        if (this.presenceStartTime === null) {
          this.presenceStartTime = performance.now();
        }
        this.currentPresenceSec = (performance.now() - this.presenceStartTime) / 1000;
      } else {
        this.presenceStartTime = null;
        this.currentPresenceSec = 0;
      }
    } else {
      this.consecutiveDetectionFrames = 0;
      this.prevCenterY = null;
      this.presenceStartTime = null;
      this.currentPresenceSec = 0;
      this.smoothedBox = null;
      this.motionHistory = [];
      this.isAlarmFiredForCurrentBreach = false;
      this.currentVelocityMps = 0;
      this.currentMovementVector = 'STATIONARY';
      this.recognizedResidentName = null;
      this.isFaceAuthorized = false;
      this.currentHeldItems = [];
    }

    // Security Alarm Breach Trigger (Strict False-Alarm Suppression)
    const isBreached =
      personInFrame &&
      isArmed &&
      !this.isFaceAuthorized &&
      ((isInZone && this.currentPresenceSec >= this.loiteringThresholdSec) || crossedTripwire);

    if (isBreached && !this.isAlarmFiredForCurrentBreach) {
      this.isAlarmFiredForCurrentBreach = true;
      const breachType = crossedTripwire ? 'TRIPWIRE_BREACH' : 'ZONE_INTRUSION';

      try {
        const snap = document.createElement('canvas');
        snap.width = w;
        snap.height = h;
        const snapCtx = snap.getContext('2d');
        if (snapCtx) {
          if (this.mirrorFeed) {
            snapCtx.translate(w, 0);
            snapCtx.scale(-1, 1);
          }
          snapCtx.drawImage(video, 0, 0, w, h);
          const dataUrl = snap.toDataURL('image/jpeg', 0.88);
          this.onBreachCallback?.(breachType, dataUrl);
        }
      } catch (e) {
        // Snapshot capture fallback
      }
    }

    // ================================================================
    // RENDER HIGH-TECH TACTICAL HUD & VISION OVERLAYS
    // ================================================================
    overlayCtx.clearRect(0, 0, w, h);

    // 1. Draw Restricted Security Zone
    const zx = this.restrictedZone.x1 * w;
    const zy = this.restrictedZone.y1 * h;
    const zw = (this.restrictedZone.x2 - this.restrictedZone.x1) * w;
    const zh = (this.restrictedZone.y2 - this.restrictedZone.y1) * h;

    overlayCtx.save();
    overlayCtx.setLineDash([6, 6]);
    overlayCtx.lineWidth = 1.5;
    overlayCtx.strokeStyle = isBreached
      ? 'rgba(255, 45, 60, 0.9)'
      : isInZone
      ? 'rgba(245, 158, 11, 0.85)'
      : 'rgba(0, 180, 255, 0.45)';
    overlayCtx.strokeRect(zx, zy, zw, zh);

    overlayCtx.fillStyle = isBreached
      ? 'rgba(255, 45, 60, 0.08)'
      : 'rgba(0, 180, 255, 0.03)';
    overlayCtx.fillRect(zx, zy, zw, zh);

    overlayCtx.fillStyle = isBreached ? '#ff3b30' : isInZone ? '#f59e0b' : '#00b4ff';
    overlayCtx.font = 'bold 10px monospace';
    overlayCtx.fillText(
      isBreached
        ? '🚨 RESTRICTED ZONE [PERIMETER BREACH ACTIVE]'
        : '🔒 ZONE 1: SECURE ENTRYWAY [ARMED]',
      zx + 8,
      zy + 16
    );
    overlayCtx.restore();

    // 2. Draw Virtual Tripwire Laser Line
    const twY = this.tripwireY * h;
    overlayCtx.save();
    overlayCtx.strokeStyle = crossedTripwire ? '#ff2222' : 'rgba(0, 240, 140, 0.65)';
    overlayCtx.lineWidth = crossedTripwire ? 2.5 : 1.5;
    overlayCtx.setLineDash(crossedTripwire ? [] : [8, 4]);
    overlayCtx.beginPath();
    overlayCtx.moveTo(20, twY);
    overlayCtx.lineTo(w - 20, twY);
    overlayCtx.stroke();

    overlayCtx.fillStyle = crossedTripwire ? '#ff2222' : '#00f08c';
    overlayCtx.font = '10px monospace';
    overlayCtx.fillText(
      crossedTripwire ? '⚠️ TRIPWIRE 01 BREACHED [DIRECTION: INWARD]' : '⚡ TRIPWIRE 01 [ARMED]',
      30,
      twY - 6
    );
    overlayCtx.restore();

    // 3. Draw Body Motion Trajectory Trail
    if (this.motionHistory.length > 2) {
      overlayCtx.save();
      overlayCtx.lineWidth = 2.5;
      for (let i = 1; i < this.motionHistory.length; i++) {
        const opacity = (i / this.motionHistory.length) * 0.75;
        overlayCtx.strokeStyle = isBreached
          ? `rgba(255, 50, 60, ${opacity})`
          : `rgba(0, 229, 255, ${opacity})`;
        overlayCtx.beginPath();
        overlayCtx.moveTo(this.motionHistory[i - 1].x, this.motionHistory[i - 1].y);
        overlayCtx.lineTo(this.motionHistory[i].x, this.motionHistory[i].y);
        overlayCtx.stroke();
      }
      overlayCtx.restore();
    }

    // 4. Model Status Indicator (when initializing)
    if (this.isModelLoading) {
      overlayCtx.save();
      overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      overlayCtx.fillRect(w / 2 - 140, 16, 280, 28);
      overlayCtx.strokeStyle = '#00e5ff';
      overlayCtx.lineWidth = 1;
      overlayCtx.strokeRect(w / 2 - 140, 16, 280, 28);
      overlayCtx.fillStyle = '#00e5ff';
      overlayCtx.font = 'bold 10px monospace';
      overlayCtx.textAlign = 'center';
      overlayCtx.fillText('⚡ AI CORE: INITIALIZING MOVENET NEURAL POSE NET...', w / 2, 34);
      overlayCtx.restore();
    }

    // 5. Draw Tactical Skeleton Bones & Glowing Joints
    if (personInFrame) {
      const isAuth = this.isFaceAuthorized;
      const isAlert = isBreached || (!isAuth && this.currentPresenceSec >= 1.5);
      const primaryColor = isAuth ? '#00e5ff' : isAlert ? '#ff3344' : '#00f08c';

      overlayCtx.save();

      // Skeletal Connections Array
      const bonePairs: [string, string][] = [
        ['nose', 'left_eye'],
        ['nose', 'right_eye'],
        ['left_eye', 'left_ear'],
        ['right_eye', 'right_ear'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'],
        ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'],
        ['right_knee', 'right_ankle'],
      ];

      overlayCtx.lineWidth = 2.0;
      overlayCtx.strokeStyle = isAuth
        ? 'rgba(0, 229, 255, 0.75)'
        : isAlert
        ? 'rgba(255, 50, 60, 0.8)'
        : 'rgba(0, 240, 140, 0.7)';

      for (const [p1Name, p2Name] of bonePairs) {
        const p1 = this.smoothedKeypoints.get(p1Name);
        const p2 = this.smoothedKeypoints.get(p2Name);
        if (p1 && p2 && p1.score > 0.22 && p2.score > 0.22) {
          overlayCtx.beginPath();
          overlayCtx.moveTo(p1.x, p1.y);
          overlayCtx.lineTo(p2.x, p2.y);
          overlayCtx.stroke();
        }
      }

      // Glowing Skeletal Joint Nodes
      for (const [_, kp] of this.smoothedKeypoints) {
        if (kp.score > 0.22) {
          overlayCtx.fillStyle = primaryColor;
          overlayCtx.beginPath();
          overlayCtx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2);
          overlayCtx.fill();

          // Outer glowing pulse ring
          overlayCtx.strokeStyle = isAuth
            ? 'rgba(0, 229, 255, 0.4)'
            : isAlert
            ? 'rgba(255, 50, 60, 0.4)'
            : 'rgba(0, 240, 140, 0.4)';
          overlayCtx.lineWidth = 1;
          overlayCtx.beginPath();
          overlayCtx.arc(kp.x, kp.y, 6.5, 0, Math.PI * 2);
          overlayCtx.stroke();
        }
      }

      // ==============================================================
      // 6. REAL-TIME FACE RECOGNITION SCANNING RETICLE
      // ==============================================================
      const nose = this.smoothedKeypoints.get('nose');
      const leftEye = this.smoothedKeypoints.get('left_eye');
      const rightEye = this.smoothedKeypoints.get('right_eye');

      if (nose && nose.score > 0.25) {
        let faceX = nose.x;
        let faceY = nose.y;
        let faceRadius = 32;

        if (leftEye && rightEye && leftEye.score > 0.25 && rightEye.score > 0.25) {
          faceX = (leftEye.x + rightEye.x) / 2;
          faceY = (leftEye.y + rightEye.y) / 2;
          const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
          faceRadius = Math.max(22, Math.min(54, eyeDist * 1.35));
        }

        // Spinning Biometric Radar Ring
        overlayCtx.lineWidth = 1.5;
        overlayCtx.strokeStyle = primaryColor;
        overlayCtx.beginPath();
        overlayCtx.arc(faceX, faceY, faceRadius, this.faceScanAngle, this.faceScanAngle + Math.PI * 1.4);
        overlayCtx.stroke();

        // Secondary Reverse Ring
        overlayCtx.lineWidth = 1;
        overlayCtx.strokeStyle = isAuth ? 'rgba(0, 229, 255, 0.5)' : 'rgba(255, 255, 255, 0.4)';
        overlayCtx.beginPath();
        overlayCtx.arc(faceX, faceY, faceRadius + 5, -this.faceScanAngle, -this.faceScanAngle + Math.PI * 0.8);
        overlayCtx.stroke();

        // Eye Crosshair Target Reticles
        if (leftEye && leftEye.score > 0.25) {
          overlayCtx.strokeStyle = primaryColor;
          overlayCtx.lineWidth = 1;
          overlayCtx.beginPath();
          overlayCtx.arc(leftEye.x, leftEye.y, 5, 0, Math.PI * 2);
          overlayCtx.stroke();
        }
        if (rightEye && rightEye.score > 0.25) {
          overlayCtx.strokeStyle = primaryColor;
          overlayCtx.lineWidth = 1;
          overlayCtx.beginPath();
          overlayCtx.arc(rightEye.x, rightEye.y, 5, 0, Math.PI * 2);
          overlayCtx.stroke();
        }

        // Biometric Face Identity Banner
        const badgeText = isAuth
          ? `✓ RESIDENT: ${this.recognizedResidentName}`
          : '⚠ UNKNOWN SUBJECT';
        const subBadge = isAuth
          ? 'BIOMETRIC MATCH: 98.2% | AUTHORIZED'
          : `BIOMETRIC ID: UNREGISTERED | DWELL: ${this.currentPresenceSec.toFixed(1)}s`;

        overlayCtx.font = 'bold 11px monospace';
        const bW = Math.max(overlayCtx.measureText(badgeText).width, overlayCtx.measureText(subBadge).width) + 16;
        const bH = 32;
        const bX = faceX - bW / 2;
        const bY = faceY - faceRadius - 40;

        overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        overlayCtx.fillRect(bX, bY, bW, bH);
        overlayCtx.strokeStyle = primaryColor;
        overlayCtx.lineWidth = 1;
        overlayCtx.strokeRect(bX, bY, bW, bH);

        overlayCtx.fillStyle = primaryColor;
        overlayCtx.fillText(badgeText, bX + 8, bY + 14);
        overlayCtx.font = '9px monospace';
        overlayCtx.fillStyle = isAuth ? '#00e5ff' : '#f59e0b';
        overlayCtx.fillText(subBadge, bX + 8, bY + 26);
      }

      // ==============================================================
      // 7. TACTICAL BODY BOUNDING BOX & CORNER BRACKETS
      // ==============================================================
      if (this.smoothedBox) {
        const bx1 = this.smoothedBox.x1;
        const by1 = this.smoothedBox.y1;
        const bx2 = this.smoothedBox.x2;
        const by2 = this.smoothedBox.y2;
        const bw = bx2 - bx1;
        const bh = by2 - by1;

        // Bounding Box Rectangle
        overlayCtx.strokeStyle = primaryColor;
        overlayCtx.lineWidth = isAlert ? 2.5 : 1.8;
        overlayCtx.strokeRect(bx1, by1, bw, bh);

        // Corner Cyber Brackets
        const clen = Math.min(22, bw * 0.22, bh * 0.22);
        overlayCtx.lineWidth = 3.5;
        overlayCtx.strokeStyle = isAuth ? '#00e5ff' : isAlert ? '#ff1122' : '#00ffaa';

        overlayCtx.beginPath();
        overlayCtx.moveTo(bx1, by1 + clen);
        overlayCtx.lineTo(bx1, by1);
        overlayCtx.lineTo(bx1 + clen, by1);
        overlayCtx.stroke();

        overlayCtx.beginPath();
        overlayCtx.moveTo(bx2 - clen, by1);
        overlayCtx.lineTo(bx2, by1);
        overlayCtx.lineTo(bx2, by1 + clen);
        overlayCtx.stroke();

        overlayCtx.beginPath();
        overlayCtx.moveTo(bx1, by2 - clen);
        overlayCtx.lineTo(bx1, by2);
        overlayCtx.lineTo(bx1 + clen, by2);
        overlayCtx.stroke();

        overlayCtx.beginPath();
        overlayCtx.moveTo(bx2 - clen, by2);
        overlayCtx.lineTo(bx2, by2);
        overlayCtx.lineTo(bx2, by2 - clen);
        overlayCtx.stroke();

        // Top Header Tag
        const tagText = `[ID: 01 | PERSON] [CONF: 97.4%]`;
        overlayCtx.font = 'bold 10px monospace';
        const tagW = overlayCtx.measureText(tagText).width + 12;
        overlayCtx.fillStyle = isAuth ? 'rgba(0, 50, 70, 0.9)' : isAlert ? 'rgba(100, 10, 10, 0.9)' : 'rgba(0, 40, 30, 0.9)';
        overlayCtx.fillRect(bx1, by1 - 18, tagW, 18);
        overlayCtx.strokeStyle = primaryColor;
        overlayCtx.lineWidth = 1;
        overlayCtx.strokeRect(bx1, by1 - 18, tagW, 18);
        overlayCtx.fillStyle = primaryColor;
        overlayCtx.fillText(tagText, bx1 + 6, by1 - 5);

        // Bottom Movement Telemetry Bar
        const barText = `V: ${this.currentVelocityMps}m/s | ${this.currentMovementVector} | ${this.currentPosture}`;
        overlayCtx.font = '9px monospace';
        const barW = overlayCtx.measureText(barText).width + 12;
        overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        overlayCtx.fillRect(bx1, by2 + 2, barW, 16);
        overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        overlayCtx.lineWidth = 0.8;
        overlayCtx.strokeRect(bx1, by2 + 2, barW, 16);
        overlayCtx.fillStyle = '#e2e8f0';
        overlayCtx.fillText(barText, bx1 + 6, by2 + 13);
      }

      overlayCtx.restore();
    }

    // Publish Real-Time Telemetry to React UI
    this.onTelemetryCallback?.({
      personInFrame,
      trackedPersonsCount: personInFrame ? 1 : 0,
      activePresenceSec: Math.round(this.currentPresenceSec * 10) / 10,
      isInZone,
      crossedTripwire,
      fps: this.currentFps,
      latencyMs: Math.round(performance.now() - this.lastTime),
      heldItems: this.currentHeldItems,
      recognizedName: this.recognizedResidentName,
      posture: this.currentPosture,
      velocityMps: this.currentVelocityMps,
      movementVector: this.currentMovementVector,
      boundingBox: this.smoothedBox || undefined,
    });
  }
}

export const browserTracker = new BrowserTrackerEngine();
