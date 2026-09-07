#ifndef DISPLAY_H
#define DISPLAY_H


#include <Arduino.h>
#include <U8g2lib.h>
#include "Config.h"
#include "Bitmaps.h"


// OLED object

U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(
    U8G2_R0,
    U8X8_PIN_NONE
);



void initDisplay()
{

  Wire.begin(OLED_SDA, OLED_SCL);

  display.begin();

  display.clearBuffer();

  display.setFont(u8g2_font_ncenB08_tr);

  display.drawStr(20,30,"NekoAI");

  display.drawStr(15,45,"Starting...");

  display.sendBuffer();

  delay(1500);

}



// =============================
// Main Watch Screen
// =============================

void drawMainScreen(
int happiness,
int friendship,
int steps
)

{

display.clearBuffer();



display.setFont(u8g2_font_6x10_tr);


// Title

display.drawStr(0,10,"NekoAI");


// Battery

display.drawXBMP(
110,
0,
8,
8,
batteryIcon
);

display.drawStr(
100,
15,
"85%"
);



// Stats

display.drawStr(
0,
58,
"HP:"
);

display.setCursor(20,58);
display.print(happiness);



display.drawStr(
55,
58,
"ST:"
);

display.setCursor(75,58);
display.print(steps);



display.sendBuffer();

}




// =============================
// Message Screen
// =============================


void showMessage(String msg)

{

display.clearBuffer();


display.setFont(
u8g2_font_7x14_tr
);


display.drawStr(
5,
30,
msg.c_str()
);


display.sendBuffer();


}



#endif