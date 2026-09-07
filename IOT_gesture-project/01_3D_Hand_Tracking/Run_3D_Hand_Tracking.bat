@echo off
title 3D Hand Tracking - ESP32 + MPU6050
cd /d "C:\Users\Techcho\Documents\Arduino\IOT_gesture-project\01_3D_Hand_Tracking"
echo Starting 3D Hand Tracking Visualizer...
echo Connecting to ESP32 on COM6...
python hand_tracking_visualizer.py
pause
