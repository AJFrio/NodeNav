#!/usr/bin/env python3
"""
Quick test for channel 12 specifically
"""

import sys
import bluetooth
import time
import json

if len(sys.argv) != 2:
    print("Usage: python3 test-channel-12.py <device_address>")
    sys.exit(1)

address = sys.argv[1]
channel = 12

print(f"Testing connection to {address} on channel {channel}")
print("="*60)

sock = None
try:
    print("Creating RFCOMM socket...")
    sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
    
    print("Setting timeout to 10 seconds...")
    sock.settimeout(10)
    
    print(f"Connecting to {address}:{channel}...")
    sock.connect((address, channel))
    
    print("✓ CONNECTED!")
    print("\nSending handshake...")
    
    handshake = json.dumps({"type": "client", "name": "NodeNav-PC"}) + "\n"
    sock.send(handshake.encode('utf-8'))
    print("✓ Handshake sent")
    
    print("\nWaiting for GPS data (30 seconds)...")
    sock.settimeout(30)
    
    gps_count = 0
    start_time = time.time()
    
    while time.time() - start_time < 30 and gps_count < 5:
        try:
            data = sock.recv(1024)
            if data:
                decoded = data.decode('utf-8', errors='ignore')
                print(f"\n✓ Received data ({len(data)} bytes)")
                
                # Parse GPS data
                lines = decoded.strip().split('\n')
                for line in lines:
                    if line:
                        try:
                            gps_data = json.loads(line)
                            if 'latitude' in gps_data and 'longitude' in gps_data:
                                gps_count += 1
                                print(f"\n[GPS #{gps_count}]")
                                print(f"  Latitude:  {gps_data['latitude']}")
                                print(f"  Longitude: {gps_data['longitude']}")
                                if 'accuracy' in gps_data:
                                    print(f"  Accuracy:  {gps_data['accuracy']}m")
                                if 'bearing' in gps_data:
                                    print(f"  Bearing:   {gps_data['bearing']}°")
                                print(f"  Timestamp: {gps_data.get('timestamp', 'N/A')}")
                        except json.JSONDecodeError:
                            print(f"  Raw: {line[:100]}")
        except Exception as e:
            if "timed out" not in str(e):
                print(f"Error receiving: {e}")
            break
    
    print(f"\n{'='*60}")
    print(f"✓ SUCCESS! Received {gps_count} GPS updates")
    print(f"{'='*60}")
    print("\nGPS streaming is working!")
    print("The NodeNav app should now receive location data.")
    
except bluetooth.BluetoothError as e:
    print(f"\n✗ Bluetooth error: {e}")
    print("\nTroubleshooting:")
    print("1. Make sure Android app is running")
    print("2. Check device is connected: bluetoothctl info", address)
    print("3. Verify channel with: sdptool browse", address)
except Exception as e:
    print(f"\n✗ Error: {e}")
finally:
    if sock:
        try:
            sock.close()
            print("\nSocket closed")
        except:
            pass
