import os
import time
import cv2
import aiosmtplib
from email.message import EmailMessage
from app.config import config
from app.models import IncidentRecord, EventType, EventSeverity

class AlertService:
    def __init__(self):
        self.last_alert_time: dict[EventType, float] = {}
        self.incidents: list[IncidentRecord] = []

    async def trigger_rule_alert(self, frame, event_data: dict, camera_name: str) -> IncidentRecord | None:
        """
        Saves snapshot, creates incident record, and asynchronously dispatches Gmail alert
        based on specific security rule (Zone Breach, Tripwire Crossing, Loitering).
        """
        now = time.time()
        event_type: EventType = event_data["event_type"]
        severity: EventSeverity = event_data.get("severity", EventSeverity.HIGH)
        
        # Cooldown per event type to avoid flooding
        last_time = self.last_alert_time.get(event_type, 0.0)
        if now - last_time < config.ALERT_COOLDOWN_SEC:
            return None

        self.last_alert_time[event_type] = now

        # 1. Save high-res snapshot
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        file_id = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{event_type.value.lower()}_{file_id}.jpg"
        filepath = os.path.join(config.SNAPSHOT_DIR, filename)

        cv2.imwrite(filepath, frame)

        # 2. Register incident
        incident = IncidentRecord(
            id=file_id,
            timestamp=timestamp_str,
            camera_name=camera_name,
            event_type=event_type,
            severity=severity,
            track_id=event_data.get("track_id"),
            confidence=event_data.get("confidence", 0.90),
            dwell_time_sec=event_data.get("dwell_time", 0.0),
            snapshot_url=f"/snapshots/{filename}",
            details=event_data.get("details", "Security rule triggered")
        )
        self.incidents.insert(0, incident)

        # 3. Asynchronous Gmail SMTP alert
        if config.ENABLE_EMAIL_ALERTS and config.SENDER_EMAIL and config.SENDER_APP_PASSWORD and config.RECIPIENT_EMAIL:
            await self._send_email_alert(incident, filepath)
        else:
            print(f"[AlertService] [{severity.value}] {event_type.value} logged locally for Track #{incident.track_id}.")

        return incident

    async def _send_email_alert(self, incident: IncidentRecord, image_path: str):
        """Dispatches formatted HTML email alert with image attachment."""
        try:
            msg = EmailMessage()
            msg["Subject"] = f"🚨 [{incident.severity.value}] {incident.event_type.value.replace('_', ' ')}: {incident.camera_name}"
            msg["From"] = config.SENDER_EMAIL
            msg["To"] = config.RECIPIENT_EMAIL

            # HTML Email Body
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c0a09; color: #f5f5f4; margin: 0; padding: 20px; }}
                .card {{ max-width: 550px; margin: 0 auto; background: #1c1917; border-radius: 12px; border: 1px solid #dc2626; overflow: hidden; }}
                .header {{ background: #dc2626; color: white; padding: 18px 24px; font-weight: bold; font-size: 18px; }}
                .body {{ padding: 24px; }}
                .metric {{ margin-bottom: 12px; font-size: 14px; }}
                .label {{ color: #a8a29e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
                .value {{ font-size: 16px; font-weight: 600; color: #ffffff; }}
                .footer {{ border-top: 1px solid #292524; padding: 14px 24px; font-size: 12px; color: #78716c; text-align: center; }}
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">🚨 SECURITY RULE BREACH DETECTED</div>
                <div class="body">
                  <p><b>{incident.details}</b></p>
                  
                  <div class="metric">
                    <div class="label">Event Type</div>
                    <div class="value">{incident.event_type.value.replace('_', ' ')} (Severity: {incident.severity.value})</div>
                  </div>
                  <div class="metric">
                    <div class="label">Camera Location</div>
                    <div class="value">{incident.camera_name}</div>
                  </div>
                  <div class="metric">
                    <div class="label">Event Timestamp</div>
                    <div class="value">{incident.timestamp}</div>
                  </div>
                  <div class="metric">
                    <div class="label">Track Details</div>
                    <div class="value">Track ID #{incident.track_id} | Dwell Time: {incident.dwell_time_sec}s</div>
                  </div>
                  <div class="metric">
                    <div class="label">AI Confidence</div>
                    <div class="value">{incident.confidence * 100:.1f}%</div>
                  </div>

                  <p style="margin-top: 20px; font-size: 13px; color: #f87171;">A high-resolution snapshot frame captured at the moment of breach is attached below.</p>
                </div>
                <div class="footer">Smart CCTV Guardian Surveillance System</div>
              </div>
            </body>
            </html>
            """
            msg.set_content(f"Security Alert: {incident.event_type.value} on {incident.camera_name}. See attached image.")
            msg.add_alternative(html_content, subtype="html")

            with open(image_path, "rb") as f:
                img_data = f.read()
                msg.add_attachment(img_data, maintype="image", subtype="jpeg", filename=os.path.basename(image_path))

            await aiosmtplib.send(
                msg,
                hostname=config.SMTP_SERVER,
                port=config.SMTP_PORT,
                start_tls=True,
                username=config.SENDER_EMAIL,
                password=config.SENDER_APP_PASSWORD,
            )
            print(f"[AlertService] Email alert sent to {config.RECIPIENT_EMAIL}")

        except Exception as e:
            print(f"[AlertService] Email send error: {e}")

alert_service = AlertService()
