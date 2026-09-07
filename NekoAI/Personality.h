#ifndef PERSONALITY_H
#define PERSONALITY_H

#include <Arduino.h>
#include "Config.h"
#include "Sensors.h"   // gives us isRecentlyActive() for steps -> mood

// ===============================
// Mood System
// (Order MUST match the MOOD_* codes in CatFaces.h)
// ===============================
enum Mood
{
  JOYFUL,
  HAPPY,
  NORMAL,
  CURIOUS,
  HUNGRY,
  SAD,
  ANGRY,
  SLEEPY,
  EXCITED
};

// ===============================
// Current state
// ===============================
Mood currentMood = HAPPY;

int happiness  = START_HAPPINESS;
int friendship = START_FRIENDSHIP;

bool eyesClosed = false;

String currentMessage = "Hello!";

// ===============================
// Timers
// ===============================
unsigned long lastMoodChange   = 0;
unsigned long lastHappinessTick = 0;
unsigned long lastInteraction  = 0;

unsigned long blinkTimer      = 0;
unsigned long blinkStartedAt  = 0;
unsigned long nextBlinkDelay  = BLINK_MIN_INTERVAL;

// ===============================
// Choose Mood
// Priorities: sleepy (idle) > very low happiness > active bonus >
//             happiness band > default
// ===============================
void chooseMood()
{
  unsigned long idleTime = millis() - lastInteraction;

  // Sleepy overrides everything if left alone for a while and not moving
  if (idleTime > SLEEPY_IDLE_TIME && !moving)
  {
    currentMood = SLEEPY;
    currentMessage = "Zzz...";
    return;
  }

  // Very low happiness: alternate between hungry and a little grumpy
  if (happiness <= 15)
  {
    currentMood = (random(2) == 0) ? HUNGRY : ANGRY;
    currentMessage = (currentMood == HUNGRY) ? "Feed me!" : "Hmph!";
    return;
  }

  if (happiness <= 35)
  {
    currentMood = HUNGRY;
    currentMessage = "Getting hungry...";
    return;
  }

  // Steps -> mood bonus: been active recently and reasonably happy
  if (isRecentlyActive() && happiness >= 55)
  {
    currentMood = (random(2) == 0) ? JOYFUL : EXCITED;
    currentMessage = "Yay, let's move!";
    return;
  }

  if (happiness >= 85)
  {
    currentMood = (random(2) == 0) ? JOYFUL : HAPPY;
    currentMessage = "I'm so happy!";
    return;
  }

  if (happiness >= 60)
  {
    currentMood = HAPPY;
    currentMessage = "Feeling good!";
    return;
  }

  if (happiness >= 40)
  {
    currentMood = (random(2) == 0) ? NORMAL : CURIOUS;
    currentMessage = (currentMood == CURIOUS) ? "What's that?" : "Just chilling";
    return;
  }

  currentMood = SAD;
  currentMessage = "Feeling down...";
}

// ===============================
// Non-blocking blink
// ===============================
void updateBlink()
{
  unsigned long now = millis();

  if (!eyesClosed && now - blinkTimer > nextBlinkDelay)
  {
    eyesClosed = true;
    blinkStartedAt = now;
  }

  if (eyesClosed && now - blinkStartedAt > BLINK_DURATION)
  {
    eyesClosed = false;
    blinkTimer = now;
    nextBlinkDelay = random(BLINK_MIN_INTERVAL, BLINK_MAX_INTERVAL);
  }
}

// ===============================
// Main update, call every loop()
// ===============================
void updatePersonality()
{
  unsigned long now = millis();

  // Happiness slowly decays over time
  if (now - lastHappinessTick > HAPPINESS_DECAY_INTERVAL)
  {
    if (happiness > MIN_HAPPINESS) happiness--;
    lastHappinessTick = now;
  }

  // Re-evaluate mood periodically (not every frame, keeps it stable)
  if (now - lastMoodChange > MOOD_CHANGE_INTERVAL)
  {
    chooseMood();
    lastMoodChange = now;
  }

  updateBlink();
}

// ===============================
// Feeding
// ===============================
void feedCat()
{
  happiness += 10;
  if (happiness > MAX_HAPPINESS) happiness = MAX_HAPPINESS;

  friendship += 5;

  currentMood = JOYFUL;
  currentMessage = "Yummy!";

  lastInteraction = millis();
  lastMoodChange = millis(); // don't let the periodic check immediately override
}

// ===============================
// Playing
// ===============================
void playWithCat()
{
  happiness += 5;
  if (happiness > MAX_HAPPINESS) happiness = MAX_HAPPINESS;

  friendship += 10;

  currentMood = EXCITED;
  currentMessage = "Let's play!";

  lastInteraction = millis();
  lastMoodChange = millis();
}

// ===============================
// Get Mood Text
// ===============================
String moodText()
{
  switch (currentMood)
  {
    case JOYFUL:   return "Joyful";
    case HAPPY:    return "Happy";
    case NORMAL:   return "Normal";
    case CURIOUS:  return "Curious";
    case HUNGRY:   return "Hungry";
    case SAD:      return "Sad";
    case ANGRY:    return "Angry";
    case SLEEPY:   return "Sleepy";
    case EXCITED:  return "Excited";
  }
  return "Unknown";
}

#endif
