#ifndef ANIMATION_H
#define ANIMATION_H


#include <Arduino.h>
#include "Config.h"
#include "CatSprites.h"


// =====================================
// Animation States
// =====================================


enum AnimationState
{

ANIM_IDLE,

ANIM_BLINK,

ANIM_HAPPY,

ANIM_SLEEP,

ANIM_EAT,

ANIM_PLAY

};



// =====================================
// Animation Variables
// =====================================


AnimationState currentAnimation = ANIM_IDLE;


int currentFrame = 0;


unsigned long lastFrameTime = 0;


unsigned long animationStartTime = 0;



bool animationRunning = false;



// =====================================
// Set Animation
// =====================================


void setAnimation(AnimationState anim)

{


currentAnimation = anim;


currentFrame = 0;


animationStartTime = millis();


animationRunning = true;


}



// =====================================
// Get Current Sprite
// =====================================


const unsigned char* getCurrentSprite()

{


switch(currentAnimation)

{


case ANIM_IDLE:

if(currentFrame==0)

return CAT_IDLE_1;

else

return CAT_IDLE_2;



case ANIM_BLINK:

return CAT_BLINK;



case ANIM_HAPPY:

return CAT_HAPPY;



case ANIM_SLEEP:

return CAT_SLEEP;



case ANIM_EAT:

return CAT_EAT;



case ANIM_PLAY:

return CAT_PLAY;



}



return CAT_IDLE_1;


}




// =====================================
// Update Animation Engine
// =====================================


void updateAnimation()

{


unsigned long now = millis();



if(
now-lastFrameTime < IDLE_SPEED
)

return;



lastFrameTime = now;



// Idle animation loop


if(currentAnimation==ANIM_IDLE)

{

currentFrame++;

if(currentFrame>1)

currentFrame=0;

}



// Temporary animations


if(
currentAnimation!=ANIM_IDLE
)

{


if(
now-animationStartTime > 3000
)

{


currentAnimation=ANIM_IDLE;

currentFrame=0;


}


}



}




// =====================================
// Blink Controller
// =====================================


unsigned long lastBlinkTime=0;



void updateBlink()

{


if(
millis()-lastBlinkTime > BLINK_INTERVAL
)

{


setAnimation(
ANIM_BLINK
);


lastBlinkTime=millis();


}


}



#endif