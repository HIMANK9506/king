#ifndef GAMES_H
#define GAMES_H

#include <Arduino.h>
#include "Display.h"
#include "Config.h"
#include "Bitmaps.h"

// =============================
// Game Menu State
// =============================
const char* gameMenuItems[] = { "Reaction", "Snake", "Back to Watch" };
const int gameMenuCount = 3;

int gameMenuIndex = 0;

// Edge-detect state for menu navigation (so one press = one move)
bool lastFeedState = HIGH;
bool lastPlayState = HIGH;

// =============================
// Draw the Games Menu screen
// =============================
void drawGameMenu()
{
  display.clearBuffer();

  display.setFont(u8g2_font_7x14_tr);
  display.drawXBMP(4, 2, 8, 8, gameIcon);
  display.drawStr(16, 11, "Games");
  display.drawHLine(0, 15, SCREEN_WIDTH);

  display.setFont(u8g2_font_6x10_tr);

  for (int i = 0; i < gameMenuCount; i++)
  {
    int y = 28 + (i * 14);

    if (i == gameMenuIndex)
    {
      display.drawStr(4, y, ">");
    }

    display.drawStr(16, y, gameMenuItems[i]);
  }

  display.setFont(u8g2_font_4x6_tr);
  display.drawStr(2, 62, "FEED=move  PLAY=select");

  display.sendBuffer();
}

// =============================
// Reaction Game (blocking, self-contained)
// =============================
void reactionGame()
{
  display.clearBuffer();
  display.setFont(u8g2_font_7x14_tr);
  display.drawStr(15, 25, "REACTION!");
  display.drawStr(5, 45, "Wait for GO...");
  display.sendBuffer();

  delay(random(1000, 2500));

  display.clearBuffer();
  display.drawStr(30, 35, "GO!");
  display.sendBuffer();

  unsigned long start = millis();
  unsigned long timeout = start + 3000;
  bool pressed = false;

  while (millis() < timeout)
  {
    if (digitalRead(PLAY_BUTTON) == LOW)
    {
      pressed = true;
      break;
    }
  }

  display.clearBuffer();

  if (pressed)
  {
    unsigned long reaction = millis() - start;
    display.setFont(u8g2_font_7x14_tr);
    display.drawStr(10, 25, "TIME:");
    display.setCursor(10, 45);
    display.print(reaction);
    display.print(" ms");
  }
  else
  {
    display.setFont(u8g2_font_7x14_tr);
    display.drawStr(10, 35, "Too slow!");
  }

  display.sendBuffer();
  delay(2000);
}

// =============================
// Snake-ish Game (blocking, self-contained)
// =============================
void snakeGame()
{
  int x = 60;
  int y = 30;
  int dx = 2;
  int dy = 1;

  for (int i = 0; i < 150; i++)
  {
    display.clearBuffer();
    display.drawFrame(0, 0, 128, 64);
    display.drawBox(x, y, 4, 4);
    display.sendBuffer();

    x += dx;
    y += dy;

    if (x > 120 || x < 4) dx = -dx;
    if (y > 58 || y < 4)  dy = -dy;

    if (digitalRead(FEED_BUTTON) == LOW || digitalRead(PLAY_BUTTON) == LOW)
    {
      break;
    }

    delay(40);
  }

  display.clearBuffer();
  display.setFont(u8g2_font_7x14_tr);
  display.drawStr(20, 35, "GAME OVER");
  display.sendBuffer();
  delay(1200);
}

// =============================
// Menu navigation - call every loop() while
// currentScreen == SCREEN_GAME_MENU
// =============================
void handleGameMenu()
{
  bool feedNow = digitalRead(FEED_BUTTON);
  bool playNow = digitalRead(PLAY_BUTTON);

  // FEED = move selection down (wraps around)
  if (feedNow == LOW && lastFeedState == HIGH)
  {
    gameMenuIndex = (gameMenuIndex + 1) % gameMenuCount;
  }

  // PLAY = confirm selection
  if (playNow == LOW && lastPlayState == HIGH)
  {
    if (gameMenuIndex == 0)
    {
      reactionGame();
    }
    else if (gameMenuIndex == 1)
    {
      snakeGame();
    }
    else
    {
      currentScreen = SCREEN_WATCH;
    }
  }

  lastFeedState = feedNow;
  lastPlayState = playNow;

  if (currentScreen == SCREEN_GAME_MENU)
  {
    drawGameMenu();
  }
}

#endif
