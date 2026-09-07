# CatAI - Version 3 (High Efficiency Engine) 🐱⚡

**CatAI V3** is an optimized iteration of the ESP32 cyber-pet platform, tuned for minimal RAM overhead, fast 60 FPS OLED rendering cycles, and low-latency sensor sampling.

---

## 🚀 Key Improvements

- **⚡ Memory-Optimized Framebuffers**: Streamlined U8g2 buffer paging to reduce ESP32 heap usage.
- **🎨 Refined Procedural Eyes**: Enhanced eyelid rendering and smooth pupil dilation routines in `CatFaces.h`.
- **🕹️ Enhanced Mini-Games**: Improved collision detection and score tracking in `Games.h`.
- **📊 Adaptive Sensor Filtering**: Enhanced low-pass filtering on MPU6050 readings to eliminate false-positive step detections.

---

## 🛠️ Hardware Requirements
- **ESP32 Dev Module**
- **0.96" SSD1306 OLED (I2C: SDA=GPIO 21, SCL=GPIO 22)**
- **MPU6050 6-Axis IMU (I2C: SDA=GPIO 21, SCL=GPIO 22)**
- **2x Push Buttons (GPIO 18, GPIO 19 with internal pull-ups)**
