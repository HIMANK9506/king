#include <Wire.h>
#include <MPU6050_light.h>

MPU6050 mpu(Wire);
float roll, pitch, yaw;

void setup() {
  Serial.begin(115200);   // Start serial communication
  Wire.begin();           // Start I2C communication (SDA: GPIO 21, SCL: GPIO 22)
  
  byte status = mpu.begin();
  Serial.print(F("MPU6050 status: "));
  Serial.println(status);
  while(status != 0) {
    Serial.println(F("Failed to connect to MPU6050. Check wiring!"));
    delay(1000);
  }
  
  Serial.println(F("Calculating offsets, do not move MPU6050"));
  delay(1000);
  mpu.calcOffsets();      // Calibrate: keep sensor STILL during this!
  Serial.println(F("Done!\n"));
}

void loop() {
  mpu.update();           // Read latest sensor values
  roll  = mpu.getAngleX();
  pitch = mpu.getAngleY();
  yaw   = mpu.getAngleZ();

  // Send values over USB as: roll,pitch,yaw
  Serial.print(roll);  Serial.print(',');
  Serial.print(pitch); Serial.print(',');
  Serial.println(yaw); // println adds newline at end
  delay(10);           // Wait 10ms before next reading
}
