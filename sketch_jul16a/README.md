# ESP32 CyberWatch ⌚ - Smart Fitness & Health Tracker

An advanced, IoT-connected Smartwatch firmware written for the **ESP32**, integrating **MAX30105 biometric pulse/oxygen sensing**, **MPU6050 motion tracking**, an **OLED interface**, a playable **Chrome Dino Game**, and real-time **Supabase Cloud synchronization**.

---

## 🌟 Features

- **❤️ Biometric Vitals Monitoring**:
  - Continuous Heart Rate (BPM) sensing.
  - Blood Oxygen Saturation ($SpO_2$) calculation using Maxim's PPG algorithm (`spo2_algorithm.h`).
  - Real-time pulse waveform plotting on OLED.
- **🚶 Pedometer & Motion Engine**:
  - Step counter algorithm utilizing MPU6050 3-axis accelerometer data.
  - Dynamic step goal progress bar and distance estimations.
- **🎮 Playable Chrome Dino Runner Game**:
  - Full Dino obstacle runner game built directly into the smartwatch!
  - Jump controls via tactile button or wrist flick motion gestures.
  - High score tracking and buzzer sound effects.
- **☁️ Supabase Cloud Telemetry Sync**:
  - Automatically pushes vitals, step counts, and game high scores to a Supabase PostgreSQL backend (`watch_events` table).
  - Smart anti-spam delta filtering (only syncs when metrics change meaningfully or after configured time intervals).
- **⏰ NTP Time Sync & Power Management**:
  - Automatically fetches accurate real-world time over WiFi.

---

## 🛠️ Hardware Specifications

| Component | Interface | Description |
| :--- | :--- | :--- |
| **ESP32 MCU** | — | Core dual-core processor handling sensing & WiFi |
| **SSD1306 OLED (128x64)** | I2C (0x3C) | Graphics & UI display |
| **MAX30105 / MAX30102** | I2C (0x57) | Optical Photoplethysmography (PPG) sensor for BPM/SpO2 |
| **MPU6050** | I2C (0x68) | 6-axis accelerometer & gyroscope |
| **Piezo Buzzer** | PWM | Acoustic feedback for game over, clicks, and alarms |
| **Nav Buttons** | GPIO Pins | Screen cycle and interactive controls |

---

## 🚀 Configuration & Flashing

1. Open `sketch_jul16a.ino` in Arduino IDE.
2. In the configuration section (lines 26-34), configure your WiFi credentials and Supabase database settings:
   ```cpp
   const char* WIFI_SSID        = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD    = "YOUR_WIFI_PASSWORD";
   const char* SUPABASE_URL     = "https://your-project.supabase.co";
   const char* SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
   const char* SUPABASE_TABLE   = "watch_events";
   ```
3. Ensure required libraries are installed (`Adafruit_SSD1306`, `Adafruit_GFX`, `MPU6050`, `SparkFun MAX3010x`).
4. Select `ESP32 Dev Module` and click **Upload**.
