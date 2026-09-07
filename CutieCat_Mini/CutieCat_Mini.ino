// ============================================================
//  CutieCat Mini
//  ESP32 + SSD1306 OLED + 2 Buttons
//  Home screen: animated cat face + live clock (NTP synced)
//  Mode 2: WiFi network scanner
// ============================================================

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <time.h>

// ---------- CONFIG: fill these in ----------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const long  GMT_OFFSET_SEC      = 19800;  // India = UTC+5:30 = 5.5*3600
const int   DAYLIGHT_OFFSET_SEC = 0;

// ---------- OLED CONFIG ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---------- BUTTON CONFIG ----------
#define BUTTON_A 18   // cycle / next
#define BUTTON_B 19   // select / back

// ---------- APP STATE ----------
enum Screen { HOME, WIFI_SCAN };
Screen currentScreen = HOME;

bool wifiConnected = false;
unsigned long lastBlink = 0;
bool eyesOpen = true;
int blinkInterval = 3000; // blinks every ~3 sec, randomized a bit later

unsigned long lastTailMove = 0;
int tailFrame = 0;

// button debounce
unsigned long lastButtonPress = 0;
const unsigned long debounceDelay = 250;

// wifi scan results cache
int networksFound = -1; // -1 = not scanned yet
unsigned long lastScanTime = 0;

// ============================================================
void setup() {
  Serial.begin(115200);

  pinMode(BUTTON_A, INPUT_PULLUP);
  pinMode(BUTTON_B, INPUT_PULLUP);

  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("OLED not found!");
    while (true) delay(10);
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(10, 25);
  display.println("CutieCat booting...");
  display.display();

  connectWiFi();

  randomSeed(analogRead(0));
}

// ============================================================
void loop() {
  handleButtons();

  if (currentScreen == HOME) {
    drawHomeScreen();
  } else if (currentScreen == WIFI_SCAN) {
    drawWifiScreen();
  }

  delay(50); // keep animation smooth without hammering the CPU
}

// ============================================================
// WIFI CONNECTION (for NTP time sync)
// ============================================================
void connectWiFi() {
  display.clearDisplay();
  display.setCursor(0, 25);
  display.println("Connecting WiFi...");
  display.display();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi connected!");
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, "pool.ntp.org", "time.nist.gov");

    display.clearDisplay();
    display.setCursor(15, 25);
    display.println("WiFi Connected!");
    display.display();
    delay(1000);
  } else {
    wifiConnected = false;
    Serial.println("\nWiFi failed - clock will show boot time only");

    display.clearDisplay();
    display.setCursor(10, 25);
    display.println("No WiFi - offline mode");
    display.display();
    delay(1500);
  }
}

// ============================================================
// BUTTON HANDLING
// ============================================================
void handleButtons() {
  unsigned long now = millis();
  if (now - lastButtonPress < debounceDelay) return;

  bool aPressed = (digitalRead(BUTTON_A) == LOW);
  bool bPressed = (digitalRead(BUTTON_B) == LOW);

  if (aPressed) {
    lastButtonPress = now;
    // Button A: cycle to next screen
    if (currentScreen == HOME) {
      currentScreen = WIFI_SCAN;
      networksFound = -1; // force rescan on entry
    } else {
      currentScreen = HOME;
    }
  }

  if (bPressed) {
    lastButtonPress = now;
    // Button B: on WiFi screen, trigger rescan. On home, does nothing (reserved)
    if (currentScreen == WIFI_SCAN) {
      networksFound = -1; // trigger rescan
    }
  }
}

// ============================================================
// HOME SCREEN: animated cat face + clock
// ============================================================
void drawHomeScreen() {
  display.clearDisplay();

  drawCatFace();
  drawClock();

  display.setCursor(2, 56);
  display.setTextSize(1);
  display.print("A:WiFi scan");

  display.display();
}

