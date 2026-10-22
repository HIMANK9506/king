import os
import json
import time
import uuid
import secrets
import threading
from typing import Tuple, Optional, Dict, Any
import cv2

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
CAMERAS_CONFIG_FILE = os.path.join(DATA_DIR, "cameras.json")
DEVICE_CONFIG_FILE = os.path.join(DATA_DIR, "device.json")

os.makedirs(DATA_DIR, exist_ok=True)

class CameraNetworkManager:
    def __init__(self):
        self.lock = threading.Lock()
        self.device_info = self._load_or_create_device_info()
        self.connected_cameras: Dict[int, Dict[str, Any]] = self._load_connected_cameras()

    def _load_or_create_device_info(self) -> dict:
        if os.path.exists(DEVICE_CONFIG_FILE):
            try:
                with open(DEVICE_CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "device_code" in data:
                        return data
            except Exception as e:
                print(f"[CameraNetwork] Failed to read device config: {e}")

        # Generate persistent 8-character tactical device code (e.g. GRD-7821-X9)
        suffix = secrets.token_hex(2).upper()
        digits = secrets.randbelow(9000) + 1000
        device_code = f"GRD-{digits}-{suffix}"
        device_id = str(uuid.uuid4())

        data = {
            "device_id": device_id,
            "device_code": device_code,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        try:
            with open(DEVICE_CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[CameraNetwork] Failed to save device config: {e}")

        return data

    def _load_connected_cameras(self) -> Dict[int, Dict[str, Any]]:
        if os.path.exists(CAMERAS_CONFIG_FILE):
            try:
                with open(CAMERAS_CONFIG_FILE, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    # Convert string keys to int
                    return {int(k): v for k, v in raw.items()}
            except Exception as e:
                print(f"[CameraNetwork] Failed to read cameras config: {e}")
        return {}

    def _save_connected_cameras(self):
        try:
            with open(CAMERAS_CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump({str(k): v for k, v in self.connected_cameras.items()}, f, indent=2)
        except Exception as e:
            print(f"[CameraNetwork] Failed to save cameras config: {e}")

    def get_device_code(self) -> str:
        return self.device_info.get("device_code", "GRD-0000-XX")

    def verify_code(self, input_code: str) -> bool:
        if not input_code:
            return False
        clean_input = input_code.strip().upper().replace(" ", "")
        actual_code = self.get_device_code().upper().replace(" ", "")
        # Allow matching either full code (e.g. GRD-7821-X9) or trailing portion
        return clean_input == actual_code or clean_input in actual_code

    def build_stream_url(
        self,
        ip_address: str,
        port: int = 554,
        unique_code: str = "",
        protocol: str = "RTSP",
        stream_path: Optional[str] = None,
        username: str = "admin"
    ) -> str:
        ip = ip_address.strip()
        user = username.strip() if username else "admin"
        code = unique_code.strip()

        # If user entered an entire URL (e.g. rtsp:// or http://), use it directly
        if ip.startswith("rtsp://") or ip.startswith("http://"):
            return ip

        protocol_upper = protocol.strip().upper()

        if protocol_upper == "RTSP":
            path = stream_path.strip().lstrip("/") if stream_path else "h264Preview_01_main"
            if code:
                return f"rtsp://{user}:{code}@{ip}:{port}/{path}"
            return f"rtsp://{ip}:{port}/{path}"

        elif protocol_upper == "HTTP_MJPEG":
            path = stream_path.strip().lstrip("/") if stream_path else "video.mjpg"
            if code:
                return f"http://{user}:{code}@{ip}:{port}/{path}"
            return f"http://{ip}:{port}/{path}"

        # Default fallback to RTSP
        return f"rtsp://{ip}:{port}/{stream_path or 'live.sdp'}"

    def test_camera_connection(self, stream_url: str, timeout_sec: float = 3.0) -> Tuple[bool, str]:
        """
        Quickly probes the target camera stream using OpenCV with buffer size 1.
        Runs in a worker thread to enforce strict timeout.
        """
        result = {"success": False, "message": "Connection attempt timed out."}

        def probe():
            try:
                cap = cv2.VideoCapture(stream_url)
                if cap.isOpened():
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    ret, frame = cap.read()
                    if ret and frame is not None and frame.size > 0:
                        h, w = frame.shape[:2]
                        result["success"] = True
                        result["message"] = f"Handshake verified! Stream active ({w}x{h} resolution)."
                    else:
                        result["message"] = "Connected to camera socket, but no valid video frames received."
                    cap.release()
                else:
                    result["message"] = "Failed to open camera stream. Check IP, Port, and Unique Code / Password."
            except Exception as e:
                result["message"] = f"Stream probe error: {str(e)}"

        thread = threading.Thread(target=probe, daemon=True)
        thread.start()
        thread.join(timeout=timeout_sec)

        return result["success"], result["message"]

    def bind_camera_to_channel(
        self,
        channel_id: int,
        ip_address: str,
        port: int,
        unique_code: str,
        camera_name: str,
        protocol: str = "RTSP",
        stream_path: Optional[str] = None,
        username: str = "admin"
    ) -> Tuple[bool, str, str]:
        with self.lock:
            stream_url = self.build_stream_url(
                ip_address=ip_address,
                port=port,
                unique_code=unique_code,
                protocol=protocol,
                stream_path=stream_path,
                username=username
            )

            # Test connection
            is_valid, msg = self.test_camera_connection(stream_url, timeout_sec=2.5)

            # Store configuration regardless of whether camera is currently online or offline
            # (Allows pre-configuring IP cameras that might turn on later)
            self.connected_cameras[channel_id] = {
                "channel_id": channel_id,
                "ip_address": ip_address,
                "port": port,
                "unique_code": unique_code,
                "camera_name": camera_name,
                "protocol": protocol,
                "stream_path": stream_path,
                "username": username,
                "stream_url": stream_url,
                "last_tested": time.strftime("%Y-%m-%d %H:%M:%S"),
                "is_active": True,
            }
            self._save_connected_cameras()

            return is_valid, stream_url, msg

    def unbind_channel(self, channel_id: int) -> bool:
        with self.lock:
            if channel_id in self.connected_cameras:
                del self.connected_cameras[channel_id]
                self._save_connected_cameras()
                return True
            return False

    def get_channel_config(self, channel_id: int) -> Optional[dict]:
        with self.lock:
            return self.connected_cameras.get(channel_id)

camera_network_manager = CameraNetworkManager()
