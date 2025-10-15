# GPS Bluetooth Streaming - Implementation Guide

## Overview
NodeNav now supports real-time GPS location streaming from an Android device over Bluetooth. The GPS data is displayed on the navigation page with a live position marker that follows your movement.

## Architecture

### Components

1. **bluetooth-gps-service.js** - Backend service that handles GPS data streaming
   - Platform-specific implementations for Windows, Linux, and simulation mode
   - Listens for GPS data over Bluetooth RFCOMM (Serial Port Profile)
   - Parses newline-delimited JSON location data
   - Maintains current location state

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

## Platform-Specific Implementation

### Windows

Uses `@abandonware/bluetooth-serial-port` package for Bluetooth RFCOMM communication.

**Prerequisites:**
```bash
npm install @abandonware/bluetooth-serial-port
```

**How it works:**
1. Searches for the GPS service on the connected device
2. Connects to the RFCOMM channel
3. Streams data in real-time
4. Handles disconnection gracefully

### Linux

Uses a Python bridge with `pybluez` for Bluetooth communication.

**Prerequisites:**
```bash
sudo apt-get install python3-bluez
```

**How it works:**
1. Spawns a Python subprocess to handle Bluetooth connection
2. Python script connects to device via RFCOMM
3. Data is piped back to Node.js via stdout
4. JSON parsing happens in Node.js

### Simulation Mode

For development and testing without a physical device.

**How it works:**
1. Simulates GPS movement in a circular pattern around Boulder, CO
2. Updates location every 2 seconds
3. Generates realistic accuracy and bearing values
4. Perfect for testing the UI without hardware

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
```

## Troubleshooting

### GPS Not Connecting

**Symptoms:** No GPS indicator appears, location not updating

**Solutions:**
1. Ensure Android device is paired and connected via Bluetooth
2. Check that the Android GPS streaming app is running
3. Verify GPS permissions are granted on Android device
4. Check browser console for error messages

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

### Windows Installation Issues

**Symptoms:** Error installing `bluetooth-serial-port` package

**Solutions:**
1. Install Visual Studio Build Tools 2019 or newer
2. Install Python 2.7 (required for node-gyp)
3. Run: `npm install --global windows-build-tools`
4. Restart terminal and try again

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

