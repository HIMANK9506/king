#ifndef EMOTIONS_H
#define EMOTIONS_H

#include <Adafruit_SSD1306.h>

// Each one is modeled after a kaomoji from your reference set --
// see the comment next to each for which one it's based on.
enum Emotion {
  EMOTION_NEUTRAL,     // (◔‿◔)
  EMOTION_HAPPY,       // (◕‿◕)
  EMOTION_EXCITED,     // (☆▽☆)
  EMOTION_LOVE,        // (✿^‿^)
  EMOTION_SLEEPY,      // (=‿=)
  EMOTION_SURPRISED,   // (ʘ‿ʘ)
  EMOTION_CONFUSED,    // (θ‿θ)
  EMOTION_SMUG,        // ಡ_ʖ_ಡ
  EMOTION_SAD,
  EMOTION_ANGRY,
  EMOTION_ADORING,     // (●♡∀♡)  -- heart eyes
  EMOTION_WINK,        // (◠‿・)—☆
  EMOTION_DIZZY,       // (@_@)
  EMOTION_SHRUG,       // ¯\_(ツ)_/¯
  EMOTION_TOUCHED,     // ಥ‿ಥ  -- happy tears
  EMOTION_CRYING,      // (；∀；)
  EMOTION_KISS,        // ( ˘ ³˘)♥
  EMOTION_RAGE,        // (╬☉д⊙)
  EMOTION_NERVOUS,     // (・_・;)
  EMOTION_STARSTRUCK,  // (✯ᴗ✯)
};

// Turns a string like "happy" (from the JSON message) into an Emotion enum.
// Defaults to NEUTRAL if it doesn't recognise the word.
Emotion emotionFromString(const String &name);

// Draws a face for the given emotion, centered in the top ~40px of the
// display, leaving room for text below. `frame` is an ever-increasing
// counter (advanced by the main loop every ~150ms) that drives animation:
// periodic blinking, floating hearts, twinkling stars, etc.
void drawFace(Adafruit_SSD1306 &display, Emotion emotion, unsigned long frame);

#endif
