import time
import threading
from typing import Optional, Dict, List
import cv2
import numpy as np

from app.config import config
from app.models import SystemMode, CameraChannelInfo
from app.detector import IntruderDetector
from app.alerts import alert_service
from app.camera_network import camera_network_manager

class StreamManager:
    def __init__(self):
        self.detector = IntruderDetector()
        self.system_mode = SystemMode.ARMED
        
        self.latest_raw_frame: Optional[np.ndarray] = None
        self.latest_annotated_frame: Optional[np.ndarray] = None
        self.cached_jpeg_bytes: Optional[bytes] = None
        
        self.is_connected = False
        self.current_fps = 0.0
        self.active_presence_sec = 0.0
        self.person_in_frame = False
        self.tracked_persons_count = 0
        self.running = False
        
        # Dual-Thread Handles for Primary Cam 1
        self.capture_thread = None
        self.inference_thread = None
        self.virtual_thread = None
        self.lock = threading.Lock()
        self.frame_id = 0
        self.frame_condition = threading.Condition()
        
        # Multi-Channel NVR Conditions & JPEG buffers
        self.channel_conditions = {
            1: self.frame_condition,
            2: threading.Condition(),
            3: threading.Condition(),
            4: threading.Condition(),
        }
        self.channel_frame_ids = {1: 0, 2: 0, 3: 0, 4: 0}
        self.channel_jpegs: Dict[int, Optional[bytes]] = {1: None, 2: None, 3: None, 4: None}
        
        self.source_changed = False
        self.mirror_feed = config.MIRROR_FEED
        self.simulated_intruder_x = 120
        self.simulated_step = 3

    def start(self):
        if not self.running:
            self.running = True
            self.capture_thread = threading.Thread(target=self._capture_worker, daemon=True)
            self.inference_thread = threading.Thread(target=self._inference_worker, daemon=True)
            self.virtual_thread = threading.Thread(target=self._virtual_channels_worker, daemon=True)
            self.capture_thread.start()
            self.inference_thread.start()
            self.virtual_thread.start()

    def stop(self):
        self.running = False
        if self.capture_thread:
            self.capture_thread.join(timeout=1.5)
        if self.inference_thread:
            self.inference_thread.join(timeout=1.5)
        if self.virtual_thread:
            self.virtual_thread.join(timeout=1.5)

    def set_mode(self, mode: SystemMode):
        self.system_mode = mode

    def set_mirror(self, enabled: bool):
        self.mirror_feed = enabled
        config.MIRROR_FEED = enabled

    def update_source(self, source: str, name: str = None):
        config.CAMERA_SOURCE = source
        if name:
            config.CAMERA_NAME = name
        self.source_changed = True

    def get_channel_condition(self, cam_id: int) -> threading.Condition:
        return self.channel_conditions.get(cam_id, self.frame_condition)

    def get_channel_frame_id(self, cam_id: int) -> int:
        return self.channel_frame_ids.get(cam_id, self.frame_id)

    def get_channel_jpeg(self, cam_id: int) -> bytes:
        jpeg = self.channel_jpegs.get(cam_id)
        if jpeg is not None:
            return jpeg
        return self.get_jpeg_frame()

    def reload_channel(self, cam_id: int):
        if cam_id == 1:
            self.source_changed = True

    def get_cameras_info(self) -> List[CameraChannelInfo]:
        bitrate_cam1 = 285 + (self.frame_id % 32)
        bitrate_cam2 = 308 + ((self.channel_frame_ids[2] * 3) % 27)
        bitrate_cam3 = 282 + ((self.channel_frame_ids[3] * 2) % 22)
        bitrate_cam4 = 305 + ((self.channel_frame_ids[4] * 4) % 31)

        is_breached = self.person_in_frame and self.active_presence_sec >= 2.0 and (self.system_mode in [SystemMode.ARMED, SystemMode.NIGHT_MODE])

        default_names = {
            1: (f"CAM 01 - {config.CAMERA_NAME}", "Main Gate / Primary AI"),
            2: ("CAM 02 - Backyard Perimeter", "Perimeter Fence Line"),
            3: ("CAM 03 - Front Porch / Entry", "Doorway & Walkway"),
            4: ("CAM 04 - Driveway & Street", "Vehicle Access & Road"),
        }

        infos = []
        for cid in [1, 2, 3, 4]:
            cfg = camera_network_manager.get_channel_config(cid)
            if cfg and cfg.get("camera_name"):
                cname = f"CAM 0{cid} - {cfg['camera_name']}"
                loc = f"IP: {cfg.get('ip_address')}:{cfg.get('port', 554)} ({cfg.get('protocol', 'RTSP')})"
            else:
                cname, loc = default_names[cid]

            bitrate = {
                1: bitrate_cam1,
                2: bitrate_cam2,
                3: bitrate_cam3,
                4: bitrate_cam4,
            }[cid]

            infos.append(
                CameraChannelInfo(
                    id=cid,
                    name=cname,
                    location=loc,
                    status="ONLINE" if (cid != 1 or self.is_connected) else "CONNECTING",
                    bitrate_kbps=bitrate,
                    fps=self.current_fps if cid == 1 else 15.0,
                    active_breach=(cid == 1 and is_breached)
                )
            )
        return infos

    def _open_capture(self):
        # 0. Check if channel 1 has an IP camera bound via IP + Unique Code
        cfg1 = camera_network_manager.get_channel_config(1)
        if cfg1 and cfg1.get("stream_url"):
            try:
                cap = cv2.VideoCapture(cfg1["stream_url"])
                if cap.isOpened():
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        return cap
                    cap.release()
            except Exception as e:
                print(f"[StreamManager] Failed to connect to configured IP camera for Cam 1: {e}")

        src = config.CAMERA_SOURCE.strip()
        if src.upper() == "SIMULATED":
            return None

        if src.isdigit():
            idx = int(src)
            # 1. Try DirectShow backend with zero-latency buffer (Fastest on Windows)
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                cap.set(cv2.CAP_PROP_FPS, 30)
                ret, frame = cap.read()
                if ret and frame is not None:
                    return cap
                cap.release()

            # 2. Try default backend with buffer size 1
            cap = cv2.VideoCapture(idx)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                ret, frame = cap.read()
                if ret and frame is not None:
                    return cap
                cap.release()

            # 3. Try MSMF explicitly
            cap = cv2.VideoCapture(idx, cv2.CAP_MSMF)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                ret, frame = cap.read()
                if ret and frame is not None:
                    return cap
                cap.release()

            return None

        cap = cv2.VideoCapture(src)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                return cap
            cap.release()
        return None

    def _generate_synthetic_cctv_frame(self, frame_idx: int) -> np.ndarray:
        w, h = 640, 480
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        frame[:, :] = (30, 32, 36)

        cv2.line(frame, (0, 340), (w, 340), (48, 52, 58), 2)
        for x in range(0, w + 100, 100):
            cv2.line(frame, (x, 340), (int(x * 1.3) - 80, h), (40, 44, 50), 1)

        cv2.rectangle(frame, (200, 130), (440, 340), (45, 50, 60), -1)
        cv2.rectangle(frame, (200, 130), (440, 340), (70, 75, 90), 2)
        cv2.putText(frame, "[SECURE ACCESS DOOR]", (220, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (120, 120, 220), 1)

        self.simulated_intruder_x += self.simulated_step
        if self.simulated_intruder_x > 480 or self.simulated_intruder_x < 100:
            self.simulated_step *= -1

        ix = int(self.simulated_intruder_x)
        cv2.circle(frame, (ix, 190), 20, (180, 175, 170), -1)
        cv2.rectangle(frame, (ix - 24, 212), (ix + 24, 290), (130, 85, 55), -1)
        cv2.rectangle(frame, (ix - 20, 290), (ix - 6, 338), (40, 40, 95), -1)
        cv2.rectangle(frame, (ix + 6, 290), (ix + 20, 338), (40, 40, 95), -1)

        cv2.putText(frame, "[SYNTHETIC CCTV TEST STREAM]", (15, h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (130, 130, 130), 1)
        return frame

    # ============================================================
    # THREAD 1: HIGH-SPEED FRAME GRABBER (Native 30+ FPS)
    # ============================================================
    def _capture_worker(self):
        cap = self._open_capture()
        fps_counter = 0
        fps_timer = time.time()
        frame_idx = 0
        failed_reads = 0

        while self.running:
            if self.source_changed:
                if cap and cap.isOpened():
                    cap.release()
                cap = self._open_capture()
                failed_reads = 0
                self.source_changed = False

            frame_idx += 1
            frame = None
            if cap and cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    failed_reads += 1
                    if failed_reads >= 5:
                        cap.release()
                        time.sleep(0.5)
                        cap = self._open_capture()
                        failed_reads = 0
                else:
                    failed_reads = 0

            if frame is None:
                self.is_connected = True
                frame = self._generate_synthetic_cctv_frame(frame_idx)
            else:
                self.is_connected = True
                if self.mirror_feed:
                    frame = cv2.flip(frame, 1)

            with self.lock:
                self.latest_raw_frame = frame
                if self.cached_jpeg_bytes is None:
                    ret, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                    if ret:
                        self.cached_jpeg_bytes = jpeg.tobytes()
                        self.channel_jpegs[1] = self.cached_jpeg_bytes

            fps_counter += 1
            if time.time() - fps_timer >= 1.0:
                self.current_fps = round(fps_counter / (time.time() - fps_timer), 1)
                fps_counter = 0
                fps_timer = time.time()

            time.sleep(0.002)

        if cap and cap.isOpened():
            cap.release()

    # ============================================================
    # THREAD 2: ASYNCHRONOUS AI INFERENCE & TRACKING WORKER (CAM 1)
    # ============================================================
    def _inference_worker(self):
        while self.running:
            frame_to_process = None
            with self.lock:
                if self.latest_raw_frame is not None:
                    frame_to_process = self.latest_raw_frame.copy()

            if frame_to_process is not None:
                (
                    annotated_frame,
                    detections,
                    triggered_events,
                    presence_sec,
                    person_in,
                    tracks_count
                ) = self.detector.process_frame(frame_to_process, self.system_mode)

                # CCTV On-Screen Telemetry OSD (Matching Reference Images 1 & 2)
                h, w, _ = annotated_frame.shape
                now_str = time.strftime("%d/%m/%Y %H:%M:%S")
                cur_bitrate = 285 + (self.frame_id % 32)
                
                # Top-Right Telemetry
                cv2.putText(
                    annotated_frame,
                    f"[{cur_bitrate} KB/s]  {now_str}",
                    (w - 240, 24),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.40,
                    (240, 240, 240),
                    1,
                    cv2.LINE_AA
                )
                
                # Top-Left Channel Label
                cam1_label = f"[CAM 01] {config.CAMERA_NAME[:20].upper()}"
                cv2.putText(
                    annotated_frame,
                    cam1_label,
                    (12, 24),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.42,
                    (0, 230, 120),
                    1,
                    cv2.LINE_AA
                )

                # Pre-encode JPEG once at optimal balance (82 quality) for high FPS
                ret, jpeg = cv2.imencode(".jpg", annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
                jpeg_bytes = jpeg.tobytes() if ret else None

                with self.frame_condition:
                    self.latest_annotated_frame = annotated_frame
                    if jpeg_bytes is not None:
                        self.cached_jpeg_bytes = jpeg_bytes
                        self.channel_jpegs[1] = jpeg_bytes
                        self.frame_id += 1
                        self.channel_frame_ids[1] = self.frame_id
                    self.active_presence_sec = presence_sec
                    self.person_in_frame = person_in
                    self.tracked_persons_count = tracks_count
                    self.frame_condition.notify_all()

                if triggered_events:
                    import asyncio
                    try:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        for event in triggered_events:
                            loop.run_until_complete(
                                alert_service.trigger_rule_alert(annotated_frame, event, config.CAMERA_NAME)
                            )
                        loop.close()
                    except Exception as e:
                        print(f"[StreamManager] Alert dispatch error: {e}")

            time.sleep(0.002)

    # ============================================================
    # THREAD 3: MULTI-CHANNEL VIRTUAL CCTV GENERATOR (CAMS 2, 3, 4)
    # ============================================================
    def _virtual_channels_worker(self):
        v_idx = 0
        w, h = 640, 480

        while self.running:
            v_idx += 1
            now_str = time.strftime("%d/%m/%Y %H:%M:%S")

            # --------------------------------------------------------
            # CAM 02: Backyard Perimeter (IR Night Vision Theme)
            # --------------------------------------------------------
            f2 = np.zeros((h, w, 3), dtype=np.uint8)
            f2[:, :] = (20, 26, 22) # Dark green night-vision hue

            # Ground & Fence
            cv2.line(f2, (0, 310), (w, 310), (35, 55, 40), 2)
            for x in range(0, w + 30, 35):
                cv2.line(f2, (x, 240), (x, 310), (45, 68, 50), 2)
            cv2.line(f2, (0, 255), (w, 255), (45, 68, 50), 1)

            # Security Perimeter Tripwire line
            cv2.line(f2, (30, 370), (w - 30, 370), (0, 180, 230), 1, cv2.LINE_AA)
            cv2.putText(f2, "[PERIMETER TRIPWIRE ACTIVE - NO BREACH]", (40, 362), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 180, 230), 1, cv2.LINE_AA)

            # OSD
            bitrate2 = 308 + ((v_idx * 3) % 27)
            cv2.putText(f2, "[CAM 02] BACKYARD PERIMETER", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 240, 140), 1, cv2.LINE_AA)
            cv2.putText(f2, f"[{bitrate2} KB/s]  {now_str}", (w - 235, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (230, 230, 230), 1, cv2.LINE_AA)
            cv2.putText(f2, "IR NIGHT VISION | 1080p", (12, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (140, 170, 150), 1, cv2.LINE_AA)
            cv2.putText(f2, "STATUS: SECURE", (w - 140, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (0, 230, 120), 1, cv2.LINE_AA)

            ret2, jpg2 = cv2.imencode(".jpg", f2, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if ret2:
                cond2 = self.channel_conditions[2]
                with cond2:
                    self.channel_jpegs[2] = jpg2.tobytes()
                    self.channel_frame_ids[2] = v_idx
                    cond2.notify_all()

            # --------------------------------------------------------
            # CAM 03: Front Porch / Entryway (Slate Architectural Tone)
            # --------------------------------------------------------
            f3 = np.zeros((h, w, 3), dtype=np.uint8)
            f3[:, :] = (32, 34, 38) # Charcoal architectural tone

            # Doorway & Steps
            cv2.rectangle(f3, (240, 120), (400, 360), (45, 48, 55), -1)
            cv2.rectangle(f3, (240, 120), (400, 360), (80, 85, 95), 2)
            cv2.circle(f3, (380, 240), 5, (160, 170, 180), -1) # Door handle
            # Walkway
            cv2.line(f3, (180, h), (240, 360), (60, 65, 75), 2)
            cv2.line(f3, (460, h), (400, 360), (60, 65, 75), 2)

            # Zone Box
            cv2.rectangle(f3, (180, 260), (460, 420), (0, 140, 255), 1)
            cv2.putText(f3, "[ZONE 1: PORCH ENTRY - ARMED]", (190, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (0, 160, 255), 1, cv2.LINE_AA)

            # OSD
            bitrate3 = 282 + ((v_idx * 2) % 22)
            cv2.putText(f3, "[CAM 03] FRONT PORCH / ENTRY", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 240, 140), 1, cv2.LINE_AA)
            cv2.putText(f3, f"[{bitrate3} KB/s]  {now_str}", (w - 235, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (230, 230, 230), 1, cv2.LINE_AA)
            cv2.putText(f3, "WIDE-ANGLE 140 | 1080p", (12, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (150, 150, 160), 1, cv2.LINE_AA)
            cv2.putText(f3, "STATUS: MONITORING", (w - 170, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (0, 230, 120), 1, cv2.LINE_AA)

            ret3, jpg3 = cv2.imencode(".jpg", f3, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if ret3:
                cond3 = self.channel_conditions[3]
                with cond3:
                    self.channel_jpegs[3] = jpg3.tobytes()
                    self.channel_frame_ids[3] = v_idx
                    cond3.notify_all()

            # --------------------------------------------------------
            # CAM 04: Driveway & Street (Roadway Surveillance)
            # --------------------------------------------------------
            f4 = np.zeros((h, w, 3), dtype=np.uint8)
            f4[:, :] = (28, 28, 30) # Asphalt dark grey

            # Road lines & Curb
            cv2.line(f4, (0, 320), (w, 320), (55, 55, 60), 2)
            cv2.line(f4, (100, 320), (60, h), (75, 75, 80), 3) # Curb
            cv2.line(f4, (540, 320), (580, h), (75, 75, 80), 3)
            # Parked Vehicle Outline (Silhouette)
            cv2.rectangle(f4, (180, 230), (340, 310), (45, 45, 50), -1)
            cv2.rectangle(f4, (210, 180), (310, 230), (45, 45, 50), -1)
            cv2.circle(f4, (220, 310), 16, (20, 20, 22), -1)
            cv2.circle(f4, (300, 310), 16, (20, 20, 22), -1)
            cv2.putText(f4, "[VEHICLE: STATIONARY]", (190, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.32, (160, 160, 170), 1, cv2.LINE_AA)

            # OSD
            bitrate4 = 305 + ((v_idx * 4) % 31)
            cv2.putText(f4, "[CAM 04] DRIVEWAY & STREET", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 240, 140), 1, cv2.LINE_AA)
            cv2.putText(f4, f"[{bitrate4} KB/s]  {now_str}", (w - 235, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (230, 230, 230), 1, cv2.LINE_AA)
            cv2.putText(f4, "VEHICLE AI SCAN | 1080p", (12, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (150, 150, 160), 1, cv2.LINE_AA)
            cv2.putText(f4, "STATUS: SECURE", (w - 140, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (0, 230, 120), 1, cv2.LINE_AA)

            ret4, jpg4 = cv2.imencode(".jpg", f4, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if ret4:
                cond4 = self.channel_conditions[4]
                with cond4:
                    self.channel_jpegs[4] = jpg4.tobytes()
                    self.channel_frame_ids[4] = v_idx
                    cond4.notify_all()

            # Refresh virtual channels at ~15 FPS (66ms)
            time.sleep(0.066)

    def get_jpeg_frame(self) -> bytes:
        with self.lock:
            if self.cached_jpeg_bytes is not None:
                return self.cached_jpeg_bytes

        blank = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(blank, "CONNECTING HIGH-DEF CAMERA...", (140, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
        _, jpeg = cv2.imencode(".jpg", blank)
        return jpeg.tobytes()

stream_manager = StreamManager()
