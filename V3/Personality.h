#ifndef PERSONALITY_H
#define PERSONALITY_H


#include <Arduino.h>


// ===============================
// Mood System
// ===============================


enum Mood
{

JOYFUL,
HAPPY,
NORMAL,
CURIOUS,
HUNGRY,
SAD,
ANGRY,
SLEEPY,
EXCITED

};




enum Animation
{

IDLE,
BLINKING,
EATING,
PLAYING,
SLEEPING,
HAPPY_FACE

};



// Current state

Mood currentMood = HAPPY;

Animation currentAnimation = IDLE;



// ===============================
// Cat Stats
// ===============================


int happiness = START_HAPPINESS;

int friendship = START_FRIENDSHIP;



// ===============================
// Timers
// ===============================


unsigned long lastMoodChange = 0;

unsigned long lastBlink = 0;

unsigned long blinkInterval = 4000;



bool eyesClosed = false;



// ===============================
// Choose Random Mood
// ===============================


void chooseMood()

{


int randomMood=random(0,5);



switch(randomMood)

{


case 0:

currentMood=HAPPY;

break;



case 1:

currentMood=NORMAL;

break;



case 2:

currentMood=SAD;

break;



case 3:

currentMood=SLEEPY;

break;



case 4:

currentMood=EXCITED;

break;



}



}




// ===============================
// Update Personality
// ===============================


void updatePersonality()

{


// random mood change

if(
millis()-lastMoodChange > 30000
)

{

chooseMood();

lastMoodChange=millis();

}




// happiness slowly decreases


if(
millis()%60000 < 50
)

{

if(happiness>0)

happiness--;

}




// blinking


if(
millis()-lastBlink > blinkInterval
)

{

eyesClosed=true;


currentAnimation=BLINKING;



delay(150);



eyesClosed=false;


currentAnimation=IDLE;



lastBlink=millis();


}




}




// ===============================
// Feeding
// ===============================


void feedCat()

{


happiness +=10;


friendship +=5;



if(happiness>100)

happiness=100;



currentAnimation=EATING;



}




// ===============================
// Playing
// ===============================


void playWithCat()

{


happiness+=5;


friendship+=10;



if(happiness>100)

happiness=100;


currentAnimation=PLAYING;



}




// ===============================
// Get Mood Text
// ===============================


String moodText()

{


switch(currentMood)

{


case HAPPY:

return "Happy";


case NORMAL:

return "Normal";


case SAD:

return "Sad";


case SLEEPY:

return "Sleepy";


case EXCITED:

return "Excited";


}



return "Unknown";


}



#endif