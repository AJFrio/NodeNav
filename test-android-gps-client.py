#!/usr/bin/env python3
"""
Test Android GPS Server Connection
This script connects as a CLIENT to the Android RFCOMM SERVER
"""

import sys
import bluetooth
import time
import json

def test_insecure_connection(address):
    """Try connecting without authentication (insecure)"""
    print(f"\nTesting INSECURE connection to {address}")
    print("="*50)
    
    # Standard SPP UUID - must match Android app
    SPP_UUID = "00001101-0000-1000-8000-00805F9B34FB"
    
    # First, try to discover the service
    print("Searching for GPS service...")
    try:
        services = bluetooth.find_service(uuid=SPP_UUID, address=address)
        if services:
            print(f"Found {len(services)} SPP service(s)")
            for svc in services:
                print(f"  Service: {svc.get('name', 'Unknown')} on port {svc.get('port', '?')}")
                if svc.get('port'):
                    # Try to connect to this specific port
                    test_channel(address, svc.get('port'))
        else:
            print("No SPP services found via SDP")
    except Exception as e:
        print(f"Service discovery failed: {e}")
    
    # Try common RFCOMM channels regardless
    print("\nTrying standard RFCOMM channels...")
    for channel in [1, 2, 3, 4, 5]:
        if test_channel(address, channel):
            return True
    
    return False

def test_channel(address, channel):
    """Test a specific RFCOMM channel"""
    print(f"\nChannel {channel}:")
    sock = None
    
    try:
        # Create socket
        sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        sock.settimeout(10)
        
        print(f"  Connecting to {address}:{channel}...")
        sock.connect((address, channel))
        
        print(f"  ✓ Connected successfully!")
        
        # Send a hello message
        hello = json.dumps({
            "type": "client",
            "name": "NodeNav-PC-Test",
            "timestamp": time.time()
        }) + "\n"
        
        sock.send(hello.encode('utf-8'))
        print(f"  ✓ Sent handshake")
        
        # Try to receive GPS data
        print(f"  Waiting for GPS data (10 seconds)...")
        sock.settimeout(10)
        
        start_time = time.time()
        data_received = False
        
        while time.time() - start_time < 10:
            try:
                data = sock.recv(1024)
                if data:
                    decoded = data.decode('utf-8', errors='ignore')
                    print(f"  ✓ Received: {decoded[:100]}")
                    
                    # Try to parse as JSON
                    try:
                        lines = decoded.strip().split('\n')
                        for line in lines:
                            if line:
                                gps_data = json.loads(line)
                                if 'latitude' in gps_data and 'longitude' in gps_data:
                                    print(f"  ✓ GPS Data: Lat={gps_data['latitude']}, Lon={gps_data['longitude']}")
                                    data_received = True
                                    break
                    except json.JSONDecodeError:
                        pass
                    
                    if data_received:
                        break
            except socket.timeout:
                continue
            except Exception as e:
                print(f"  Error reading data: {e}")
                break
        
        if not data_received:
            print(f"  ⚠ Connected but no GPS data received")
            print(f"     Make sure Android app is getting location updates")
        
        return True
        
    except bluetooth.BluetoothError as e:
        error_str = str(e)
        if "Connection refused" in error_str:
            print(f"  ✗ Connection refused (no service on this channel)")
        elif "Host is down" in error_str:
            print(f"  ✗ Host is down (device not reachable)")
            return False  # No point trying other channels
        elif "File descriptor in bad state" in error_str:
            print(f"  ✗ Bad file descriptor (Bluetooth stack issue)")
        elif "Permission denied" in error_str:
            print(f"  ✗ Permission denied")
        elif "timed out" in error_str:
            print(f"  ✗ Connection timeout")
        else:
            print(f"  ✗ {error_str}")
        return False
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False
        
    finally:
        if sock:
            try:
                sock.close()
            except:
                pass

def check_bluetooth_state(address):
    """Check the Bluetooth connection state"""
    print(f"\nChecking Bluetooth state for {address}")
    print("="*50)
    
    import subprocess
    
    try:
        # Check with bluetoothctl
        result = subprocess.run(
            ['bluetoothctl', 'info', address],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            output = result.stdout
            
            # Parse key information
            if 'Device' in output:
                print("✓ Device found in bluetoothctl")
            
            if 'Name:' in output:
                for line in output.split('\n'):
                    if 'Name:' in line:
                        print(f"  {line.strip()}")
            
            if 'Paired: yes' in output:
                print("✓ Device is paired")
            else:
                print("✗ Device is NOT paired")
                print("  Run: bluetoothctl pair", address)
                return False
            
            if 'Trusted: yes' in output:
                print("✓ Device is trusted")
            else:
                print("⚠ Device is NOT trusted")
                print("  Run: bluetoothctl trust", address)
            
            if 'Connected: yes' in output:
                print("✓ Device shows as connected")
            else:
                print("✗ Device is NOT connected")
                print("  Run: bluetoothctl connect", address)
                return False
                
            return True
        else:
            print("✗ Device not found in bluetoothctl")
            return False
            
    except Exception as e:
        print(f"Could not check device state: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 test-android-gps-client.py <device_address>")
        print("Example: python3 test-android-gps-client.py AA:BB:CC:DD:EE:FF")
        sys.exit(1)
    
    address = sys.argv[1].upper()
    
    print("\n" + "="*50)
    print("ANDROID GPS SERVER CONNECTION TEST")
    print("="*50)
    print(f"Target device: {address}")
    
    # Check Bluetooth state first
    if not check_bluetooth_state(address):
        print("\n⚠ Fix Bluetooth pairing/connection first!")
        sys.exit(1)
    
    # Test connection
    print("\n" + "="*50)
    print("TESTING RFCOMM CONNECTION")
    print("="*50)
    
    success = test_insecure_connection(address)
    
    if success:
        print("\n" + "="*50)
        print("✓ SUCCESS!")
        print("="*50)
        print("GPS connection is working!")
        print("\nThe NodeNav app should now be able to receive GPS data.")
    else:
        print("\n" + "="*50)
        print("✗ CONNECTION FAILED")
        print("="*50)
        print("\nTroubleshooting steps:")
        print("1. On Android: Make sure NodeNav app is running")
        print("   - Should show 'Bluetooth GPS server started'")
        print("   - Should show your location on the map")
        print("\n2. Check Android logs:")
        print("   adb logcat | grep -E 'BTLocation|Bluetooth'")
        print("\n3. Try making Android discoverable:")
        print("   - Android Settings → Bluetooth → Make visible")
        print("\n4. Reset and re-pair:")
        print("   bluetoothctl")
        print(f"   remove {address}")
        print(f"   scan on")
        print(f"   pair {address}")
        print(f"   trust {address}")
        print(f"   connect {address}")
        print("\n5. On Android, try:")
        print("   - Force stop NodeNav app")
        print("   - Clear app data")
        print("   - Disable battery optimization for NodeNav")
        print("   - Restart phone")

if __name__ == "__main__":
    main()
