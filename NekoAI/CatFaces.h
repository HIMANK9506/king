#ifndef CATFACES_H
#define CATFACES_H

#include <Arduino.h>
#include "Display.h"

// ============================================
// Mood codes expected by drawCat()
// (Must match the Mood enum order in Personality.h)
// ============================================
#define MOOD_JOYFUL   0
#define MOOD_HAPPY    1
#define MOOD_NORMAL   2
#define MOOD_CURIOUS  3
#define MOOD_HUNGRY   4
#define MOOD_SAD      5
#define MOOD_ANGRY    6
#define MOOD_SLEEPY   7
#define MOOD_EXCITED  8

// ============================================
// Helper: sparkle eye (filled disc with a tiny
// highlight punched out using the background color)
// ============================================
void drawSparkleEye(int cx, int cy, int r)
{
  display.setDrawColor(1);
  display.drawDisc(cx, cy, r);

  display.setDrawColor(0);
  display.drawDisc(cx - 1, cy - 1, 1);

  display.setDrawColor(1);
}

// ============================================
// Helper: blush mark (two tiny diagonal dots)
// ============================================
void drawBlush(int cx, int cy)
{
  display.drawPixel(cx, cy);
  display.drawPixel(cx + 1, cy);
  display.drawPixel(cx, cy + 1);
}

