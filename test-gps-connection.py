#!/usr/bin/env python3
"""
Test GPS Bluetooth Connection
This script helps diagnose and fix Bluetooth GPS connection issues
"""

import sys
import bluetooth
import subprocess
import time

def check_bluetooth_status():
    """Check if Bluetooth service is running"""
    try:
        result = subprocess.run(['systemctl', 'is-active', 'bluetooth'], 
                              capture_output=True, text=True)
        if result.stdout.strip() != 'active':
            print("❌ Bluetooth service is not running")
            print("   Run: sudo systemctl start bluetooth")
            return False
        print("✓ Bluetooth service is running")
        return True
    except Exception as e:
        print(f"⚠️  Could not check Bluetooth service: {e}")
        return True

def find_device_services(address):
    """Find available services on the device"""
    print(f"\n🔍 Scanning services on {address}...")
    try:
        services = bluetooth.find_service(address=address)
        if not services:
            print("   No services found. Device might not be offering SPP/RFCOMM")
            return None
            
        print(f"   Found {len(services)} services:")
        spp_channel = None
        
        for svc in services:
            port = svc.get("port", "Unknown")
            name = svc.get("name", "Unknown")
            service_id = svc.get("service-id", "Unknown")
            
            print(f"   - Port {port}: {name}")
            
            # Look for SPP (Serial Port Profile) or GPS-related services
            if name and any(x in name.lower() for x in ['spp', 'serial', 'gps', 'location', 'nodenav']):
                spp_channel = port
                print(f"     ⭐ Likely GPS service on port {port}")
                
        return spp_channel
    except Exception as e:
        print(f"   Error scanning services: {e}")
        return None

def test_connection(address, port=1):
    """Test connection to the device"""
    print(f"\n📡 Testing connection to {address} on port {port}...")
    
    sock = None
    try:
        # Create socket
        sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        sock.settimeout(10)
        
        print(f"   Connecting to port {port}...")
        sock.connect((address, port))
        
        print("   ✓ Connection successful!")
        
        # Try to read some data
        print("   Waiting for data (5 seconds)...")
        sock.settimeout(5)
        
        try:
            data = sock.recv(1024)
            if data:
                decoded = data.decode('utf-8', errors='ignore')
                print(f"   ✓ Received data: {decoded[:100]}...")
            else:
                print("   ⚠️  No data received")
        except Exception as e:
            print(f"   ⚠️  No data received: {e}")
            
        return True
        
    except bluetooth.BluetoothError as e:
        error_str = str(e)
        print(f"   ❌ Connection failed: {error_str}")
        
        # Provide specific troubleshooting
        if "Permission denied" in error_str:
            print("\n   Fix: Add yourself to bluetooth group:")
            print("   sudo usermod -a -G bluetooth $USER")
            print("   Then log out and back in")
            
        elif "Host is down" in error_str:
            print("\n   Fix: Device is disconnected or out of range")
            print("   1. Check device is paired: bluetoothctl paired-devices")
            print("   2. Connect device: bluetoothctl connect " + address)
            
        elif "Connection refused" in error_str:
            print("\n   Fix: The service is not available on this port")
            print("   The Android app might not be running or using a different port")
            
        elif "File descriptor in bad state" in error_str:
            print("\n   Fix: Socket is in an invalid state")
            print("   1. Kill any existing GPS connections:")
            print("      pkill -f 'python.*gps'")
            print("   2. Reset Bluetooth adapter:")
            print("      sudo systemctl restart bluetooth")
            print("   3. On your phone, toggle Bluetooth off and on")
            
        return False
        
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False
        
    finally:
        if sock:
            try:
                sock.close()
            except:
                pass

def check_existing_connections():
    """Check for existing RFCOMM connections"""
    print("\n🔗 Checking existing RFCOMM connections...")
    try:
        result = subprocess.run(['rfcomm', '-a'], capture_output=True, text=True)
        if result.stdout.strip():
            print(f"   Found connections:\n{result.stdout}")
            return True
        else:
            print("   No existing RFCOMM connections")
            return False
    except FileNotFoundError:
        print("   rfcomm command not found (install bluez-utils)")
        return False
    except Exception as e:
        print(f"   Could not check: {e}")
        return False

def release_rfcomm(device="/dev/rfcomm0"):
    """Release an RFCOMM device"""
    try:
        subprocess.run(['sudo', 'rfcomm', 'release', device], 
                      capture_output=True, check=False)
        print(f"   Released {device}")
    except Exception as e:
        print(f"   Could not release {device}: {e}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 test-gps-connection.py <BLUETOOTH_ADDRESS>")
        print("Example: python3 test-gps-connection.py 64:9D:38:33:1E:D1")
        sys.exit(1)
    
    address = sys.argv[1]
    
    print("═" * 60)
    print("  GPS Bluetooth Connection Diagnostic Tool")
    print("═" * 60)
    
    # Check Bluetooth service
    if not check_bluetooth_status():
        sys.exit(1)
    
    # Check for existing connections that might block
    if check_existing_connections():
        print("   ⚠️  Existing connections might interfere")
        print("   Consider releasing them with: sudo rfcomm release all")
    
    # Find available services
    suggested_port = find_device_services(address)
    
    # Test connection
    if suggested_port:
        print(f"\n📌 Suggested port from service discovery: {suggested_port}")
        success = test_connection(address, suggested_port)
    else:
        # Try common ports
        print("\n🔄 Trying common RFCOMM ports...")
        for port in [1, 2, 3, 4, 5]:
            if test_connection(address, port):
                print(f"\n✅ SUCCESS! Use port {port} for GPS connection")
                break
            time.sleep(1)  # Brief pause between attempts
    
    print("\n" + "═" * 60)
    print("\nAdditional troubleshooting steps:")
    print("1. Ensure the Android GPS app is running and showing 'Streaming...'")
    print("2. Check phone's Bluetooth settings - device should be 'Connected'")
    print("3. Try unpairing and re-pairing the device")
    print("4. On phone: Settings > Developer Options > Disable 'Bluetooth HCI snoop log'")
    print("5. Some phones need: Settings > Bluetooth > Advanced > Accept all files")

if __name__ == "__main__":
    main()
