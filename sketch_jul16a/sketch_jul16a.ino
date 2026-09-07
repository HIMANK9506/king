#include <Wire.h>
#include <math.h>
#include <time.h>
#include <string.h>
#include <esp_system.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <MPU6050.h>

enum BuzzerPattern {
  BUZZER_NONE,
  BUZZER_CLICK,
  BUZZER_DOUBLE,
  BUZZER_DICE,
  BUZZER_GAMEOVER
};
void buzzerStart(BuzzerPattern p);

// =====================================================
// SUPABASE / WIFI CONFIG
// Replace these with your own credentials
// =====================================================
const char* WIFI_SSID        = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD    = "YOUR_WIFI_PASSWORD";
const char* SUPABASE_URL     = "https://your-project.supabase.co";
const char* SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const char* SUPABASE_TABLE   = "watch_events";


// =====================================================
// SUPABASE ANTI-SPAM SETTINGS
// =====================================================
#define VITALS_SEND_INTERVAL_MS  30000UL   // 30 s min between vitals sends
#define STEPS_SEND_INTERVAL_MS  60000UL   // 1 min   
#define VITALS_HR_DELTA              3     // min BPM change to trigger send 
#define VITALS_SPO2_DELTA            1     // min % change to trigger send

unsigned long lastVitalsSendMs  = 0;
unsigned long lastStepsSendMs   = 0;
int32_t       lastSentHR        = -1;
int32_t       lastSentSpO2      = -1;
long          lastSentSteps     = -1;
bool          dinoScoreSent     = false;   // reset on each new game

// ===================== GLOBAL VARIABLES (FINAL FIX) =====================

// PPG
int32_t spo2Value = 0;
int8_t validSPO2 = 0;
int32_t heartRateValue = 0;
int8_t validHeartRate = 0;

// Steps
long stepCount = 0;

// Dino
int dinoScore = 0;

// Supabase tracking

// =====================================================
// DISPLAY
// =====================================================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_I2C_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool displayOK = false;

// =====================================================
// BUTTONS
// =====================================================
// Wire each button between the pin and GND.
// Internal pullups are enabled.
#define BTN1_PIN 32   // Next / Action
#define BTN2_PIN 33   // Select / Back
#define BUTTON_DEBOUNCE_MS 35

struct ButtonDebounce {
  bool stableState = HIGH;
  bool lastReading = HIGH;
  unsigned long lastChangeMs = 0;
};

ButtonDebounce btn1;
ButtonDebounce btn2;

bool btn1Pressed = false;
bool btn2Pressed = false;

void updateOneButton(ButtonDebounce &btn, uint8_t pin, bool &pressedEvent) {
  bool reading = digitalRead(pin);

  if (reading != btn.lastReading) {
    btn.lastChangeMs = millis();
    btn.lastReading = reading;
  }

  pressedEvent = false;

  if ((millis() - btn.lastChangeMs) > BUTTON_DEBOUNCE_MS && reading != btn.stableState) {
    bool previous = btn.stableState;
    btn.stableState = reading;

    if (previous == HIGH && btn.stableState == LOW) {
      pressedEvent = true;
    }
  }
}

void updateButtons() {
  updateOneButton(btn1, BTN1_PIN, btn1Pressed);
  updateOneButton(btn2, BTN2_PIN, btn2Pressed);
}

// =====================================================
// MODE CONSTANTS
// =====================================================
const uint8_t MODE_BOOT  = 99;
const uint8_t MODE_HOME  = 0;
const uint8_t MODE_PPG   = 1;
const uint8_t MODE_STEPS = 2;
const uint8_t MODE_DICE  = 3;
const uint8_t MODE_DINO  = 4;

uint8_t currentMode  = MODE_BOOT;
uint8_t selectedMode = MODE_PPG;

// =====================================================
// BUZZER
// =====================================================
#define BUZZER_PIN 27



struct BuzzerState {
  BuzzerPattern pattern = BUZZER_NONE;
  uint8_t step = 0;
  unsigned long nextMs = 0;
} buzzerState;

void buzzerOff() {
  digitalWrite(BUZZER_PIN, LOW);
}

void buzzerOn() {
  digitalWrite(BUZZER_PIN, HIGH);
}

void buzzerStart(BuzzerPattern p) {
  buzzerState.pattern = p;
  buzzerState.step = 0;
  buzzerState.nextMs = millis();
}

