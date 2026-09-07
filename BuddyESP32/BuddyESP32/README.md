# BuddyESP32 — Display + WiFi + Motion Reactions

Goal so far: ESP32 shows an animated face + text on the OLED, controllable over
WiFi from your laptop, and reacts physically to being shaken or picked up via
the MPU6050.

## Wiring (SSD1306 OLED + MPU6050, both share the same I2C bus)

| Component | Pin | ESP32 pin |
|-----------|-----|-----------|
| OLED      | VCC | 3V3       |
| OLED      | GND | GND       |
| OLED      | SDA | GPIO 21   |
| OLED      | SCL | GPIO 22   |
| MPU6050   | VCC | 3V3       |
| MPU6050   | GND | GND       |
| MPU6050   | SDA | GPIO 21 (same as OLED) |
| MPU6050   | SCL | GPIO 22 (same as OLED) |

Both devices sit on the same two I2C wires — SDA to SDA, SCL to SCL — since
they use different addresses (OLED at 0x3C, MPU6050 at 0x68) and don't
conflict. If your board wires I2C differently, let me know and we'll adjust
`Wire.begin()` in the .ino.

## 1. Install libraries (Arduino IDE)

Tools → Manage Libraries → search and install each of:
- **Adafruit SSD1306**
- **Adafruit GFX Library**
- **ArduinoJson** (by Benoit Blanchon — make sure it's version 6.x or 7.x)
- **Adafruit MPU6050**
- **Adafruit Unified Sensor** (installs automatically as a dependency of the above, but check it's there)

(WiFi.h and WebServer.h ship with the ESP32 board package you already have installed.)

## 2. Set your hotspot credentials

Open `config.h` and replace:
```cpp
#define WIFI_SSID     "YourHotspotName"
#define WIFI_PASSWORD "YourHotspotPassword"
```
with your actual phone hotspot name and password.

## 3. Upload

Open `BuddyESP32.ino` in Arduino IDE (keep all the other files in the same folder —
Arduino IDE will show them as tabs automatically). Select your ESP32 Dev Module and
port, then Upload.

## 4. Watch it boot

Open the Serial Monitor (115200 baud). You should see it connect to your hotspot and
print an IP address, like:
```
Connected! IP address: 192.168.43.55
```
Right after that, it checks the motion sensor and prints one of:
```
MPU6050 found -- motion reactions enabled.
```
or, if the wiring isn't right:
```
MPU6050 not found -- motion reactions disabled (check wiring).
```
This isn't fatal — the buddy still works fine without motion, it just won't
react to being shaken or picked up until the sensor's found.

The OLED should show "Connected!" then that same IP, then settle on a neutral face
with "Ready to chat!" underneath.

**Write that IP down — you'll need it for testing and for the companion app later.**

## 5. Test it from your laptop

Make sure your laptop is also connected to the same phone hotspot. Then:
```bash
pip install requests
python test_send.py 192.168.43.55 "Hey buddy, how's it going?" happy
```
(Replace the IP with whatever your ESP32 printed.)

The display should update immediately — a smiling face with your message underneath.

## About the faces

These are drawn with simple shapes (circles, lines, small sparkle marks) inspired
by kaomoji-style expressions -- since the OLED's built-in font can't render Unicode
characters like ◕‿◕ or θ‿θ directly, each one is recreated as a small vector drawing
instead, matching the same personality.

Valid emotions to send: `neutral`, `happy`, `excited`, `love`, `sleepy`, `surprised`,
`confused`, `smug`, `sad`, `angry`, `adoring`, `wink`, `dizzy`, `shrug`, `touched`,
`crying`, `kiss`, `rage`, `nervous`, `starstruck`

Try a few:
```bash
python test_send.py 10.194.158.33 "I'm so excited!!" excited
python test_send.py 10.194.158.33 "aww, that's sweet" love
python test_send.py 10.194.158.33 "you're the best <3" adoring
python test_send.py 10.194.158.33 "hehe just kidding" wink
python test_send.py 10.194.158.33 "whoa too much info" dizzy
python test_send.py 10.194.158.33 "eh, dunno" shrug
python test_send.py 10.194.158.33 "that really got me" touched
python test_send.py 10.194.158.33 "muah" kiss
python test_send.py 10.194.158.33 "THAT'S NOT FAIR" rage
python test_send.py 10.194.158.33 "wow, incredible" starstruck
```

## Testing motion reactions

Once flashed with the MPU6050 wired up:
- **Shake it** (a few quick back-and-forth movements) → should show a dizzy
  face with "Whoaaa, dizzy!" for about 2.5 seconds
- **Pick it up sharply** (a single quick jolt, like lifting it off the desk)
  → should show a surprised face with "Oh, hi there!"
- After either reaction, it should return to whatever was showing before
  (the AI's last message, or the idle "Ready to chat!" face)

If it's not triggering, or triggers way too easily, the sensitivity constants
are all at the top of `motion.cpp` (`SPIKE_THRESHOLD`, `SHAKE_SPIKE_COUNT`,
`EVENT_COOLDOWN_MS`) — let me know what it's doing wrong and we can tune them
together rather than guessing blind.

## What's next

- Push-to-talk via a physical button on the ESP32 instead of pressing Enter
  on your laptop, so the buddy feels less tethered to a keyboard
- More motion gestures — tilt, flip-to-sleep, tap-tap patterns
- The companion app (BuddyBrain) already exists as a separate project —
  mic/text → local AI → sends to this same `/say` endpoint
