import os
from pydantic import BaseModel, Field
from app.models import SecurityRulesConfig

class SystemConfig(BaseModel):
    # Camera Source: "1" for physical USB/Laptop Webcam, "0" for Motorola Smart Connect virtual cam, "SIMULATED" for synthetic demo, or RTSP URL
    CAMERA_SOURCE: str = os.getenv("CAMERA_SOURCE", "1")
    CAMERA_NAME: str = os.getenv("CAMERA_NAME", "USB2.0 HD UVC WebCam (CAM-01)")
    MIRROR_FEED: bool = os.getenv("MIRROR_FEED", "true").lower() in ("true", "1", "yes")

    # False Positive Reduction Parameters (Research Guide Specs)
    DETECTION_CONFIDENCE: float = float(os.getenv("DETECTION_CONFIDENCE", "0.50"))
    MIN_CONSECUTIVE_PRESENCE_SEC: float = float(os.getenv("MIN_CONSECUTIVE_PRESENCE_SEC", "2.0")) # >= 2 seconds
    ALERT_COOLDOWN_SEC: float = float(os.getenv("ALERT_COOLDOWN_SEC", "15.0"))

    # Security Rules & Restricted Zones
    rules: SecurityRulesConfig = Field(default_factory=SecurityRulesConfig)

    # Alert Service (Gmail SMTP / SendGrid App Passwords)
    ENABLE_EMAIL_ALERTS: bool = os.getenv("ENABLE_EMAIL_ALERTS", "false").lower() in ("true", "1", "yes")
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SENDER_EMAIL: str = os.getenv("SENDER_EMAIL", "")
    SENDER_APP_PASSWORD: str = os.getenv("SENDER_APP_PASSWORD", "")
    RECIPIENT_EMAIL: str = os.getenv("RECIPIENT_EMAIL", "")

    # Storage paths
    SNAPSHOT_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "snapshots")

config = SystemConfig()
os.makedirs(config.SNAPSHOT_DIR, exist_ok=True)
