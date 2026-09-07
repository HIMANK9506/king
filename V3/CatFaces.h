#ifndef CATFACES_H
#define CATFACES_H


#include <Arduino.h>
#include "Display.h"


// =======================
// Cat Drawing Engine
// =======================


void drawCat(
bool eyesClosed,
int mood
)

{

display.setDrawColor(1);



// Head

display.drawCircle(
64,
32,
22
);



// Ears

display.drawTriangle(
45,
18,
50,
5,
58,
15
);


display.drawTriangle(
70,
15,
78,
5,
83,
18
);



// Eyes

if(eyesClosed)
{

display.drawLine(
52,
30,
58,
30
);


display.drawLine(
70,
30,
76,
30
);


}

else
{


display.drawDisc(
55,
30,
3
);


display.drawDisc(
73,
30,
3
);


}


// Mouth

display.drawLine(
61,
40,
67,
40
);



// Mood effects


// Happy

if(mood==1)
{

display.drawCircle(
64,
40,
5
);

}



// Sleep

if(mood==2)
{

display.drawStr(
90,
20,
"Z"
);


display.drawStr(
96,
12,
"Z"
);


}




}



// =======================
// Animations
// =======================


void idleCat()
{

drawCat(false,0);

}



void happyCat()
{

drawCat(false,1);

}



void sleepCat()
{

drawCat(true,2);

}



void blinkCat()
{

drawCat(true,0);

}



#endif