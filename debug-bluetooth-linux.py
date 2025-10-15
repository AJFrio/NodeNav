#!/usr/bin/env python3
"""
Debug Bluetooth Connection Issues on Linux
This script helps diagnose why GPS connection is failing
"""

import sys
import time
import subprocess
import json

try:
    import bluetooth
except ImportError:
    print("ERROR: Python bluetooth module not installed")
    print("Install with: sudo apt-get install python3-bluez")
    sys.exit(1)

def check_bluetooth_status():
    """Check if Bluetooth service is running"""
    print("\n" + "="*60)
    print("CHECKING BLUETOOTH STATUS")
    print("="*60)
    
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', 'bluetooth'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.stdout.strip() == 'active':
            print("✓ Bluetooth service is active")
            return True
        else:
            print("✗ Bluetooth service is not active")
            print("  Run: sudo systemctl start bluetooth")
            return False
    except Exception as e:
        print(f"✗ Could not check Bluetooth service: {e}")
        return False

def check_rfcomm_support():
    """Check if RFCOMM module is loaded"""
    print("\n" + "="*60)
    print("CHECKING RFCOMM SUPPORT")
    print("="*60)
    
    try:
        result = subprocess.run(
            ['lsmod'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if 'rfcomm' in result.stdout.lower():
            print("✓ RFCOMM kernel module is loaded")
            return True
        else:
            print("⚠ RFCOMM module not loaded")
            print("  Loading RFCOMM module...")
            try:
                subprocess.run(['sudo', 'modprobe', 'rfcomm'], check=True)
                print("✓ RFCOMM module loaded successfully")
                return True
            except:
                print("✗ Failed to load RFCOMM module")
                return False
    except Exception as e:
        print(f"✗ Could not check RFCOMM module: {e}")
        return False

def list_paired_devices():
    """List paired devices using bluetoothctl"""
    print("\n" + "="*60)
    print("PAIRED DEVICES")
    print("="*60)
    
    try:
        result = subprocess.run(
            ['bluetoothctl', 'paired-devices'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            devices = []
            for line in lines:
                if 'Device' in line:
                    parts = line.split(' ', 2)
                    if len(parts) >= 3:
                        addr = parts[1]
                        name = parts[2] if len(parts) > 2 else 'Unknown'
                        devices.append((addr, name))
                        print(f"  {addr} - {name}")
            return devices
        else:
            print("✗ Could not list paired devices")
            return []
    except Exception as e:
        print(f"✗ Error listing devices: {e}")
        return []

def check_device_connection(address):
    """Check if device is connected"""
    print(f"\n" + "="*60)
    print(f"CHECKING CONNECTION STATUS: {address}")
    print("="*60)
    
    try:
        result = subprocess.run(
            ['bluetoothctl', 'info', address],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            output = result.stdout
            
            # Parse connection status
            if 'Connected: yes' in output:
                print(f"✓ Device is connected")
                
                # Check for UUIDs
                if 'UUID: Serial Port' in output or '00001101-0000-1000-8000' in output:
                    print(f"✓ Serial Port Profile (SPP) is available")
                else:
                    print(f"⚠ Serial Port Profile (SPP) not found in UUIDs")
                    
                return True
            else:
                print(f"✗ Device is not connected")
                print(f"  Connect with: bluetoothctl connect {address}")
                return False
        else:
            print(f"✗ Could not get device info")
            return False
    except Exception as e:
        print(f"✗ Error checking device: {e}")
        return False

def test_service_discovery(address):
    """Test Bluetooth service discovery"""
    print(f"\n" + "="*60)
    print(f"SERVICE DISCOVERY: {address}")
    print("="*60)
    
    try:
        print("Discovering services (this may take 10-20 seconds)...")
        services = bluetooth.find_service(address=address)
        
        if not services:
            print("✗ No services found")
            print("\nTrying alternative discovery methods...")
            
            # Try with SPP UUID
            SPP_UUID = "00001101-0000-1000-8000-00805F9B34FB"
            services = bluetooth.find_service(uuid=SPP_UUID, address=address)
            
            if services:
                print(f"✓ Found {len(services)} SPP service(s)")
        else:
            print(f"✓ Found {len(services)} service(s)")
        
        for i, service in enumerate(services, 1):
            print(f"\nService {i}:")
            print(f"  Name: {service.get('name', 'Unknown')}")
            print(f"  Protocol: {service.get('protocol', 'Unknown')}")
            print(f"  Port/Channel: {service.get('port', 'Unknown')}")
            print(f"  Service ID: {service.get('service-id', 'Unknown')}")
            print(f"  Host: {service.get('host', 'Unknown')}")
            
        return services
    except Exception as e:
        print(f"✗ Service discovery failed: {e}")
        return []

def test_rfcomm_connection(address, channel):
    """Test RFCOMM connection to specific channel"""
    print(f"\n" + "="*60)
    print(f"TESTING RFCOMM CONNECTION: {address} Channel {channel}")
    print("="*60)
    
    sock = None
    try:
        print(f"Creating RFCOMM socket...")
        sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        
        print(f"Setting timeout to 10 seconds...")
        sock.settimeout(10)
        
        print(f"Attempting connection to {address} on channel {channel}...")
        sock.connect((address, channel))
        
        print(f"✓ Successfully connected to channel {channel}")
        
        # Try to send a test message
        try:
            test_msg = json.dumps({"type": "ping", "timestamp": time.time()}) + "\n"
            sock.send(test_msg.encode('utf-8'))
            print(f"✓ Sent test message")
            
            # Try to receive data (with short timeout)
            sock.settimeout(2)
            data = sock.recv(1024)
            if data:
                print(f"✓ Received data: {data[:100]}")
        except Exception as e:
            print(f"⚠ Could not exchange data: {e}")
        
        return True
        
    except bluetooth.BluetoothError as e:
        error_msg = str(e)
        print(f"✗ Connection failed: {error_msg}")
        
        # Provide specific guidance based on error
        if "Connection refused" in error_msg:
            print("\nPossible causes:")
            print("  1. Android app is not running")
            print("  2. Android app is not accepting connections")
            print("  3. Wrong RFCOMM channel")
        elif "Host is down" in error_msg:
            print("\nDevice appears to be disconnected or out of range")
        elif "File descriptor in bad state" in error_msg:
            print("\nBluetooth socket issue. Try:")
            print("  1. Restart Bluetooth: sudo systemctl restart bluetooth")
            print("  2. Re-pair the device")
        elif "Permission denied" in error_msg:
            print("\nPermission issue. Try running with sudo")
            
        return False
        
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False
        
    finally:
        if sock:
            try:
                sock.close()
                print("Socket closed")
            except:
                pass

def suggest_fixes(address):
    """Suggest fixes based on diagnostic results"""
    print(f"\n" + "="*60)
    print("SUGGESTED FIXES")
    print("="*60)
    
    print("""
1. RESTART BLUETOOTH SERVICE:
   sudo systemctl restart bluetooth
   
2. RE-PAIR THE DEVICE:
   bluetoothctl
   remove {0}
   scan on
   # Wait for device to appear
   pair {0}
   trust {0}
   connect {0}
   exit
   
3. CHECK ANDROID APP:
   - Ensure NodeNav Android app is running
   - Check it shows "Bluetooth GPS server started"
   - Keep the app in foreground
   - Try force-stopping and restarting the app
   
4. TEST MANUAL CONNECTION:
   sudo rfcomm connect hci0 {0} 1
   # This creates /dev/rfcomm0 if successful
   
5. CHECK PERMISSIONS:
   - Add your user to dialout group:
     sudo usermod -a -G dialout $USER
   - Logout and login again
   
6. RESET BLUETOOTH STACK:
   sudo rfkill unblock bluetooth
   sudo hciconfig hci0 reset
   sudo systemctl restart bluetooth
""".format(address))

def main():
    """Main diagnostic function"""
    print("\n" + "="*60)
    print("BLUETOOTH GPS DIAGNOSTIC TOOL")
    print("="*60)
    
    if len(sys.argv) < 2:
        print("\nUsage: python3 debug-bluetooth-linux.py <device_address>")
        print("Example: python3 debug-bluetooth-linux.py 64:9D:38:33:1E:D1")
        
        # List paired devices to help
        devices = list_paired_devices()
        if devices:
            print("\nYou can use one of these addresses:")
            for addr, name in devices:
                print(f"  python3 debug-bluetooth-linux.py {addr}")
        sys.exit(1)
    
    address = sys.argv[1].upper()
    
    # Run diagnostics
    bt_ok = check_bluetooth_status()
    rfcomm_ok = check_rfcomm_support()
    
    if not bt_ok:
        print("\n⚠ Fix Bluetooth service first")
        sys.exit(1)
    
    # Check device connection
    connected = check_device_connection(address)
    
    if not connected:
        print(f"\n⚠ Device {address} is not connected")
        print("Attempting to connect...")
        try:
            subprocess.run(['bluetoothctl', 'connect', address], timeout=10)
            time.sleep(2)
            connected = check_device_connection(address)
        except:
            pass
    
    # Try service discovery
    services = test_service_discovery(address)
    
    # Determine channels to test
    channels_to_test = []
    if services:
        for service in services:
            if service.get('protocol') == 'RFCOMM':
                port = service.get('port')
                if port and port not in channels_to_test:
                    channels_to_test.append(port)
    
    # Add default channels if none found
    if not channels_to_test:
        print("\nNo RFCOMM services found, will test default channels")
        channels_to_test = [1, 2, 3, 4, 5]
    
    # Test RFCOMM connections
    success = False
    for channel in channels_to_test:
        if test_rfcomm_connection(address, channel):
            success = True
            print(f"\n✓ RFCOMM channel {channel} is working!")
            print(f"The Android app should use this channel.")
            break
    
    if not success:
        print("\n✗ Could not connect to any RFCOMM channel")
        suggest_fixes(address)
    else:
        print("\n" + "="*60)
        print("DIAGNOSIS COMPLETE")
        print("="*60)
        print("\nConnection test successful!")
        print("The GPS streaming should work with the NodeNav app.")
        print("\nIf GPS still doesn't work:")
        print("1. Check the Android app is streaming GPS data")
        print("2. Check the React app Navigation tab")
        print("3. Look for 'GPS Connected' indicator")

if __name__ == "__main__":
    main()
