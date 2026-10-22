from enum import Enum
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field

class SystemMode(str, Enum):
    ARMED = "ARMED"
    DISARMED = "DISARMED"
    NIGHT_MODE = "NIGHT_MODE"

class EventType(str, Enum):
    ZONE_INTRUSION = "ZONE_INTRUSION"
    BOUNDARY_CROSSING = "BOUNDARY_CROSSING"
    SUSPICIOUS_LOITERING = "SUSPICIOUS_LOITERING"
    REPEATED_APPROACH = "REPEATED_APPROACH"
    WEAPON_DETECTED = "WEAPON_DETECTED"
    HANDHELD_ITEM_DETECTED = "HANDHELD_ITEM_DETECTED"
    SUSPICIOUS_POSE = "SUSPICIOUS_POSE"
    UNKNOWN_INTRUDER = "UNKNOWN_INTRUDER"
    AUTHORIZED_PERSON = "AUTHORIZED_PERSON"
    PET_FILTERED = "PET_FILTERED"

class EventSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    INFO = "INFO"

class RestrictedZoneConfig(BaseModel):
    enabled: bool = True
    name: str = "Restricted Zone / Doorway"
    x1: float = 0.25
    y1: float = 0.20
    x2: float = 0.75
    y2: float = 0.90

class VirtualBoundaryConfig(BaseModel):
    enabled: bool = True
    name: str = "Perimeter Tripwire"
    x1: float = 0.10
    y1: float = 0.65
    x2: float = 0.90
    y2: float = 0.65

class SecurityRulesConfig(BaseModel):
    zone: RestrictedZoneConfig = Field(default_factory=RestrictedZoneConfig)
    boundary: VirtualBoundaryConfig = Field(default_factory=VirtualBoundaryConfig)
    loitering_threshold_sec: float = 5.0
    persistence_threshold_frames: int = 3
    confidence_threshold: float = 0.45
    pet_filtering_enabled: bool = True
    vehicle_detection_enabled: bool = True
    handheld_detection_enabled: bool = True
    pose_detection_enabled: bool = True
    face_recognition_enabled: bool = True
    suppress_authorized_faces: bool = True

class IncidentRecord(BaseModel):
    id: str
    timestamp: str
    camera_name: str
    event_type: EventType
    severity: EventSeverity
    track_id: Optional[int] = None
    confidence: float
    dwell_time_sec: float = 0.0
    held_item_name: Optional[str] = None
    snapshot_url: str
    details: str

class CameraChannelInfo(BaseModel):
    id: int
    name: str
    location: str
    status: str = "ONLINE"
    bitrate_kbps: int = 295
    fps: float = 30.0
    active_breach: bool = False

class SystemStatus(BaseModel):
    mode: SystemMode
    camera_source: str
    camera_name: str
    is_connected: bool
    fps: float
    inference_latency_ms: float
    active_presence_sec: float
    person_in_frame: bool
    tracked_persons_count: int
    detected_held_items: List[str] = Field(default_factory=list)
    last_alert: Optional[str] = None
    email_alerts_enabled: bool
    mirror_feed: bool = True
    rules: SecurityRulesConfig
    authorized_faces_count: int = 0
    recognized_person_name: Optional[str] = None
    detected_behavior: Optional[str] = None
    local_ip: str = "127.0.0.1"
    mobile_app_url: str = "http://127.0.0.1:5173"
    cameras: List[CameraChannelInfo] = Field(default_factory=list)

class EnrolledFaceRecord(BaseModel):
    id: str
    name: str
    enrolled_at: str
    thumbnail_url: str

class FaceEnrollRequest(BaseModel):
    name: str

class CameraConfigUpdate(BaseModel):
    source: str
    name: Optional[str] = None

class MirrorUpdate(BaseModel):
    enabled: bool

class ModeUpdate(BaseModel):
    mode: SystemMode

class EmailConfigUpdate(BaseModel):
    enable: bool
    sender_email: Optional[str] = None
    sender_app_password: Optional[str] = None
    recipient_email: Optional[str] = None

class CameraConnectRequest(BaseModel):
    channel_id: int = Field(default=1, ge=1, le=4)
    ip_address: str
    port: int = 554
    unique_code: str # Unique Device Code or Security Verification Password
    camera_name: str
    protocol: str = "RTSP" # RTSP, HTTP_MJPEG, CUSTOM
    stream_path: Optional[str] = None
    username: Optional[str] = "admin"

class CameraConnectResponse(BaseModel):
    success: bool
    channel_id: int
    camera_name: str
    stream_url: str
    message: str

class SystemDeviceCodeInfo(BaseModel):
    device_id: str
    device_code: str
    local_ip: str
    web_url: str
    active_channels: int = 4
    created_at: str

class CodeVerificationRequest(BaseModel):
    code: str

class CodeVerificationResponse(BaseModel):
    verified: bool
    message: str
