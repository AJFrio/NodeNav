# Fix GPS Connection Issues - Step by Step

## The Problem
You're getting "File descriptor in bad state" errors when trying to connect to the Android GPS service. This indicates the Bluetooth connection at the transport level is not properly established.

## Quick Diagnosis

Run this on your Linux machine:
```bash
# 1. Check if device is actually connected
bluetoothctl info 64:9D:38:33:1E:D1

# Look for "Connected: yes"
```

## Step-by-Step Fix

### Step 1: Reset Bluetooth on Both Devices

**On Linux PC:**
```bash
# Reset Bluetooth service
sudo systemctl restart bluetooth

# Reset Bluetooth adapter
sudo hciconfig hci0 reset
```

**On Android:**
1. Settings → Bluetooth → Turn OFF
2. Wait 5 seconds  
3. Turn Bluetooth back ON

### Step 2: Remove and Re-pair Devices

**On Linux PC:**
```bash
bluetoothctl

# Inside bluetoothctl:
remove 64:9D:38:33:1E:D1
scan on
# Wait for your device to appear
pair 64:9D:38:33:1E:D1
# Enter PIN/confirm pairing on both devices
trust 64:9D:38:33:1E:D1
connect 64:9D:38:33:1E:D1
# Should see "Connection successful"
exit
```

### Step 3: Verify Android App is Ready

**On Android:**
1. Force stop the NodeNav app
2. Clear app data/cache if needed
3. Launch NodeNav app fresh
4. Grant all permissions
5. **IMPORTANT**: You should see in the app:
   - "Bluetooth GPS server started successfully"
   - "Waiting for PC connection..."
   - Your location on the map

### Step 4: Test Direct Connection

**On Linux PC:**
```bash
# Run the simple test first
python3 simple-rfcomm-test.py 64:9D:38:33:1E:D1

# If that works, run the debug tool
python3 debug-bluetooth-linux.py 64:9D:38:33:1E:D1
```

### Step 5: Alternative Connection Method

If the above doesn't work, try using `rfcomm` directly:

```bash
# Create RFCOMM device binding
sudo rfcomm bind /dev/rfcomm0 64:9D:38:33:1E:D1 1

# Check if it worked
ls -la /dev/rfcomm0

# Test reading from it
cat /dev/rfcomm0

# If you see JSON data, it's working!
# Release when done
sudo rfcomm release /dev/rfcomm0
```

### Step 6: If Still Not Working

The "File descriptor in bad state" error specifically suggests the Bluetooth connection is established at the pairing level but not at the transport level. This can happen when:

1. **The Android app isn't actually creating the RFCOMM server**
   - Check Android logcat for errors:
   ```bash
   adb logcat | grep -E "BTLocationStreamer|Bluetooth"
   ```

2. **SELinux or permissions blocking the connection**
   - On Android, try:
   ```bash
   adb shell
   su
   setenforce 0  # Temporarily disable SELinux
   ```

3. **Bluetooth profiles conflict**
   - Disconnect audio first:
   ```bash
   bluetoothctl disconnect 64:9D:38:33:1E:D1
   # Wait 5 seconds
   bluetoothctl connect 64:9D:38:33:1E:D1
   ```

## Working Configuration Checklist

✅ **Android Side:**
- [ ] NodeNav app running in foreground
- [ ] Shows "Bluetooth GPS server started"
- [ ] Shows current GPS location on map
- [ ] Bluetooth is ON and visible
- [ ] Device is paired with Linux PC

✅ **Linux Side:**
- [ ] Bluetooth service active: `systemctl status bluetooth`
- [ ] RFCOMM module loaded: `lsmod | grep rfcomm`
- [ ] Device paired: `bluetoothctl paired-devices`
- [ ] Device connected: `bluetoothctl info <address>` shows "Connected: yes"
- [ ] Python bluetooth installed: `python3 -c "import bluetooth"`

## Nuclear Option - Full Reset

If nothing else works:

**On Android:**
1. Settings → Apps → NodeNav → Storage → Clear Data
2. Settings → Bluetooth → Forget all devices
3. Restart phone

**On Linux:**
```bash
# Complete Bluetooth reset
sudo systemctl stop bluetooth
sudo rm -rf /var/lib/bluetooth/*
sudo systemctl start bluetooth

# Re-pair everything from scratch
```

## Expected Success Output

When it's working, you should see:

**In NodeNav backend logs:**
```
[GPS] Using improved GPS connector
[GPS Python] DISCOVERING_SERVICES:64:9D:38:33:1E:D1
[GPS Python] GPS_SERVICE_FOUND:NodeNav-GPS on channel 1
[GPS Python] CONNECTED:Channel 1
[GPS Python] HANDSHAKE_SENT
[GPS] ✓ Connected to GPS device
```

**In Navigation tab:**
- "GPS Connected" indicator (green)
- Your location marker on the map
- Map centers on your location

## Still Having Issues?

The core problem is that the Android RFCOMM server isn't accessible from Linux. This could be:

1. **Android 12+ Bluetooth permission issue** - The app might not have BLUETOOTH_CONNECT permission at runtime
2. **Bluetooth stack incompatibility** - Some Android devices have quirky Bluetooth implementations
3. **Power saving** - Android might be killing the Bluetooth server. Disable battery optimization for NodeNav

Try running the Android app with USB debugging and check logcat for any Bluetooth errors:
```bash
adb logcat -c  # Clear log
# Start Android app
adb logcat | tee android-bluetooth.log
# Check the log for errors
```

Share the android-bluetooth.log file if you need further help!
