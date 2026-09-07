# IoT 3D Gesture & Motion Tracking System 🖐️🕹️

A complete Internet of Things (IoT) motion and gesture sensing framework powered by an **ESP32**, an **MPU6050 6-Axis Inertial Measurement Unit (IMU)**, and real-time **3D Python / Processing visualizers**.

---

## 📁 Project Structure

```
IOT_gesture-project/
├── 00_LED_Blink_Test/         # Hardware sanity check sketch
├── 01_3D_Hand_Tracking/       # 6-DOF Hand Orientation & 3D Tracking
│   ├── 01_3D_Hand_Tracking.ino      # ESP32 firmware streaming Roll, Pitch, Yaw
│   ├── hand_tracking_visualizer.py  # Real-time Python 3D orientation renderer
│   ├── Run_3D_Hand_Tracking.bat     # One-click Windows runner
│   └── Processing_HandTracking3D/   # Processing IDE 3D model visualizer (.pde)
├── 00_MPU6050_Test/           # Raw sensor calibration & diagnostic tests
├── 02_IMU_Game_Controller/    # Gesture-based HID game controller module
└── 03_Accident_Detector/      # Impact and fall detection system
```

---

## ⚡ Hardware Connections (ESP32 to MPU6050)

| MPU6050 Pin | ESP32 Pin | Function |
| :--- | :--- | :--- |
| **VCC** | 3.3V / 5V | Power Supply |
| **GND** | GND | Ground |
| **SCL** | GPIO 22 | I2C Clock Line |
| **SDA** | GPIO 21 | I2C Data Line |

---

## 🚀 Getting Started

### 1. ESP32 Firmware
1. Open `01_3D_Hand_Tracking/01_3D_Hand_Tracking.ino` in Arduino IDE.
2. Install the `MPU6050_light` library (available in the `libraries/` directory or Library Manager).
3. Upload to the ESP32. Keep the sensor stationary for 1-2 seconds after startup for gyro calibration.

### 2. Python 3D Visualizer
1. Install Python dependencies:
   ```bash
   pip install pyserial pygame PyOpenGL
   ```
2. Run the visualizer directly or execute `Run_3D_Hand_Tracking.bat`:
   ```bash
   python hand_tracking_visualizer.py
   ```
3. Move the physical sensor to see the 3D representation mirror your motion in real time!
