# NekoAI 🐾 - ESP32 Virtual Pet & Smartwatch Companion

**NekoAI** is an interactive, Tamagotchi-inspired virtual companion running on an **ESP32** microcontroller, featuring a **monochrome OLED display (U8g2)** and an **MPU6050 motion sensor**.

---

## 🌟 Features

- **😸 Dynamic Emotions & Expressions**: Procedural pixel-art cat face rendering Happy, Normal, Sad, Sleepy, Playful, and Hungry expressions.
- **🚶 Pedometer Integration**: Uses the MPU6050 accelerometer to count real-world physical steps. Daily activity boosts your pet's happiness!
- **🍖 Care & Nutrition**: Feed your cat and monitor its HP / hunger levels in real time.
- **🎮 Built-in OLED Mini-Games**: Play arcade mini-games using the tactile buttons directly on the OLED screen.
- **⚡ Battery & Status Display**: Top status bar displays step count, motion indicator, and mood indicators.

---

## 🛠️ Hardware Setup

| Component | Pin / Bus | Description |
| :--- | :--- | :--- |
| **ESP32 Dev Module** | Core MCU | Controls logic, animations, and sensor reading |
| **0.96" OLED (SSD1306/SH1106)** | I2C (SDA: 21, SCL: 22) | High-speed rendering via U8g2 library |
| **MPU6050 IMU** | I2C (SDA: 21, SCL: 22) | Pedometer, shake, and motion detection |
| **Feed Button** | GPIO 18 (Pull-Up) | Short press to feed your pet |
| **Play Button** | GPIO 19 (Pull-Up) | Short press to pet/play; Long press for Mini-Games menu |

---

## 🚀 Installation

1. Open `NekoAI.ino` in Arduino IDE.
2. Install `U8g2` and `MPU6050` from the Library Manager or copy from the `libraries/` directory.
3. Select board `ESP32 Dev Module` and click **Upload**.
