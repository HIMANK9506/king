#ifndef CONFIG_H
#define CONFIG_H


// ===============================
// NekoAI Smart Watch Configuration
// ===============================


// OLED
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_SDA 21
#define OLED_SCL 22

#define OLED_ADDRESS 0x3C



// Buttons

#define FEED_BUTTON 32
#define PLAY_BUTTON 33



// MPU6050

#define MPU_SDA 21
#define MPU_SCL 22



// Display refresh rate

#define FRAME_DELAY 100



// Battery simulation

#define BATTERY_LEVEL 85



// Pet settings

#define START_HAPPINESS 80
#define START_FRIENDSHIP 0



// Animation speed

#define BLINK_TIME 4000
#define IDLE_TIME 3000



#endif