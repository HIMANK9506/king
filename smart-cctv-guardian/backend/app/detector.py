import time
import math
from typing import Dict, List, Tuple, Optional
import cv2
import numpy as np
from ultralytics import YOLO

from app.config import config
from app.models import SystemMode, EventType, EventSeverity, SecurityRulesConfig
from app.advanced_ai import advanced_pose_analyzer, advanced_face_manager

# COCO Class IDs
CLASS_PERSON = 0
PET_CLASSES = {15: "cat", 16: "dog", 14: "bird", 17: "horse", 18: "sheep", 19: "cow"}
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

# Handheld & Everyday Items detectable by YOLOv8 COCO
HANDHELD_CLASSES = {
    67: "cell phone",
    43: "knife",
    76: "scissors",
    39: "bottle",
    41: "cup",
    24: "backpack",
    26: "handbag",
    63: "laptop",
    73: "book",
    28: "umbrella"
}

# Strict confidence thresholds to prevent false positives (especially phone on squares/books)
ITEM_MIN_CONFIDENCE = {
    "cell phone": 0.65,  # High threshold: eliminates squarish false alarms
    "knife": 0.45,
    "scissors": 0.45,
    "bottle": 0.50,
    "cup": 0.50,
    "laptop": 0.60,
    "backpack": 0.55,
    "handbag": 0.55,
    "book": 0.60,
    "umbrella": 0.55
}

WEAPON_CLASSES = {"knife", "scissors"}

def ccw(A, B, C):
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])

def segments_intersect(A, B, C, D):
    return (ccw(A, C, D) != ccw(B, C, D)) and (ccw(A, B, C) != ccw(A, B, D))

def boxes_overlap(boxA, boxB):
    # Determine if boxA and boxB overlap
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interArea = max(0, xB - xA) * max(0, yB - yA)
    return interArea > 0

def is_item_held_by_hand(item_box, pose_keypoints, person_box):
    """
    Ensures an object is actually near the person's hands/wrists,
    preventing arbitrary objects on desks or floors from being tagged as held.
    """
    if not boxes_overlap(person_box, item_box):
        return False

    # If pose keypoints are available, test proximity to wrists (Keypoints 9 & 10)
    if pose_keypoints is not None and len(pose_keypoints) >= 11:
        lw = pose_keypoints[9]   # [x, y, conf]
        rw = pose_keypoints[10]  # [x, y, conf]

        icx = (item_box[0] + item_box[2]) / 2
        icy = (item_box[1] + item_box[3]) / 2

        wrist_nearby = False
        if lw[2] > 0.30:
            if math.hypot(icx - lw[0], icy - lw[1]) <= 95:
                wrist_nearby = True
        if rw[2] > 0.30:
            if math.hypot(icx - rw[0], icy - rw[1]) <= 95:
                wrist_nearby = True

        if (lw[2] > 0.30 or rw[2] > 0.30) and not wrist_nearby:
            return False

    return True

