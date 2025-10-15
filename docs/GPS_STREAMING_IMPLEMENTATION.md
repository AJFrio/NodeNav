# GPS Bluetooth Streaming - Implementation Guide

## Overview
NodeNav supports real-time GPS location streaming from an Android device over Bluetooth on Linux systems. The GPS data is displayed on the navigation page with a live position marker that follows your movement.

**Platform Support:** Linux only (optimized for Raspberry Pi and other Linux-based headunits)

## Architecture

### Components

1. **bluetooth-gps-service.js** - Backend service that handles GPS data streaming
   - **Linux-optimized** implementation using Python/BlueZ
   - Listens for GPS data over Bluetooth RFCOMM (Serial Port Profile)
   - Parses newline-delimited JSON location data
   - Event-driven architecture with EventEmitter
   - Automatic reconnection with exponential backoff
   - Statistics tracking and performance monitoring

2. **Server API Endpoints** - REST API for GPS data access
   - `GET /api/gps/location` - Get current GPS location
   - `GET /api/gps/status` - Get GPS connection status
   - `POST /api/gps/start` - Start listening for GPS data
   - `POST /api/gps/stop` - Stop listening for GPS data

3. **Frontend Components**
   - **gpsAPI** - Frontend API client for GPS data
   - **MapBox** - Updated with current position marker support
   - **NavigationPage** - Polls GPS data and centers map on current position

## Data Format

The Android app streams GPS data as newline-delimited JSON messages:

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 5.2,
  "bearing": 45.8,
  "timestamp": 1697654321000
}
```

### Field Descriptions

| Field | Type | Unit | Description | Required |
|-------|------|------|-------------|----------|
| `latitude` | Double | Degrees | Latitude coordinate (-90 to 90) | Yes |
| `longitude` | Double | Degrees | Longitude coordinate (-180 to 180) | Yes |
| `accuracy` | Float | Meters | Horizontal accuracy of the position | No |
| `bearing` | Float | Degrees | Direction of travel (0-360, 0=North) | No |
| `timestamp` | Long | Milliseconds | Unix timestamp (milliseconds since epoch) | Yes |

## How It Works

### Automatic Connection

1. When you open the Navigation page, NodeNav automatically checks for connected Bluetooth devices
2. If a device is connected, it attempts to start the GPS listener
3. The GPS service connects to the device's Bluetooth RFCOMM service
4. Location updates are received and parsed in real-time
5. The map automatically centers on your current position

### Visual Indicators

- **Blue pulsing marker** - Shows your current GPS position on the map
- **GPS Connected badge** - Appears in the top-right corner when GPS is active
- **Accuracy circle** (if available) - Semi-transparent circle showing GPS accuracy

### Map Behavior

- **Auto-centering** - The map automatically follows your GPS position
- **Bearing rotation** - Map rotates to match your direction of travel (if bearing is available)
- **Smooth transitions** - Map smoothly animates to new positions

## Linux Implementation Details

NodeNav GPS streaming is optimized exclusively for Linux systems using BlueZ (the official Linux Bluetooth stack).

### Prerequisites

**Required:**
```bash
# Install Python 3 and Bluetooth library
sudo apt-get update
sudo apt-get install python3 python3-bluez

# Verify installation
python3 --version
```

**Bluetooth Permissions:**
```bash
# Option 1: Add user to bluetooth group (recommended)
sudo usermod -a -G bluetooth $USER
# Log out and back in for changes to take effect

