#include <Arduino.h>


#include "Config.h"

#include "CatSprites.h"

#include "Animation.h"

#include "CatAI.h"

#include "Memory.h"

#include "Sensors.h"

#include "DisplayEngine.h"

#include "Menu.h"

#include "Games.h"

#include "Sound.h"

#include "Icons.h"



void setup()
{


Serial.begin(115200);



pinMode(
BUTTON_SELECT,
INPUT_PULLUP
);


pinMode(
BUTTON_NEXT,
INPUT_PULLUP
);



initDisplay();


initSensors();


initMemory();


loadMemory();


initSound();



setAnimation(
ANIM_IDLE
);



}



void loop()
{


// AI update

updateCatAI();


// animation

updateAnimation();

updateBlink();


// sensors

updateSensors();



// Button actions


if(
digitalRead(BUTTON_SELECT)==LOW
)

{

feedCat();

saveMemory();

happySound();


delay(500);

}



if(
digitalRead(BUTTON_NEXT)==LOW
)

{

playCat();

saveMemory();


delay(500);

}




// Display


drawHome();



delay(50);



}