#ifndef DISPLAY_HELPERS_H
#define DISPLAY_HELPERS_H

#include <Adafruit_SSD1306.h>
#include "emotions.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1        // most boards share the ESP32's reset pin
#define SCREEN_I2C_ADDRESS 0x3C  // common default -- 0x3D on some boards

// Call once in setup(). Returns false if the display wasn't found (check wiring).
bool initDisplay(Adafruit_SSD1306 &display);

// Simple full-screen status/boot message (e.g. "Connecting to WiFi...")
void showStatus(Adafruit_SSD1306 &display, const String &line1, const String &line2 = "");

// The main "buddy" screen: face up top (animated via `frame`), spoken text
// wrapped below it. Call this repeatedly from loop() with an increasing
// frame counter to keep the face alive (blinking, floating hearts, etc).
void showFaceAndText(Adafruit_SSD1306 &display, Emotion emotion, const String &text, unsigned long frame);

#endif
