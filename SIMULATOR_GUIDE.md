# Drone Simulator - Quick Guide

## 🚀 What Was Created

A complete 3D drone flight simulator that visualizes your drone controller inputs in real-time!

## 📁 Files Created

1. **simulator.html** - Main simulator page with 3D canvas and telemetry display
2. **assets/css/simulator.css** - Styling for the simulator interface
3. **assets/js/simulator.js** - 3D drone physics engine and rendering

## 🎮 How to Use

### Step 1: Start the Server
The server is already running! You should see:
```
Server running!
- Local:   http://localhost:3000
- Network: http://192.168.31.x:3000
```

### Step 2: Open the Simulator
Navigate to: **http://localhost:3000/simulator**

### Step 3: Open the Controller
In another tab or device, navigate to: **http://localhost:3000/**

Or click the "Open Simulator" button on the controller page!

### Step 4: Fly the Drone!
- Move the joysticks on the controller
- Watch the drone respond in real-time in the simulator
- See motor values, altitude, speed, and orientation update live

## 🎯 Features

### Visual Elements
- **3D Drone Rendering** - Quadcopter with 4 motors and arms
- **Real-time Physics** - Gravity, thrust, drag, and rotational dynamics
- **Grid Floor** - Reference grid for spatial awareness
- **Shadow** - Dynamic shadow based on altitude
- **Motor Glow** - Motors glow brighter with more power

### Telemetry Display
- **Altitude** - Height above ground in meters
- **Speed** - Total velocity in m/s
- **Pitch** - Forward/backward tilt in degrees
- **Roll** - Left/right tilt in degrees
- **Yaw** - Rotation angle in degrees

### Motor Visualization
- **4 Motor Bars** - Visual representation of each motor's power (0-255)
- **Real-time Updates** - Bars update as you move the joysticks
- **Color-coded** - Gradient from blue to green based on power

## 🛸 Flight Controls

### Left Joystick (Throttle/Yaw)
- **Up/Down** - Increase/decrease altitude (throttle)
- **Left/Right** - Rotate left/right (yaw)

### Right Joystick (Pitch/Roll)
- **Up/Down** - Tilt forward/backward (pitch)
- **Left/Right** - Tilt left/right (roll)

## 🔧 Technical Details

### Motor Mixing (Quadcopter X Configuration)
```
Motor 1 (Front Right): throttle - pitch + roll - yaw
Motor 2 (Rear Right):  throttle + pitch + roll + yaw
Motor 3 (Rear Left):   throttle + pitch - roll - yaw
Motor 4 (Front Left):  throttle - pitch - roll + yaw
```

### Physics Simulation
- **Gravity**: 9.81 m/s²
- **Mass**: 1.0 kg
- **Drag Coefficient**: 0.1
- **Angular Drag**: 0.15
- **Update Rate**: 60 FPS (requestAnimationFrame)

## 🌐 Routes

- `/` - Drone Controller
- `/simulator` - Drone Simulator

## 💡 Tips

1. **Open both in separate windows** - Best experience with controller and simulator side-by-side
2. **Use on mobile** - Open controller on your phone, simulator on your computer
3. **Smooth movements** - The drone has realistic physics, so smooth inputs work best
4. **Watch the motors** - The motor bars help you understand how the mixing works

## 🎨 Design Features

- Modern, premium UI with glassmorphism effects
- Gradient backgrounds and smooth animations
- Responsive design (works on mobile and desktop)
- Real-time Socket.IO communication
- Color-coded status indicators

Enjoy flying! 🚁✨