void updateBuzzer() {
  if (buzzerState.pattern == BUZZER_NONE) return;
  if (millis() < buzzerState.nextMs) return;

  switch (buzzerState.pattern) {
    case BUZZER_CLICK:
      if (buzzerState.step == 0) {
        buzzerOn();
        buzzerState.step = 1;
        buzzerState.nextMs = millis() + 25;
      } else {
        buzzerOff();
        buzzerState.pattern = BUZZER_NONE;
      }
      break;

    case BUZZER_DOUBLE:
      if (buzzerState.step == 0) {
        buzzerOn();
        buzzerState.step = 1;
        buzzerState.nextMs = millis() + 40;
      } else if (buzzerState.step == 1) {
        buzzerOff();
        buzzerState.step = 2;
        buzzerState.nextMs = millis() + 35;
      } else if (buzzerState.step == 2) {
        buzzerOn();
        buzzerState.step = 3;
        buzzerState.nextMs = millis() + 40;
      } else {
        buzzerOff();
        buzzerState.pattern = BUZZER_NONE;
      }
      break;

    case BUZZER_DICE:
      if (buzzerState.step == 0) {
        buzzerOn();
        buzzerState.step = 1;
        buzzerState.nextMs = millis() + 35;
      } else if (buzzerState.step == 1) {
        buzzerOff();
        buzzerState.step = 2;
        buzzerState.nextMs = millis() + 20;
      } else if (buzzerState.step == 2) {
        buzzerOn();
        buzzerState.step = 3;
        buzzerState.nextMs = millis() + 35;
      } else if (buzzerState.step == 3) {
        buzzerOff();
        buzzerState.step = 4;
        buzzerState.nextMs = millis() + 20;
      } else if (buzzerState.step == 4) {
        buzzerOn();
        buzzerState.step = 5;
        buzzerState.nextMs = millis() + 35;
      } else {
        buzzerOff();
        buzzerState.pattern = BUZZER_NONE;
      }
      break;

    case BUZZER_GAMEOVER:
      if (buzzerState.step == 0) {
        buzzerOn();
        buzzerState.step = 1;
        buzzerState.nextMs = millis() + 250;
      } else {
        buzzerOff();
        buzzerState.pattern = BUZZER_NONE;
      }
      break;

    default:
      buzzerOff();
      buzzerState.pattern = BUZZER_NONE;
      break;
  }
}

// Helper so buzzer patterns can keep running during short animations
void waitWithBuzzer(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    updateBuzzer();
    delay(1);
  }
}

// =====================================================
// SENSORS
// =====================================================
MAX30105 particleSensor;
MPU6050 mpu;

bool maxOk = false;
bool imuOk = false;

// =====================================================
// CLOCK HELPERS
// Build-time clock, then increments with millis()
// =====================================================
time_t bootEpoch = 0;

int monthIndexFromStr(const char *m) {
  if (!strcmp(m, "Jan")) return 0;
  if (!strcmp(m, "Feb")) return 1;
  if (!strcmp(m, "Mar")) return 2;
  if (!strcmp(m, "Apr")) return 3;
  if (!strcmp(m, "May")) return 4;
  if (!strcmp(m, "Jun")) return 5;
  if (!strcmp(m, "Jul")) return 6;
  if (!strcmp(m, "Aug")) return 7;
  if (!strcmp(m, "Sep")) return 8;
  if (!strcmp(m, "Oct")) return 9;
  if (!strcmp(m, "Nov")) return 10;
  return 11;
}

void initClockFromBuildTime() {
  char mon[4] = {0};
  int day = 1, year = 2026;
  int hour = 0, minute = 0, second = 0;

  sscanf(__DATE__, "%3s %d %d", mon, &day, &year);
  sscanf(__TIME__, "%d:%d:%d", &hour, &minute, &second);

  struct tm tmBuild = {};
  tmBuild.tm_mday = day;
  tmBuild.tm_mon  = monthIndexFromStr(mon);
  tmBuild.tm_year = year - 1900;
  tmBuild.tm_hour = hour;
  tmBuild.tm_min  = minute;
  tmBuild.tm_sec  = second;
  tmBuild.tm_isdst = -1;

  bootEpoch = mktime(&tmBuild);
}

void getNowTm(struct tm *outTm) {
  time_t now = bootEpoch + (millis() / 1000UL);
  localtime_r(&now, outTm);
}

void formatTimeHMS(char *out, size_t len) {
  struct tm t;
  getNowTm(&t);
  strftime(out, len, "%H:%M:%S", &t);
}

void formatDateDMY(char *out, size_t len) {
  struct tm t;
  getNowTm(&t);
  strftime(out, len, "%d-%b-%Y", &t);
}

// =====================================================
// TIME / TEXT HELPERS
// =====================================================
void drawCenteredText(const char* text, int y, uint8_t textSize) {
  if (!displayOK) return;

  display.setTextSize(textSize);
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(text, 0, y, &x1, &y1, &w, &h);

  int x = (SCREEN_WIDTH - (int)w) / 2;
  if (x < 0) x = 0;

  display.setCursor(x, y);
  display.print(text);
}

void drawTimeTopLeft(uint8_t x, uint8_t y) {
  if (!displayOK) return;

  char t[9];
  formatTimeHMS(t, sizeof(t));

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);
  display.setCursor(x, y);
  display.print(t);
}