void drawCatFace() {
  unsigned long now = millis();

  // Blinking logic
  if (now - lastBlink > blinkInterval) {
    eyesOpen = !eyesOpen;
    lastBlink = now;
    if (eyesOpen) {
      blinkInterval = 2000 + random(0, 3000); // vary time until next blink
    } else {
      blinkInterval = 150; // eyes stay closed briefly
    }
  }

  int cx = 32; // face center x
  int cy = 20; // face center y

  // Ears (triangles)
  display.fillTriangle(cx - 18, cy - 10, cx - 8, cy - 22, cx - 4, cy - 8, SSD1306_WHITE);
  display.fillTriangle(cx + 18, cy - 10, cx + 8, cy - 22, cx + 4, cy - 8, SSD1306_WHITE);

  // Face outline (circle)
  display.drawCircle(cx, cy, 16, SSD1306_WHITE);

  // Eyes
  if (eyesOpen) {
    display.fillCircle(cx - 7, cy - 2, 2, SSD1306_WHITE);
    display.fillCircle(cx + 7, cy - 2, 2, SSD1306_WHITE);
  } else {
    display.drawLine(cx - 9, cy - 2, cx - 5, cy - 2, SSD1306_WHITE);
    display.drawLine(cx + 5, cy - 2, cx + 9, cy - 2, SSD1306_WHITE);
  }

  // Nose
  display.fillTriangle(cx - 2, cy + 4, cx + 2, cy + 4, cx, cy + 7, SSD1306_WHITE);

  // Mouth (simple curve using two lines)
  display.drawLine(cx, cy + 7, cx - 5, cy + 11, SSD1306_WHITE);
  display.drawLine(cx, cy + 7, cx + 5, cy + 11, SSD1306_WHITE);

  // Whiskers
  display.drawLine(cx - 16, cy + 2, cx - 24, cy, SSD1306_WHITE);
  display.drawLine(cx - 16, cy + 5, cx - 24, cy + 5, SSD1306_WHITE);
  display.drawLine(cx + 16, cy + 2, cx + 24, cy, SSD1306_WHITE);
  display.drawLine(cx + 16, cy + 5, cx + 24, cy + 5, SSD1306_WHITE);

  // Animated tail (bottom right corner, wags)
  if (now - lastTailMove > 300) {
    tailFrame = (tailFrame + 1) % 3;
    lastTailMove = now;
  }
  int tailY = 40 + (tailFrame == 1 ? -3 : (tailFrame == 2 ? 3 : 0));
  display.drawLine(90, 40, 105, tailY, SSD1306_WHITE);
  display.drawLine(105, tailY, 115, tailY - 8, SSD1306_WHITE);
}

void drawClock() {
  display.setTextSize(2);

  if (wifiConnected) {
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
      char timeStr[9];
      strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
      display.setCursor(60, 5);
      display.println(timeStr);

      char dateStr[12];
      strftime(dateStr, sizeof(dateStr), "%d %b", &timeinfo);
      display.setTextSize(1);
      display.setCursor(75, 25);
      display.println(dateStr);
    } else {
      display.setCursor(60, 5);
      display.println("--:--");
    }
  } else {
    // Fallback: show uptime if no WiFi/NTP
    unsigned long secs = millis() / 1000;
    int h = secs / 3600;
    int m = (secs % 3600) / 60;
    int s = secs % 60;
    display.setCursor(60, 5);
    display.printf("%02d:%02d:%02d", h, m, s);
    display.setTextSize(1);
    display.setCursor(60, 25);
    display.println("(uptime)");
  }
}

// ============================================================
// WIFI SCAN SCREEN
// ============================================================
void drawWifiScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("WiFi Scan - CutieCat");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  if (networksFound == -1) {
    display.setCursor(20, 28);
    display.println("Scanning...");
    display.display();

    networksFound = WiFi.scanNetworks();
    lastScanTime = millis();
  }

  display.fillRect(0, 12, 128, 44, SSD1306_BLACK); // clear result area

  if (networksFound == 0) {
    display.setCursor(10, 28);
    display.println("No networks found");
  } else {
    int maxShow = min(networksFound, 4); // fit 4 lines on screen
    for (int i = 0; i < maxShow; i++) {
      display.setCursor(0, 12 + (i * 10));
      String ssid = WiFi.SSID(i);
      if (ssid.length() > 14) ssid = ssid.substring(0, 14);
      display.print(ssid);
      display.print(" ");
      display.print(WiFi.RSSI(i));
      display.println("dB");
    }
  }

  display.setCursor(0, 56);
  display.print("A:Home  B:Rescan");

  display.display();
}