class TrackedObject:
    def __init__(self, track_id: int, class_id: int, class_name: str, bbox: List[int], conf: float):
        self.track_id = track_id
        self.class_id = class_id
        self.class_name = class_name
        self.bbox = bbox # [x1, y1, x2, y2]
        self.conf = conf
        self.centroid = ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)
        self.bottom_center = ((bbox[0] + bbox[2]) // 2, bbox[3])
        
        self.history: List[Tuple[int, int]] = [self.bottom_center]
        self.first_seen = time.time()
        self.last_seen = time.time()
        self.hits = 1
        self.time_in_zone = 0.0
        self.inside_zone = False
        self.crossed_boundary = False
        self.zone_entry_count = 0
        
        # Handheld items attached to this person
        self.held_items: List[dict] = []
        self.alerted_events: set[EventType] = set()

        # Advanced AI: Pose & Behavioral tracking (Option 2)
        self.pose_behavior: str = "STANDING"
        self.is_suspicious_pose: bool = False
        self.pose_keypoints: Optional[np.ndarray] = None
        self.pose_description: str = "Normal Posture"

        # Advanced AI: Facial Recognition & Authorization (Option 3)
        self.is_authorized: bool = False
        self.person_name: str = "Unknown"
        self.face_similarity: float = 0.0
        self.face_bbox: Optional[List[int]] = None
        self.last_face_time: float = 0.0
        self.last_pose_time: float = 0.0

    def update(self, bbox: List[int], conf: float, dt: float, in_zone: bool):
        self.bbox = bbox
        self.conf = conf
        self.centroid = ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)
        self.bottom_center = ((bbox[0] + bbox[2]) // 2, bbox[3])
        
        self.history.append(self.bottom_center)
        if len(self.history) > 30:
            self.history.pop(0)

        self.last_seen = time.time()
        self.hits += 1

        if in_zone:
            if not self.inside_zone:
                self.zone_entry_count += 1
            self.inside_zone = True
            self.time_in_zone += dt
        else:
            self.inside_zone = False

class IntruderDetector:
    def __init__(self):
        print("[Detector] Loading YOLOv8 nano model for tracking and handheld item recognition...")
        self.model = YOLO("yolov8n.pt")
        
        self.tracks: Dict[int, TrackedObject] = {}
        self.next_track_id = 1
        self.last_frame_time = time.time()
        self.inference_latency_ms = 0.0
        self.detected_held_item_names: List[str] = []
        self.current_behavior: str = "Standing (Upright)"
        self.recognized_person_name: Optional[str] = None
        self.frame_count: int = 0

        # Target classes: Person + Pets + Vehicles + Handheld Items
        self.target_classes = [CLASS_PERSON] + list(PET_CLASSES.keys()) + list(VEHICLE_CLASSES.keys()) + list(HANDHELD_CLASSES.keys())

    def process_frame(self, frame: np.ndarray, system_mode: SystemMode):
        t_start = time.time()
        now = t_start
        dt = max(0.001, min(0.2, now - self.last_frame_time))
        self.last_frame_time = now
        self.frame_count += 1

        h, w, _ = frame.shape
        rules = config.rules

        zone_px = (
            int(rules.zone.x1 * w), int(rules.zone.y1 * h),
            int(rules.zone.x2 * w), int(rules.zone.y2 * h)
        )
        line_px = (
            (int(rules.boundary.x1 * w), int(rules.boundary.y1 * h)),
            (int(rules.boundary.x2 * w), int(rules.boundary.y2 * h))
        )

        # 1. Run YOLOv8 Multi-Class Inference
        inference_conf = min(rules.confidence_threshold, 0.38)
        results = self.model(
            frame,
            classes=self.target_classes,
            conf=inference_conf,
            imgsz=416,
            verbose=False
        )

        self.inference_latency_ms = (time.time() - t_start) * 1000.0

        person_dets = []
        handheld_dets = []
        other_dets = []

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])

                if cls_id == CLASS_PERSON and conf >= rules.confidence_threshold:
                    person_dets.append({
                        "bbox": [x1, y1, x2, y2],
                        "class_id": cls_id,
                        "class_name": "person",
                        "conf": conf,
                        "bottom_center": ((x1 + x2) // 2, y2)
                    })
                elif cls_id in HANDHELD_CLASSES:
                    c_name = HANDHELD_CLASSES[cls_id]
                    min_conf = ITEM_MIN_CONFIDENCE.get(c_name, 0.50)
                    if conf < min_conf:
                        continue

                    bw = max(1, x2 - x1)
                    bh = max(1, y2 - y1)

                    # Strict anti-square rejection filter for Cell Phones:
                    if c_name == "cell phone":
                        aspect_ratio = max(bw, bh) / min(bw, bh)
                        # Real smartphones have an elongated rectangular aspect ratio (>= 1.42).
                        # Discard square shapes, coasters, wallets, remotes, books:
                        if aspect_ratio < 1.42:
                            continue
                        # Discard huge items (a phone in hand shouldn't be larger than 35% of frame)
                        if bw > w * 0.35 or bh > h * 0.35:
                            continue

                    handheld_dets.append({
                        "bbox": [x1, y1, x2, y2],
                        "class_id": cls_id,
                        "class_name": c_name,
                        "conf": conf,
                        "centroid": ((x1 + x2) // 2, (y1 + y2) // 2)
                    })
                elif cls_id in PET_CLASSES and conf >= rules.confidence_threshold:
                    other_dets.append({
                        "bbox": [x1, y1, x2, y2],
                        "class_id": cls_id,
                        "class_name": PET_CLASSES[cls_id],
                        "conf": conf
                    })

        # 2. Update Multi-Object Tracking
        self._update_tracks(person_dets, dt, zone_px, rules.zone.enabled)

        # 3. Associate Handheld Objects with Tracked Persons (Wrist Proximity Verified)
        current_held_names = []
        for track in self.tracks.values():
            track.held_items = []
            for item in handheld_dets:
                if is_item_held_by_hand(item["bbox"], track.pose_keypoints, track.bbox):
                    track.held_items.append(item)
                    current_held_names.append(item["class_name"])

        self.detected_held_item_names = list(set(current_held_names))

        # ============================================================
        # 4. OPTION 2: AI Human Pose & Behavioral Analysis (Decimated for 30 FPS)
        # ============================================================
        triggered_events = []
        should_run_pose = (self.frame_count % 2 == 0) or any(t.pose_keypoints is None for t in self.tracks.values() if t.class_name == "person")
        if getattr(rules, 'pose_detection_enabled', True) and person_dets and should_run_pose:
            try:
                pose_results = advanced_pose_analyzer.analyze_poses(frame, conf=0.35)
                for p_res in pose_results:
                    p_box = p_res["bbox"]
                    for track in self.tracks.values():
                        if track.class_name == "person" and boxes_overlap(track.bbox, p_box):
                            track.pose_behavior = p_res["behavior"]
                            track.pose_keypoints = p_res["keypoints"]
                            track.is_suspicious_pose = p_res["is_suspicious"]
                            track.pose_description = p_res["alert_description"]
                            track.last_pose_time = now

                            if track.is_suspicious_pose and EventType.SUSPICIOUS_POSE not in track.alerted_events:
                                triggered_events.append({
                                    "event_type": EventType.SUSPICIOUS_POSE,
                                    "severity": EventSeverity.HIGH if track.pose_behavior != "FALL_DETECTED" else EventSeverity.CRITICAL,
                                    "track_id": track.track_id,
                                    "confidence": p_res["confidence"],
                                    "dwell_time": round(track.time_in_zone, 1),
                                    "details": f"🚨 Posture Alert: Track #{track.track_id} — {track.pose_description}"
                                })
                                track.alerted_events.add(EventType.SUSPICIOUS_POSE)
                            break
            except Exception as e:
                print(f"[Detector] Pose analysis error: {e}")

        # ============================================================
        # 5. OPTION 3: AI Facial Recognition (Throttled & Cached for High FPS)
        # ============================================================
        active_recognized_name = None
        has_unverified = any(not t.is_authorized and (now - t.last_face_time > 1.2) for t in self.tracks.values() if t.class_name == "person")
        should_run_face = (self.frame_count % 12 == 0) or has_unverified
        if getattr(rules, 'face_recognition_enabled', True) and person_dets and should_run_face:
            try:
                face_results = advanced_face_manager.identify_faces(frame)
                for f_res in face_results:
                    f_box = f_res["bbox"]
                    for track in self.tracks.values():
                        if track.class_name == "person" and boxes_overlap(track.bbox, f_box):
                            track.last_face_time = now
                            track.is_authorized = f_res["is_authorized"]
                            track.person_name = f_res["name"]
                            track.face_similarity = f_res["similarity"]
                            track.face_bbox = f_box

                            if track.is_authorized:
                                active_recognized_name = track.person_name
                                if EventType.AUTHORIZED_PERSON not in track.alerted_events:
                                    triggered_events.append({
                                        "event_type": EventType.AUTHORIZED_PERSON,
                                        "severity": EventSeverity.INFO,
                                        "track_id": track.track_id,
                                        "confidence": track.face_similarity,
                                        "dwell_time": round(track.time_in_zone, 1),
                                        "details": f"🟢 Verified Resident: {track.person_name} identified ({int(track.face_similarity*100)}%)"
                                    })
                                    track.alerted_events.add(EventType.AUTHORIZED_PERSON)
                            break
            except Exception as e:
                print(f"[Detector] Face recognition error: {e}")
        else:
            # Maintain active recognized resident name from cached authorized tracks
            for track in self.tracks.values():
                if track.class_name == "person" and track.is_authorized:
                    active_recognized_name = track.person_name
                    break

        self.recognized_person_name = active_recognized_name
        active_behaviors = [t.pose_behavior for t in self.tracks.values() if t.class_name == "person"]
        self.current_behavior = active_behaviors[0] if active_behaviors else "Standing (Upright)"

        # 6. Evaluate Security Rules
        person_in_frame = False
        active_presence_sec = 0.0

        for track_id, track in list(self.tracks.items()):
            if track.class_name == "person":
                person_in_frame = True
                active_presence_sec = max(active_presence_sec, now - track.first_seen)

                # Check if this person is verified as authorized resident
                suppress_alarms = track.is_authorized and getattr(rules, 'suppress_authorized_faces', True)

                # Check for Weapons / Dangerous items in hand
                for item in track.held_items:
                    if item["class_name"] in WEAPON_CLASSES:
                        if EventType.WEAPON_DETECTED not in track.alerted_events:
                            triggered_events.append({
                                "event_type": EventType.WEAPON_DETECTED,
                                "severity": EventSeverity.CRITICAL,
                                "track_id": track.track_id,
                                "confidence": item["conf"],
                                "dwell_time": round(track.time_in_zone, 1),
                                "held_item": item["class_name"],
                                "details": f"🚨 WEAPON DETECTED: Track #{track.track_id} holding {item['class_name'].upper()}"
                            })
                            track.alerted_events.add(EventType.WEAPON_DETECTED)
                    elif rules.handheld_detection_enabled:
                        if EventType.HANDHELD_ITEM_DETECTED not in track.alerted_events:
                            triggered_events.append({
                                "event_type": EventType.HANDHELD_ITEM_DETECTED,
                                "severity": EventSeverity.MEDIUM,
                                "track_id": track.track_id,
                                "confidence": item["conf"],
                                "dwell_time": round(track.time_in_zone, 1),
                                "held_item": item["class_name"],
                                "details": f"Track #{track.track_id} holding {item['class_name']}"
                            })
                            track.alerted_events.add(EventType.HANDHELD_ITEM_DETECTED)

                # Only evaluate zone/tripwire alarms if NOT suppressed by authorized resident identity
                if system_mode in [SystemMode.ARMED, SystemMode.NIGHT_MODE] and not suppress_alarms:
                    # Rule 1: Restricted Zone Entry
                    if rules.zone.enabled and track.inside_zone:
                        if track.hits >= rules.persistence_threshold_frames:
                            if EventType.ZONE_INTRUSION not in track.alerted_events:
                                triggered_events.append({
                                    "event_type": EventType.ZONE_INTRUSION,
                                    "severity": EventSeverity.CRITICAL,
                                    "track_id": track.track_id,
                                    "confidence": track.conf,
                                    "dwell_time": round(track.time_in_zone, 1),
                                    "details": f"Track #{track.track_id} breached {rules.zone.name}"
                                })
                                track.alerted_events.add(EventType.ZONE_INTRUSION)

                    # Rule 2: Virtual Tripwire Boundary Crossing
                    if rules.boundary.enabled and len(track.history) >= 2 and not track.crossed_boundary:
                        p_prev = track.history[-2]
                        p_curr = track.history[-1]
                        if segments_intersect(p_prev, p_curr, line_px[0], line_px[1]):
                            track.crossed_boundary = True
                            if EventType.BOUNDARY_CROSSING not in track.alerted_events:
                                triggered_events.append({
                                    "event_type": EventType.BOUNDARY_CROSSING,
                                    "severity": EventSeverity.HIGH,
                                    "track_id": track.track_id,
                                    "confidence": track.conf,
                                    "dwell_time": round(track.time_in_zone, 1),
                                    "details": f"Track #{track.track_id} crossed {rules.boundary.name}"
                                })
                                track.alerted_events.add(EventType.BOUNDARY_CROSSING)

                    # Rule 3: Suspicious Loitering
                    if track.time_in_zone >= rules.loitering_threshold_sec:
                        if EventType.SUSPICIOUS_LOITERING not in track.alerted_events:
                            triggered_events.append({
                                "event_type": EventType.SUSPICIOUS_LOITERING,
                                "severity": EventSeverity.MEDIUM,
                                "track_id": track.track_id,
                                "confidence": track.conf,
                                "dwell_time": round(track.time_in_zone, 1),
                                "details": f"Track #{track.track_id} loitering ({track.time_in_zone:.1f}s > {rules.loitering_threshold_sec}s)"
                            })
                            track.alerted_events.add(EventType.SUSPICIOUS_LOITERING)

        # 7. Render Crisp High-Visibility HUD & Tactical Corner Brackets
        annotated_frame = self._draw_visual_hud(frame, system_mode, zone_px, line_px, rules, other_dets)

        return (
            annotated_frame,
            person_dets,
            triggered_events,
            round(active_presence_sec, 1),
            person_in_frame,
            len(self.tracks)
        )

    def _update_tracks(self, detections: List[dict], dt: float, zone_px: Tuple[int, int, int, int], zone_enabled: bool):
        now = time.time()
        zx1, zy1, zx2, zy2 = zone_px

        unmatched_dets = []
        for det in detections:
            bc = det["bottom_center"]
            in_zone = zone_enabled and (zx1 <= bc[0] <= zx2 and zy1 <= bc[1] <= zy2)

            best_match_id = None
            best_dist = 110.0

            for tid, track in self.tracks.items():
                d = math.hypot(bc[0] - track.bottom_center[0], bc[1] - track.bottom_center[1])
                if d < best_dist:
                    best_dist = d
                    best_match_id = tid

            if best_match_id is not None:
                self.tracks[best_match_id].update(det["bbox"], det["conf"], dt, in_zone)
            else:
                unmatched_dets.append((det, in_zone))

        for det, in_zone in unmatched_dets:
            new_id = self.next_track_id
            self.next_track_id += 1
            self.tracks[new_id] = TrackedObject(
                track_id=new_id,
                class_id=det["class_id"],
                class_name=det["class_name"],
                bbox=det["bbox"],
                conf=det["conf"]
            )
            self.tracks[new_id].inside_zone = in_zone

        for tid in list(self.tracks.keys()):
            if now - self.tracks[tid].last_seen > 1.2:
                del self.tracks[tid]

    def _draw_tactical_corner_box(self, frame, x1, y1, x2, y2, color, corner_len=20, thickness=2):
        """Draws crisp tactical corner brackets with drop shadow for maximum clarity."""
        cv2.rectangle(frame, (x1, y1), (x2, y2), (20, 20, 20), thickness + 2, cv2.LINE_AA)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1, cv2.LINE_AA)

        # Corner brackets (Top-Left)
        cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, thickness, cv2.LINE_AA)
        cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, thickness, cv2.LINE_AA)

        # Top-Right
        cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, thickness, cv2.LINE_AA)
        cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, thickness, cv2.LINE_AA)

        # Bottom-Left
        cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, thickness, cv2.LINE_AA)
        cv2.line(frame, (x1, y2), (x1, y1 - corner_len), color, thickness, cv2.LINE_AA)

        # Bottom-Right
        cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, thickness, cv2.LINE_AA)
        cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, thickness, cv2.LINE_AA)

    def _draw_visual_hud(self, frame: np.ndarray, system_mode: SystemMode, zone_px, line_px, rules: SecurityRulesConfig, other_dets: List[dict]) -> np.ndarray:
        h, w, _ = frame.shape
        zx1, zy1, zx2, zy2 = zone_px
        l1, l2 = line_px

        overlay = frame.copy()

        # 1. Restricted Zone: ONLY drawn if an intruder is actively breaching it!
        zone_breached = any(t.class_name == "person" and t.inside_zone and not t.is_authorized for t in self.tracks.values())
        if rules.zone.enabled and zone_breached and system_mode in [SystemMode.ARMED, SystemMode.NIGHT_MODE]:
            z_color = (0, 0, 240)
            fill_color = (0, 0, 160)
            cv2.rectangle(overlay, (zx1, zy1), (zx2, zy2), fill_color, -1)
            cv2.rectangle(frame, (zx1, zy1), (zx2, zy2), z_color, 2, cv2.LINE_AA)
            cv2.putText(frame, "🚨 RESTRICTED ZONE BREACH", (zx1 + 10, zy1 + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)

        # 2. Virtual Tripwire: ONLY drawn if an unauthorized person has just crossed it!
        boundary_crossed = any(t.class_name == "person" and t.crossed_boundary and not t.is_authorized for t in self.tracks.values())
        if rules.boundary.enabled and boundary_crossed and system_mode in [SystemMode.ARMED, SystemMode.NIGHT_MODE]:
            cv2.line(frame, l1, l2, (0, 0, 240), 3, cv2.LINE_AA)
            cv2.putText(frame, "🚨 TRIPWIRE CROSSED", (l1[0] + 10, l1[1] - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 0, 255), 2, cv2.LINE_AA)

        # 3. Tracked Persons: Draw Tactical Boxes & AI Overlays
        for track in self.tracks.values():
            if track.class_name != "person":
                continue

            x1, y1, x2, y2 = track.bbox
            has_held_items = len(track.held_items) > 0
            is_breaching = (track.inside_zone or track.crossed_boundary or track.time_in_zone >= 2.0)
            
            # Draw Skeleton if pose is active and anomalous/suspicious
            if track.pose_keypoints is not None:
                if track.is_suspicious_pose:
                    advanced_pose_analyzer.draw_tactical_skeleton(frame, track.pose_keypoints, color=(0, 0, 255), thickness=2)
                elif track.is_authorized:
                    advanced_pose_analyzer.draw_tactical_skeleton(frame, track.pose_keypoints, color=(0, 230, 120), thickness=1)

            # If person is verified as authorized resident
            if track.is_authorized:
                # Emerald Green Authorized Box
                b_color = (0, 220, 100)
                self._draw_tactical_corner_box(frame, x1, y1, x2, y2, b_color, corner_len=20, thickness=2)
                lbl = f"🟢 AUTHORIZED: {track.person_name.upper()} ({int(track.face_similarity * 100)}%)"

                (lw, lh), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(frame, (x1, y1 - 24), (x1 + lw + 14, y1), (15, 25, 15), -1)
                cv2.rectangle(frame, (x1, y1 - 24), (x1 + lw + 14, y1), b_color, 1, cv2.LINE_AA)
                cv2.putText(frame, lbl, (x1 + 6, y1 - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

                # Show posture badge if not standing
                if track.pose_behavior != "STANDING":
                    p_badge = f"POSE: {track.pose_behavior.replace('_', ' ')}"
                    cv2.putText(frame, p_badge, (x1 + 6, y2 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (120, 255, 180), 1, cv2.LINE_AA)

            else:
                # Show red alert box if breaching, holding items, or suspicious posture
                show_alert_box = (system_mode in [SystemMode.ARMED, SystemMode.NIGHT_MODE] and is_breaching) or has_held_items or track.is_suspicious_pose

                if show_alert_box:
                    b_color = (0, 0, 240)
                    self._draw_tactical_corner_box(frame, x1, y1, x2, y2, b_color, corner_len=22, thickness=2)

                    lbl = f"🚨 INTRUDER #{track.track_id} (UNKNOWN)"
                    if track.inside_zone:
                        lbl += f" | IN ZONE: {track.time_in_zone:.1f}s"

                    (lw, lh), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    cv2.rectangle(frame, (x1, y1 - 24), (x1 + lw + 14, y1), (15, 15, 15), -1)
                    cv2.rectangle(frame, (x1, y1 - 24), (x1 + lw + 14, y1), b_color, 1, cv2.LINE_AA)
                    cv2.putText(frame, lbl, (x1 + 6, y1 - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

                    # Show posture alert label
                    if track.is_suspicious_pose:
                        p_badge = f"⚠️ POSE: {track.pose_behavior.replace('_', ' ')}"
                        cv2.putText(frame, p_badge, (x1 + 6, y2 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 180, 255), 1, cv2.LINE_AA)

            # Draw Handheld Items when detected (e.g. Phone, Bottle, Weapon)
            for item in track.held_items:
                ix1, iy1, ix2, iy2 = item["bbox"]
                iname = item["class_name"]
                iconf = int(item["conf"] * 100)
                is_weapon = iname in WEAPON_CLASSES
                
                i_color = (0, 0, 255) if is_weapon else (0, 220, 255)
                cv2.rectangle(frame, (ix1, iy1), (ix2, iy2), i_color, 2, cv2.LINE_AA)
                
                badge = f"⚠️ WEAPON: {iname.upper()} ({iconf}%)" if is_weapon else f"HELD: {iname.upper()} ({iconf}%)"
                (ilw, ilh), _ = cv2.getTextSize(badge, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
                
                cv2.rectangle(frame, (ix1, iy1 - 22), (ix1 + ilw + 10, iy1), (10, 10, 10), -1)
                cv2.rectangle(frame, (ix1, iy1 - 22), (ix1 + ilw + 10, iy1), i_color, 1, cv2.LINE_AA)
                cv2.putText(frame, badge, (ix1 + 5, iy1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.42, i_color, 1, cv2.LINE_AA)

        # Subtle top indicator banner (minimal and clean)
        if zone_breached or boundary_crossed:
            cv2.rectangle(frame, (0, 0), (w, 26), (0, 0, 180), -1)
            cv2.putText(frame, "🚨 SECURITY INTRUSION ACTIVE — UNRECOGNIZED SUBJECT BREACH", (12, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        return frame
