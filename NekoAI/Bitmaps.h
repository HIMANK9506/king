#ifndef BITMAPS_H
#define BITMAPS_H

#include <Arduino.h>

// ==========================
// Battery Icon (8x8)
// ==========================
const unsigned char batteryIcon[] PROGMEM =
{
  0x00, 0x7E, 0x42, 0x42,
  0x42, 0x42, 0x42, 0x7E
};

// ==========================
// Heart Icon (8x8)
// ==========================
const unsigned char heartIcon[] PROGMEM =
{
  0x00, 0x66, 0xFF, 0xFF,
  0x7E, 0x3C, 0x18, 0x00
};

// ==========================
// Step Icon (8x8)
// ==========================
const unsigned char stepIcon[] PROGMEM =
{
  0x18, 0x18, 0x18, 0x18,
  0x3C, 0x7E, 0x66, 0x00
};

// ==========================
// Game Icon (8x8)
// ==========================
const unsigned char gameIcon[] PROGMEM =
{
  0x3C, 0x42, 0xA5, 0x81,
  0xA5, 0x99, 0x42, 0x3C
};

// ==========================
// Sleep Icon (8x8)
// ==========================
const unsigned char sleepIcon[] PROGMEM =
{
  0x00, 0x30, 0x60, 0xC0,
  0x60, 0x30, 0x00, 0x00
};

#endif
