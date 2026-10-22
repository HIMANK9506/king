import time
import socket
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.config import config
from app.models import (
    SystemMode,
    SystemStatus,
    CameraChannelInfo,
    ModeUpdate,
    MirrorUpdate,
    CameraConfigUpdate,
    EmailConfigUpdate,
    IncidentRecord,
    SecurityRulesConfig,
    EventType,
    EventSeverity,
    EnrolledFaceRecord,
    FaceEnrollRequest
)
from app.detector import IntruderDetector
from app.alerts import alert_service
from app.stream_manager import stream_manager
from app.advanced_ai import advanced_face_manager, FACES_DIR

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Main] Starting stream manager with upgraded tracking & security rule engine...")
    stream_manager.start()
    yield
    print("[Main] Stopping stream manager...")
    stream_manager.stop()

app = FastAPI(
    title="Smart CCTV Guardian — Upgraded Intrusion Engine",
    description="Multi-object tracking, restricted zone intrusion, virtual tripwire crossing, loitering detection, and pet filtering.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/snapshots", StaticFiles(directory=config.SNAPSHOT_DIR), name="snapshots")
app.mount("/faces", StaticFiles(directory=FACES_DIR), name="faces")

def stream_generator(cam_id: int = 1):
    """Generates real-time MJPEG frames for specified camera channel without socket buffer backlog."""
    last_sent_id = -1
    cond = stream_manager.get_channel_condition(cam_id)
    while True:
        with cond:
            cond.wait_for(
                lambda: stream_manager.get_channel_frame_id(cam_id) != last_sent_id,
                timeout=0.25
            )
            frame_bytes = stream_manager.get_channel_jpeg(cam_id)
            last_sent_id = stream_manager.get_channel_frame_id(cam_id)

        if frame_bytes is not None:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )

@app.get("/api/feed", summary="Live Low-Latency Camera Video Feed (Multi-Channel)")
def live_video_feed(cam: int = Query(1, description="Camera channel ID (1, 2, 3, 4)")):
    if cam not in [1, 2, 3, 4]:
        cam = 1
    return StreamingResponse(
        stream_generator(cam),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*",
        }
    )

@app.get("/api/cameras", response_model=list[CameraChannelInfo], summary="List All 4 NVR Camera Channels")
def list_cameras():
    return stream_manager.get_cameras_info()

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@app.get("/api/status", response_model=SystemStatus, summary="Get Current System Status & Telemetry")
def get_system_status():
    last_alert_str = alert_service.incidents[0].timestamp if alert_service.incidents else None
    local_ip = get_local_ip()
    mobile_app_url = f"http://{local_ip}:5173"
    cameras = stream_manager.get_cameras_info()
    return SystemStatus(
        mode=stream_manager.system_mode,
        camera_source=config.CAMERA_SOURCE,
        camera_name=config.CAMERA_NAME,
        is_connected=stream_manager.is_connected,
        fps=stream_manager.current_fps,
        inference_latency_ms=round(stream_manager.detector.inference_latency_ms, 1),
        active_presence_sec=stream_manager.active_presence_sec,
        person_in_frame=stream_manager.person_in_frame,
        tracked_persons_count=stream_manager.tracked_persons_count,
        detected_held_items=stream_manager.detector.detected_held_item_names,
        last_alert=last_alert_str,
        email_alerts_enabled=config.ENABLE_EMAIL_ALERTS,
        mirror_feed=stream_manager.mirror_feed,
        rules=config.rules,
        authorized_faces_count=len(advanced_face_manager.enrolled_faces),
        recognized_person_name=stream_manager.detector.recognized_person_name,
        detected_behavior=stream_manager.detector.current_behavior,
        local_ip=local_ip,
        mobile_app_url=mobile_app_url,
        cameras=cameras
    )

@app.post("/api/mirror", summary="Toggle Camera Horizontal Flip (Mirror Mode)")
def update_camera_mirror(body: MirrorUpdate):
    stream_manager.set_mirror(body.enabled)
    return {"status": "success", "mirror_feed": stream_manager.mirror_feed}

@app.post("/api/mode", summary="Set System State (Armed, Disarmed, Night Mode)")
def update_system_mode(body: ModeUpdate):
    stream_manager.set_mode(body.mode)
    return {"status": "success", "mode": stream_manager.system_mode.value}

