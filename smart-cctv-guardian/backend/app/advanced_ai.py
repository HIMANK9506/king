import os
import time
import math
import json
import uuid
from typing import List, Dict, Tuple, Optional
import cv2
import numpy as np
from ultralytics import YOLO

# Model Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")
FACES_DIR = os.path.join(DATA_DIR, "faces")
FACES_JSON_PATH = os.path.join(DATA_DIR, "faces.json")

os.makedirs(FACES_DIR, exist_ok=True)

# COCO 17 Pose Keypoint Indices
NOSE = 0
LEFT_EYE, RIGHT_EYE = 1, 2
LEFT_EAR, RIGHT_EAR = 3, 4
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_ELBOW, RIGHT_ELBOW = 7, 8
LEFT_WRIST, RIGHT_WRIST = 9, 10
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

SKELETON_PAIRS = [
    (0, 1), (0, 2), (1, 3), (2, 4), # Head
    (5, 6),                         # Shoulders
    (5, 7), (7, 9),                 # Left arm
    (6, 8), (8, 10),                # Right arm
    (5, 11), (6, 12), (11, 12),     # Torso
    (11, 13), (13, 15),             # Left leg
    (12, 14), (14, 16)              # Right leg
]

class PoseBehaviorAnalyzer:
    """
    AI Pose & Suspicious Behavior Recognition using YOLOv8n-pose.
    Analyzes 17 human skeletal keypoints at edge speed to detect:
    - Hands raised / threat stance / aggression
    - Crouching / sneaking to bypass security tripwires
    - Sudden fall / slip emergency
    - Normal standing / upright patrol
    """
    def __init__(self):
        pose_weights = os.path.join(BASE_DIR, "yolov8n-pose.pt")
        if not os.path.exists(pose_weights):
            pose_weights = "yolov8n-pose.pt"
        print(f"[PoseAnalyzer] Loading YOLOv8 nano pose model ({pose_weights})...")
        self.model = YOLO(pose_weights)
        self.last_behaviors: Dict[int, str] = {}

    def analyze_poses(self, frame: np.ndarray, conf: float = 0.40) -> List[dict]:
        """
        Runs pose estimation and classifies human behavior with fast 384 inference.
        """
        results = self.model(frame, conf=conf, imgsz=384, verbose=False)
        pose_detections = []

        if not results or len(results) == 0:
            return pose_detections

        r = results[0]
        if not hasattr(r, 'keypoints') or r.keypoints is None:
            return pose_detections

        boxes = r.boxes.xyxy.cpu().numpy() if r.boxes is not None else []
        confs = r.boxes.conf.cpu().numpy() if r.boxes is not None else []
        kpts_data = r.keypoints.data.cpu().numpy() # [N, 17, 3] (x, y, conf)

        for i in range(len(kpts_data)):
            kpts = kpts_data[i] # 17 keypoints
            bbox = [int(v) for v in boxes[i]] if i < len(boxes) else [0, 0, 0, 0]
            box_conf = float(confs[i]) if i < len(confs) else 0.0

            behavior, confidence, alert_desc = self._classify_behavior(kpts, bbox)

            pose_detections.append({
                "bbox": bbox,
                "confidence": box_conf,
                "keypoints": kpts,
                "behavior": behavior,
                "is_suspicious": behavior in ["HANDS_RAISED", "CROUCHING_OR_SNEAKING", "FALL_DETECTED"],
                "alert_description": alert_desc
            })

        return pose_detections

    def _classify_behavior(self, kpts: np.ndarray, bbox: List[int]) -> Tuple[str, float, str]:
        """
        Classifies behavioral anomalies using skeletal geometry.
        """
        # Check wrist and shoulder elevations
        lw, rw = kpts[LEFT_WRIST], kpts[RIGHT_WRIST]
        ls, rs = kpts[LEFT_SHOULDER], kpts[RIGHT_SHOULDER]
        nose = kpts[NOSE]
        lh, rh = kpts[LEFT_HIP], kpts[RIGHT_HIP]
        lk, rk = kpts[LEFT_KNEE], kpts[RIGHT_KNEE]
        la, ra = kpts[LEFT_ANKLE], kpts[RIGHT_ANKLE]

        # 1. Hands Raised (Surrender / Aggression / Threat Stance)
        # Wrist is higher on image (lower y value) than head/nose or shoulders
        hands_up_left = (lw[2] > 0.35 and ls[2] > 0.35 and lw[1] < ls[1] - 15)
        hands_up_right = (rw[2] > 0.35 and rs[2] > 0.35 and rw[1] < rs[1] - 15)
        
        if (hands_up_left and hands_up_right) or (lw[2] > 0.35 and nose[2] > 0.35 and lw[1] < nose[1]) or (rw[2] > 0.35 and nose[2] > 0.35 and rw[1] < nose[1]):
            return "HANDS_RAISED", 0.90, "⚠️ Threat/Surrender Posture: Hands Raised Above Shoulders"

        # 2. Slip / Fall Down Emergency
        # Check if head and hips are at approximately the same height (horizontal orientation)
        bw = max(1, bbox[2] - bbox[0])
        bh = max(1, bbox[3] - bbox[1])
        if (nose[2] > 0.35 and (lh[2] > 0.35 or rh[2] > 0.35)):
            hip_y = (lh[1] + rh[1]) / 2 if (lh[2] > 0.35 and rh[2] > 0.35) else (lh[1] if lh[2] > 0.35 else rh[1])
            vert_diff = abs(nose[1] - hip_y)
            horiz_diff = abs(nose[0] - (lh[0] + rh[0]) / 2)
            if vert_diff < 40 and horiz_diff > 45 and bw > bh:
                return "FALL_DETECTED", 0.88, "🚨 Fall Detected: Subject is horizontal on floor"

        # 3. Crouching / Sneaking to avoid perimeter tripwires
        if ls[2] > 0.35 and rs[2] > 0.35 and lh[2] > 0.35 and rh[2] > 0.35:
            shoulder_y = (ls[1] + rs[1]) / 2
            hip_y = (lh[1] + rh[1]) / 2
            torso_len = abs(hip_y - shoulder_y)
            
            # If knees/ankles are compressed or bounding box aspect ratio is squat (bh/bw < 1.1)
            aspect_ratio = bh / bw
            if aspect_ratio < 1.15 and torso_len > 25:
                return "CROUCHING_OR_SNEAKING", 0.85, "⚠️ Suspicious Crawling/Crouching Posture"

        return "STANDING", 0.95, "Normal Upright Posture"

    def draw_tactical_skeleton(self, frame: np.ndarray, kpts: np.ndarray, color=(0, 240, 255), thickness=2):
        """
        Draws high-tech glowing tactical skeleton lines and joints on person.
        """
        # Draw skeleton bone lines
        for pt1_idx, pt2_idx in SKELETON_PAIRS:
            pt1 = kpts[pt1_idx]
            pt2 = kpts[pt2_idx]
            if pt1[2] > 0.40 and pt2[2] > 0.40:
                p1 = (int(pt1[0]), int(pt1[1]))
                p2 = (int(pt2[0]), int(pt2[1]))
                cv2.line(frame, p1, p2, (20, 20, 20), thickness + 2, cv2.LINE_AA)
                cv2.line(frame, p1, p2, color, thickness, cv2.LINE_AA)

        # Draw glowing joint points
        for idx in range(17):
            pt = kpts[idx]
            if pt[2] > 0.40:
                cx, cy = int(pt[0]), int(pt[1])
                cv2.circle(frame, (cx, cy), 4, (10, 10, 10), -1, cv2.LINE_AA)
                cv2.circle(frame, (cx, cy), 3, (255, 255, 255), -1, cv2.LINE_AA)