# Option 2: Create D-Bus policy (see LINUX_BLUETOOTH_GUIDE.md)
```

### How It Works

1. **Connection Initialization**
   - Node.js spawns a Python subprocess with a Bluetooth RFCOMM script
   - Python connects to the Android device on channel 1 (standard SPP)
   - Connection status messages sent via stderr

2. **Data Streaming**
   - GPS data flows from Python to Node.js via stdout
   - Each JSON message is validated before processing
   - Structured error messages for debugging

3. **Automatic Reconnection**
   - Detects connection loss automatically
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
   - Up to 5 reconnection attempts by default
   - Manual reconnection always available

4. **Event-Driven Architecture**
   - Uses Node.js EventEmitter for location updates
   - Events: `connected`, `disconnected`, `location`, `reconnect_failed`
   - Clean separation between transport and application logic

5. **Performance Optimizations**
   - Efficient buffering for incomplete JSON messages
   - Throttled logging (every 5 updates to reduce noise)
   - Socket timeout handling for better responsiveness
   - Graceful shutdown with SIGTERM/SIGINT handling

### Why Linux-Only?

- **Native BlueZ Support**: Linux has the best Bluetooth stack for embedded systems
- **Raspberry Pi Optimized**: Perfect for car headunit projects
- **Reliable RFCOMM**: BlueZ provides stable serial port profile implementation
- **Resource Efficient**: Python bridge is lightweight and fast
- **Standard Platform**: Most automotive projects use Linux-based systems

## Usage

### Starting GPS Manually

You can manually start GPS listening via the API:

```javascript
import { gpsAPI } from './services/api';

// Start listening for GPS from a specific device
await gpsAPI.startListening('XX:XX:XX:XX:XX:XX');

// Get current location
const location = await gpsAPI.getLocation();
console.log(`Lat: ${location.latitude}, Lon: ${location.longitude}`);

// Stop listening
await gpsAPI.stopListening();
```

### Checking GPS Status

```javascript
const status = await gpsAPI.getStatus();
console.log('Connected:', status.connected);
console.log('Has Location:', status.hasLocation);
console.log('Last Update:', new Date(status.lastUpdate));
console.log('Uptime:', status.uptime / 1000, 'seconds');
console.log('Auto-Reconnect:', status.autoReconnect);
```

### Event Listeners

The GPS service is an EventEmitter. You can listen for events:

```javascript
const gpsService = require('./services/bluetooth-gps-service');

// Listen for new location updates
gpsService.on('location', (location) => {
  console.log(`New location: ${location.latitude}, ${location.longitude}`);
});

// Listen for connection events
gpsService.on('connected', (info) => {
  console.log(`Connected to ${info.deviceAddress}`);
});

gpsService.on('disconnected', (info) => {
  console.log(`Disconnected from ${info.deviceAddress}`);
  console.log('Stats:', info.stats);
});

gpsService.on('reconnect_failed', (info) => {
  console.error(`Failed to reconnect after ${info.attempts} attempts`);
});
```

### Statistics

View detailed statistics about GPS performance:

```javascript
const stats = gpsService.getStats();
console.log('Total Updates:', stats.totalUpdates);
console.log('Updates/sec:', stats.updatesPerSecond);
console.log('Uptime:', stats.uptime / 1000, 'seconds');
console.log('Errors:', stats.errors);
console.log('Parse Errors:', stats.parseErrors);
```

## Troubleshooting

### GPS Not Connecting

**Symptoms:** No GPS indicator appears, location not updating

**Check server logs for specific errors:**

**"Python3 not found"**
```bash
sudo apt-get install python3
```

**"Failed to start Python process"**
```bash
sudo apt-get install python3-bluez
```

**"Connection failed: [Errno 13] Permission denied"**
```bash
# Add user to bluetooth group
sudo usermod -a -G bluetooth $USER
# Log out and back in
```

**"Connection timeout after 30 seconds"**
1. Ensure Android device is paired: `bluetoothctl paired-devices`
2. Connect device: `bluetoothctl connect XX:XX:XX:XX:XX:XX`
3. Check Android GPS app is running and showing "Streaming..."
4. Verify GPS permissions are granted on Android

**"Connection failed: Host is down"**
1. Device is out of range or Bluetooth is off
2. Reconnect device in Bluetooth settings
3. Restart Android GPS streaming app

### Inaccurate Position

**Symptoms:** Position marker is offset or jumping around

**Solutions:**
1. Move to an area with better GPS reception (outdoors, clear sky view)
2. Wait for GPS to acquire more satellites (accuracy improves over time)
3. Check the accuracy value - higher values indicate lower precision

### Connection Drops

**Symptoms:** GPS indicator disappears intermittently

**Solutions:**
1. Ensure devices stay within Bluetooth range (~10 meters)
2. Minimize Bluetooth interference from other devices
3. Keep Android app in foreground to prevent system from killing it
4. Check battery optimization settings on Android

### Auto-Reconnection Not Working

**Symptoms:** GPS doesn't reconnect after disconnect

**Solutions:**
1. Check if auto-reconnect is enabled:
   ```javascript
   const info = gpsService.getConnectionInfo();
   console.log('Auto-reconnect:', info.autoReconnect);
   ```
2. If disabled, restart with auto-reconnect:
   ```javascript
   await gpsAPI.startListening('XX:XX:XX:XX:XX:XX', true);
   ```
3. Check reconnection attempts haven't been exhausted:
   ```javascript
   console.log('Attempts:', info.reconnectAttempts);
   // If >= 5, call startListening() again to reset
   ```

### High Parse Errors

**Symptoms:** Many "Parse error" messages in logs

**Solutions:**
1. Check Android app version (may be sending malformed data)
2. Verify Android app is using correct JSON format
3. Check for Bluetooth interference causing data corruption
4. Move devices closer together

## API Reference

### Backend Service (bluetooth-gps-service.js)

```javascript
// Initialize the service
await gpsService.initialize();

