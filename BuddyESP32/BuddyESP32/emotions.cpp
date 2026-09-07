#include "emotions.h"

// Eye positions, shared by all expressions
static const int LEFT_EYE_X = 40;
static const int RIGHT_EYE_X = 88;
static const int EYE_Y = 20;
static const int MOUTH_Y = 40;

// Blink roughly every 3.6s (24 frames * 150ms), for one frame at a time.
static const unsigned long BLINK_CYCLE = 24;

Emotion emotionFromString(const String &name) {
  String n = name;
  n.toLowerCase();
  if (n == "happy" || n == "content" || n == "glad") return EMOTION_HAPPY;
  if (n == "excited" || n == "amazed" || n == "wow") return EMOTION_EXCITED;
  if (n == "love" || n == "affection" || n == "cute") return EMOTION_LOVE;
  if (n == "sleepy" || n == "tired") return EMOTION_SLEEPY;
  if (n == "surprised" || n == "shocked") return EMOTION_SURPRISED;
  if (n == "confused" || n == "thinking" || n == "unsure") return EMOTION_CONFUSED;
  if (n == "smug" || n == "sly" || n == "smirk") return EMOTION_SMUG;
  if (n == "sad" || n == "disappointed") return EMOTION_SAD;
  if (n == "angry" || n == "annoyed") return EMOTION_ANGRY;
  if (n == "adoring" || n == "heart eyes" || n == "smitten") return EMOTION_ADORING;
  if (n == "wink" || n == "playful") return EMOTION_WINK;
  if (n == "dizzy" || n == "overwhelmed") return EMOTION_DIZZY;
  if (n == "shrug" || n == "whatever" || n == "idk" || n == "dunno") return EMOTION_SHRUG;
  if (n == "touched" || n == "moved") return EMOTION_TOUCHED;
  if (n == "crying" || n == "heartbroken" || n == "upset") return EMOTION_CRYING;
  if (n == "kiss" || n == "affectionate") return EMOTION_KISS;
  if (n == "rage" || n == "furious" || n == "mad") return EMOTION_RAGE;
  if (n == "nervous" || n == "embarrassed" || n == "awkward") return EMOTION_NERVOUS;
  if (n == "starstruck" || n == "impressed" || n == "admiring") return EMOTION_STARSTRUCK;
  return EMOTION_NEUTRAL;
}

// ---------- Eye styles ----------

static void drawRoundEye(Adafruit_SSD1306 &d, int cx, int cy, int r) {
  d.fillCircle(cx, cy, r, SSD1306_WHITE);
  d.fillCircle(cx - r / 3, cy - r / 3, 1, SSD1306_BLACK); // shine highlight
}

static void drawWideEye(Adafruit_SSD1306 &d, int cx, int cy, int r) {
  d.drawCircle(cx, cy, r, SSD1306_WHITE);
  d.fillCircle(cx, cy, 1, SSD1306_WHITE);
}

static void drawClosedHappyEye(Adafruit_SSD1306 &d, int cx, int cy, int r) {
  d.drawLine(cx - r, cy, cx, cy - r, SSD1306_WHITE);
  d.drawLine(cx, cy - r, cx + r, cy, SSD1306_WHITE);
}

static void drawFlatEye(Adafruit_SSD1306 &d, int cx, int cy, int r) {
  d.drawFastHLine(cx - r, cy - 1, r * 2, SSD1306_WHITE);
  d.drawFastHLine(cx - r, cy + 1, r * 2, SSD1306_WHITE);
}

static void drawSparkle(Adafruit_SSD1306 &d, int cx, int cy, int r) {
  d.drawLine(cx, cy - r, cx, cy + r, SSD1306_WHITE);
  d.drawLine(cx - r, cy, cx + r, cy, SSD1306_WHITE);
  d.drawLine(cx - r / 2, cy - r / 2, cx + r / 2, cy + r / 2, SSD1306_WHITE);
  d.drawLine(cx - r / 2, cy + r / 2, cx + r / 2, cy - r / 2, SSD1306_WHITE);
}

static void drawThetaEye(Adafruit_SSD1306 &d, int cx, int cy, int r) {
  d.drawCircle(cx, cy, r, SSD1306_WHITE);
  d.drawFastHLine(cx - r, cy, r * 2, SSD1306_WHITE);
}

