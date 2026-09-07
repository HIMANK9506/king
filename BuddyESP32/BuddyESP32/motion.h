#ifndef MOTION_H
#define MOTION_H

#include <Adafruit_MPU6050.h>

enum MotionEvent {
  MOTION_NONE,
  MOTION_SHAKE,    // several sharp movements in quick succession
  MOTION_PICKUP,   // one sharp jolt (e.g. lifting it off the desk)
};

// Call once in setup(). Returns false if the MPU6050 wasn't found on the
// I2C bus (check wiring) -- motion reactions just get skipped in that case,
// the rest of the buddy still works fine without it.
bool initMotion(Adafruit_MPU6050 &mpu);

// Call frequently (every ~50ms) from loop(). Returns a detected event, or
// MOTION_NONE most of the time. Has its own cooldown so a single shake
// doesn't fire the same event repeatedly.
MotionEvent pollMotion(Adafruit_MPU6050 &mpu);

#endif