// Start listening for GPS data
await gpsService.startListening('XX:XX:XX:XX:XX:XX');

// Get current location
const location = gpsService.getCurrentLocation();
// Returns: { latitude, longitude, accuracy, bearing, timestamp }

// Check connection status
const info = gpsService.getConnectionInfo();
// Returns: { connected, deviceAddress, hasLocation, lastUpdate }

// Stop listening
await gpsService.stopListening();

// Add event listener for location updates
gpsService.addListener((location) => {
  console.log('New location:', location);
});

// Cleanup
await gpsService.cleanup();
```

### Frontend API (gpsAPI)

```javascript
import { gpsAPI } from './services/api';

// Get current location
const location = await gpsAPI.getLocation();

// Get connection status
const status = await gpsAPI.getStatus();

// Start listening (requires device address)
await gpsAPI.startListening('XX:XX:XX:XX:XX:XX');

// Stop listening
await gpsAPI.stopListening();
```

### MapBox Component Props

```javascript
<MapBox
  center={[-105.2705, 40.0150]}  // [lng, lat]
  zoom={16.5}
  bearing={0}
  pitch={60}
  style="mapbox://styles/mapbox/streets-v12"
  currentPosition={{              // NEW: GPS position
    latitude: 40.0150,
    longitude: -105.2705,
    accuracy: 5.2,
    bearing: 45.8
  }}
  onMapLoad={(mapInstance) => {}}
/>
```

## Performance Characteristics

- **Update Rate:** 1-5 Hz (depending on GPS refresh rate)
- **Latency:** 100-500ms from GPS fix to display
- **Data Usage:** ~50-100 bytes per update
- **Power Consumption:** Moderate (GPS is primary consumer)
- **Bluetooth Range:** ~10 meters

## Security

1. **Pairing Required** - Devices must be paired before connection
2. **No Authentication** - Beyond Bluetooth pairing
3. **Link Encryption** - Standard Bluetooth encryption
4. **Local Only** - No internet exposure, operates entirely over Bluetooth

## Future Enhancements

Potential improvements for future versions:

1. **Multiple Device Support** - Track multiple GPS sources simultaneously
2. **GPS Recording** - Save GPS tracks for later playback
3. **Route Following** - Turn-by-turn navigation based on GPS
4. **Geofencing** - Trigger actions when entering/leaving areas
5. **Speed Display** - Calculate and display current speed
6. **Trip Statistics** - Distance traveled, average speed, etc.
7. **Offline Maps** - Cache map tiles for offline use
8. **GPS Smoothing** - Apply Kalman filtering for smoother movement

## Related Documentation

- [Bluetooth Audio Setup](./BLUETOOTH_AUDIO_SETUP.md)
- [Windows Bluetooth Setup](./WINDOWS_BLUETOOTH_SETUP.md)
- [Linux Bluetooth Guide](./LINUX_BLUETOOTH_GUIDE.md)
- [MapBox Setup](../MAPBOX_SETUP.md)

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Bluetooth connectivity: Device Manager (Windows) or `bluetoothctl` (Linux)
3. Check server logs for GPS service messages
4. Review Android app logcat: `adb logcat | grep GPS`

## License

See LICENSE file in the repository root.

