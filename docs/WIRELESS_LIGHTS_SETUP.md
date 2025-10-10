# NodeNav Wireless Lights System Setup Guide

## Overview

The NodeNav Wireless Lights system provides zero-configuration control of ESP-01 based RGB light units through a WebSocket protocol. The system operates on a self-contained WiFi network created by the head unit.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Head Unit (Linux)                     │
│                                                          │
│  ┌────────────┐    ┌──────────────┐   ┌─────────────┐  │
│  │   React    │───▶│ Express.js   │──▶│  WebSocket  │  │
│  │  Frontend  │    │   HTTP API   │   │   Server    │  │
│  └────────────┘    └──────────────┘   └──────┬──────┘  │
│                                               │          │
│  ┌────────────────────────────────────────────┼──────┐  │
│  │  WiFi Access Point (hostapd + dnsmasq)     │      │  │
│  │  SSID: NodeNav-Lights                      │      │  │
│  │  IP: 192.168.4.1                           │      │  │
│  └────────────────────────────────────────────┼──────┘  │
└─────────────────────────────────────────────────┼─────────┘
                                                │
                      WiFi Network              │
                                                │
        ┌───────────────────┬───────────────────┴────────┐
        │                   │                             │
   ┌────▼────┐         ┌────▼────┐                 ┌────▼────┐
   │ ESP-01  │         │ ESP-01  │       ...       │ ESP-01  │
   │ Light 1 │         │ Light 2 │                 │ Light N │
   │         │         │         │                 │         │
   │ RGB LED │         │ RGB LED │                 │ RGB LED │
   └─────────┘         └─────────┘                 └─────────┘
```

## Prerequisites

### Head Unit (Server)

- Linux-based system (Raspberry Pi, Linux laptop, etc.)
- Node.js 14+ and npm
- Root access (for WiFi AP setup)
- WiFi adapter capable of AP mode

Required packages:
```bash
sudo apt-get update
sudo apt-get install hostapd dnsmasq iptables
```

### ESP-01 Light Units

- ESP-01 or ESP-01S modules
- RGB LED strips or individual LEDs
- Arduino IDE with ESP8266 support
- USB-to-Serial adapter for programming

## Installation

### Part 1: Server Setup

#### 1. Install Dependencies

Navigate to the NodeNav project directory:

```bash
cd /path/to/NodeNav
npm install
```

This will install the `ws` WebSocket library and other dependencies.

#### 2. Setup WiFi Access Point

The system includes scripts to create a WiFi Access Point on Linux.

**Important:** Edit the interface name in the scripts if your WiFi interface is not `wlan0`:

```bash
nano setup-linux-wifi-ap.sh
# Change INTERFACE="wlan0" to your interface name (check with: ip link)
```

Run the setup script with sudo:

```bash
sudo chmod +x setup-linux-wifi-ap.sh
sudo ./setup-linux-wifi-ap.sh
```

You should see output indicating the AP is active:

```
✓ NodeNav-Lights Access Point is now active!
  SSID: NodeNav-Lights
  IP Address: 192.168.4.1
  Interface: wlan0
