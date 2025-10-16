#!/bin/bash
# Step-by-step Bluetooth connection fix

if [ -z "$1" ]; then
    echo "Usage: ./FIX_CONNECTION_STEP_BY_STEP.sh <device_address>"
    echo "Example: ./FIX_CONNECTION_STEP_BY_STEP.sh 64:9D:38:33:1E:D1"
    exit 1
fi

ADDRESS="$1"

echo "=========================================="
echo "BLUETOOTH CONNECTION RECOVERY PROCESS"
echo "=========================================="
echo ""

read -p "Step 1: Have you FORCE STOPPED the Android app? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please force stop the NodeNav app on Android:"
    echo "  Settings → Apps → NodeNav → Force Stop"
    exit 1
fi

read -p "Step 2: Turn OFF Bluetooth on Android? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please turn OFF Bluetooth on Android"
    exit 1
fi

echo ""
echo "Step 3: Resetting Linux Bluetooth..."
sudo systemctl restart bluetooth
sudo hciconfig hci0 reset
sleep 2
echo "✓ Linux Bluetooth reset"

echo ""
echo "Step 4: Removing device pairing..."
bluetoothctl remove $ADDRESS
sleep 1
echo "✓ Device unpaired"

echo ""
echo "Step 5: Starting device scan..."
bluetoothctl scan on &
SCAN_PID=$!
sleep 2

echo ""
read -p "Step 6: Turn ON Bluetooth on Android now, then press Enter..."

echo ""
echo "Waiting for device to appear (20 seconds)..."
sleep 5

echo ""
echo "Step 7: Pairing with device..."
bluetoothctl pair $ADDRESS
sleep 2

echo ""
echo "Step 8: Trusting device..."
bluetoothctl trust $ADDRESS
sleep 1

echo ""
echo "Step 9: Connecting to device..."
bluetoothctl connect $ADDRESS
sleep 3

# Stop scanning
kill $SCAN_PID 2>/dev/null
bluetoothctl scan off

echo ""
echo "Step 10: Verifying connection..."
CONNECTED=$(bluetoothctl info $ADDRESS | grep "Connected: yes")
if [ -z "$CONNECTED" ]; then
    echo "✗ Device did not connect"
    echo ""
    echo "Manual pairing required:"
    echo "  bluetoothctl"
    echo "  scan on"
    echo "  # Wait for device to appear"
    echo "  pair $ADDRESS"
    echo "  trust $ADDRESS"
    echo "  connect $ADDRESS"
    exit 1
fi

echo "✓ Device connected!"
echo ""

read -p "Step 11: START the NodeNav Android app now, then press Enter..."

echo ""
echo "Waiting for app to start (5 seconds)..."
sleep 5

echo ""
echo "Step 12: Checking for NodeNav-GPS service..."
sdptool browse $ADDRESS > /tmp/sdp_browse.txt 2>&1

if grep -qi "nodenav" /tmp/sdp_browse.txt; then
    echo "✓ NodeNav-GPS service found!"
    
    CHANNEL=$(grep -A 20 -i "nodenav" /tmp/sdp_browse.txt | grep "Channel:" | head -1 | awk '{print $2}')
    echo "✓ RFCOMM Channel: $CHANNEL"
    
    echo ""
    echo "=========================================="
    echo "✓ SUCCESS!"
    echo "=========================================="
    echo ""
    echo "GPS service is available on channel $CHANNEL"
    echo ""
    echo "Test the connection:"
    echo "  python3 test-channel-$CHANNEL.py $ADDRESS"
    echo ""
    echo "Or start the NodeNav server:"
    echo "  cd NodeNav/src && node server.js"
    
else
    echo "✗ NodeNav-GPS service NOT found"
    echo ""
    echo "Discovered services:"
    cat /tmp/sdp_browse.txt
    echo ""
    echo "TROUBLESHOOTING:"
    echo ""
    echo "1. Check Android app logs:"
    echo "   adb logcat -c"
    echo "   adb logcat | grep -E 'BTLocationStreamer|Bluetooth'"
    echo ""
    echo "2. Look for these messages:"
    echo "   - 'Created INSECURE RFCOMM server socket successfully'"
    echo "   - 'RFCOMM server socket using channel: X'"
    echo "   - 'Waiting for PC connection...'"
    echo ""
    echo "3. If you see errors, the Android app may not have permissions"
    echo ""
    echo "4. Check permissions on Android:"
    echo "   Settings → Apps → NodeNav → Permissions"
    echo "   - Location: Allow"
    echo "   - Nearby devices: Allow"
    echo ""
    echo "5. Try making Android discoverable:"
    echo "   Settings → Bluetooth → Make visible"
fi

