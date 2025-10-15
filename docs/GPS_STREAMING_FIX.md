# GPS Streaming Fix Documentation

## Overview
This document explains how GPS coordinate streaming works between the Android app and the PC React application, and provides solutions for common issues.

## Architecture

### Android Side (GPS Provider)
- **Role**: Acts as a Bluetooth RFCOMM server
- **Service Name**: NodeNav-GPS  
- **UUID**: 00001101-0000-1000-8000-00805F9B34FB (Standard SPP UUID)
- **Protocol**: Streams GPS data as newline-delimited JSON over Bluetooth Serial Port Profile

### PC Side (GPS Consumer)
- **Role**: Acts as a Bluetooth RFCOMM client
- **Platform**: Linux required (uses BlueZ stack)
- **Connection**: Discovers and connects to Android's RFCOMM service
- **Display**: Shows GPS location on MapBox map in Navigation tab

## Data Format
GPS data is transmitted as JSON objects, one per line:
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 5.2,
  "bearing": 45.8,
  "timestamp": 1697654321000
}
```

## Setup Instructions

### On Android Device

1. **Install the NodeNav Android App**
   - Build and install from `NodeNav-Android` directory
   - Or use the APK if provided

2. **Grant Permissions**
   - Location (Fine/Coarse) - Required for GPS
   - Bluetooth Connect - Required for connections
   - Bluetooth Advertise - Required for making device discoverable

3. **Run the App**
   - Launch NodeNav Android app
   - You should see "Bluetooth GPS server started"
   - The app will show your current location on the map
   - Keep the app in the foreground

### On PC (Linux)

1. **Pair Your Android Device**
   ```bash
   # Make your Android device discoverable
   # Then on Linux:
   bluetoothctl
   power on
   agent on
   default-agent
   scan on
   # Wait for your device to appear, note its MAC address
   pair XX:XX:XX:XX:XX:XX
   trust XX:XX:XX:XX:XX:XX
   connect XX:XX:XX:XX:XX:XX
   exit
   ```

2. **Install Dependencies**
   ```bash
   # Python Bluetooth module (required)
   sudo apt-get update
   sudo apt-get install -y python3-bluez
   
   # Node.js dependencies
   cd NodeNav
   npm install
   ```

3. **Start the NodeNav Application**
   ```bash
   # Terminal 1: Start the backend server
   cd NodeNav/src
   node server.js
   
   # Terminal 2: Start the frontend
   cd NodeNav
   npm run dev
   ```

4. **Navigate to the App**
   - Open browser to `http://localhost:5173`
   - Go to Bluetooth Settings
   - Connect to your Android device
   - Go to Navigation tab
   - You should see "GPS Connected" indicator

## Troubleshooting

### Issue: Music works but GPS doesn't stream

**Symptoms:**
- Bluetooth audio streaming works fine
- No GPS data appears on the map
- No "GPS Connected" indicator

**Solutions:**

1. **Check Android App is Running**
   - The NodeNav Android app must be running and showing GPS data
   - Look for "Streamed: Lat=X, Lon=Y" in Android logs
   - If no GPS data shows, check location permissions

2. **Verify Bluetooth Connection Type**
   - Music uses A2DP/AVRCP profiles
   - GPS uses RFCOMM/SPP profile
   - Both can work simultaneously but are separate connections

3. **Check Service Discovery**
   ```python
   # Test script to check if GPS service is visible
   python3 test-gps-connection.py XX:XX:XX:XX:XX:XX
   ```

4. **Manual Connection Test**
   ```python
   # Use the improved connector directly
   python3 gps-connector-improved.py XX:XX:XX:XX:XX:XX
   ```
   You should see GPS JSON data printed to console

### Issue: Connection Refused

**Symptoms:**
- "Connection refused" errors in logs
- Can't connect to RFCOMM channel

**Solutions:**

