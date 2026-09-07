#ifndef MENU_H
#define MENU_H


#include "DisplayEngine.h"


int menuIndex=0;


String menus[]=
{

"CAT",

"HEALTH",

"GAMES",

"SETTINGS"

};



void drawMenu()
{


oled.clearBuffer();



oled.setFont(
u8g2_font_7x14_tr
);



for(int i=0;i<4;i++)
{

oled.setCursor(
10,
20+i*12
);


if(i==menuIndex)

oled.print(">");


oled.print(
menus[i]
);


}



oled.sendBuffer();


}



void nextMenu()
{


menuIndex++;


if(menuIndex>3)

menuIndex=0;


}



#endif