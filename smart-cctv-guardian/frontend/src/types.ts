export type SystemMode = 'ARMED' | 'DISARMED' | 'NIGHT_MODE';

export type EventType =
  | 'ZONE_INTRUSION'
  | 'BOUNDARY_CROSSING'
  | 'SUSPICIOUS_LOITERING'
  | 'REPEATED_APPROACH'
  | 'WEAPON_DETECTED'
  | 'HANDHELD_ITEM_DETECTED'
  | 'SUSPICIOUS_POSE'
  | 'UNKNOWN_INTRUDER'
  | 'AUTHORIZED_PERSON'
  | 'PET_FILTERED';

export type EventSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export interface RestrictedZoneConfig {
  enabled: boolean;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface VirtualBoundaryConfig {
  enabled: boolean;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SecurityRulesConfig {
  zone: RestrictedZoneConfig;
  boundary: VirtualBoundaryConfig;
  loitering_threshold_sec: number;
  persistence_threshold_frames: number;
  confidence_threshold: number;
  pet_filtering_enabled: boolean;
  vehicle_detection_enabled: boolean;
  handheld_detection_enabled?: boolean;
  pose_detection_enabled?: boolean;
  face_recognition_enabled?: boolean;
  suppress_authorized_faces?: boolean;
}

export interface CameraChannelInfo {
  id: number;
  name: string;
  location: string;
  status: string;
  bitrate_kbps: number;
  fps: number;
  active_breach?: boolean;
}

export interface SystemStatus {
  mode: SystemMode;
  camera_source: string;
  camera_name: string;
  is_connected: boolean;
  fps: number;
  inference_latency_ms: number;
  active_presence_sec: number;
  person_in_frame: boolean;
  tracked_persons_count: number;
  detected_held_items?: string[];
  last_alert: string | null;
  email_alerts_enabled: boolean;
  mirror_feed?: boolean;
  rules?: SecurityRulesConfig;
  authorized_faces_count?: number;
  recognized_person_name?: string | null;
  detected_behavior?: string | null;
  local_ip?: string;
  mobile_app_url?: string;
  cameras?: CameraChannelInfo[];
}

export interface EnrolledFaceRecord {
  id: string;
  name: string;
  enrolled_at: string;
  thumbnail_url: string;
}

export interface IncidentRecord {
  id: string;
  timestamp: string;
  camera_name: string;
  event_type: EventType;
  severity: EventSeverity;
  track_id?: number | null;
  confidence: number;
  dwell_time_sec: number;
  held_item_name?: string | null;
  snapshot_url: string;
  details: string;
}

export interface VideoRecordingItem {
  id: string;
  createdAt: number;
  cameraName: string;
  durationSec: number;
  blob: Blob;
  blobUrl: string;
  triggerEvent?: string;
  sizeBytes: number;
}

export interface CameraConnectRequest {
  channel_id: number;
  ip_address: string;
  port: number;
  unique_code: string;
  camera_name: string;
  protocol: 'RTSP' | 'HTTP_MJPEG' | 'CUSTOM';
  stream_path?: string;
  username?: string;
}

export interface CameraConnectResponse {
  success: boolean;
  channel_id: number;
  camera_name: string;
  stream_url: string;
  message: string;
}

export interface SystemDeviceCodeInfo {
  device_id: string;
  device_code: string;
  local_ip: string;
  web_url: string;
  active_channels: number;
  created_at: string;
}