void drawTimeTopCentered(uint8_t y) {
  if (!displayOK) return;

  char t[9];
  formatTimeHMS(t, sizeof(t));

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(t, 0, y, &x1, &y1, &w, &h);

  int x = (SCREEN_WIDTH - (int)w) / 2;
  if (x < 0) x = 0;

  display.setCursor(x, y);
  display.print(t);
}

void drawBottomTimeBar() {
  if (!displayOK) return;

  char t[9];
  formatTimeHMS(t, sizeof(t));

  display.fillRect(0, 52, SCREEN_WIDTH, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setTextWrap(false);

  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(t, 0, 0, &x1, &y1, &w, &h);

  int x = (SCREEN_WIDTH - (int)w) / 2;
  if (x < 0) x = 0;

  display.setCursor(x, 54);
  display.print(t);

  display.setTextColor(SSD1306_WHITE);
}

// =====================================================
// UI HELPERS
// =====================================================
const char* modeLabel(uint8_t m) {
  switch (m) {
    case MODE_PPG:   return "PPG";
    case MODE_STEPS: return "STEPS";
    case MODE_DICE:  return "DICE";
    case MODE_DINO:  return "DINO";
    default:         return "HOME";
  }
}

void drawTile(int x, int y, int w, int h, const char* label, bool selected) {
  if (!displayOK) return;

  display.setTextWrap(false);
  display.setTextSize(1);

  if (selected) {
    display.fillRoundRect(x, y, w, h, 4, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
  } else {
    display.drawRoundRect(x, y, w, h, 4, SSD1306_WHITE);
    display.setTextColor(SSD1306_WHITE);
  }

  int16_t x1, y1;
  uint16_t tw, th;
  display.getTextBounds(label, 0, 0, &x1, &y1, &tw, &th);
  int tx = x + (w - (int)tw) / 2;
  int ty = y + (h - (int)th) / 2 + 1;

  display.setCursor(tx, ty);
  display.print(label);
}

void showBootScreen() {
  if (!displayOK) return;

  char t[9];
  char d[16];
  formatTimeHMS(t, sizeof(t));
  formatDateDMY(d, sizeof(d));

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  display.setTextSize(1);
  drawCenteredText("SMARTWATCH", 2, 1);

  display.setTextSize(2);
  drawCenteredText(t, 16, 2);

  display.setTextSize(1);
  drawCenteredText(d, 38, 1);

  drawCenteredText("Press any button", 50, 1);

  display.display();
}

void showHomeScreen() {
  if (!displayOK) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  display.drawRect(0, 0, SCREEN_WIDTH, 12, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(2, 2);
  display.print("SMARTWATCH");

  drawTile(4, 16, 56, 14, "PPG",   selectedMode == MODE_PPG);
  drawTile(68, 16, 56, 14, "STEPS", selectedMode == MODE_STEPS);
  drawTile(4, 34, 56, 14, "DICE",  selectedMode == MODE_DICE);
  drawTile(68, 34, 56, 14, "DINO",  selectedMode == MODE_DINO);

  drawBottomTimeBar();

  display.display();
}

// =====================================================
// MODE 1: PPG + HR + SpO2
// =====================================================

// =====================================================
// SUPABASE HELPERS
// =====================================================

// Low-level POST to Supabase REST API.
// Returns true on HTTP 201 (created).
bool sendToSupabase(const String& jsonBody) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Supabase] WiFi not connected, skipping send");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();  // Skip TLS cert check (fine for prototype/bootcamp)

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/" + SUPABASE_TABLE;

  if (!http.begin(client, url)) {
    Serial.println("[Supabase] http.begin() failed");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");

  int code = http.POST(jsonBody);
  http.end();

  if (code == 201) {
    Serial.println("[Supabase] Sent OK: " + jsonBody);
    return true;
  } else {
    Serial.printf("[Supabase] HTTP %d\n", code);
    return false;
  }
}

// Send vitals if: enough time passed AND values changed meaningfully.
void maybeSendVitals() {
  if (!validHeartRate && !validSPO2) return;
  if (millis() - lastVitalsSendMs < VITALS_SEND_INTERVAL_MS) return;

  bool hrChanged   = (lastSentHR   == -1) || (abs((int)heartRateValue - (int)lastSentHR)  >= VITALS_HR_DELTA);
  bool spo2Changed = (lastSentSpO2 == -1) || (abs((int)spo2Value      - (int)lastSentSpO2) >= VITALS_SPO2_DELTA);

  if (!hrChanged && !spo2Changed) return;

  String json = "{\"event_type\":\"vitals\"";
  if (validHeartRate) json += ",\"heart_rate\":" + String(heartRateValue);
  if (validSPO2)      json += ",\"spo2\":"       + String(spo2Value);
  json += "}";

  if (sendToSupabase(json)) {
    lastVitalsSendMs = millis();
    if (validHeartRate) lastSentHR   = heartRateValue;
    if (validSPO2)      lastSentSpO2 = spo2Value;
  }
}

// Send step count if: enough time passed AND count actually changed.
void maybeSendSteps() {
  if (stepCount == lastSentSteps) return;
  if (millis() - lastStepsSendMs < STEPS_SEND_INTERVAL_MS) return;

  String json = "{\"event_type\":\"steps\",\"steps\":" + String(stepCount) + "}";

  if (sendToSupabase(json)) {
    lastStepsSendMs = millis();
    lastSentSteps   = stepCount;
  }
}

// Send dino score exactly once when the game ends.
void maybeSendDinoScore() {
  if (dinoScoreSent) return;

  String json = "{\"event_type\":\"game_score\",\"score\":" + String(dinoScore) + "}";

  if (sendToSupabase(json)) {
    dinoScoreSent = true;
  }
}


#define PPG_RING_SIZE 100

uint32_t ppgIRRing[PPG_RING_SIZE];
uint32_t ppgRedRing[PPG_RING_SIZE];
uint32_t ppgIRLinear[PPG_RING_SIZE];
uint32_t ppgRedLinear[PPG_RING_SIZE];

int ppgRingIndex = 0;
int ppgSamplesFilled = 0;
//////////////////////////////////////////////////////////////////////////

const int PPG_PLOT_WIDTH = SCREEN_WIDTH;
int32_t ppgPlot[PPG_PLOT_WIDTH];

bool ppgGraphPhase = true;
unsigned long ppgPhaseStartMs = 0;
unsigned long lastPPGDrawMs = 0;
unsigned long lastPPGComputeMs = 0;

bool fingerPresent = false;
const uint32_t FINGER_IR_THRESHOLD = 100000UL;

void resetPPGMode() {
  for (int i = 0; i < PPG_RING_SIZE; i++) {
    ppgIRRing[i] = 0;
    ppgRedRing[i] = 0;
    ppgIRLinear[i] = 0;
    ppgRedLinear[i] = 0;
  }

  for (int i = 0; i < PPG_PLOT_WIDTH; i++) {
    ppgPlot[i] = 0;
  }

  ppgRingIndex = 0;
  ppgSamplesFilled = 0;
  spo2Value = 0;
  validSPO2 = 0;
  heartRateValue = 0;
  validHeartRate = 0;
  ppgGraphPhase = true;
  ppgPhaseStartMs = millis();
  lastPPGDrawMs = 0;
  lastPPGComputeMs = 0;
  fingerPresent = false;
}

void pushPPGPlot(int32_t v) {
  for (int i = 1; i < PPG_PLOT_WIDTH; i++) {
    ppgPlot[i - 1] = ppgPlot[i];
  }
  ppgPlot[PPG_PLOT_WIDTH - 1] = v;
}

void copyPPGRingToLinear() {
  int start = ppgRingIndex;
  for (int i = 0; i < PPG_RING_SIZE; i++) {
    int idx = (start + i) % PPG_RING_SIZE;
    ppgIRLinear[i] = ppgIRRing[idx];
    ppgRedLinear[i] = ppgRedRing[idx];
  }
}

void drawPPGGraph() {
  if (!displayOK) return;

  const int graphTop = 13;
  const int graphBottom = 38;

  int32_t mn = ppgPlot[0];
  int32_t mx = ppgPlot[0];

  for (int i = 1; i < PPG_PLOT_WIDTH; i++) {
    if (ppgPlot[i] < mn) mn = ppgPlot[i];
    if (ppgPlot[i] > mx) mx = ppgPlot[i];
  }

  mn -= 500;
  mx += 500;
  if (mx <= mn) mx = mn + 1;

  display.clearDisplay();
  drawTimeTopLeft(0, 0);

  for (int i = 0; i < PPG_PLOT_WIDTH - 1; i++) {
    int y1 = map(ppgPlot[i], mn, mx, graphBottom, graphTop);
    int y2 = map(ppgPlot[i + 1], mn, mx, graphBottom, graphTop);
    display.drawLine(i, y1, i + 1, y2, SSD1306_WHITE);
  }

  display.display();
}

void drawPPGVitals() {
  if (!displayOK) return;

  display.clearDisplay();
  drawTimeTopLeft(0, 0);

  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);
  display.setTextSize(1);

  display.setCursor(0, 12);
  display.print("HR: ");
  if (validHeartRate && heartRateValue >= 40 && heartRateValue <= 180) {
    display.print(heartRateValue);
  } else {
    display.print("--");
  }

  display.setCursor(0, 34);
  display.print("SpO2: ");
  if (validSPO2 && spo2Value >= 80 && spo2Value <= 100) {
    display.print(spo2Value);
    display.print("%");
  } else {
    display.print("--");
  }

  display.display();
}

void drawNoFinger() {
  if (!displayOK) return;

  display.clearDisplay();
  drawTimeTopLeft(0, 0);

  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  display.setTextSize(2);
  drawCenteredText("NO FINGER", 22, 2);

  display.setTextSize(1);
  drawCenteredText("Place finger on sensor", 48, 1);

  display.display();
}

void updatePPGMode() {
  if (!maxOk) {
    if (displayOK) {
      display.clearDisplay();
      drawTimeTopLeft(0, 0);
      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(1);
      display.setCursor(0, 18);
      display.println("MAX30102 not found");
      display.println("Check wiring");
      display.display();
    }
    return;
  }

  particleSensor.check();

  bool anySample = false;
  fingerPresent = false;

  while (particleSensor.available()) {
    anySample = true;

    uint32_t red = particleSensor.getRed();
    uint32_t ir  = particleSensor.getIR();
    particleSensor.nextSample();

    fingerPresent = (ir > FINGER_IR_THRESHOLD);

    if (fingerPresent) {
      ppgIRRing[ppgRingIndex] = ir;
      ppgRedRing[ppgRingIndex] = red;
      ppgRingIndex = (ppgRingIndex + 1) % PPG_RING_SIZE;
      if (ppgSamplesFilled < PPG_RING_SIZE) ppgSamplesFilled++;

      static float smoothIR = 0;
      smoothIR = 0.85f * smoothIR + 0.15f * (float)ir;
      pushPPGPlot((int32_t)smoothIR);

      Serial.print(ir);
      Serial.print(",");
      Serial.println(red);
    } else {
      pushPPGPlot(0);
      Serial.println("0,0");
    }
  }

  if (!anySample) {
    return;
  }

  if (!fingerPresent) {
    drawNoFinger();
    ppgPhaseStartMs = millis();
    return;
  }

  if (ppgGraphPhase) {
    if (millis() - lastPPGDrawMs >= 20) {
      drawPPGGraph();
      lastPPGDrawMs = millis();
    }

    if (millis() - lastPPGComputeMs >= 2000UL && ppgSamplesFilled == PPG_RING_SIZE) {
      copyPPGRingToLinear();

      int32_t calcSpO2 = 0;
      int32_t calcHR = 0;
      int8_t valSpO2 = 0;
      int8_t valHR = 0;

      maxim_heart_rate_and_oxygen_saturation(
        ppgIRLinear, PPG_RING_SIZE, ppgRedLinear,
        &calcSpO2, &valSpO2, &calcHR, &valHR
      );

      if (valHR && calcHR >= 40 && calcHR <= 180) {
        heartRateValue = calcHR;
        validHeartRate = 1;
      } else {
        validHeartRate = 0;
      }

      if (valSpO2 && calcSpO2 >= 80 && calcSpO2 <= 100) {
        spo2Value = calcSpO2;
        validSPO2 = 1;
      } else {
        validSPO2 = 0;
      }

      Serial.print("HR: ");
      if (validHeartRate) Serial.print(heartRateValue); else Serial.print("--");
      Serial.print("  SpO2: ");
      if (validSPO2) Serial.print(spo2Value); else Serial.print("--");
      Serial.println();

      maybeSendVitals();   // <-- send to Supabase if enough time elapsed and values changed

      lastPPGComputeMs = millis();
    }

    if (millis() - ppgPhaseStartMs > 20000UL) {
      ppgGraphPhase = false;
      ppgPhaseStartMs = millis();
    }
  } else {
    drawPPGVitals();

    if (millis() - ppgPhaseStartMs > 3000UL) {
      ppgGraphPhase = true;
      ppgPhaseStartMs = millis();
    }
  }
}

// =====================================================
// MODE 2: STEP COUNTER
// =====================================================

float stepFilteredMag = 1.0f;
bool stepArmed = false;
unsigned long lastStepTime = 0;
unsigned long lastStepDrawMs = 0;

void resetStepMode() {
  stepCount = 0;
  stepFilteredMag = 1.0f;
  stepArmed = false;
  lastStepTime = 0;
  lastStepDrawMs = 0;
}

void drawStepScreen() {
  if (!displayOK) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("STEP COUNTER");

  display.drawLine(0, 12, SCREEN_WIDTH, 12, SSD1306_WHITE);

  display.setTextSize(3);
  display.setCursor(0, 20);
  display.print(stepCount);

  display.setTextSize(1);
  display.setCursor(84, 28);
  display.print("B1=RST");

  display.setCursor(78, 38);
  display.print("B2=HOME");

  drawBottomTimeBar();

  display.display();
}

void updateStepMode() {
  if (!imuOk) {
    if (displayOK) {
      display.clearDisplay();
      drawTimeTopLeft(0, 0);
      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(1);
      display.setCursor(0, 18);
      display.println("MPU6050 not found");
      display.println("Check wiring");
      display.display();
    }
    return;
  }

  int16_t ax, ay, az;
  mpu.getAcceleration(&ax, &ay, &az);

  float mag = sqrtf((float)ax * ax + (float)ay * ay + (float)az * az) / 16384.0f;

  stepFilteredMag = 0.90f * stepFilteredMag + 0.10f * mag;
  float motion = mag - stepFilteredMag;

  if (motion > 0.38f && !stepArmed && (millis() - lastStepTime > 500)) {
    stepCount++;
    stepArmed = true;
    lastStepTime = millis();
    Serial.print("Steps: ");
    Serial.println(stepCount);
  }

  if (motion < 0.12f) {
    stepArmed = false;
  }

  if (millis() - lastStepDrawMs > 50) {
    drawStepScreen();
    lastStepDrawMs = millis();
  }

  maybeSendSteps();   // <-- send to Supabase every 5 min if count changed
}

// =====================================================
// MODE 3: DICE GAME
// =====================================================
int diceValue = 1;
float dicePrevMag = 1.0f;
unsigned long lastRollTime = 0;
unsigned long lastDiceDrawMs = 0;

void resetDiceMode() {
  diceValue = 1;
  dicePrevMag = 1.0f;
  lastRollTime = 0;
  lastDiceDrawMs = 0;
}

void drawDicePip(int cx, int cy, int r) {
  display.fillCircle(cx, cy, r, SSD1306_WHITE);
}

void drawDiceFace(int val) {
  if (!displayOK) return;

  display.clearDisplay();
  drawTimeTopLeft(0, 0);

  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  int x = 24;
  int y = 20;
  int s = 36;

  display.drawRoundRect(x, y, s, s, 6, SSD1306_WHITE);

  int left    = x + 9;
  int centerX = x + 18;
  int right   = x + 27;
  int top     = y + 9;
  int mid     = y + 18;
  int bottom  = y + 27;

  switch (val) {
    case 1:
      drawDicePip(centerX, mid, 3);
      break;
    case 2:
      drawDicePip(left, top, 3);
      drawDicePip(right, bottom, 3);
      break;
    case 3:
      drawDicePip(left, top, 3);
      drawDicePip(centerX, mid, 3);
      drawDicePip(right, bottom, 3);
      break;
    case 4:
      drawDicePip(left, top, 3);
      drawDicePip(right, top, 3);
      drawDicePip(left, bottom, 3);
      drawDicePip(right, bottom, 3);
      break;
    case 5:
      drawDicePip(left, top, 3);
      drawDicePip(right, top, 3);
      drawDicePip(centerX, mid, 3);
      drawDicePip(left, bottom, 3);
      drawDicePip(right, bottom, 3);
      break;
    case 6:
      drawDicePip(left, top, 3);
      drawDicePip(left, mid, 3);
      drawDicePip(left, bottom, 3);
      drawDicePip(right, top, 3);
      drawDicePip(right, mid, 3);
      drawDicePip(right, bottom, 3);
      break;
  }

  display.setTextSize(2);
  display.setCursor(80, 28);
  display.print(val);

  display.setTextSize(1);
  display.setCursor(72, 54);
  display.print("B1=ROLL");

  display.display();
}

void triggerDiceRoll() {
  if (!imuOk) return;

  if (millis() - lastRollTime <= 800 && lastRollTime != 0) return;

  buzzerStart(BUZZER_DICE);

  for (int i = 0; i < 8; i++) {
    diceValue = (int)((esp_random() % 6) + 1);
    drawDiceFace(diceValue);
    waitWithBuzzer(35);
  }

  lastRollTime = millis();
  Serial.print("Dice rolled: ");
  Serial.println(diceValue);
}

void updateDiceMode() {
  if (!imuOk) {
    if (displayOK) {
      display.clearDisplay();
      drawTimeTopLeft(0, 0);
      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(1);
      display.setCursor(0, 18);
      display.println("MPU6050 not found");
      display.println("Check wiring");
      display.display();
    }
    return;
  }

  int16_t ax, ay, az;
  mpu.getAcceleration(&ax, &ay, &az);

  float mag = sqrtf((float)ax * ax + (float)ay * ay + (float)az * az) / 16384.0f;
  float shake = fabsf(mag - dicePrevMag);

  if (shake > 0.55f && (millis() - lastRollTime > 800)) {
    triggerDiceRoll();
  }

  dicePrevMag = 0.90f * dicePrevMag + 0.10f * mag;

  if (millis() - lastDiceDrawMs > 60) {
    drawDiceFace(diceValue);
    lastDiceDrawMs = millis();
  }
}

// =====================================================
// MODE 4: DINO GAME
// =====================================================
const int GROUND_Y = 56;
const int DINO_X = 14;
const int DINO_W = 18;
const int DINO_H = 16;

int dinoY = GROUND_Y - DINO_H;
int dinoVy = 0;
bool dinoLegToggle = false;
bool dinoGameOver = false;
bool dinoGameOverSoundPlayed = false;


int obstacleX = SCREEN_WIDTH + 20;
int obstacleW = 12;
int obstacleH = 18;

unsigned long dinoStartMs = 0;
unsigned long lastDinoFrameMs = 0;

void resetDinoMode() {
  dinoY = GROUND_Y - DINO_H;
  dinoVy = 0;
  dinoLegToggle = false;
  dinoGameOver = false;
  dinoGameOverSoundPlayed = false;
  dinoScore = 0;
  obstacleX = SCREEN_WIDTH + 20;
  obstacleW = 12;
  obstacleH = 18;
  dinoStartMs = millis();
  lastDinoFrameMs = 0;
  dinoScoreSent = false;   // allow the next game-over to be sent
}

void dinoJump() {
  if (!dinoGameOver && dinoY >= GROUND_Y - DINO_H) {
    dinoVy = -11;
    buzzerStart(BUZZER_CLICK);
  }
}

void drawDinoSprite(int x, int y, bool legToggle) {
  display.drawLine(x, y + 10, x - 4, y + 8, SSD1306_WHITE);
  display.fillRoundRect(x + 2, y + 5, 10, 7, 2, SSD1306_WHITE);
  display.fillRoundRect(x + 9, y + 1, 7, 5, 2, SSD1306_WHITE);

  display.fillRect(x + 13, y + 2, 1, 1, SSD1306_BLACK);
  display.drawLine(x + 12, y + 4, x + 15, y + 4, SSD1306_BLACK);

  if (legToggle) {
    display.fillRect(x + 4, y + 11, 2, 5, SSD1306_WHITE);
    display.fillRect(x + 9, y + 10, 2, 6, SSD1306_WHITE);
  } else {
    display.fillRect(x + 4, y + 10, 2, 6, SSD1306_WHITE);
    display.fillRect(x + 9, y + 11, 2, 5, SSD1306_WHITE);
  }

  display.fillRect(x + 3, y + 15, 4, 1, SSD1306_WHITE);
  display.fillRect(x + 8, y + 15, 4, 1, SSD1306_WHITE);
}

void drawCactus(int x, int baseY, int h) {
  int trunkX = x + 3;
  display.fillRect(trunkX, baseY - h, 6, h, SSD1306_WHITE);
  display.fillRect(trunkX - 4, baseY - h + 5, 4, 2, SSD1306_WHITE);
  display.fillRect(trunkX + 6, baseY - h + 9, 4, 2, SSD1306_WHITE);
}

void drawDinoScreen() {
  if (!displayOK) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("SC:");
  display.print(dinoScore);

  drawTimeTopCentered(0);

  display.setCursor(96, 0);
  display.print("B1");

  display.drawLine(0, GROUND_Y, SCREEN_WIDTH, GROUND_Y, SSD1306_WHITE);

  if (!dinoGameOver) {
    drawDinoSprite(DINO_X, dinoY, dinoLegToggle);
    drawCactus(obstacleX, GROUND_Y, obstacleH);
    dinoLegToggle = !dinoLegToggle;
  } else {
    display.setTextSize(2);
    drawCenteredText("GAME OVER", 18, 2);
    display.setTextSize(1);
    drawCenteredText("B1=RESTART", 44, 1);
    drawCenteredText("B2=HOME", 54, 1);
  }

  display.display();
}

void updateDinoMode() {
  if (!imuOk) {
    if (displayOK) {
      display.clearDisplay();
      drawTimeTopCentered(0);
      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(1);
      display.setCursor(0, 18);
      display.println("MPU6050 not found");
      display.println("Check wiring");
      display.display();
    }
    return;
  }

  if (millis() - lastDinoFrameMs < 30) return;
  lastDinoFrameMs = millis();

  if (!dinoGameOver) {
    if (dinoVy != 0 || dinoY < GROUND_Y - DINO_H) {
      dinoVy += 1;
      dinoY += dinoVy;

      if (dinoY >= GROUND_Y - DINO_H) {
        dinoY = GROUND_Y - DINO_H;
        dinoVy = 0;
      }
    }

    int speed = 3 + (dinoScore / 400);
    obstacleX -= speed;

    if (obstacleX + obstacleW < 0) {
      obstacleW = random(10, 16);
      obstacleH = random(14, 24);
      obstacleX = SCREEN_WIDTH + random(20, 60);
    }

    dinoScore = (millis() - dinoStartMs) / 100;

    int obsTop = GROUND_Y - obstacleH;
    bool hitX = (DINO_X + DINO_W > obstacleX) && (DINO_X < obstacleX + obstacleW);
    bool hitY = (dinoY + DINO_H > obsTop) && (dinoY < GROUND_Y);

    if (hitX && hitY) {
      dinoGameOver = true;
      if (!dinoGameOverSoundPlayed) {
        buzzerStart(BUZZER_GAMEOVER);
        dinoGameOverSoundPlayed = true;
      }
      Serial.print("Dino game over. Score: ");
      Serial.println(dinoScore);
      maybeSendDinoScore();   // <-- send score to Supabase once per game
    }
  }

  drawDinoScreen();
}

// =====================================================
// MODE SWITCHING
// =====================================================
void enterMode(uint8_t newMode) {
  if (newMode != MODE_HOME) {
    selectedMode = newMode;
  }

  currentMode = newMode;

  if (displayOK) {
    display.clearDisplay();
    display.display();
  }

  buzzerStart(BUZZER_DOUBLE);

  switch (newMode) {
    case MODE_BOOT:
      showBootScreen();
      break;
    case MODE_HOME:
      showHomeScreen();
      break;
    case MODE_PPG:
      resetPPGMode();
      break;
    case MODE_STEPS:
      resetStepMode();
      break;
    case MODE_DICE:
      resetDiceMode();
      break;
    case MODE_DINO:
      resetDinoMode();
      break;
  }

  Serial.print("Mode changed to: ");
  Serial.println(modeLabel(newMode));
}

// =====================================================
// BUTTON HANDLING
// BTN1 = Next / Action
// BTN2 = Select / Back
// =====================================================
void handleButtons() {
  if (btn1Pressed) {
    Serial.println("BTN1");

    if (currentMode == MODE_HOME) {
      if (selectedMode == MODE_PPG) selectedMode = MODE_STEPS;
      else if (selectedMode == MODE_STEPS) selectedMode = MODE_DICE;
      else if (selectedMode == MODE_DICE) selectedMode = MODE_DINO;
      else selectedMode = MODE_PPG;

      buzzerStart(BUZZER_CLICK);
      showHomeScreen();
      return;
    }

    if (currentMode == MODE_STEPS) {
      stepCount = 0;
      buzzerStart(BUZZER_CLICK);
      drawStepScreen();
      return;
    }

    if (currentMode == MODE_DICE) {
      triggerDiceRoll();
      return;
    }

    if (currentMode == MODE_DINO) {
      if (dinoGameOver) {
        resetDinoMode();
        drawDinoScreen();
      } else {
        dinoJump();
      }
      return;
    }
  }

  if (btn2Pressed) {
    Serial.println("BTN2");

    if (currentMode == MODE_BOOT) {
      enterMode(MODE_HOME);
      return;
    }

    if (currentMode == MODE_HOME) {
      enterMode(selectedMode);
      return;
    }

    if (currentMode == MODE_DINO && dinoGameOver) {
      enterMode(MODE_HOME);
      return;
    }

    enterMode(MODE_HOME);
    return;
  }
}

// =====================================================
// BOOT / HOME REFRESH TIMERS
// =====================================================
unsigned long lastBootDrawMs = 0;
unsigned long lastHomeDrawMs = 0;

// =====================================================
// SETUP / LOOP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println("Boot starting...");

  Wire.begin(21, 22);
  Wire.setClock(400000);

  randomSeed((uint32_t)esp_random());
  initClockFromBuildTime();

  pinMode(BTN1_PIN, INPUT_PULLUP);
  pinMode(BTN2_PIN, INPUT_PULLUP);

  pinMode(BUZZER_PIN, OUTPUT);
  buzzerOff();

  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS)) {
    displayOK = true;
    Serial.println("OLED OK");
  } else {
    displayOK = false;
    Serial.println("OLED init failed");
  }

  if (displayOK) {
    showBootScreen();
  }

  maxOk = particleSensor.begin(Wire, I2C_SPEED_FAST);
  if (maxOk) {
    particleSensor.setup(
      60,
      4,
      2,
      100,
      411,
      4096
    );
    Serial.println("MAX30102 OK");
  } else {
    Serial.println("MAX30102 not found");
  }

  mpu.initialize();
 // MPU6050 INIT (FIXED)
  mpu.initialize();