// Simple "X" eye -- dizzy / knocked-out look, e.g. (@_@)
static void drawXEye(Adafruit_SSD1306 &d, int cx, int cy, int r) {
  d.drawLine(cx - r, cy - r, cx + r, cy + r, SSD1306_WHITE);
  d.drawLine(cx - r, cy + r, cx + r, cy - r, SSD1306_WHITE);
}

static void drawBlush(Adafruit_SSD1306 &d, int cx, int cy) {
  d.drawLine(cx - 4, cy, cx + 2, cy - 2, SSD1306_WHITE);
  d.drawLine(cx - 4, cy + 3, cx + 2, cy + 1, SSD1306_WHITE);
}

static void drawHeart(Adafruit_SSD1306 &d, int cx, int cy, int size) {
  int r = size / 2;
  d.fillCircle(cx - r, cy, r, SSD1306_WHITE);
  d.fillCircle(cx + r, cy, r, SSD1306_WHITE);
  d.fillTriangle(cx - size, cy, cx + size, cy, cx, cy + size, SSD1306_WHITE);
}

// Solid 6-point-ish star -- starstruck eyes, made of two overlapping filled triangles
static void drawFilledStar(Adafruit_SSD1306 &d, int cx, int cy, int r) {
  d.fillTriangle(cx, cy - r, cx - r, cy + r / 2, cx + r, cy + r / 2, SSD1306_WHITE);
  d.fillTriangle(cx, cy + r, cx - r, cy - r / 2, cx + r, cy - r / 2, SSD1306_WHITE);
}

static void drawTear(Adafruit_SSD1306 &d, int cx, int cyTop, int length) {
  d.drawLine(cx, cyTop, cx, cyTop + length, SSD1306_WHITE);
  d.fillCircle(cx, cyTop + length, 1, SSD1306_WHITE);
}

// Small jagged vein mark near the temple -- rage
static void drawVein(Adafruit_SSD1306 &d, int cx, int cy) {
  d.drawLine(cx, cy, cx + 3, cy + 3, SSD1306_WHITE);
  d.drawLine(cx + 3, cy + 3, cx, cy + 6, SSD1306_WHITE);
  d.drawLine(cx, cy + 6, cx + 3, cy + 9, SSD1306_WHITE);
}

// ---------- Mouth styles ----------

static void drawSmileMouth(Adafruit_SSD1306 &d) {
  d.drawCircleHelper(64, MOUTH_Y - 8, 18, 0x4, SSD1306_WHITE);
  d.drawCircleHelper(64, MOUTH_Y - 8, 18, 0x8, SSD1306_WHITE);
}

static void drawFrownMouth(Adafruit_SSD1306 &d) {
  d.drawCircleHelper(64, MOUTH_Y + 10, 18, 0x1, SSD1306_WHITE);
  d.drawCircleHelper(64, MOUTH_Y + 10, 18, 0x2, SSD1306_WHITE);
}

static void drawWavyMouth(Adafruit_SSD1306 &d) {
  d.drawLine(52, MOUTH_Y, 58, MOUTH_Y + 4, SSD1306_WHITE);
  d.drawLine(58, MOUTH_Y + 4, 64, MOUTH_Y, SSD1306_WHITE);
  d.drawLine(64, MOUTH_Y, 70, MOUTH_Y + 4, SSD1306_WHITE);
  d.drawLine(70, MOUTH_Y + 4, 76, MOUTH_Y, SSD1306_WHITE);
}

static void drawFlatMouth(Adafruit_SSD1306 &d) {
  d.drawFastHLine(52, MOUTH_Y, 24, SSD1306_WHITE);
}

static void drawGrittedMouth(Adafruit_SSD1306 &d) {
  d.drawFastHLine(50, MOUTH_Y - 1, 28, SSD1306_WHITE);
  d.drawFastHLine(50, MOUTH_Y + 1, 28, SSD1306_WHITE);
}

static void drawOpenTriangleMouth(Adafruit_SSD1306 &d) {
  d.fillTriangle(52, MOUTH_Y - 4, 76, MOUTH_Y - 4, 64, MOUTH_Y + 8, SSD1306_WHITE);
}

static void drawSmirkMouth(Adafruit_SSD1306 &d) {
  d.drawCircleHelper(64, MOUTH_Y - 8, 18, 0x8, SSD1306_WHITE);
}

// Small puckered "kiss" mouth
static void drawPuckerMouth(Adafruit_SSD1306 &d) {
  d.fillCircle(64, MOUTH_Y, 3, SSD1306_WHITE);
}

