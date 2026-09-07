import processing.serial.*;
import processing.opengl.*;

Serial myPort;
float roll = 0, pitch = 0, yaw = 0;
String portName = "COM6";  // Set to your ESP32 port COM6

void setup() {
  size(800, 600, P3D);       // 800x600 window with 3D mode
  println("Available Serial Ports:");
  printArray(Serial.list());
  
  myPort = new Serial(this, portName, 115200);
  myPort.bufferUntil('\n');  // Read until newline character
}

void draw() {
  background(50);            // Dark gray background
  lights();                  // Enable 3D lighting
  translate(width/2, height/2, 0); // Move to center of screen
  rotateY(radians(yaw));     // Apply yaw rotation
  rotateX(radians(pitch));   // Apply pitch rotation
  rotateZ(radians(roll));    // Apply roll rotation

  fill(255, 220, 180);       // Skin color
  box(80, 100, 30);          // Palm
  
  pushMatrix(); 
  translate(40, -20, 0); 
  rotateZ(radians(30));
  box(25, 60, 25);           // Thumb
  popMatrix();
  
  pushMatrix(); 
  translate(-30, -50, 0);
  box(20, 70, 20);           // Index finger
  popMatrix();
  
  pushMatrix(); 
  translate(0, -55, 0);
  box(20, 80, 20);           // Middle finger
  popMatrix();
  
  pushMatrix(); 
  translate(30, -50, 0);
  box(20, 75, 20);           // Ring finger
  popMatrix();
}

void serialEvent(Serial myPort) {
  String data = myPort.readStringUntil('\n');
  if (data != null) {
    String[] angles = split(trim(data), ',');
    if (angles.length == 3) {
      roll  = float(angles[0]);
      pitch = float(angles[1]);
      yaw   = float(angles[2]);
    }
  }
}
