# Android GPS App Configuration Guide

## The Problem
The "File descriptor in bad state" (Errno 77) error indicates that while your phone is connected via Bluetooth, the GPS streaming service isn't accessible. This typically means:

1. **No GPS app is running** on your Android device
2. **Wrong GPS app** - not all GPS apps support Bluetooth streaming
3. **App misconfiguration** - the app isn't set up for Bluetooth SPP/RFCOMM
4. **App crashed** or isn't streaming properly

## Current Situation
Your phone (Pixel 10) shows a service called "NodeNav-GPS" on port 17, but it's not accepting connections. This suggests either:
- You have a GPS app installed that created this service but it's not running
- The service was created but the app crashed
- The app needs to be reconfigured

## Recommended Android GPS Apps

### Option 1: **Share GPS** (Recommended)
- **Download**: [Google Play Store](https://play.google.com/store/apps/details?id=com.jillybunch.shareGPS)
- **Why**: Simple, reliable, specifically designed for GPS sharing
- **Setup**:
  1. Install and open the app
  2. Go to Settings → Connection Method → **Bluetooth**
  3. Enable "Start on Boot" (optional)
  4. Tap "Start Sharing"
  5. You should see "Sharing via Bluetooth" status

### Option 2: **GPS over BT**
- **Download**: Search "GPS over BT" on Play Store
- **Setup**:
  1. Open app and grant location permissions
  2. Select "Bluetooth SPP" as output
  3. Tap Start/Connect
  4. Status should show "Streaming..."

### Option 3: **Bluetooth GPS Output**
- **Download**: Search "Bluetooth GPS Output" on Play Store
- **Setup**:
  1. Set Output to "Bluetooth SPP"
  2. Format: NMEA or JSON
  3. Enable "Auto-start on Bluetooth connection"

### Option 4: **Mock GPS** (For developers)
- If you're developing your own GPS app
- Enable Developer Options → Mock Location App
- Select your GPS app as mock location provider

## Android App Configuration

### Required Settings:
1. **Connection Type**: Bluetooth SPP (Serial Port Profile)
2. **Output Format**: JSON or NMEA
3. **Port**: Usually auto-assigned (often 1-5 or 17)
4. **Permissions**: 
   - Location (Fine/Precise)
   - Bluetooth
   - Bluetooth Admin
   - Nearby Devices (Android 12+)

### Android Phone Settings:
1. **Location**: Must be ON and set to High Accuracy
2. **Bluetooth**: ON and paired with your Linux device
3. **Battery Optimization**: Disable for GPS app
   - Settings → Apps → [GPS App] → Battery → Unrestricted
4. **Developer Options** (if available):
   - Disable "Bluetooth HCI snoop log"
   - Keep "Stay awake" ON while testing

## Testing Your Setup

### 1. Verify GPS App is Running:
On your phone, the GPS app should show:
- "Streaming active" or similar status
- GPS fix acquired (latitude/longitude shown)
- Bluetooth connection established

### 2. Test from Linux:
```bash
# First, check what services your phone offers:
python3 /home/aj/Documents/Github/NodeNav/test-gps-connection.py [YOUR_PHONE_ADDRESS]

# If a GPS service is found, test it:
python3 /home/aj/Documents/Github/NodeNav/simple-gps-test.py [YOUR_PHONE_ADDRESS] [PORT]
```

### 3. If Still Getting "File descriptor in bad state":
This error specifically means the socket can't connect. Try:

```bash
# Complete reset sequence:
# 1. On phone: Force stop GPS app
# 2. On Linux:
bluetoothctl disconnect [PHONE_ADDRESS]
sudo systemctl restart bluetooth

# 3. On phone: 
# - Toggle Bluetooth OFF then ON
# - Start GPS app fresh
# - Wait for "GPS fix acquired"

# 4. On Linux:
bluetoothctl connect [PHONE_ADDRESS]
# Wait 5 seconds for services to register

# 5. Test connection:
python3 /home/aj/Documents/Github/NodeNav/simple-gps-test.py [PHONE_ADDRESS] 1
```

## Alternative: Web-based GPS (No Bluetooth needed)

If Bluetooth GPS continues to fail, consider:
1. **GPS Logger** apps that send data over WiFi/Internet
2. **GPSD** network streaming
3. **Custom web app** using phone's browser geolocation API

## Creating Your Own Android GPS App

If existing apps don't work, you can create a simple GPS streamer:

```kotlin
// Basic Android GPS Bluetooth Streamer
class GPSStreamerService : Service() {
    private lateinit var bluetoothAdapter: BluetoothAdapter
    private var serverSocket: BluetoothServerSocket? = null
    private val uuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB") // SPP UUID
    
    override fun onCreate() {
        // Start Bluetooth server
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
        serverSocket = bluetoothAdapter.listenUsingRfcommWithServiceRecord(
            "NodeNav-GPS", uuid
        )
        
        // Accept connections in background thread
        thread {
            val socket = serverSocket?.accept() // Blocks until connected
            socket?.let { streamGPSData(it) }
        }
    }
    
    private fun streamGPSData(socket: BluetoothSocket) {
        val outputStream = socket.outputStream
        locationManager.requestLocationUpdates(
            LocationManager.GPS_PROVIDER, 
            1000L, 0f
        ) { location ->
            val json = """
                {"latitude":${location.latitude},
                 "longitude":${location.longitude},
                 "accuracy":${location.accuracy},
                 "timestamp":${location.time}}
            """.trimIndent()
            outputStream.write("$json\n".toByteArray())
        }
    }
}
```

## Debugging Commands

```bash
# See all Bluetooth services on phone:
sdptool browse [PHONE_ADDRESS]

# Monitor Bluetooth traffic:
sudo btmon

# Check system logs:
journalctl -u bluetooth -f

# Test with bluetoothctl:
bluetoothctl
> info [PHONE_ADDRESS]
> menu gatt
> list-attributes [PHONE_ADDRESS]
```

## Contact & Support

If you continue having issues:
1. Check which GPS app created the "NodeNav-GPS" service
2. Try a different GPS app from the recommended list
3. The issue might be phone-specific (some phones have restrictive Bluetooth policies)
4. Consider using WiFi-based GPS streaming instead of Bluetooth