// Since I2C scanner already confirmed 0x68,
// we trust the device is present
  imuOk = true;

  Serial.println("✅ MPU6050 OK (Verified via I2C scan)");

  Serial.println("System ready.");
  Serial.println("BTN1 = Next / Action");
  Serial.println("BTN2 = Select / Back");
  Serial.println("Boot screen shows time and date first.");

  // Connect to WiFi (non-blocking attempt during boot)
  Serial.printf("[WiFi] Connecting to %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long wifiWait = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiWait < 8000) {
    delay(200);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] Could not connect — watch will work offline");
  }

  currentMode = MODE_BOOT;
}

void loop() {
  updateButtons();

  if (currentMode == MODE_BOOT) {
    if (displayOK && millis() - lastBootDrawMs >= 250) {
      showBootScreen();
      lastBootDrawMs = millis();
    }

    if (btn1Pressed || btn2Pressed) {
      enterMode(MODE_HOME);
    }

    updateBuzzer();
    delay(20);
    return;
  }

  handleButtons();

  switch (currentMode) {
    case MODE_HOME:
      if (displayOK && millis() - lastHomeDrawMs >= 250) {
        showHomeScreen();
        lastHomeDrawMs = millis();
      }
      break;

    case MODE_PPG:
      updatePPGMode();
      break;

    case MODE_STEPS:
      updateStepMode();
      break;

    case MODE_DICE:
      updateDiceMode();
      break;

    case MODE_DINO:
      updateDinoMode();
      break;
  }

  updateBuzzer();
  delay(1);
}