```

**Troubleshooting AP Setup:**

- **"No such device" error:** Your WiFi adapter doesn't support AP mode or is in use
- **"Operation not supported" error:** Install `hostapd` and `dnsmasq`
- **Cannot start services:** Stop NetworkManager temporarily: `sudo systemctl stop NetworkManager`

#### 3. Start the Server

Start the NodeNav server:

```bash
npm start
```

Or for development mode:

```bash
npm run electron-dev
```

You should see output indicating services are running:

```
NodeNav API server running on port 3001
HTTP API endpoints available at http://localhost:3001/api
WebSocket server available at ws://localhost:3001/ws/lights
Lights WebSocket service initialized
```

#### 4. Configure Auto-Start (Optional)

To automatically start the AP and server on boot, create a systemd service:

```bash
sudo nano /etc/systemd/system/nodenav-lights.service
```

Add the following content (adjust paths as needed):

```ini
[Unit]
Description=NodeNav Lights System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/NodeNav
ExecStartPre=/path/to/NodeNav/setup-linux-wifi-ap.sh
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable nodenav-lights.service
sudo systemctl start nodenav-lights.service
```

### Part 2: ESP-01 Firmware Setup

#### 1. Prepare Arduino IDE

Follow the instructions in `Controller/esp01_light_controller/README.md` to:

1. Install ESP8266 board support
2. Install required libraries (ArduinoWebsockets, ArduinoJson)
3. Configure board settings

#### 2. Wire the ESP-01

Connect LEDs to the ESP-01 GPIO pins:

```
ESP-01 GPIO0 → Red LED → Resistor → GND
ESP-01 GPIO2 → Green LED → Resistor → GND
ESP-01 TX    → Blue LED → Resistor → GND (optional)
```

**Resistor values:** Typically 220Ω for 5mm LEDs, adjust based on your LED specifications.

#### 3. Upload Firmware

1. Connect ESP-01 to USB-to-Serial adapter in programming mode (GPIO0 → GND)
2. Open `Controller/esp01_light_controller/esp01_light_controller.ino` in Arduino IDE
3. Verify network settings match your setup:
   ```cpp
   const char* SSID = "NodeNav-Lights";
   const char* PASSWORD = "NodeNavPassword";
   const char* WS_SERVER = "192.168.4.1";
   const int WS_PORT = 3001;
   ```
4. Select correct board and port
5. Click Upload
6. After upload completes, remove GPIO0 connection and power cycle

#### 4. Test Connection

1. Power on the ESP-01
2. Wait 5-10 seconds for connection
3. LEDs should blink white 3 times when connected
4. Check server logs for registration message

### Part 3: Using the System

#### 1. Access the Web Interface

Open a browser and navigate to the NodeNav interface (the exact URL depends on your setup).

#### 2. Navigate to Lights Control

Click on the "Lights" icon in the navigation menu.

#### 3. Control All Lights

Use the color wheel and brightness slider at the top to control all connected lights simultaneously.

#### 4. Control Individual Lights

Scroll down to see individual light units. For each light you can:

- **View status:** Connection state, current color, brightness
- **Edit name:** Click the edit icon to give the light a friendly name
- **Identify:** Click "Identify" to make the light blink (useful for locating specific units)

#### 5. Adding More Lights

Simply flash another ESP-01 with the same firmware and power it on. It will automatically:

1. Connect to the NodeNav-Lights network
2. Register with the server
3. Appear in the lights list within a few seconds

## API Reference

### REST API Endpoints

#### Get All Lights
```http
GET /api/lights
```

Response:
```json
[
  {
    "unitId": "AA:BB:CC:DD:EE:FF",
    "friendlyName": "Living Room",
    "lightType": "RGB-STRIP-1M",
    "registeredAt": "2025-10-10T12:00:00.000Z",
    "state": {
      "r": 255,
      "g": 128,
      "b": 0,
      "brightness": 0.8,
      "isOn": true
    },
    "connected": true
  }
]
```

#### Set Color for All Lights
```http
POST /api/lights/all/color
Content-Type: application/json

{
  "r": 255,
  "g": 128,
  "b": 0
}
```

#### Set Brightness for All Lights
```http
POST /api/lights/all/brightness
Content-Type: application/json

{
  "value": 0.75
}
```

#### Set Color for Specific Light
```http
POST /api/lights/:unitId/color
Content-Type: application/json

{
  "r": 0,
  "g": 255,
  "b": 128
}
```

#### Set Brightness for Specific Light
```http
POST /api/lights/:unitId/brightness
Content-Type: application/json

{
  "value": 0.5
}
```

#### Identify Specific Light
```http
POST /api/lights/:unitId/identify
```

#### Set Friendly Name
```http
PUT /api/lights/:unitId/name
Content-Type: application/json

