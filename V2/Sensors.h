#ifndef SENSORS_H
#define SENSORS_H


#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>


Adafruit_MPU6050 mpu;


long steps=0;

bool walking=false;


float lastMovement=0;



void initSensors()
{


Wire.begin(
MPU_SDA,
MPU_SCL
);


if(!mpu.begin())
{

Serial.println(
"MPU6050 ERROR"
);

}


}



void updateSensors()
{


sensors_event_t a,g,temp;


mpu.getEvent(
&a,
&g,
&temp
);



float movement =
sqrt(
a.acceleration.x*a.acceleration.x+
a.acceleration.y*a.acceleration.y+
a.acceleration.z*a.acceleration.z
);



if(
abs(movement-lastMovement)>2
)

{

walking=true;

steps++;

}

else

{

walking=false;

}


lastMovement=movement;


}



String activity()
{

if(walking)

return "WALK";

else

return "IDLE";

}



#endif