# 🛡️ Smart CCTV Guardian — AI Surveillance & Intruder Detection System

An edge-native, real-time AI security surveillance system built with **FastAPI**, **Ultralytics YOLOv8**, **OpenCV**, and a responsive **React (Vite) + Tailwind CSS** dashboard.

Designed following the exact architecture specified by the Research, Design, and Development teams:
- **Dev 1 (Backend, CV & Streaming):** YOLOv8 Nano edge inference, 2-second temporal presence false-positive filtering, camera stream manager (Webcam, Synthetic CCTV, or RTSP), and automated Gmail alert dispatch with high-res intruder snapshots.
- **Dev 2 (Frontend & App Integration):** High-alert responsive dashboard, low-latency live video player, armed/disarmed system state controls, incident evidence drawer, and Progressive Web App (PWA) configuration.

---

## 🏗️ Architecture Overview

```text
               ┌────────────────────────────────────────────────────────┐
               │              CAMERA INPUT LAYER                        │
               │  • Webcam index (0, 1)                                 │
               │  • RTSP CCTV Feed (rtsp://admin:pass@ip:port/stream)   │
               │  • Synthetic Demo Stream (Built-in simulator)          │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │           BACKEND CV ENGINE (FastAPI + OpenCV)         │
               │  • Background Thread Frame Capture                     │
               │  • YOLOv8 Nano Inference (person class, conf >= 0.50)  │
               │  • Temporal Filter Rule: Continuous Presence >= 2.0s   │
               │  • System State: ARMED, DISARMED, NIGHT_MODE           │
               └──────────────┬───────────────────────────┬─────────────┘
                              │                           │
                              ▼                           ▼
        ┌───────────────────────────────┐   ┌───────────────────────────┐
        │        ALERT SERVICE          │   │      STREAMING & API      │
        │ • Capture annotated snapshot  │   │ • Low-latency MJPEG feed  │
        │ • aiosmtplib async Gmail SMTP │   │ • REST endpoints          │
        │ • Cooldown throttling (30s)   │   │ • WebSocket real-time HUD │
        └───────────────────────────────┘   └─────────────┬─────────────┘
                                                          │
                                                          ▼
                                            ┌───────────────────────────┐
                                            │     REACT + VITE PWA      │
                                            │ • Live Video Player & HUD │
                                            │ • Mode Toggle Controls    │
                                            │ • Incident Evidence Drawer│
                                            │ • Config Modal            │
                                            └───────────────────────────┘
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup (Dev 1)
```bash
cd backend
# Activate virtual environment
.\venv\Scripts\activate

# Launch the FastAPI Surveillance Server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Live Video Feed: `http://localhost:8000/api/feed`
- Status Endpoint: `http://localhost:8000/api/status`

### 3. Frontend Setup (Dev 2)
```bash
cd frontend
# Install dependencies (if not already done)
npm install

# Start Vite Development Server
npm run dev
```
- Open `http://localhost:5173` in your browser.

---

## 📋 Features Aligned with Team Requirements

| Feature | Requirement Source | Implementation Details |
| :--- | :--- | :--- |
| **Camera Compatibility & RTSP** | Research Team | Supports standard RTSP URLs (`rtsp://user:pass@ip:port/stream`), local webcams, and synthetic test fallback. |
| **Edge vs. Cloud Evaluation** | Research Team | Ultra-low latency edge inference (~15ms on CPU) with YOLOv8 Nano (`yolov8n.pt`), avoiding expensive cloud streaming fees. |
| **False-Positive Reduction** | Research Team | Only triggers an intrusion alert when human presence persists for **$\ge 2.0$ consecutive seconds**, eliminating pet/shadow glitches. |
| **System State Controls** | Design Team | Interactive state controls for **Armed** (full alert), **Disarmed** (safe monitoring), and **Night Mode** (perimeter warning). |
| **Alert & Log Interface** | Design Team | Dedicated incident archive drawer with exact timestamps, detection confidence, and full-resolution snapshot previews. |
| **Intruder Detection Engine** | Dev 1 | YOLOv8 Nano loaded with OpenCV to detect person classes in video frames with bounding boxes and HUD metadata. |
| **Email Alert Service** | Dev 1 | Asynchronous non-blocking Gmail SMTP alerts via `aiosmtplib` with attached intruder JPEG snapshots and alert cooldown timer. |
| **Responsive Web App** | Dev 2 | Built with React, Vite, Tailwind CSS, and Lucide Icons, responsive across desktop, tablets, and phones. |
| **PWA Configuration** | Dev 2 | Configured with `manifest.json` and service worker hooks to install as a native-like software app on desktop and mobile. |

---

## 🛠️ Testing Without Physical CCTV Cameras
If you don't have an RTSP CCTV camera connected:
1. The system defaults to your **Laptop Webcam** (`0`).
2. If no webcam is available or if selected in settings, the system switches to **Synthetic Feed Mode**, which generates an animated security room with a moving test silhouette so you can test YOLOv8 detection, temporal filters, and snapshot capture immediately!
3. You can also click the **"Test Alert"** button in the dashboard to immediately test snapshot generation and email dispatch.
