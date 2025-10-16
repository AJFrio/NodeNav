#!/bin/bash
# Comprehensive Bluetooth Connection Diagnostic

if [ -z "$1" ]; then
    echo "Usage: ./diagnose-bluetooth-connection.sh <device_address>"
    exit 1
fi

ADDRESS="$1"

echo "========================================"
echo "BLUETOOTH CONNECTION DIAGNOSTIC"
echo "========================================"
echo "Device: $ADDRESS"
echo ""

echo "1. Checking Bluetooth service..."
systemctl is-active bluetooth
if [ $? -ne 0 ]; then
    echo "✗ Bluetooth service not active!"
    echo "  Fix: sudo systemctl start bluetooth"
    exit 1
fi
echo "✓ Bluetooth service is active"
echo ""

echo "2. Checking device info..."
bluetoothctl info $ADDRESS | grep -E "Name:|Paired:|Trusted:|Connected:|UUID:"
echo ""

echo "3. Checking if device is connected..."
CONNECTED=$(bluetoothctl info $ADDRESS | grep "Connected: yes")
if [ -z "$CONNECTED" ]; then
    echo "✗ Device is NOT connected"
    echo ""
    echo "Attempting to connect..."
    bluetoothctl connect $ADDRESS
    sleep 3
    
    CONNECTED=$(bluetoothctl info $ADDRESS | grep "Connected: yes")
    if [ -z "$CONNECTED" ]; then
        echo "✗ Failed to connect device"
        echo ""
        echo "Try manual connection:"
        echo "  bluetoothctl"
        echo "  disconnect $ADDRESS"
        echo "  connect $ADDRESS"
        echo "  exit"
        exit 1
    fi
fi
echo "✓ Device is connected"
echo ""

echo "4. Checking available services via SDP..."
sdptool browse $ADDRESS 2>&1 | grep -A 10 "Service Name:"
echo ""

echo "5. Looking for NodeNav-GPS service..."
NODENAV=$(sdptool browse $ADDRESS 2>&1 | grep -i "nodenav")
if [ -z "$NODENAV" ]; then
    echo "✗ NodeNav-GPS service NOT found"
    echo ""
    echo "This means:"
    echo "  1. Android app is not running"
    echo "  2. Android app failed to create RFCOMM server"
    echo "  3. Service record not being advertised"
    echo ""
    echo "ACTION REQUIRED:"
    echo "  On Android:"
    echo "  - Force stop NodeNav app"
    echo "  - Clear app cache"
    echo "  - Start app fresh"
    echo "  - Check logs: adb logcat | grep BTLocationStreamer"
else
    echo "✓ Found NodeNav-GPS service!"
    CHANNEL=$(sdptool browse $ADDRESS 2>&1 | grep -A 20 -i "nodenav" | grep "Channel:" | head -1 | awk '{print $2}')
    echo "✓ Channel: $CHANNEL"
    echo ""
    echo "6. Testing connection to channel $CHANNEL..."
    python3 - <<EOF
import bluetooth
import sys

address = "$ADDRESS"
channel = $CHANNEL

try:
    sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
    sock.settimeout(5)
    sock.connect((address, channel))
    print("✓ Successfully connected to channel $CHANNEL!")
    sock.close()
    sys.exit(0)
except Exception as e:
    print(f"✗ Connection failed: {e}")
    sys.exit(1)
EOF

    if [ $? -eq 0 ]; then
        echo ""
        echo "========================================"
        echo "✓ ALL TESTS PASSED"
        echo "========================================"
        echo "GPS connection should work!"
        echo ""
        echo "Start NodeNav server:"
        echo "  cd NodeNav/src && node server.js"
    else
        echo ""
        echo "✗ Connection test failed"
        echo "Even though service is advertised, cannot connect"
        echo ""
        echo "Try:"
        echo "  1. Restart Bluetooth on both devices"
        echo "  2. Unpair and re-pair devices"
        echo "  3. Check Android app logs"
    fi
fi

