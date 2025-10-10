# Wireless Lights - Quick Start Guide

## What Was Implemented

A complete zero-configuration wireless light control system using WebSocket communication between the NodeNav head unit and ESP-01 light modules.

## Quick Start

### 1. Start the Server

```bash
# Make sure dependencies are installed
npm install

# Set up WiFi Access Point (Linux only, requires sudo)
sudo ./setup-linux-wifi-ap.sh

# Start the server
npm start
```

The server will:
- Create WebSocket server on port 3001
- Listen for ESP-01 connections
- Provide REST API at `http://localhost:3001/api/lights`
- Provide WebSocket endpoint at `ws://localhost:3001/ws/lights`

### 2. Flash ESP-01 Firmware

1. Open `Controller/esp01_light_controller/esp01_light_controller.ino` in Arduino IDE
2. Install required libraries:
   - ArduinoWebsockets by Gil Maimon
   - ArduinoJson by Benoit Blanchon (v6.x)
3. Set board to "Generic ESP8266 Module"
4. Upload to ESP-01 (GPIO0 to GND for programming mode)
5. Wire RGB LEDs to GPIO0 (Red), GPIO2 (Green), TX/GPIO1 (Blue)
6. Power on the ESP-01

### 3. Use the Interface

1. Open NodeNav web interface
2. Navigate to "Lights" page
3. Use color wheel and brightness slider to control all lights
4. Scroll down to see and control individual lights

## Files Created/Modified

### Backend
- ✅ `src/services/lights-service.js` - WebSocket server and light management
- ✅ `src/server.js` - Added WebSocket integration and REST API endpoints
- ✅ `src/services/api.js` - Added LightsAPI class

### Frontend
- ✅ `src/pages/GPIOControl.jsx` - Enhanced with lights control UI

### ESP-01 Firmware
- ✅ `Controller/esp01_light_controller/esp01_light_controller.ino` - Complete firmware
- ✅ `Controller/esp01_light_controller/README.md` - Hardware and setup guide

### Linux Scripts
- ✅ `setup-linux-wifi-ap.sh` - WiFi AP creation script
- ✅ `teardown-linux-wifi-ap.sh` - WiFi AP cleanup script

### Documentation
- ✅ `WIRELESS_LIGHTS_SETUP.md` - Complete system documentation
- ✅ `LIGHTS_QUICK_START.md` - This file

## Key Features

### Server
- WebSocket server with automatic connection management
- REST API for light control
- Broadcast and unicast command support
- Heartbeat monitoring (30-second intervals)
- Command history tracking
- Graceful shutdown handling

### ESP-01 Firmware
- Automatic WiFi connection to NodeNav-Lights network
- WebSocket client with auto-reconnect
- RGB LED PWM control
- Identify/blink functionality
- Factory reset via rapid power cycling (3x within 10 seconds)
- EEPROM persistence

### Web Interface
- Color wheel for intuitive color selection
- Brightness slider (0-100%)
- Real-time light status display
- Individual light management
- Friendly name editing
- Connection status indicators
- Identify button for each light

## Network Configuration

- **SSID:** NodeNav-Lights
- **Password:** NodeNavPassword
- **Server IP:** 192.168.4.1
- **WebSocket Port:** 3001
- **WebSocket Path:** /ws/lights

## Testing Without ESP-01

You can test the server without hardware using a WebSocket client tool:

```bash
# Install wscat (WebSocket client)
npm install -g wscat

# Connect to server
wscat -c ws://localhost:3001/ws/lights

# Send registration
{"event":"register","payload":{"unitId":"AA:BB:CC:DD:EE:FF","lightType":"RGB-STRIP-1M"}}

# You should receive a registered confirmation
```

## REST API Examples

```bash
# Get all connected lights
curl http://localhost:3001/api/lights

# Set all lights to red
curl -X POST http://localhost:3001/api/lights/all/color \
  -H "Content-Type: application/json" \
  -d '{"r":255,"g":0,"b":0}'

# Set brightness to 50%
curl -X POST http://localhost:3001/api/lights/all/brightness \
  -H "Content-Type: application/json" \
  -d '{"value":0.5}'

# Identify a specific light (replace MAC address)
curl -X POST http://localhost:3001/api/lights/AA:BB:CC:DD:EE:FF/identify
```

## Troubleshooting

### Server won't start
- Check if port 3001 is available: `netstat -tlnp | grep 3001`
- Verify `ws` package is installed: `npm install`

### WiFi AP won't create (Linux)
- Install packages: `sudo apt-get install hostapd dnsmasq`
- Check interface name in script (might not be wlan0)
- Stop NetworkManager: `sudo systemctl stop NetworkManager`

### ESP-01 won't connect
- Check power supply (needs stable 3.3V, 200mA+)
- Verify SSID/password in firmware match AP settings
- Check serial monitor output (115200 baud)
- Move ESP-01 closer to head unit

### No LED output
- Verify wiring (Red→GPIO0, Green→GPIO2, Blue→TX)
- Check resistors (typically 220Ω)
- Ensure LEDs are common cathode
- Test with multimeter or oscilloscope

## Next Steps

1. **Multiple Lights:** Flash firmware to more ESP-01 units
2. **Custom Names:** Use the edit button to name each light
3. **Scenes:** Extend the API to support light scenes/presets
4. **Automation:** Integrate with other NodeNav features
5. **Persistent State:** Add EEPROM storage to remember colors on reboot

## For Full Documentation

See `WIRELESS_LIGHTS_SETUP.md` for:
- Detailed architecture
- Complete API reference
- Advanced configuration
- Security considerations
- Performance optimization
- Troubleshooting guide

## Support

- ESP-01 firmware details: `Controller/esp01_light_controller/README.md`
- System documentation: `WIRELESS_LIGHTS_SETUP.md`
- Project README: `README.md`