{
  "name": "Kitchen Counter"
}
```

### WebSocket Protocol

#### Server Endpoint
```
ws://192.168.4.1:3001/ws/lights
```

#### Client Registration (ESP-01 → Server)
```json
{
  "event": "register",
  "payload": {
    "unitId": "AA:BB:CC:DD:EE:FF",
    "lightType": "RGB-STRIP-1M"
  }
}
```

#### Server Commands (Server → ESP-01)

**Set Color:**
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

**Set Brightness:**
```json
{
  "command": "setBrightness",
  "payload": {
    "value": 0.75
  }
}
```

**Identify (Blink):**
```json
{
  "command": "identify"
}
```

## Troubleshooting

### Server Issues

**WebSocket server won't start**
- Check if port 3001 is already in use: `sudo netstat -tlnp | grep 3001`
- Make sure the server has the `ws` package installed: `npm install ws`

**No lights connecting**
- Verify AP is running: `sudo systemctl status hostapd`
- Check DHCP server: `sudo systemctl status dnsmasq`
- Verify IP address: `ip addr show` (should show 192.168.4.1 on WiFi interface)

**Lights connect but don't respond**
- Check WebSocket connection in browser console
- View server logs for error messages
- Verify ESP-01 is actually connected to WiFi (check DHCP leases: `sudo cat /var/lib/misc/dnsmasq.leases`)

### ESP-01 Issues

**ESP-01 won't connect to WiFi**
- Verify SSID and password in firmware match AP configuration
- Check power supply (needs stable 3.3V, minimum 200mA)
- Move ESP-01 closer to head unit (ESP-01 has limited range)
- Check Serial monitor output for connection errors

**LEDs don't light up**
- Verify wiring and resistor values
- Check if LEDs are common cathode (may need to invert PWM values)
- Test GPIO pins with simple blink sketch first

**ESP-01 keeps disconnecting**
- Insufficient power supply (most common issue)
- Add 100nF capacitor between VCC and GND
- Use dedicated 3.3V regulator with at least 250mA capacity

**Factory reset not working**
- Ensure you're power cycling within 10 seconds each time
- Check EEPROM is functioning (Serial monitor will show boot count)
- Try holding GPIO0 to GND during power-on (manual reset to programming mode)

## Advanced Configuration

### Changing Network Settings

To change the SSID or password:

1. **Server side:** Edit `setup-linux-wifi-ap.sh` and modify:
   ```bash
   SSID="YourCustomSSID"
   PASSWORD="YourCustomPassword"
   ```
   
2. **ESP-01 firmware:** Edit `esp01_light_controller.ino` and modify:
   ```cpp
   const char* SSID = "YourCustomSSID";
   const char* PASSWORD = "YourCustomPassword";
   ```

3. Re-run AP setup script and re-upload firmware to all ESP-01 units

### Using Different WebSocket Port

1. **Server:** Edit `src/server.js` and change `PORT` constant
2. **ESP-01:** Edit firmware and change `WS_PORT` constant

### Adding Internet Access to Light Units

Uncomment the NAT configuration lines in `setup-linux-wifi-ap.sh`:

```bash
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i eth0 -o ${INTERFACE} -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i ${INTERFACE} -o eth0 -j ACCEPT
```

This allows ESP-01 units to access the internet through the head unit (requires head unit to have internet connection on `eth0`).

### Scaling to Many Lights

The system can theoretically handle hundreds of light units, but consider:

- **WiFi bandwidth:** Each light receives ~1KB of data per color change
- **DHCP pool:** Increase DHCP range in `setup-linux-wifi-ap.sh` if needed
- **Server memory:** Each connected light uses ~10KB of RAM
- **WebSocket connections:** Linux systems typically support 1000+ concurrent WebSocket connections

## Performance Optimization

### Reduce Latency

1. **Debouncing:** Already implemented in React UI (150ms debounce)
2. **Rate limiting:** Add rate limiting to WebSocket broadcasts in `lights-service.js`
3. **Message batching:** Combine color and brightness into single message

### Increase Reliability

1. **Heartbeat monitoring:** Already implemented (30-second intervals)
2. **Auto-reconnect:** Already implemented on ESP-01 side
3. **State persistence:** Add EEPROM storage of light state on ESP-01
4. **Server-side state backup:** Add JSON file persistence in `lights-service.js`

## Security Considerations

This system is designed for private, isolated networks. For production use, consider:

1. **WPA2 encryption:** Already enabled in AP configuration
2. **WebSocket authentication:** Add token-based auth to WebSocket connections
3. **HTTPS/WSS:** Use TLS for encrypted communication
4. **Firewall rules:** Restrict access to management interfaces
5. **OTA updates:** Implement secure firmware updates for ESP-01 units

## License

This system is part of the NodeNav project. See main LICENSE file for details.

## Support

For issues, questions, or contributions:
- GitHub: [Your repository URL]
- Documentation: See other `.md` files in this repository
- ESP-01 specific: See `Controller/esp01_light_controller/README.md`

## Changelog

### Version 1.0.0 (Initial Release)
- WebSocket-based communication
- Zero-configuration ESP-01 pairing
- All-lights and individual light control
- Factory reset mechanism
- Heartbeat monitoring
- Web-based UI with color wheel and brightness control

