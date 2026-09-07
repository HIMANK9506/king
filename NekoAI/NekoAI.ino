#include <Arduino.h>
#include <Wire.h>

// Project files (order matters - each only assumes earlier ones are loaded)
#include "Config.h"
#include "Bitmaps.h"
#include "Display.h"
#include "Sensors.h"
#include "Personality.h"
#include "CatFaces.h"
#include "Games.h"

// =============================
// Watch-screen button state
// (separate from Games.h's menu button state)
// =============================
bool lastFeedWatch = HIGH;

bool playHeld       = false;
bool menuTriggered  = false;
unsigned long playPressStart = 0;

// =============================
// Draw the main watch face
// =============================
void drawWatchScreen()
{
  display.clearBuffer();

  drawStatusBar(getSteps(), moving);

  // Cat face, mood-driven
  drawCat(eyesClosed, (int)currentMood);

  // Bottom info line
  display.setFont(u8g2_font_5x8_tr);

  display.setCursor(0, 62);
  display.print("HP:");
  display.print(happiness);

  String mood = moodText();
  int moodW = display.getStrWidth(mood.c_str());
  display.setCursor(SCREEN_WIDTH - moodW, 62);
  display.print(mood);

  display.sendBuffer();
}

// =============================
// Handle buttons while on the watch screen
// FEED = tap to feed
// PLAY = tap to play, HOLD to open Games menu
// =============================
void handleWatchButtons()
{
  bool feedNow = digitalRead(FEED_BUTTON);
  bool playNow = digitalRead(PLAY_BUTTON);

  // ---- FEED: simple tap ----
  if (feedNow == LOW && lastFeedWatch == HIGH)
  {
    feedCat();
    showMessage("Yummy!");
    delay(400);
  }
  lastFeedWatch = feedNow;

  // ---- PLAY: tap vs hold ----
  if (playNow == LOW)
  {
    if (!playHeld)
    {
      playHeld = true;
      playPressStart = millis();
    }
    else if (!menuTriggered && millis() - playPressStart > MENU_HOLD_TIME)
    {
      // Held long enough -> open Games menu
      currentScreen  = SCREEN_GAME_MENU;
      menuTriggered  = true;
      gameMenuIndex  = 0;

      // Prevent Games.h from reading this same held press as a fresh
      // "select" press the instant the menu appears
      lastPlayState = LOW;
      lastFeedState = HIGH;
    }
  }
  else
  {
    if (playHeld && !menuTriggered)
    {
      // Released before the hold threshold -> it was a tap
      playWithCat();
      showMessage("Play!");
      delay(400);
    }
    playHeld      = false;
    menuTriggered = false;
  }
}

// ==========================
// Setup
// ==========================
void setup()
{
  Serial.begin(115200);

  pinMode(FEED_BUTTON, INPUT_PULLUP);
  pinMode(PLAY_BUTTON, INPUT_PULLUP);

  initDisplay();
  initSensors();

  randomSeed(analogRead(0));
  chooseMood();

  showMessage("Hello Himank!");
  delay(1200);
}

// ==========================
// Main Loop
// ==========================
void loop()
{
  updateSensors();
  updatePersonality();

  if (currentScreen == SCREEN_WATCH)
  {
    handleWatchButtons();
    drawWatchScreen();
  }
  else if (currentScreen == SCREEN_GAME_MENU)
  {
    handleGameMenu();
  }

  delay(FRAME_DELAY);
}
