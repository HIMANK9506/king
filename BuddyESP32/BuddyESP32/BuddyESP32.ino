/*
  BuddyESP32 — Phase 1 + Phase 2 (animated faces + motion reactions)
  ---------------------------------------------------------------------
  Joins your phone's hotspot, then runs a tiny web server. Your laptop
  companion app sends it messages like:

    POST http://<esp32-ip>/say
    Content-Type: application/json
    {"text": "Hey, I'm listening!", "emotion": "happy"}

  ...and the ESP32 draws the matching face + prints the text below it.
  The face keeps animating (blinking, floating hearts/stars) even between
  messages. On top of that, the MPU6050 detects shakes and pickups and
  briefly overrides the display with a matching reaction before returning
  to whatever the AI last said.

  Libraries needed (install via Arduino IDE -> Tools -> Manage Libraries):
    - Adafruit SSD1306
    - Adafruit GFX Library
    - ArduinoJson (by Benoit Blanchon)
    - Adafruit MPU6050
    - Adafruit Unified Sensor  (dependency of the above)
  (WiFi.h and WebServer.h come built-in with the ESP32 board package.)

  Wiring (default I2C pins on most ESP32 Dev Modules -- OLED and MPU6050
  share the same bus, just wire both in parallel):
    OLED   SDA -> GPIO 21   |   MPU6050 SDA -> GPIO 21
    OLED   SCL -> GPIO 22   |   MPU6050 SCL -> GPIO 22
    OLED   VCC -> 3V3       |   MPU6050 VCC -> 3V3
    OLED   GND -> GND       |   MPU6050 GND -> GND
*/

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_MPU6050.h>

#include "config.h"
#include "display_helpers.h"
#include "emotions.h"
#include "motion.h"

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Adafruit_MPU6050 mpu;
WebServer server(80);

// ---- Animation state ----
const unsigned long ANIM_INTERVAL_MS = 150; // ~6-7 fps, plenty for this style
Emotion currentEmotion = EMOTION_NEUTRAL;
String currentText = "Ready to chat!";
unsigned long frameCounter = 0;
unsigned long lastFrameTime = 0;

// ---- Motion reaction state ----
bool motionAvailable = false;
const unsigned long MOTION_POLL_INTERVAL_MS = 50;
const unsigned long MOTION_OVERRIDE_DURATION_MS = 2500;
unsigned long lastMotionPollTime = 0;
bool motionOverrideActive = false;
unsigned long motionOverrideStartTime = 0;
Emotion savedEmotion = EMOTION_NEUTRAL;
String savedText = "";

void triggerMotionReaction(MotionEvent event) {
  Emotion reactionEmotion;
  String reactionText;

  if (event == MOTION_SHAKE) {
    reactionEmotion = EMOTION_DIZZY;
    reactionText = "Whoaaa, dizzy!";
  } else if (event == MOTION_PICKUP) {
    reactionEmotion = EMOTION_SURPRISED;
    reactionText = "Oh, hi there!";
  } else {
    return;
  }

  if (!motionOverrideActive) {
    savedEmotion = currentEmotion;
    savedText = currentText;
  }

  currentEmotion = reactionEmotion;
  currentText = reactionText;
  frameCounter = 0;
  motionOverrideActive = true;
  motionOverrideStartTime = millis();

  showFaceAndText(display, currentEmotion, currentText, frameCounter);
}

void handleSay() {
  if (!server.hasArg("plain")) {
    server.send(400, "text/plain", "Missing JSON body");
    return;
  }

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }

  currentText = String((const char *)(doc["text"] | ""));
  String emotionStr = doc["emotion"] | "neutral";
  currentEmotion = emotionFromString(emotionStr);
  frameCounter = 0;
  motionOverrideActive = false; // a fresh AI message always takes priority

  showFaceAndText(display, currentEmotion, currentText, frameCounter);

  server.send(200, "text/plain", "OK");
}

void handleHealth() {
  server.send(200, "text/plain", "BuddyESP32 is alive");
}

void handleRoot() {
  String info = "BuddyESP32\n\nPOST /say with JSON: {\"text\":\"...\", \"emotion\":\"happy\"}\n";
  info += "Current IP: " + WiFi.localIP().toString();
  info += "\nMotion sensor: ";
  info += motionAvailable ? "OK" : "not found";
  server.send(200, "text/plain", info);
}

void setup() {
  Serial.begin(115200);
  Wire.begin(); // default SDA=21, SCL=22 on most ESP32 dev boards

  if (!initDisplay(display)) {
    Serial.println("SSD1306 not found -- check wiring / I2C address.");
    while (true) delay(1000);
  }

  showStatus(display, "Booting...", "Connecting WiFi");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP address: ");
  Serial.println(WiFi.localIP());

  motionAvailable = initMotion(mpu);
  if (motionAvailable) {
    Serial.println("MPU6050 found -- motion reactions enabled.");
  } else {
    Serial.println("MPU6050 not found -- motion reactions disabled (check wiring).");
  }

  showStatus(display, "Connected!", WiFi.localIP().toString());
  delay(2000);
  showFaceAndText(display, currentEmotion, currentText, frameCounter);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/say", HTTP_POST, handleSay);
  server.begin();
  Serial.println("Web server started on port 80.");

  lastFrameTime = millis();
  lastMotionPollTime = millis();
}

void loop() {
  server.handleClient();

  unsigned long now = millis();

  if (motionAvailable && (now - lastMotionPollTime >= MOTION_POLL_INTERVAL_MS)) {
    lastMotionPollTime = now;
    MotionEvent event = pollMotion(mpu);
    if (event != MOTION_NONE) {
      triggerMotionReaction(event);
    }
  }

  if (motionOverrideActive && (now - motionOverrideStartTime >= MOTION_OVERRIDE_DURATION_MS)) {
    currentEmotion = savedEmotion;
    currentText = savedText;
    frameCounter = 0;
    motionOverrideActive = false;
  }

  if (now - lastFrameTime >= ANIM_INTERVAL_MS) {
    lastFrameTime = now;
    frameCounter++;
    showFaceAndText(display, currentEmotion, currentText, frameCounter);
  }
}
