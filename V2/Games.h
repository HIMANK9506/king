#ifndef GAMES_H
#define GAMES_H


#include <Arduino.h>
#include "DisplayEngine.h"


int highScore = 0;



void reactionGame()
{

unsigned long start;

int waitTime=random(1000,4000);


oled.clearBuffer();

oled.drawStr(
20,
25,
"WAIT..."
);

oled.sendBuffer();



delay(waitTime);



start=millis();



oled.clearBuffer();

oled.drawStr(
20,
25,
"PRESS!"
);

oled.sendBuffer();



while(true)
{


if(
digitalRead(BUTTON_SELECT)==LOW
)

{

int result =
millis()-start;


if(result<highScore || highScore==0)

highScore=result;



oled.clearBuffer();

oled.setCursor(10,30);

oled.print(
"TIME:"
);

oled.print(result);


oled.sendBuffer();


delay(2000);


break;

}


}


}




void catToy()
{


oled.clearBuffer();


oled.drawStr(
20,
20,
"CATCH FISH"
);



oled.drawStr(
15,
45,
"PRESS BUTTON"
);



oled.sendBuffer();



if(
digitalRead(BUTTON_SELECT)==LOW
)

{

happiness+=5;

friendship+=2;


setAnimation(
ANIM_PLAY
);


}



}



#endif