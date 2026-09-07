# CatAI - Version 2 (Modular Architecture) 🐱⚙️

**CatAI V2** is a major modular architectural overhaul of the NekoAI virtual pet, introducing non-volatile memory persistence, dedicated display engines, acoustic buzzer feedback, and an interactive menu system.

---

## 🏗️ Architecture & Modules

```
V2/
├── V2.ino             # Main loop & state orchestration
├── DisplayEngine.h    # Low-level display drawing primitives & double buffering
├── CatAI.h            # Core decision-making engine & mood state transitions
├── CatSprites.h       # High-efficiency bitmap sprite tables
├── Animation.h        # Frame-rate independent animation controller
├── Sensors.h          # MPU6050 pedometer & gesture recognition
├── Memory.h           # EEPROM / Flash persistence (saves pet state across reboots)
├── Sound.h            # PWM Piezo buzzer melody & sound effect generator
├── Menu.h             # Hierarchical UI navigation system
├── Games.h            # Playable OLED mini-games
├── Icons.h            # UI icons (battery, food, hearts, steps)
└── Config.h           # Hardware pin mapping & timing configurations
```

---

## 🌟 Key Upgrades

- **💾 State Persistence**: Pet stats (hunger, happiness, lifetime steps) are saved to EEPROM / non-volatile storage, surviving power cycles.
- **🔊 Audio Effects**: Piezo buzzer audio cues for feeding, button clicks, level-ups, and game-over sounds.
- **📱 Modular OOP Codebase**: Separated concerns across clean C++ headers for simple maintainability and extension.