// ============================================
// Main Cat Drawing Engine - chibi / kawaii style
// ============================================
void drawCat(bool eyesClosed, int mood)
{
  display.setDrawColor(1);

  // Gentle idle "breathing" - whole face bobs 1-2px, very subtle
  int bob = (int)(sin(millis() / 600.0) * 1.5);

  // One ear twitches slightly every few seconds - adds life without
  // needing a full sprite animation system
  int twitch = ((millis() / 3500) % 2 == 0) ? 0 : 2;

  int cx = 64;
  int cy = 30 + bob;
  int r  = 19;

  // ---------- Ears (attached flush to the head, not floating) ----------
  display.drawTriangle(cx - 20, cy - 3, cx - 13 - twitch, cy - 21, cx - 5, cy - 7);
  display.drawTriangle(cx + 5, cy - 7, cx + 13 + twitch, cy - 21, cx + 20, cy - 3);

  // Inner ear detail
  display.drawLine(cx - 16, cy - 7, cx - 13, cy - 14);
  display.drawLine(cx + 13, cy - 14, cx + 16, cy - 7);

  // ---------- Head ----------
  display.drawCircle(cx, cy, r);

  // ---------- Tiny paws peeking out at the bottom (cuteness) ----------
  display.drawDisc(cx - 9, cy + r - 3, 3);
  display.drawDisc(cx + 9, cy + r - 3, 3);

  // ---------- Eyes (big + close-set = kawaii proportions) ----------
  bool forceClosed = (mood == MOOD_SLEEPY) || eyesClosed;

  int leftEyeX  = cx - 8;
  int rightEyeX = cx + 8;
  int eyeY      = cy - 1;

  if (forceClosed)
  {
    // Sleepy / blinking: soft curved lines (little upward arc)
    display.drawLine(leftEyeX - 4, eyeY, leftEyeX, eyeY - 2);
    display.drawLine(leftEyeX, eyeY - 2, leftEyeX + 4, eyeY);

    display.drawLine(rightEyeX - 4, eyeY, rightEyeX, eyeY - 2);
    display.drawLine(rightEyeX, eyeY - 2, rightEyeX + 4, eyeY);
  }
  else if (mood == MOOD_ANGRY)
  {
    drawSparkleEye(leftEyeX, eyeY, 3);
    drawSparkleEye(rightEyeX, eyeY, 3);
    display.drawLine(leftEyeX - 5, eyeY - 5, leftEyeX + 2, eyeY - 3);
    display.drawLine(rightEyeX - 2, eyeY - 3, rightEyeX + 5, eyeY - 5);
  }
  else if (mood == MOOD_SAD)
  {
    drawSparkleEye(leftEyeX, eyeY + 1, 3);
    drawSparkleEye(rightEyeX, eyeY + 1, 3);
    display.drawLine(leftEyeX - 4, eyeY - 4, leftEyeX + 2, eyeY - 5);
    display.drawLine(rightEyeX - 2, eyeY - 5, rightEyeX + 4, eyeY - 4);
  }
  else if (mood == MOOD_JOYFUL || mood == MOOD_EXCITED)
  {
    // Big sparkly wide eyes
    drawSparkleEye(leftEyeX, eyeY, 5);
    drawSparkleEye(rightEyeX, eyeY, 5);
  }
  else if (mood == MOOD_CURIOUS)
  {
    // One eye wide and curious, one relaxed
    drawSparkleEye(leftEyeX, eyeY, 5);
    drawSparkleEye(rightEyeX, eyeY, 3);
  }
  else
  {
    // Normal / hungry: standard round eyes
    drawSparkleEye(leftEyeX, eyeY, 4);
    drawSparkleEye(rightEyeX, eyeY, 4);
  }

  // ---------- Blush ----------
  if (mood == MOOD_JOYFUL || mood == MOOD_HAPPY || mood == MOOD_EXCITED)
  {
    drawBlush(cx - 15, cy + 4);
    drawBlush(cx + 13, cy + 4);
  }

  // ---------- Nose (small triangle) ----------
  display.drawTriangle(cx - 2, cy + 5, cx + 2, cy + 5, cx, cy + 8);

  // ---------- Mouth: classic cat "w" smile, shape varies by mood ----------
  if (mood == MOOD_JOYFUL || mood == MOOD_EXCITED)
  {
    display.drawLine(cx, cy + 8, cx - 5, cy + 12);
    display.drawLine(cx, cy + 8, cx + 5, cy + 12);
    display.drawLine(cx - 5, cy + 12, cx - 2, cy + 10);
    display.drawLine(cx + 5, cy + 12, cx + 2, cy + 10);
  }
  else if (mood == MOOD_HAPPY)
  {
    display.drawLine(cx, cy + 8, cx - 3, cy + 11);
    display.drawLine(cx, cy + 8, cx + 3, cy + 11);
  }
  else if (mood == MOOD_SAD)
  {
    display.drawLine(cx - 4, cy + 13, cx, cy + 10);
    display.drawLine(cx, cy + 10, cx + 4, cy + 13);
  }
  else if (mood == MOOD_ANGRY)
  {
    display.drawLine(cx - 4, cy + 11, cx + 4, cy + 11);
  }
  else if (mood == MOOD_HUNGRY)
  {
    display.drawCircle(cx, cy + 11, 2);
  }
  else
  {
    display.drawLine(cx, cy + 8, cx - 3, cy + 10);
    display.drawLine(cx, cy + 8, cx + 3, cy + 10);
  }

  // ---------- Whiskers (short, close to the muzzle) ----------
  display.drawLine(cx - r + 3, cy + 4, cx - r - 5, cy + 2);
  display.drawLine(cx - r + 3, cy + 7, cx - r - 5, cy + 7);

  display.drawLine(cx + r - 3, cy + 4, cx + r + 5, cy + 2);
  display.drawLine(cx + r - 3, cy + 7, cx + r + 5, cy + 7);

  // ---------- Sleepy Zzz ----------
  if (mood == MOOD_SLEEPY)
  {
    display.setFont(u8g2_font_5x8_tr);
    display.drawStr(cx + r - 2, cy - r + 6, "z");
    display.drawStr(cx + r + 5, cy - r - 2, "Z");
  }
}

// =======================
// Convenience wrappers
// =======================
void idleCat(int mood)     { drawCat(false, mood); }
void blinkCat(int mood)    { drawCat(true, mood); }

#endif