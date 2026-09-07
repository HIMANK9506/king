#ifndef DISPLAYENGINE_H
#define DISPLAYENGINE_H


#include <U8g2lib.h>

#include "Config.h"
#include "CatSprites.h"



U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(
U8G2_R0,
U8X8_PIN_NONE
);



void initDisplay()
{

Wire.begin(
OLED_SDA,
OLED_SCL
);


oled.begin();


}



void drawCat()
{


oled.drawXBMP(
35,
5,
32,
32,
getCurrentSprite()
);


}



void drawHome()
{


oled.clearBuffer();


drawCat();



oled.setFont(
u8g2_font_6x10_tr
);



oled.setCursor(
0,
55
);


oled.print(
"HP:"
);

oled.print(
happiness
);



oled.print(
" F:"
);

oled.print(
friendship
);



oled.sendBuffer();


}



void drawHealth()
{


oled.clearBuffer();



oled.drawStr(
10,
15,
"HEALTH"
);



oled.setCursor(
10,
35
);


oled.print(
"STEPS:"
);

oled.print(
steps
);



oled.sendBuffer();



}


#endif