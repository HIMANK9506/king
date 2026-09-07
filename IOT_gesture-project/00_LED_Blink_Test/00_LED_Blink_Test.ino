// ============================================
// GestureTech Workshop - LED Blink Test
// Blinks the built-in blue LED on ESP32 (GPIO 2)
// Confirms: USB connection, board, upload working
// ============================================

#define LED_PIN 2  // Built-in blue LED on most ESP32 boards

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("=== LED Blink Test Started ===");
  Serial.println("Blue LED should be blinking!");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED ON");
  delay(500);
  
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED OFF");
  delay(500);
}
