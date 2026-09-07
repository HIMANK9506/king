#ifndef GAMES_H
#define GAMES_H


#include <Arduino.h>
#include "Display.h"
#include "Config.h"


// =============================
// Game Variables
// =============================


int gameScore = 0;

bool gameRunning = false;



// =============================
// Reaction Game
// =============================


void reactionGame()

{

gameRunning=true;

gameScore=0;



display.clearBuffer();


display.setFont(
u8g2_font_7x14_tr
);


display.drawStr(
15,
25,
"REACTION!"
);


display.drawStr(
10,
45,
"Press PLAY"
);


display.sendBuffer();



delay(1000);



unsigned long start =
millis();



while(true)

{


if(
digitalRead(PLAY_BUTTON)==LOW
)

{


unsigned long reaction =
millis()-start;



display.clearBuffer();



display.drawStr(
10,
30,
"TIME:"
);


display.setCursor(
55,
30
);


display.print(
reaction
);


display.print(
" ms"
);


display.sendBuffer();



delay(2000);


break;


}



}



gameRunning=false;


}




// =============================
// Simple Snake Menu
// =============================


void snakeGame()

{


gameRunning=true;



int x=60;

int y=30;



int dx=2;



for(int i=0;i<100;i++)

{


display.clearBuffer();



display.drawFrame(
0,
0,
128,
64
);



display.drawBox(
x,
y,
4,
4
);



display.sendBuffer();



x+=dx;



if(x>120 || x<5)

dx=-dx;



if(
digitalRead(FEED_BUTTON)==LOW
)

{

break;

}



delay(50);



}



display.clearBuffer();


display.drawStr(
20,
30,
"GAME OVER"
);


display.sendBuffer();



delay(1000);



gameRunning=false;


}




// =============================
// Game Menu
// =============================


void openGameMenu()

{


display.clearBuffer();



display.setFont(
u8g2_font_7x14_tr
);



display.drawStr(
15,
20,
"1 Reaction"
);



display.drawStr(
15,
40,
"2 Snake"
);



display.sendBuffer();



delay(1000);



if(
digitalRead(PLAY_BUTTON)==LOW
)

{

reactionGame();

}


else if(
digitalRead(FEED_BUTTON)==LOW
)

{

snakeGame();

}



}



#endif