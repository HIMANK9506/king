#ifndef CONFIG_H
#define CONFIG_H

// ===============================
// NekoAI Smart Watch V3 Configuration
// ===============================

// ---------- OLED ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_SDA 21
#define OLED_SCL 22

#define OLED_ADDRESS 0x3C

// ---------- Buttons ----------
#define FEED_BUTTON 32
#define PLAY_BUTTON 33

// Hold PLAY_BUTTON for this long to open the Games menu
#define MENU_HOLD_TIME 800

// ---------- MPU6050 ----------
#define MPU_SDA 21
#define MPU_SCL 22

// ---------- Display refresh rate ----------
#define FRAME_DELAY 100

// ---------- Battery simulation ----------
#define BATTERY_LEVEL 85

// ---------- Pet settings ----------
#define START_HAPPINESS 80
#define START_FRIENDSHIP 0

#define MAX_HAPPINESS 100
#define MIN_HAPPINESS 0

// ---------- Animation speed ----------
#define BLINK_MIN_INTERVAL 2500
#define BLINK_MAX_INTERVAL 6000
#define BLINK_DURATION 150

// ---------- Steps -> Mood tuning ----------
// Steps needed within STEP_WINDOW to count as "active" for mood purposes
#define ACTIVE_STEP_THRESHOLD 15
#define STEP_WINDOW 30000UL

// ---------- Mood timing ----------
// How often the mood is re-evaluated
#define MOOD_CHANGE_INTERVAL 15000UL

// How long with no feed/play interaction before the cat gets sleepy
#define SLEEPY_IDLE_TIME 45000UL

// How often happiness naturally decays by 1 point
#define HAPPINESS_DECAY_INTERVAL 20000UL

#endif
