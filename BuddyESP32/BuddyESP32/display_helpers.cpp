#include "display_helpers.h"
#include <Wire.h>

bool initDisplay(Adafruit_SSD1306 &display) {
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_I2C_ADDRESS)) {
    return false;
  }
  display.clearDisplay();
  display.display();
  return true;
}

void showStatus(Adafruit_SSD1306 &display, const String &line1, const String &line2) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 24);
  display.println(line1);
  if (line2.length() > 0) {
    display.setCursor(0, 36);
    display.println(line2);
  }
  display.display();
}

void showFaceAndText(Adafruit_SSD1306 &display, Emotion emotion, const String &text, unsigned long frame) {
  display.clearDisplay();

  drawFace(display, emotion, frame);

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(true);
  display.setCursor(0, 52);
  display.print(text);

  display.display();
}
