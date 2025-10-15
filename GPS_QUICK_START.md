# GPS Bluetooth Streaming - Quick Start Guide

Get GPS location streaming from your Android device to NodeNav in just a few steps!

## Prerequisites

- ✅ Android device with NodeNav GPS streaming app
- ✅ PC with Bluetooth capability
- ✅ Devices paired via Bluetooth
- ✅ MapBox access token configured (see [MAPBOX_SETUP.md](./MAPBOX_SETUP.md))

## Windows Setup

### Step 1: Install Bluetooth Package (Optional)

For real GPS streaming from Android:

```bash
npm install @abandonware/bluetooth-serial-port
```

**Note:** This requires Visual Studio Build Tools. If you encounter errors, see the troubleshooting section below.

### Step 2: Pair Your Android Device

1. Open **Settings** → **Bluetooth & devices**
2. Click **Add device** → **Bluetooth**
3. Select your Android device from the list
4. Confirm pairing on both devices

### Step 3: Start NodeNav

```bash
npm start
```

The server will automatically initialize the GPS service.

### Step 4: Connect Android App

1. Open the NodeNav GPS app on your Android device
2. The app should automatically start streaming GPS data
3. NodeNav will automatically detect and connect to the GPS stream

### Step 5: Open Navigation Page

1. Open NodeNav in your browser
2. Navigate to the **Navigation** page
3. You should see:
   - A blue pulsing marker at your current position
   - "GPS Connected" indicator in the top-right corner
   - The map automatically centered on your location

## Linux Setup

### Step 1: Install Python Bluetooth

```bash
sudo apt-get install python3-bluez
```

### Step 2: Pair Your Android Device

```bash
bluetoothctl
scan on
# Wait for your device to appear
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
exit
```

### Step 3: Start NodeNav

```bash
npm start
```

### Step 4: Follow Steps 4-5 from Windows Setup

## Testing Without Hardware (Simulation Mode)

NodeNav includes a GPS simulation mode for testing without an Android device:

1. Start NodeNav normally
2. Open the Navigation page
3. The simulation will automatically start
4. You'll see a marker moving in a circular pattern around Boulder, CO

The simulation is perfect for:
- Testing the UI and map features
- Development without hardware
- Demonstrating the system

## What You Should See

### When GPS is Connected

**Navigation Page:**
- 🔵 Blue pulsing marker at your current position
- 📍 "GPS Connected" badge in top-right corner
- 🗺️ Map centered on your location
- 🧭 Map rotates to match your direction of travel

**Browser Console:**
```
[GPS] GPS service initialized (Windows/Linux/simulation)
[Navigation] Starting GPS listener for device: XX:XX:XX:XX:XX:XX
[GPS] Connected to GPS service
[GPS] Location updated: 40.015000, -105.270500
```

### When GPS is Not Available

- No position marker on the map
- No "GPS Connected" badge
- Map stays at default location (Boulder, CO)
- Console shows: `[Navigation] Could not fetch GPS location`

## Troubleshooting

### "Cannot find module '@abandonware/bluetooth-serial-port'"

**Solution:** Either install the package or use simulation mode:

```bash
# Option 1: Install the package
npm install @abandonware/bluetooth-serial-port

# Option 2: Just use simulation mode
# (No action needed - simulation is automatic)
```

### Bluetooth Package Won't Install on Windows

**Solution:** Install build tools:

```bash
# Install Visual Studio Build Tools
npm install --global windows-build-tools

# Or install Visual Studio 2019+ with "Desktop development with C++" workload
```

### GPS Not Connecting

**Checklist:**
- [ ] Is the Android device paired in system Bluetooth settings?
- [ ] Is the Android GPS app running and showing "Streaming..."?
- [ ] Are location permissions granted on the Android device?
- [ ] Is GPS enabled on the Android device?
- [ ] Are the devices within Bluetooth range (10 meters)?

**Test Connection:**
```bash
# Check Bluetooth status
# Windows: Device Manager → Bluetooth
# Linux: bluetoothctl info XX:XX:XX:XX:XX:XX
```

### Position is Inaccurate

**Solutions:**
- Move outdoors for better GPS reception
- Wait 30-60 seconds for GPS to acquire more satellites
- Check the accuracy value (should be < 20 meters for good accuracy)
- Restart the Android GPS app

### Connection Keeps Dropping

**Solutions:**
- Ensure devices stay within 10 meters
- Keep Android app in foreground
- Disable battery optimization for the GPS app on Android
- Check for Bluetooth interference from other devices

## API Endpoints

Once running, you can test the GPS API:

### Get Current Location
```bash
curl http://localhost:3001/api/gps/location
```

Example response:
```json
{
  "latitude": 40.0150,
  "longitude": -105.2705,
  "accuracy": 5.2,
  "bearing": 45.8,
  "timestamp": 1697654321000
}
```

### Get GPS Status
```bash
curl http://localhost:3001/api/gps/status
```

Example response:
```json
{
  "connected": true,
  "deviceAddress": "XX:XX:XX:XX:XX:XX",
  "hasLocation": true,
  "lastUpdate": 1697654321000
}
```

### Start GPS Listener Manually
```bash
curl -X POST http://localhost:3001/api/gps/start \
  -H "Content-Type: application/json" \
  -d '{"deviceAddress": "XX:XX:XX:XX:XX:XX"}'
```

### Stop GPS Listener
```bash
curl -X POST http://localhost:3001/api/gps/stop
```

## Next Steps

Once GPS is working:

1. **Explore the Navigation Page**
   - Watch the map follow your movement
   - See the bearing rotation as you change direction
   - Monitor the GPS accuracy indicator

2. **Test Music Controls**
   - Play music from your Android device
   - Control playback from the navigation page
   - See album art and track info overlay

3. **Enable 3D Maps** (Optional)
   - Go to Display Settings
   - Enable "3D Maps"
   - Return to Navigation for a 3D view

4. **Read Full Documentation**
   - [GPS Implementation Guide](./docs/GPS_STREAMING_IMPLEMENTATION.md)
   - [Bluetooth Audio Setup](./docs/BLUETOOTH_AUDIO_SETUP.md)
   - [MapBox Setup](./MAPBOX_SETUP.md)

## Getting Android Device Address

### On Android Device
1. Go to **Settings** → **About phone**
2. Find **Bluetooth address**
3. Note it down (format: XX:XX:XX:XX:XX:XX)

### On PC - Windows
```powershell
Get-PnpDevice -Class Bluetooth | Where-Object {$_.FriendlyName -like "*Android*"}
```

### On PC - Linux
```bash
bluetoothctl devices
```

## Support

- **Documentation:** [docs/GPS_STREAMING_IMPLEMENTATION.md](./docs/GPS_STREAMING_IMPLEMENTATION.md)
- **Issues:** Check browser console and server logs
- **Bluetooth Help:** [docs/WINDOWS_BLUETOOTH_SETUP.md](./docs/WINDOWS_BLUETOOTH_SETUP.md)

## Features

✨ **Live GPS Tracking**
- Real-time position updates (1-5 Hz)
- Sub-second latency
- Visual position marker with pulsing animation
- Accuracy circle visualization

🧭 **Smart Navigation**
- Auto-centering on current position
- Bearing-based map rotation
- Smooth animated transitions
- Works with 2D and 3D maps

🎵 **Integrated Music Controls**
- Control music playback while navigating
- See album art and track info
- Seamless Bluetooth audio integration

🔒 **Secure & Private**
- All data stays local (Bluetooth only)
- No internet connection required
- No data collection or tracking

Enjoy your GPS-enabled navigation! 🚗📍

