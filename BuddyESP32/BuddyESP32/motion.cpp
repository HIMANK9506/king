#include "motion.h"
#include <math.h>

static const float REST_MAGNITUDE = 9.8;      // ~1g at rest, in m/s^2
static const float SPIKE_THRESHOLD = 4.0;     // how far above rest counts as a "spike"
static const unsigned long SPIKE_WINDOW_MS = 1000;   // spikes must cluster within this window to count as a shake
static const int SHAKE_SPIKE_COUNT = 3;       // this many spikes within the window = shake
static const unsigned long EVENT_COOLDOWN_MS = 2500; // don't re-trigger for a bit after firing

static unsigned long spikeTimestamps[5] = {0, 0, 0, 0, 0};
static int spikeIndex = 0;
static unsigned long lastEventTime = 0;

bool initMotion(Adafruit_MPU6050 &mpu) {
  if (!mpu.begin()) {
    return false;
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  return true;
}

MotionEvent pollMotion(Adafruit_MPU6050 &mpu) {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float magnitude = sqrt(a.acceleration.x * a.acceleration.x +
                          a.acceleration.y * a.acceleration.y +
                          a.acceleration.z * a.acceleration.z);
  float deviation = fabs(magnitude - REST_MAGNITUDE);

  unsigned long now = millis();

  if (now - lastEventTime < EVENT_COOLDOWN_MS) {
    return MOTION_NONE; // still cooling down from the last reaction
  }

  if (deviation > SPIKE_THRESHOLD) {
    spikeTimestamps[spikeIndex % 5] = now;
    spikeIndex++;

    int countInWindow = 0;
    for (int i = 0; i < 5; i++) {
      if (spikeTimestamps[i] != 0 && now - spikeTimestamps[i] < SPIKE_WINDOW_MS) {
        countInWindow++;
      }
    }

    if (countInWindow >= SHAKE_SPIKE_COUNT) {
      lastEventTime = now;
      for (int i = 0; i < 5; i++) spikeTimestamps[i] = 0;
      spikeIndex = 0;
      return MOTION_SHAKE;
    } else if (countInWindow == 1) {
      // A single isolated spike -- treat as a pickup. If more spikes follow
      // quickly after this, they'll accumulate toward a shake instead.
      lastEventTime = now;
      return MOTION_PICKUP;
    }
  }

  return MOTION_NONE;
}
