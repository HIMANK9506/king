#ifndef CONFIG_H
#define CONFIG_H


// =================================
// NekoAI V2 Hardware Configuration
// =================================


// OLED

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_SDA 21
#define OLED_SCL 22

#define OLED_ADDRESS 0x3C



// =================================
// Buttons
// =================================

#define BUTTON_SELECT 32
#define BUTTON_NEXT   33



// =================================
// MPU6050
// =================================

#define MPU_SDA 21
#define MPU_SCL 22



// =================================
// Animation Settings
// =================================

#define IDLE_SPEED 800

#define BLINK_INTERVAL 5000

#define HAPPY_DURATION 3000

#define SLEEP_TIMEOUT 60000



// =================================
// Cat Default Stats
// =================================


#define DEFAULT_HAPPINESS 80

#define DEFAULT_HUNGER 80

#define DEFAULT_ENERGY 100

#define DEFAULT_FRIENDSHIP 0

#define DEFAULT_CURIOSITY 50



// =================================
// AI Settings
// =================================


#define MOOD_UPDATE_TIME 30000


#define HUNGER_DECAY_TIME 3600000


#define ENERGY_DECAY_TIME 1800000



// =================================
// Memory
// =================================


#define MEMORY_NAMESPACE "NekoAI"



#endif