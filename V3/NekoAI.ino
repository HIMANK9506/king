#include <Arduino.h>
#include <Wire.h>


// Project files

#include "Config.h"

#include "Bitmaps.h"

#include "Display.h"

#include "CatFaces.h"

#include "Sensors.h"

#include "Personality.h"

#include "Games.h"



// ==========================
// Setup
// ==========================


void setup()

{


Serial.begin(115200);



pinMode(
FEED_BUTTON,
INPUT_PULLUP
);


pinMode(
PLAY_BUTTON,
INPUT_PULLUP
);



// Start OLED

initDisplay();



// Start MPU6050

initSensors();



// Random moods

randomSeed(
analogRead(0)
);


chooseMood();



showMessage(
"Hello Himank!"
);


delay(1500);



}



// ==========================
// Main Loop
// ==========================


void loop()

{


// Update sensors

updateSensors();


// Update cat brain

updatePersonality();




// Button controls


if(
digitalRead(FEED_BUTTON)==LOW
)

{


feedCat();


showMessage(
"Yummy!"
);


delay(500);


}



if(
digitalRead(PLAY_BUTTON)==LOW
)

{


playWithCat();


showMessage(
"Play!"
);


delay(500);


}





// Draw main UI


display.clearBuffer();



// Draw cat


drawCat(
eyesClosed,
currentMood
);



// Draw information


display.setFont(
u8g2_font_5x8_tr
);



display.setCursor(
0,
62
);


display.print(
"HP:"
);


display.print(
happiness
);



display.setCursor(
40,
62
);


display.print(
"ST:"
);


display.print(
getSteps()
);




display.setCursor(
90,
62
);


display.print(
moodText()
);




display.sendBuffer();





delay(
FRAME_DELAY
);



}