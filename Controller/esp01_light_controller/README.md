# ESP-01 Light Controller

WebSocket-based RGB LED controller firmware for ESP-01 modules.

## Hardware Requirements

- ESP-01 or ESP-01S module (ESP8266)
- RGB LED strip or individual RGB LEDs (common cathode recommended)
- Appropriate resistors for LEDs
- 3.3V power supply (stable, at least 200mA)

## Wiring

```
ESP-01 Pin    →  Connection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VCC (3.3V)    →  3.3V Power Supply
GND           →  Ground
GPIO0 (D3)    →  Red LED PWM (through resistor)
GPIO2 (D4)    →  Green LED PWM (through resistor)
TX/GPIO1      →  Blue LED PWM (optional, conflicts with Serial debug)
```

**Note:** GPIO1 (TX pin) can be used for the Blue channel, but you must disable Serial communication by commenting out all `Serial.begin()` and `Serial.print()` statements in the code.

## Required Libraries

Install these libraries using Arduino IDE Library Manager:

1. **ESP8266WiFi** - Built-in with ESP8266 board support
2. **ArduinoWebsockets** by Gil Maimon
   - Search: "ArduinoWebsockets"
   - Version: 0.5.3 or higher
3. **ArduinoJson** by Benoit Blanchon
   - Search: "ArduinoJson"
   - Version: 6.x (not 7.x)

## Arduino IDE Setup

### 1. Install ESP8266 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add to "Additional Board Manager URLs":
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
4. Go to **Tools → Board → Board Manager**
5. Search for "esp8266"
6. Install "ESP8266 by ESP8266 Community"

### 2. Board Settings

Configure these settings in Arduino IDE:

```
Board: "Generic ESP8266 Module"
Upload Speed: "115200"
CPU Frequency: "80 MHz"
Flash Size: "1MB (FS:64KB OTA:~470KB)"
Flash Mode: "DIO"
Reset Method: "nodemcu"
```

### 3. Upload the Firmware

1. Connect ESP-01 to USB-to-Serial adapter
2. Put ESP-01 in programming mode:
   - Connect GPIO0 to GND
   - Power cycle or press reset
3. Select correct COM port in **Tools → Port**
4. Click **Upload**
5. Once uploaded, disconnect GPIO0 from GND
6. Power cycle the ESP-01

## Network Configuration

The ESP-01 will automatically connect to:

- **SSID:** `NodeNav-Lights`
- **Password:** `NodeNavPassword`
- **Server:** `ws://192.168.4.1:3001/ws/lights`

These values are hardcoded in the firmware. If you need to change them, edit these constants in the `.ino` file:

```cpp
const char* SSID = "NodeNav-Lights";
const char* PASSWORD = "NodeNavPassword";
const char* WS_SERVER = "192.168.4.1";
const int WS_PORT = 3001;
```

## Factory Reset

The ESP-01 includes a factory reset feature activated by rapid power cycling:

1. Power on the ESP-01
2. Power off within 10 seconds
3. Repeat 3 times total
4. On the 3rd rapid boot, the red LED will blink rapidly
5. All saved settings will be cleared
6. The module will reboot and enter discovery mode

## LED Behavior

- **Startup:** LEDs turn white briefly
- **Connected to WiFi:** 3 quick white blinks
- **Identify Command:** 3 quick white blinks
- **Factory Reset:** 10 rapid red blinks

## Troubleshooting

### ESP-01 won't connect to WiFi

- Verify the SSID and password match the Access Point
- Check that the AP is running on the head unit
- Ensure the ESP-01 is within range (ESP-01 has limited range)
- Check power supply (needs stable 3.3V, at least 200mA)

### No LED output

- Verify wiring connections
- Check that LEDs are common cathode (or adjust code for common anode)
- Ensure resistors are correctly sized for your LEDs
- If using GPIO1 for blue, disable Serial debug output

### Module keeps rebooting

- Power supply is likely insufficient
- Use a dedicated 3.3V regulator with adequate current capacity
- Add decoupling capacitors (100nF and 10uF) near VCC/GND

### Serial Monitor shows nothing

- Make sure baud rate is set to 115200
- Check USB-to-Serial adapter connections
- If using GPIO1 for LED, Serial won't work (comment out Serial code)

## Debugging

To see debug output:

1. Keep GPIO1 (TX) disconnected from LEDs
2. Connect ESP-01 TX pin to USB-to-Serial RX
3. Open Serial Monitor at 115200 baud
4. You'll see connection status, received commands, etc.

## Message Protocol

The ESP-01 communicates using JSON messages over WebSocket:

### Registration (ESP-01 → Server)
```json
{
  "event": "register",
  "payload": {
    "unitId": "AA:BB:CC:DD:EE:FF",
    "lightType": "RGB-STRIP-1M"
  }
}
```

### Set Color (Server → ESP-01)
```json
{
  "command": "setColor",
  "payload": {
    "r": 255,
    "g": 128,
    "b": 0
  }
}
```

### Set Brightness (Server → ESP-01)
```json
{
  "command": "setBrightness",
  "payload": {
    "value": 0.75
  }
}
```

### Identify (Server → ESP-01)
```json
{
  "command": "identify"
}
```

## License

This code is part of the NodeNav project and follows the same license.

