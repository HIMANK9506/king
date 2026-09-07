#ifndef CATGRAPHICS_H
#define CATGRAPHICS_H



#include <U8g2lib.h>



void drawCat(
U8G2 &display,
bool eyesClosed,
Animation animation
)
{


// ears

display.drawTriangle(35,20,45,5,55,20);

display.drawTriangle(73,20,83,5,93,20);



// head

display.drawCircle(64,35,25);



// eyes

if(eyesClosed || animation==SLEEPING)
{

display.drawLine(52,32,60,32);

display.drawLine(68,32,76,32);

}

else
{

display.drawDisc(56,32,3);

display.drawDisc(72,32,3);

}



// nose

display.drawPixel(64,38);



// mouth

if(animation==HAPPY_FACE)
{

display.drawLine(60,42,64,45);

display.drawLine(64,45,68,42);

}

else if(animation==EATING)
{

display.drawCircle(64,42,4);

}

else
{

display.drawLine(61,42,64,40);

display.drawLine(64,40,67,42);

}



// whiskers

display.drawLine(35,38,50,38);

display.drawLine(78,38,93,38);


display.drawLine(35,43,50,40);

display.drawLine(78,40,93,43);



}



#endif