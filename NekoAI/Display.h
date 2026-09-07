#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include <U8g2lib.h>
#include "Config.h"
#include "Bitmaps.h"

// ==========================
// OLED object
// ==========================
U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(
  U8G2_R0,
  U8X8_PIN_NONE
);

// ==========================
// Screen state
// ==========================
enum ScreenState
{
  SCREEN_WATCH,
  SCREEN_GAME_MENU,
  SCREEN_GAME_REACTION,
  SCREEN_GAME_SNAKE
};

ScreenState currentScreen = SCREEN_WATCH;

// ==========================
// Init
// ==========================
void initDisplay()
{
  Wire.begin(OLED_SDA, OLED_SCL);

  display.begin();

  display.clearBuffer();
  display.setFont(u8g2_font_ncenB08_tr);
  display.drawStr(20, 30, "NekoAI");
  display.drawStr(15, 45, "Starting...");
  display.sendBuffer();

  delay(1200);
}

// ==========================
// Top status bar (battery + steps + mood icon)
// Shared across watch screen
// ==========================
void drawStatusBar(int steps, bool isActive)
{
  display.drawXBMP(112, 0, 8, 8, batteryIcon);
  display.setFont(u8g2_font_4x6_tr);
  display.drawStr(96, 7, "85%");

  display.drawXBMP(0, 0, 8, 8, stepIcon);
  display.setCursor(10, 7);
  display.print(steps);

  if (isActive)
  {
    display.drawStr(40, 7, "ACTIVE");
  }
}

// ==========================
// Message overlay (temporary text, e.g. "Yummy!")
// ==========================
void showMessage(String msg)
{
  display.clearBuffer();
  display.setFont(u8g2_font_7x14_tr);

  int w = display.getStrWidth(msg.c_str());
  int x = (SCREEN_WIDTH - w) / 2;

  display.drawStr(x, 36, msg.c_str());
  display.sendBuffer();
}

#endif
