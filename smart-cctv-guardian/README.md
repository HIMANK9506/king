# 🛡️ Smart CCTV Guardian — AI 4-Channel NVR & Threat Suppression System

> 📖 **Complete Documentation & Architecture Handbook:**  
> For an exhaustive, feature-by-feature explanation, threat detection state machines, spatial tripwire algorithms, face whitelist pipelines, and deployment guides, check out [**SMART_CCTV_GUARDIAN_HANDBOOK.md**](SMART_CCTV_GUARDIAN_HANDBOOK.md).

An edge-native, real-time AI security surveillance station built with **FastAPI**, **Ultralytics YOLOv8 Tracking & Pose**, **YuNet/SFace Face Recognition**, **OpenCV**, and a tactical **React (Vite) + Tailwind CSS** dashboard.

Designed to operate in **3 distinct deployment modes**:
1. **🖥️ PC Desktop Software App** (Launched via `.bat` or native Electron executable)
2. **📱 Native-Style Mobile App** (Dedicated smartphone layout, quick actions, touch controls, and PWA/Capacitor shell)
3. **🌐 Web-Based Station** (Connects any CCTV or camera remotely via **IP address** and **Unique Verification Code**)

---

## 🌟 The 3 Ways to Run & Connect

### Way 1: 🖥️ Desktop Software App (BAT / EXE Launcher)
Double-click either launcher in the project root:
- **`Launch-Desktop-App.bat`**: Auto-detects the backend, starts AI streaming in background if needed, and launches the dedicated native Windows desktop window.
- **`SmartCCTVGuardian.bat`**: Master terminal launcher with interactive menu (Start Desktop, Full System, Stop Services, Push to GitHub).
- **`run-desktop-app.bat`**: Launches Electron directly using the compiled production build.

### Way 2: 📱 Mobile App (Smartphone & Tablet Touchscreen Interface)
- **Dedicated Mobile View:** Open on any mobile phone or toggle **"Mobile View"** in the top bar. Automatically adapts to a native mobile app layout (matching CCTV mobile stations):
  - **Header:** Live system beacon, Armed/Night/Disarm mode pills, active threat banner.
  - **Quick Action Pills:** `All Feeds`, `CAM 01`, `CAM 02`, `CAM 03`, `CAM 04`, `+ Connect IP Cam`.
  - **Swipeable Camera Cards:** Each camera has high-res live video, OSD bitrate/timestamp, snapshot capture, live recording, and camera mirror toggle.
  - **Bottom Mobile Navigation:** `Devices`, `Alerts`, `Connect`, and `Rules`.
- **Install as Native PWA / Android App:** Click the **Install** button or add to phone home screen. Also includes `capacitor.config.json` for compiling native Android APKs via Android Studio.

### Way 3: 🌐 Website-Based System (Connect CCTV via IP & Unique Code)
Access the system in any modern web browser (`http://localhost:5173` or `http://<local_ip>:5173`):
- **Connect External IP / CCTV Cameras:**
  - Click **"📡 Connect Cam"** in the header or the **Connect** tab on mobile.
  - Enter the **Camera IP Address** (e.g. `192.168.1.120`), **Port** (e.g. `554`), and **Unique Camera Code / Password**.
  - Choose stream protocol (**RTSP**, **HTTP/MJPEG**, or **Direct Stream URL**).
  - Assign to any NVR channel (**CAM 01**, **CAM 02**, **CAM 03**, or **CAM 04**).
  - Built-in OpenCV probe tests handshake and verifies active video frames with 1-click binding.
- **NVR Station Unique Pair Code:**
  - Every station generates a persistent unique security code (e.g. `GRD-4212-BC38`).
  - Remote web clients or mobile devices can enter the IP + code to authorize remote access without cloud fees.

---

## 🎛️ 4-Channel NVR Interface (Matching Wireframe)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Brand | System Mode (Armed / Night / Disarm) | Connect IP Cam | Mobile View | Resident Whitelist        │
├─────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│                                                                 │ ┌───────────────────────────────────────────┐ │
│                       MAIN CAMERA STAGE                         │ │ LOGS: Real-Time Event & AI Threat Stream  │ │
│   - Large focused live feed (High-FPS zero-buffer)              │ │ (Intrusion alerts, Pose changes, Breaches)│ │
│   - Upper-Right: Bitrate (e.g. 297 KB/s) + Monospace Clock      │ └───────────────────────────────────────────┘ │
│   - Upper-Left: [CAM 01] Channel Tag + Resolution               │ ┌──────────────────────┬────────────────────┐ │
│   - Tactical HUD: REC, Snapshot, Mirror Flip, Fullscreen        │ │ SNAPSHOTS & RECORDS  │ CONTROLS & RULES   │ │
│                                                                 │ │                      │                    │ │
├─────────────────────────────────────────────────────────────────┤ │ - Intruder photo     │ - Zone & Tripwire  │ │
│ SUB-STREAMS THUMBNAIL ROW (v1, v2, v3)                          │ │   evidence gallery   │   toggle switches  │ │
│   - Live mini thumbnails of remaining 3 cameras                 │ │ - Recorded video     │ - Pose detection   │ │
│   - 1-Click to promote any camera to Main Stage                 │ │   clips archive      │   sensitivity      │ │
│   - [⊞ 4-Cam Grid Mode Toggle]: Switches into 2x2 NVR screen    │ │ - Download / Player  │ - Resident status  │ │
└─────────────────────────────────────────────────────────────────┴─┴──────────────────────┴────────────────────┘─┘
```

---

## ⚡ Quickstart Commands

### Start All Services (PC & Web):
```bat
start-all.bat
```

### Start Desktop App Only:
```bat
Launch-Desktop-App.bat
```

### Stop All Services:
```bat
stop-all.bat
```

### Push to GitHub:
```bat
push_to_github.bat
```
