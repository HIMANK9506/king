# CutieCat Mini 🐱

An interactive, wearable virtual pet and WiFi diagnostics tool built on an **ESP32** microcontroller and an **SSD1306 128x64 I2C OLED display**.

---

## 🌟 Features

- **🐾 Animated Virtual Pet**: Real-time animated cat face with procedural eye blinking and playful tail-wagging animations.
- **⏰ NTP Live Clock**: Synchronized network time display (configured for UTC+5:30 / IST), showing current hours, minutes, and seconds.
- **📡 WiFi Network Scanner**: Scans 2.4 GHz WiFi networks, listing SSID names, signal strength (RSSI dBm), and open/secured network status.
- **🔘 Multi-Screen Navigation**: Smooth switching between Home screen and WiFi scanner using physical buttons with hardware debouncing.

---

## 🛠️ Hardware Requirements

| Component | Specification | Connection to ESP32 |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32 Dev Module / NodeMCU-32S | — |
| **Display** | 0.96" SSD1306 Monochrome OLED (128x64, I2C) | SDA → GPIO 21, SCL → GPIO 22, VCC → 3.3V, GND → GND |
| **Button A** | Tactile Push Button (Cycle / Next) | GPIO 18 → Button → GND (Internal Pull-Up) |
| **Button B** | Tactile Push Button (Select / Back) | GPIO 19 → Button → GND (Internal Pull-Up) |

---

## 🚀 Getting Started

### 1. Software Setup
Install the following libraries in Arduino IDE (`Sketch -> Include Library -> Manage Libraries...`):
- `Adafruit GFX Library`
- `Adafruit SSD1306`

### 2. Configuration
Open `CutieCat_Mini.ino` and configure your local WiFi network:
```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

### 3. Flashing
1. Select board: `ESP32 Dev Module` in Arduino IDE.
2. Select COM port and upload speed (`115200` or `921600`).
3. Press **Upload**.
