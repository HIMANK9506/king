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



// ============================
// Sensor Variables
// ============================

long steps = 0;

bool moving = false;


float lastAcceleration = 0;

unsigned long lastStepTime = 0;



// ============================
// Initialize Sensors
// ============================

void initSensors()

{

Wire.begin(
MPU_SDA,
MPU_SCL
);



if(!mpu.begin())

{

Serial.println(
"MPU6050 not detected"
);


}

else

{

Serial.println(
"MPU6050 Ready"
);

}



mpu.setAccelerometerRange(
MPU6050_RANGE_8_G
);


mpu.setGyroRange(
MPU6050_RANGE_500_DEG
);


}



// ============================
// Read MPU6050
// ============================


void updateSensors()

{


sensors_event_t a,g,temp;


mpu.getEvent(
&a,
&g,
&temp
);



// Calculate movement strength


float acceleration = sqrt(
a.acceleration.x*a.acceleration.x +
a.acceleration.y*a.acceleration.y +
a.acceleration.z*a.acceleration.z
);



float difference =
abs(
acceleration-lastAcceleration
);



lastAcceleration = acceleration;



// Motion detection


if(difference > 2.0)

{

moving=true;



// Step detection cooldown

if(
millis()-lastStepTime > 350
)

{

steps++;

lastStepTime = millis();

}



}

else

{

moving=false;

}



}



// ============================
// Get Step Count
// ============================


int getSteps()

{

return steps;

}



// ============================
// Activity Status
// ============================


String activityStatus()

{

if(moving)

return "ACTIVE";


else

return "IDLE";


}



#endif