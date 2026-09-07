import sys
import time
import serial
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *

PORT = "COM6"
BAUD = 115200

def draw_hand():
    # Colors
    skin_color = (1.0, 0.86, 0.70)
    edge_color = (0.3, 0.2, 0.1)

    def draw_box(dx, dy, dz):
        x, y, z = dx / 2.0, dy / 2.0, dz / 2.0
        vertices = [
            ( x,  y, -z), ( x, -y, -z), (-x, -y, -z), (-x,  y, -z),
            ( x,  y,  z), ( x, -y,  z), (-x, -y,  z), (-x,  y,  z)
        ]
        faces = [
            (0,1,2,3), (4,5,6,7), (0,4,7,3),
            (1,5,6,2), (0,1,5,4), (3,2,6,7)
        ]
        
        # Draw solid faces
        glColor3fv(skin_color)
        glBegin(GL_QUADS)
        for face in faces:
            for vertex in face:
                glVertex3fv(vertices[vertex])
        glEnd()

        # Draw wireframe edges for definition
        glColor3fv(edge_color)
        glBegin(GL_LINES)
        edges = [
            (0,1), (1,2), (2,3), (3,0),
            (4,5), (5,6), (6,7), (7,4),
            (0,4), (1,5), (2,6), (3,7)
        ]
        for edge in edges:
            for vertex in edge:
                glVertex3fv(vertices[vertex])
        glEnd()

    # Palm
    draw_box(80, 100, 25)

    # Thumb
    glPushMatrix()
    glTranslatef(48, -15, 0)
    glRotatef(30, 0, 0, 1)
    draw_box(22, 55, 20)
    glPopMatrix()

    # Index finger
    glPushMatrix()
    glTranslatef(-30, 75, 0)
    draw_box(18, 55, 18)
    glPopMatrix()

    # Middle finger
    glPushMatrix()
    glTranslatef(-10, 85, 0)
    draw_box(18, 65, 18)
    glPopMatrix()

    # Ring finger
    glPushMatrix()
    glTranslatef(12, 78, 0)
    draw_box(18, 60, 18)
    glPopMatrix()

    # Little / Pinky finger
    glPushMatrix()
    glTranslatef(32, 60, 0)
    draw_box(16, 45, 16)
    glPopMatrix()

def main():
    print(f"Connecting to ESP32 on {PORT} at {BAUD} baud...")
    try:
        ser = serial.Serial(PORT, BAUD, timeout=0.1)
        time.sleep(1)
        print("Connected to ESP32 successfully!")
    except Exception as e:
        print(f"Could not open serial port {PORT}: {e}")
        return

    pygame.init()
    display = (800, 600)
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL)
    pygame.display.set_caption("3D Hand Tracking - ESP32 + MPU6050")

    glEnable(GL_DEPTH_TEST)
    glMatrixMode(GL_PROJECTION)
    gluPerspective(45, (display[0] / display[1]), 0.1, 1000.0)
    glMatrixMode(GL_MODELVIEW)

    roll, pitch, yaw = 0.0, 0.0, 0.0
    clock = pygame.time.Clock()

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False

        # Read Serial Data from ESP32
        while ser.in_waiting > 0:
            try:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    parts = line.split(',')
                    if len(parts) == 3:
                        roll = float(parts[0])
                        pitch = float(parts[1])
                        yaw = float(parts[2])
            except Exception:
                pass

        # Clear buffers
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glLoadIdentity()

        # Position camera
        glTranslatef(0.0, 0.0, -350.0)

        # Apply MPU6050 rotations
        glRotatef(pitch, 1, 0, 0)  # Tilt Forward / Backward
        glRotatef(-yaw, 0, 1, 0)   # Rotate Left / Right
        glRotatef(roll, 0, 0, 1)   # Roll side to side

        # Draw 3D Hand Model
        draw_hand()

        pygame.display.flip()
        clock.tick(60)

    ser.close()
    pygame.quit()

if __name__ == "__main__":
    main()