@app.get("/api/rules", response_model=SecurityRulesConfig, summary="Get Configured Security Rules & Zones")
def get_rules():
    return config.rules

@app.post("/api/rules", response_model=SecurityRulesConfig, summary="Update Security Rules & Zones")
def update_rules(new_rules: SecurityRulesConfig):
    config.rules = new_rules
    return config.rules

@app.get("/api/incidents", response_model=list[IncidentRecord], summary="List Security Incidents & Snapshots")
def get_incidents(event_type: Optional[EventType] = Query(None, description="Filter by event type")):
    if event_type:
        return [inc for inc in alert_service.incidents if inc.event_type == event_type]
    return alert_service.incidents

@app.post("/api/camera", summary="Configure Camera Source (Webcam index, RTSP URL, or SIMULATED)")
def update_camera_source(body: CameraConfigUpdate):
    stream_manager.update_source(body.source, body.name)
    return {
        "status": "success",
        "camera_source": config.CAMERA_SOURCE,
        "camera_name": config.CAMERA_NAME
    }

@app.post("/api/email-config", summary="Configure Alert Email & SMTP Settings")
def update_email_config(body: EmailConfigUpdate):
    config.ENABLE_EMAIL_ALERTS = body.enable
    if body.sender_email:
        config.SENDER_EMAIL = body.sender_email
    if body.sender_app_password:
        config.SENDER_APP_PASSWORD = body.sender_app_password
    if body.recipient_email:
        config.RECIPIENT_EMAIL = body.recipient_email
    return {
        "status": "success",
        "email_alerts_enabled": config.ENABLE_EMAIL_ALERTS,
        "recipient": config.RECIPIENT_EMAIL
    }

# ============================================================
# AI FACE RECOGNITION & WHITELIST ENDPOINTS (OPTION 3)
# ============================================================
@app.get("/api/faces", response_model=list[EnrolledFaceRecord], summary="List Authorized Face Profiles")
def list_authorized_faces():
    return advanced_face_manager.list_faces()

@app.post("/api/faces/enroll", response_model=EnrolledFaceRecord, summary="Enroll Face from Current Camera Stream")
def enroll_current_face(body: FaceEnrollRequest):
    frame = None
    with stream_manager.lock:
        if stream_manager.latest_raw_frame is not None:
            frame = stream_manager.latest_raw_frame.copy()

    if frame is None:
        raise HTTPException(status_code=400, detail="Camera feed not available. Ensure camera is active.")

    enrolled = advanced_face_manager.enroll_face(body.name, frame)
    if not enrolled:
        raise HTTPException(
            status_code=400,
            detail="No face clearly detected in frame. Please look directly into the camera with good lighting and retry."
        )

    return enrolled

@app.delete("/api/faces/{face_id}", summary="Remove Authorized Face Profile")
def delete_authorized_face(face_id: str):
    success = advanced_face_manager.delete_face(face_id)
    if not success:
        raise HTTPException(status_code=404, detail="Face profile not found.")
    return {"status": "success", "deleted_id": face_id}

@app.post("/api/trigger-test-alert", summary="Manually Trigger a Test Rule Breach")
async def trigger_test_alert(event_type: EventType = Query(EventType.ZONE_INTRUSION)):
    frame = stream_manager.latest_raw_frame
    if frame is None:
        import numpy as np
        frame = np.zeros((480, 640, 3), dtype=np.uint8)

    severity_map = {
        EventType.ZONE_INTRUSION: EventSeverity.CRITICAL,
        EventType.BOUNDARY_CROSSING: EventSeverity.HIGH,
        EventType.SUSPICIOUS_LOITERING: EventSeverity.MEDIUM,
        EventType.REPEATED_APPROACH: EventSeverity.MEDIUM,
        EventType.PET_FILTERED: EventSeverity.INFO
    }

    test_event = {
        "event_type": event_type,
        "severity": severity_map.get(event_type, EventSeverity.HIGH),
        "track_id": 99,
        "confidence": 0.96,
        "dwell_time": 5.8 if event_type == EventType.SUSPICIOUS_LOITERING else 2.1,
        "details": f"Test simulated {event_type.value.replace('_', ' ')} breach"
    }

    incident = await alert_service.trigger_rule_alert(frame, test_event, f"{config.CAMERA_NAME} (TEST)")
    if incident:
        return {"status": "success", "incident": incident}
    else:
        return {"status": "cooldown_active", "message": "Alert cooldown active (wait 15s)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