1. **Restart Bluetooth on Both Devices**
   ```bash
   # On Linux
   sudo systemctl restart bluetooth
   
   # On Android
   # Toggle Bluetooth off and on in Settings
   ```

2. **Clear Pairing and Re-pair**
   ```bash
   bluetoothctl
   remove XX:XX:XX:XX:XX:XX
   # Then pair again following steps above
   ```

3. **Check Android App State**
   - Force stop and restart the Android app
   - Ensure it shows "Waiting for PC connection"

### Issue: No GPS Data on Android

**Symptoms:**
- Android app shows no location
- Map doesn't update on Android

**Solutions:**

1. **Check Location Settings**
   - Settings → Location → On
   - Use "High accuracy" mode
   - Grant location permission to NodeNav app

2. **Test GPS Outside**
   - GPS works best with clear sky view
   - Indoor testing may not work well

3. **Check MapBox Token**
   - Ensure `mapbox_access_token.xml` has valid token
   - Token should not be the placeholder value

### Issue: Windows Compatibility

**Important:** GPS streaming does NOT work on Windows due to Bluetooth stack limitations.

**Windows Limitations:**
- Windows Bluetooth API doesn't expose RFCOMM/SPP properly
- Python bluetooth module not available for Windows
- Only audio streaming (A2DP) works reliably

**Solutions for Windows Users:**

1. **Use WSL2 with Ubuntu**
   ```bash
   # In WSL2 Ubuntu
   sudo apt-get install python3-bluez
   # Follow Linux instructions above
   ```

2. **Use a Raspberry Pi**
   - Install Raspberry Pi OS
   - Follow Linux setup instructions
   - Access web interface from Windows browser

3. **Dual Boot Linux**
   - Install Ubuntu alongside Windows
   - Boot into Linux for GPS features

## Testing Tools

### 1. Bluetooth GPS Test (Windows)
```bash
python test-bluetooth-gps-windows.py
```
Shows Bluetooth status and provides setup instructions

### 2. GPS Connection Test (Linux)
```bash
python test-gps-connection.py XX:XX:XX:XX:XX:XX
```
Tests direct connection to Android GPS service

### 3. Improved GPS Connector (Linux)
```bash
python gps-connector-improved.py XX:XX:XX:XX:XX:XX
```
Enhanced connector with better service discovery

## Technical Details

### Android Implementation
- File: `BluetoothLocationStreamer.kt`
- Creates RFCOMM server socket
- Waits for incoming connections
- Streams GPS updates from MapBox location provider

### PC Implementation  
- File: `bluetooth-gps-service.js`
- Spawns Python subprocess for Bluetooth connection
- Parses incoming JSON GPS data
- Emits events for UI updates

### React UI
- File: `NavigationPage.jsx`
- Polls GPS service for location updates
- Updates MapBox map with current position
- Shows GPS connection status

## Performance Notes

- GPS updates stream at ~1Hz (once per second)
- Bluetooth latency is typically <100ms
- Map updates may lag slightly behind actual position
- Accuracy depends on phone's GPS quality

## Security Considerations

- Bluetooth pairing provides basic authentication
- GPS data is transmitted unencrypted
- Only use on trusted networks
- Consider additional security for production use

## Future Improvements

1. **Implement GPS Data Filtering**
   - Kalman filtering for smoother tracks
   - Outlier detection and removal

2. **Add Connection Resilience**
   - Automatic reconnection on disconnect
   - Connection status monitoring

3. **Windows Support**
   - Investigate Windows Bluetooth LE APIs
   - Consider alternative connection methods

4. **Data Compression**
   - Implement binary protocol for efficiency
   - Batch updates to reduce overhead

## Contact

For issues or questions about GPS streaming, please check:
- GitHub Issues in the NodeNav repository
- The ANDROID_GPS_APP_GUIDE.md for Android-specific details
- The GPS_STREAMING_IMPLEMENTATION.md for protocol details