// ---------- Decorations (hearts / stars / shrug marks around the face) ----------

static void drawDecorations(Adafruit_SSD1306 &d, Emotion emotion, unsigned long frame) {
  if (emotion == EMOTION_LOVE) {
    int bob1 = ((frame % 8) < 4) ? 0 : -2;
    int bob2 = ((frame % 10) < 5) ? -1 : 1;
    drawHeart(d, 14, 10 + bob1, 4);
    drawHeart(d, 114, 9 + bob2, 3);
  } else if (emotion == EMOTION_EXCITED) {
    if ((frame % 4) < 2) drawSparkle(d, 12, 9, 4);
    if (((frame + 2) % 4) < 2) drawSparkle(d, 116, 11, 3);
    if (((frame + 1) % 5) < 3) drawSparkle(d, 100, 6, 3);
  } else if (emotion == EMOTION_WINK) {
    if ((frame % 6) < 3) drawSparkle(d, 110, 12, 3);
  } else if (emotion == EMOTION_KISS) {
    int drift = (frame % 12); // heart drifts up and to the right, then resets
    drawHeart(d, 100 + drift / 2, 14 - drift / 2, 4);
  } else if (emotion == EMOTION_RAGE) {
    drawVein(d, LEFT_EYE_X - 14, EYE_Y - 12);
  } else if (emotion == EMOTION_SHRUG) {
    // little shoulder tick-marks, evoking ¯\_(ツ)_/¯
    d.drawLine(18, 48, 26, 44, SSD1306_WHITE);
    d.drawLine(110, 48, 102, 44, SSD1306_WHITE);
  } else if (emotion == EMOTION_NERVOUS) {
    drawTear(d, RIGHT_EYE_X + 12, EYE_Y - 6, 5);
  }
}

// ---------- Full faces ----------

