#ifndef CATAI_H
#define CATAI_H


#include <Arduino.h>

#include "Config.h"
#include "Animation.h"



// =====================================
// Cat Mood System
// =====================================


enum CatMood
{

JOYFUL,

HAPPY,

NORMAL,

CURIOUS,

HUNGRY,

SAD,

SLEEPY,

TIRED,

EXCITED

};





CatMood currentMood = HAPPY;




// =====================================
// Cat Stats
// =====================================


int happiness = DEFAULT_HAPPINESS;

int hunger = DEFAULT_HUNGER;

int energy = DEFAULT_ENERGY;

int friendship = DEFAULT_FRIENDSHIP;

int curiosity = DEFAULT_CURIOSITY;



// =====================================
// Timers
// =====================================


unsigned long lastMoodUpdate = 0;

unsigned long lastHungerUpdate = 0;

unsigned long lastEnergyUpdate = 0;




// =====================================
// Calculate Emotion
// =====================================


void calculateEmotion()

{


if(hunger < 25)

{

currentMood = HUNGRY;

setAnimation(ANIM_EAT);

}


else if(energy < 20)

{

currentMood = SLEEPY;

setAnimation(ANIM_SLEEP);

}


else if(happiness > 85)

{

currentMood = JOYFUL;

setAnimation(ANIM_HAPPY);

}


else if(friendship > 50)

{

currentMood = HAPPY;

}


else if(curiosity > 70)

{

currentMood = CURIOUS;

}


else if(happiness < 30)

{

currentMood = SAD;

}


else

{

currentMood = NORMAL;

}



}





// =====================================
// Update Cat Brain
// =====================================


void updateCatAI()

{


unsigned long now = millis();



// Hunger decreases


if(
now-lastHungerUpdate > HUNGER_DECAY_TIME
)

{


if(hunger>0)

hunger--;


lastHungerUpdate=now;


}




// Energy decreases


if(
now-lastEnergyUpdate > ENERGY_DECAY_TIME
)

{


if(energy>0)

energy--;


lastEnergyUpdate=now;


}




// Update mood


if(
now-lastMoodUpdate > MOOD_UPDATE_TIME
)

{


calculateEmotion();


lastMoodUpdate=now;


}



}




// =====================================
// Feed Cat
// =====================================


void feedCat()

{


hunger +=20;


happiness +=5;


friendship +=3;


energy +=5;



if(hunger>100)

hunger=100;


if(happiness>100)

happiness=100;


if(energy>100)

energy=100;



setAnimation(
ANIM_EAT
);



}





// =====================================
// Play With Cat
// =====================================


void playCat()

{


happiness +=10;

friendship +=5;

curiosity +=10;


energy -=10;



if(happiness>100)

happiness=100;


if(curiosity>100)

curiosity=100;


if(energy<0)

energy=0;



setAnimation(
ANIM_PLAY
);



}





// =====================================
// Sleep Cat
// =====================================


void sleepCat()

{


energy +=30;


hunger -=5;


setAnimation(
ANIM_SLEEP
);



if(energy>100)

energy=100;


if(hunger<0)

hunger=0;


}




// =====================================
// Mood Text
// =====================================


String getMoodText()

{


switch(currentMood)

{

case JOYFUL:
return "JOYFUL";


case HAPPY:
return "HAPPY";


case NORMAL:
return "NORMAL";


case CURIOUS:
return "CURIOUS";


case HUNGRY:
return "HUNGRY";


case SAD:
return "SAD";


case SLEEPY:
return "SLEEPY";


case TIRED:
return "TIRED";


case EXCITED:
return "EXCITED";


}


return "UNKNOWN";


}



#endif