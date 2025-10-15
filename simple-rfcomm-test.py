#!/usr/bin/env python3
"""
Simple RFCOMM Connection Test
Minimal script to test if Android GPS server is accessible
"""

import sys
import bluetooth
import time

if len(sys.argv) != 2:
    print("Usage: python3 simple-rfcomm-test.py <device_address>")
    print("Example: python3 simple-rfcomm-test.py 64:9D:38:33:1E:D1")
    sys.exit(1)

address = sys.argv[1]
print(f"Testing connection to {address}")

# Test each channel with a fresh socket
for channel in range(1, 11):  # Test channels 1-10
    print(f"\nTrying channel {channel}...")
    
    sock = None
    try:
        # Create new socket
        sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        sock.settimeout(3)
        
        # Try to connect
        sock.connect((address, channel))
        
        print(f"✓ SUCCESS! Connected on channel {channel}")
        
        # Try to read some data
        sock.settimeout(2)
        try:
            data = sock.recv(1024)
            if data:
                print(f"Received: {data[:100]}")
        except:
            print("No immediate data (normal if GPS not ready)")
        
        sock.close()
        print(f"\nChannel {channel} works! Use this for GPS connection.")
        sys.exit(0)
        
    except Exception as e:
        error = str(e)
        if "Connection refused" in error:
            print(f"  Channel {channel}: Connection refused (no service)")
        elif "Host is down" in error:
            print(f"  Channel {channel}: Host is down")
            print("\n✗ Device is not reachable. Try:")
            print("  1. bluetoothctl connect", address)
            print("  2. Check Bluetooth is enabled on Android")
            break
        elif "File descriptor in bad state" in error:
            print(f"  Channel {channel}: Bad file descriptor")
        elif "timed out" in error:
            print(f"  Channel {channel}: Connection timeout")
        else:
            print(f"  Channel {channel}: {error}")
    finally:
        if sock:
            try:
                sock.close()
            except:
                pass
    
    time.sleep(0.2)  # Brief pause between attempts

print("\n✗ Could not connect to any channel")
print("\nTroubleshooting:")
print("1. Make sure Android app is running and shows 'Bluetooth GPS server started'")
print("2. Try: bluetoothctl")
print(f"   remove {address}")
print(f"   scan on")
print(f"   pair {address}")
print(f"   trust {address}") 
print(f"   connect {address}")
print("3. Restart Bluetooth: sudo systemctl restart bluetooth")