void drawFace(Adafruit_SSD1306 &display, Emotion emotion, unsigned long frame) {
  bool blinkFrame = (frame != 0) && (frame % BLINK_CYCLE == 0)
                     && emotion != EMOTION_SLEEPY
                     && emotion != EMOTION_SURPRISED
                     && emotion != EMOTION_DIZZY
                     && emotion != EMOTION_ADORING
                     && emotion != EMOTION_CRYING;

  if (blinkFrame) {
    drawFlatEye(display, LEFT_EYE_X, EYE_Y, 5);
    drawFlatEye(display, RIGHT_EYE_X, EYE_Y, 5);
  } else {
    switch (emotion) {
      case EMOTION_HAPPY:
        drawRoundEye(display, LEFT_EYE_X, EYE_Y, 6);
        drawRoundEye(display, RIGHT_EYE_X, EYE_Y, 6);
        break;
      case EMOTION_EXCITED:
        drawSparkle(display, LEFT_EYE_X, EYE_Y, 7);
        drawSparkle(display, RIGHT_EYE_X, EYE_Y, 7);
        break;
      case EMOTION_LOVE:
        drawClosedHappyEye(display, LEFT_EYE_X, EYE_Y, 5);
        drawClosedHappyEye(display, RIGHT_EYE_X, EYE_Y, 5);
        drawBlush(display, LEFT_EYE_X - 14, EYE_Y + 8);
        drawBlush(display, RIGHT_EYE_X + 6, EYE_Y + 8);
        break;
      case EMOTION_SLEEPY:
        drawFlatEye(display, LEFT_EYE_X, EYE_Y, 6);
        drawFlatEye(display, RIGHT_EYE_X, EYE_Y, 6);
        break;
      case EMOTION_SURPRISED:
        drawWideEye(display, LEFT_EYE_X, EYE_Y, 8);
        drawWideEye(display, RIGHT_EYE_X, EYE_Y, 8);
        break;
      case EMOTION_CONFUSED:
        drawThetaEye(display, LEFT_EYE_X, EYE_Y, 6);
        drawThetaEye(display, RIGHT_EYE_X, EYE_Y, 6);
        break;
      case EMOTION_SMUG:
        drawFlatEye(display, LEFT_EYE_X, EYE_Y, 6);
        drawRoundEye(display, RIGHT_EYE_X, EYE_Y - 2, 5);
        break;
      case EMOTION_SAD:
        drawRoundEye(display, LEFT_EYE_X, EYE_Y, 4);
        drawRoundEye(display, RIGHT_EYE_X, EYE_Y, 4);
        break;
      case EMOTION_ANGRY:
        drawRoundEye(display, LEFT_EYE_X, EYE_Y, 4);
        drawRoundEye(display, RIGHT_EYE_X, EYE_Y, 4);
        display.drawLine(LEFT_EYE_X - 8, EYE_Y - 10, LEFT_EYE_X + 4, EYE_Y - 6, SSD1306_WHITE);
        display.drawLine(RIGHT_EYE_X + 8, EYE_Y - 10, RIGHT_EYE_X - 4, EYE_Y - 6, SSD1306_WHITE);
        break;
      case EMOTION_ADORING:
        drawHeart(display, LEFT_EYE_X, EYE_Y, 5);
        drawHeart(display, RIGHT_EYE_X, EYE_Y, 5);
        break;
      case EMOTION_WINK:
        drawRoundEye(display, LEFT_EYE_X, EYE_Y, 6);
        drawClosedHappyEye(display, RIGHT_EYE_X, EYE_Y, 5);
        break;
      case EMOTION_DIZZY:
        drawXEye(display, LEFT_EYE_X, EYE_Y, 6);
        drawXEye(display, RIGHT_EYE_X, EYE_Y, 6);
        break;
      case EMOTION_SHRUG:
        drawFlatEye(display, LEFT_EYE_X, EYE_Y, 5);
        drawFlatEye(display, RIGHT_EYE_X, EYE_Y, 5);
        break;
      case EMOTION_TOUCHED:
        drawRoundEye(display, LEFT_EYE_X, EYE_Y, 5);
        drawRoundEye(display, RIGHT_EYE_X, EYE_Y, 5);
        drawTear(display, LEFT_EYE_X - 2, EYE_Y + 6, 6);
        break;
      case EMOTION_CRYING:
        drawWideEye(display, LEFT_EYE_X, EYE_Y, 6);
        drawWideEye(display, RIGHT_EYE_X, EYE_Y, 6);
        drawTear(display, LEFT_EYE_X, EYE_Y + 7, 8);
        drawTear(display, RIGHT_EYE_X, EYE_Y + 7, 8);
        break;
      case EMOTION_KISS:
        drawClosedHappyEye(display, LEFT_EYE_X, EYE_Y, 5);
        drawClosedHappyEye(display, RIGHT_EYE_X, EYE_Y, 5);
        break;
      case EMOTION_RAGE:
        drawWideEye(display, LEFT_EYE_X, EYE_Y, 7);
        drawWideEye(display, RIGHT_EYE_X, EYE_Y, 7);
        display.drawLine(LEFT_EYE_X - 8, EYE_Y - 11, LEFT_EYE_X + 4, EYE_Y - 7, SSD1306_WHITE);
        display.drawLine(RIGHT_EYE_X + 8, EYE_Y - 11, RIGHT_EYE_X - 4, EYE_Y - 7, SSD1306_WHITE);
        break;
      case EMOTION_NERVOUS:
        drawRoundEye(display, LEFT_EYE_X, EYE_Y, 3);
        drawRoundEye(display, RIGHT_EYE_X, EYE_Y, 3);
        break;
      case EMOTION_STARSTRUCK:
        drawFilledStar(display, LEFT_EYE_X, EYE_Y, 6);
        drawFilledStar(display, RIGHT_EYE_X, EYE_Y, 6);
        break;
      case EMOTION_NEUTRAL:
      default:
        drawRoundEye(display, LEFT_EYE_X, EYE_Y, 5);
        drawRoundEye(display, RIGHT_EYE_X, EYE_Y, 5);
        break;
    }
  }

  // Mouth (unaffected by blinking)
  switch (emotion) {
    case EMOTION_EXCITED:
      drawOpenTriangleMouth(display);
      break;
    case EMOTION_SAD:
      drawFrownMouth(display);
      break;
    case EMOTION_ANGRY:
      drawFlatMouth(display);
      break;
    case EMOTION_SMUG:
      drawSmirkMouth(display);
      break;
    case EMOTION_CRYING:
      drawWavyMouth(display);
      break;
    case EMOTION_RAGE:
      drawGrittedMouth(display);
      break;
    case EMOTION_KISS:
      drawPuckerMouth(display);
      break;
    case EMOTION_NERVOUS:
      drawWavyMouth(display);
      break;
    case EMOTION_SHRUG:
      drawFlatMouth(display);
      break;
    default:
      drawSmileMouth(display);
      break;
  }

  drawDecorations(display, emotion, frame);
}
