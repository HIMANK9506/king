#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#include "Config.h"

// ============================
// MPU6050 Object
// ============================
Adafruit_MPU6050 mpu;
bool mpuReady = false;

// ============================
// Sensor Variables
// ============================
long steps = 0;
bool moving = false;

float lastAcceleration = 0;
unsigned long lastStepTime = 0;

// Activity window tracking (feeds the mood system)
long stepsAtWindowStart = 0;
unsigned long windowStartTime = 0;
bool recentlyActive = false;

// ============================
// Initialize Sensors
// ============================
void initSensors()
{
  Wire.begin(MPU_SDA, MPU_SCL);

  if (!mpu.begin())
  {
    Serial.println("MPU6050 not detected");
    mpuReady = false;
  }
  else
  {
    Serial.println("MPU6050 Ready");
    mpuReady = true;
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);

  windowStartTime = millis();
  stepsAtWindowStart = 0;
}

// ============================
// Read MPU6050 + update step/activity state
// ============================
void updateSensors()
{
  if (!mpuReady)
  {
    moving = false;
    return;
  }

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Calculate movement strength
  float acceleration = sqrt(
    a.acceleration.x * a.acceleration.x +
    a.acceleration.y * a.acceleration.y +
    a.acceleration.z * a.acceleration.z
  );

  float difference = abs(acceleration - lastAcceleration);
  lastAcceleration = acceleration;

  // Motion + step detection
  if (difference > 2.0)
  {
    moving = true;

    if (millis() - lastStepTime > 350)
    {
      steps++;
      lastStepTime = millis();
    }
  }
  else
  {
    moving = false;
  }

  // Rolling activity window -> used by Personality.h to influence mood
  if (millis() - windowStartTime > STEP_WINDOW)
  {
    long stepsThisWindow = steps - stepsAtWindowStart;
    recentlyActive = (stepsThisWindow >= ACTIVE_STEP_THRESHOLD);

    stepsAtWindowStart = steps;
    windowStartTime = millis();
  }
}

// ============================
// Getters
// ============================
int getSteps()
{
  return steps;
}

bool isRecentlyActive()
{
  return recentlyActive;
}

String activityStatus()
{
  return moving ? "ACTIVE" : "IDLE";
}

#endif