class FaceRecognitionManager:
    """
    AI Face Recognition with YuNet (Detector) and SFace (128-d Feature Extractor).
    Maintains an authorized whitelist database to distinguish Authorized Residents from Unknown Intruders.
    """
    def __init__(self):
        yunet_path = os.path.join(MODELS_DIR, "yunet.onnx")
        sface_path = os.path.join(MODELS_DIR, "sface.onnx")

        print(f"[FaceRecognition] Initializing YuNet ({yunet_path}) and SFace ({sface_path})...")
        self.detector = cv2.FaceDetectorYN.create(yunet_path, "", (320, 320), 0.65, 0.3)
        self.recognizer = cv2.FaceRecognizerSF.create(sface_path, "")
        self.enrolled_faces: List[dict] = []
        self._load_enrolled_faces()

    def _load_enrolled_faces(self):
        """Loads saved face whitelist embeddings from JSON."""
        if os.path.exists(FACES_JSON_PATH):
            try:
                with open(FACES_JSON_PATH, "r", encoding="utf-8") as f:
                    self.enrolled_faces = json.load(f)
                print(f"[FaceRecognition] Loaded {len(self.enrolled_faces)} authorized face profiles.")
            except Exception as e:
                print(f"[FaceRecognition] Error loading faces: {e}")
                self.enrolled_faces = []
        else:
            self.enrolled_faces = []

    def _save_enrolled_faces(self):
        """Persists face whitelist to disk."""
        with open(FACES_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(self.enrolled_faces, f, indent=2)

    def enroll_face(self, name: str, frame: np.ndarray) -> Optional[dict]:
        """
        Enrolls a new authorized face from the current frame.
        """
        h, w, _ = frame.shape
        self.detector.setInputSize((w, h))
        _, faces = self.detector.detect(frame)

        if faces is None or len(faces) == 0:
            return None

        # Pick largest face
        largest_face = max(faces, key=lambda f: f[2] * f[3])
        fx, fy, fw, fh = int(largest_face[0]), int(largest_face[1]), int(largest_face[2]), int(largest_face[3])

        # Align and extract 128-d feature
        aligned_face = self.recognizer.alignCrop(frame, largest_face)
        feature = self.recognizer.feature(aligned_face) # [1, 128]
        feature_list = feature.flatten().tolist()

        face_id = "face_" + str(uuid.uuid4())[:8]
        crop_path = os.path.join(FACES_DIR, f"{face_id}.jpg")

        # Save thumbnail crop
        pad_x = int(fw * 0.15)
        pad_y = int(fh * 0.15)
        x1 = max(0, fx - pad_x)
        y1 = max(0, fy - pad_y)
        x2 = min(w, fx + fw + pad_x)
        y2 = min(h, fy + fh + pad_y)
        face_crop = frame[y1:y2, x1:x2]
        if face_crop.size > 0:
            cv2.imwrite(crop_path, face_crop)

        new_record = {
            "id": face_id,
            "name": name.strip() or "Authorized Resident",
            "enrolled_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "thumbnail_url": f"/faces/{face_id}.jpg",
            "embedding": feature_list
        }

        self.enrolled_faces.append(new_record)
        self._save_enrolled_faces()
        print(f"[FaceRecognition] Successfully enrolled authorized face: {new_record['name']} (ID: {face_id})")
        return {
            "id": new_record["id"],
            "name": new_record["name"],
            "enrolled_at": new_record["enrolled_at"],
            "thumbnail_url": new_record["thumbnail_url"]
        }

    def list_faces(self) -> List[dict]:
        """Returns public metadata of all authorized faces."""
        return [
            {
                "id": f["id"],
                "name": f["name"],
                "enrolled_at": f.get("enrolled_at", ""),
                "thumbnail_url": f.get("thumbnail_url", "")
            }
            for f in self.enrolled_faces
        ]

    def delete_face(self, face_id: str) -> bool:
        """Removes an authorized face from whitelist."""
        orig_len = len(self.enrolled_faces)
        self.enrolled_faces = [f for f in self.enrolled_faces if f["id"] != face_id]
        if len(self.enrolled_faces) < orig_len:
            self._save_enrolled_faces()
            thumb_path = os.path.join(FACES_DIR, f"{face_id}.jpg")
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
            return True
        return False

    def identify_faces(self, frame: np.ndarray, match_thresh: float = 0.42) -> List[dict]:
        """
        Detects faces in frame and compares them against the authorized whitelist.
        Returns matched identity and authorization status.
        """
        if not self.enrolled_faces:
            return []

        h, w, _ = frame.shape
        scale_x = 1.0
        scale_y = 1.0
        detect_frame = frame

        if w > 640:
            target_w = 640
            target_h = int(640 * h / w)
            detect_frame = cv2.resize(frame, (target_w, target_h))
            scale_x = w / target_w
            scale_y = h / target_h
            self.detector.setInputSize((target_w, target_h))
        else:
            self.detector.setInputSize((w, h))

        _, faces = self.detector.detect(detect_frame)

        results = []
        if faces is None or len(faces) == 0:
            return results

        for face in faces:
            scaled_face = face.copy()
            scaled_face[0] *= scale_x
            scaled_face[1] *= scale_y
            scaled_face[2] *= scale_x
            scaled_face[3] *= scale_y
            for k in range(4, 14, 2):
                scaled_face[k] *= scale_x
                scaled_face[k + 1] *= scale_y

            fx, fy, fw, fh = int(scaled_face[0]), int(scaled_face[1]), int(scaled_face[2]), int(scaled_face[3])
            score = float(face[14])

            if score < 0.60:
                continue

            aligned_face = self.recognizer.alignCrop(frame, scaled_face)
            curr_feature = self.recognizer.feature(aligned_face)

            best_match_name = "UNKNOWN INTRUDER"
            best_sim = 0.0
            is_authorized = False

            for enrolled in self.enrolled_faces:
                saved_feat = np.array(enrolled["embedding"], dtype=np.float32).reshape(1, 128)
                sim = float(self.recognizer.match(curr_feature, saved_feat, cv2.FaceRecognizerSF_FR_COSINE))
                if sim > best_sim:
                    best_sim = sim
                    if sim >= match_thresh:
                        best_match_name = enrolled["name"]
                        is_authorized = True

            results.append({
                "bbox": [fx, fy, fx + fw, fy + fh],
                "confidence": score,
                "is_authorized": is_authorized,
                "name": best_match_name,
                "similarity": round(best_sim, 2)
            })

        return results

advanced_pose_analyzer = PoseBehaviorAnalyzer()
advanced_face_manager = FaceRecognitionManager()
