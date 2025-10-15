#!/usr/bin/env python3
"""
Windows Bluetooth GPS Test Script
Tests Bluetooth connectivity and GPS data streaming from Android device

This script helps diagnose Bluetooth connection issues on Windows.
Note: For actual GPS streaming, you'll need to run the NodeNav app on Linux.
"""

import sys
import json
import time
import subprocess

# Check if running on Windows
if sys.platform != 'win32':
    print("This script is designed for Windows testing only.")
    print("For actual GPS streaming, use Linux with the NodeNav application.")
    sys.exit(1)

def test_bluetooth_adapter():
    """Test if Bluetooth adapter is available on Windows"""
    print("\n" + "="*60)
    print("TESTING BLUETOOTH ADAPTER")
    print("="*60)
    
    try:
        # Use PowerShell to check Bluetooth adapter
        ps_script = """
        Get-PnpDevice -Class Bluetooth | 
        Where-Object { $_.Status -eq 'OK' } |
        Select-Object FriendlyName, Status |
        ConvertTo-Json
        """
        
        result = subprocess.run(
            ['powershell', '-NoProfile', '-Command', ps_script],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout:
            devices = json.loads(result.stdout)
            if not isinstance(devices, list):
                devices = [devices] if devices else []
            
            if devices:
                print("✓ Bluetooth adapter found:")
                for device in devices[:3]:  # Show first 3 adapters
                    print(f"  - {device.get('FriendlyName', 'Unknown')}")
                return True
            else:
                print("✗ No Bluetooth adapter found")
                return False
        else:
            print("✗ Could not query Bluetooth adapters")
            return False
            
    except Exception as e:
        print(f"✗ Error checking Bluetooth adapter: {e}")
        return False

def list_paired_devices():
    """List all paired Bluetooth devices on Windows"""
    print("\n" + "="*60)
    print("PAIRED BLUETOOTH DEVICES")
    print("="*60)
    
    try:
        # Get paired Bluetooth devices
        ps_script = """
        Get-PnpDevice -Class Bluetooth | 
        Where-Object { $_.Status -ne 'Unknown' -and $_.FriendlyName -ne $null } |
        Select-Object FriendlyName, Status, InstanceId |
        ConvertTo-Json
        """
        
        result = subprocess.run(
            ['powershell', '-NoProfile', '-Command', ps_script],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout:
            devices = json.loads(result.stdout)
            if not isinstance(devices, list):
                devices = [devices] if devices else []
            
            android_devices = []
            
            for device in devices:
                name = device.get('FriendlyName', 'Unknown')
                status = device.get('Status', 'Unknown')
                
                # Filter for likely Android devices
                if any(keyword in name.lower() for keyword in ['phone', 'android', 'pixel', 'samsung', 'galaxy']):
                    android_devices.append({
                        'name': name,
                        'status': status
                    })
                    
            if android_devices:
                print("Found Android devices:")
                for i, device in enumerate(android_devices, 1):
                    status_icon = "✓" if device['status'] == 'OK' else "○"
                    print(f"  {i}. {status_icon} {device['name']} ({device['status']})")
                return android_devices
            else:
                print("No Android devices found in paired devices.")
                print("\nTo pair your Android device:")
                print("  1. On Windows: Settings → Bluetooth & devices → Add device")
                print("  2. On Android: Settings → Bluetooth → Make device visible")
                print("  3. Select your Android device from the Windows list")
                return []
        else:
            print("✗ Could not query paired devices")
            return []
            
    except Exception as e:
        print(f"✗ Error listing devices: {e}")
        return []

def check_services():
    """Check if required services are running"""
    print("\n" + "="*60)
    print("CHECKING REQUIRED SERVICES")
    print("="*60)
    
    services_to_check = [
        ('Bluetooth Support Service', 'bthserv'),
        ('Bluetooth Audio Gateway Service', 'BTAGService'),
    ]
    
    all_running = True
    
    for display_name, service_name in services_to_check:
        try:
            result = subprocess.run(
                ['sc', 'query', service_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if 'RUNNING' in result.stdout:
                print(f"✓ {display_name} is running")
            else:
                print(f"✗ {display_name} is not running")
                all_running = False
                
        except Exception as e:
            print(f"✗ Could not check {display_name}: {e}")
            all_running = False
    
    return all_running

def provide_instructions():
    """Provide setup instructions for GPS streaming"""
    print("\n" + "="*60)
    print("GPS STREAMING SETUP INSTRUCTIONS")
    print("="*60)
    
    print("""
For GPS streaming to work between your Android phone and PC:

ON YOUR ANDROID PHONE:
1. Install and run the NodeNav Android app
2. Grant all requested permissions (Location, Bluetooth)
3. The app will show "Bluetooth GPS server started"
4. Keep the app running in the foreground

ON YOUR PC (Linux required for GPS):
1. Make sure your phone is paired via Bluetooth
2. Start the NodeNav application:
   cd NodeNav
   npm run dev
   
3. In another terminal, start the backend server:
   cd NodeNav/src
   node server.js
   
4. The backend will automatically try to connect to your phone
5. Check the Navigation tab - you should see "GPS Connected"

TROUBLESHOOTING:
- Music streaming works but GPS doesn't?
  → The Android app needs to be running and showing GPS data
  → Check Android app logs for "Streamed: Lat=..." messages
  
- Can't connect at all?
  → Unpair and re-pair the devices
  → On Android: Make sure Bluetooth is on and visible
  → On PC: Restart Bluetooth service

- Using Windows?
  → GPS streaming requires Linux (Raspberry Pi, WSL2, or Linux PC)
  → Windows can only handle audio streaming, not GPS data
""")

def main():
    """Main test function"""
    print("\n" + "="*60)
    print("NODENAV BLUETOOTH GPS TEST SCRIPT")
    print("="*60)
    print("This script will help diagnose Bluetooth connectivity")
    
    # Test Bluetooth adapter
    if not test_bluetooth_adapter():
        print("\n⚠ Bluetooth adapter issue detected. Please check your Bluetooth hardware.")
        return
    
    # Check services
    if not check_services():
        print("\n⚠ Some Bluetooth services are not running.")
        print("Try: Settings → Bluetooth & devices → Turn Bluetooth on")
    
    # List paired devices
    devices = list_paired_devices()
    
    if not devices:
        print("\n⚠ No Android devices paired.")
        print("Please pair your Android phone first.")
    
    # Provide instructions
    provide_instructions()
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)
    
    if sys.platform == 'win32':
        print("\n⚠ IMPORTANT: You're on Windows.")
        print("GPS streaming requires Linux. Consider using:")
        print("  - WSL2 with Ubuntu")
        print("  - A Raspberry Pi")
        print("  - A dedicated Linux PC")

if __name__ == "__main__":
    main()
