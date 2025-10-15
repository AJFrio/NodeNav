#!/usr/bin/env python3
"""
Simple GPS connection test - minimal code to isolate the issue
"""
import sys
import bluetooth
import time

def test_direct_connection(address, port):
    """Test the simplest possible connection"""
    print(f"Testing direct connection to {address} on port {port}")
    
    sock = None
    try:
        # Create a fresh socket
        sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        
        # Connect with a longer timeout
        print(f"Attempting to connect...")
        sock.settimeout(15)
        sock.connect((address, port))
        
        print("✅ SUCCESS! Connected to GPS service")
        print("Waiting for data (10 seconds)...")
        
        # Try to receive data
        sock.settimeout(10)
        try:
            data = sock.recv(1024)
            if data:
                print(f"Received: {data.decode('utf-8', errors='ignore')[:100]}")
            else:
                print("No data received but connection is OK")
        except:
            print("No data received (timeout) but connection was successful")
            
        return True
        
    except bluetooth.BluetoothError as e:
        print(f"❌ Bluetooth Error: {e}")
        
        # Check errno
        if hasattr(e, 'errno'):
            print(f"Error number: {e.errno}")
            
        return False
        
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False
        
    finally:
        if sock:
            try:
                sock.close()
                print("Socket closed")
            except:
                pass

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 simple-gps-test.py <ADDRESS> [PORT]")
        print("Example: python3 simple-gps-test.py 64:9D:38:33:1E:D1 17")
        sys.exit(1)
    
    address = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 17
    
    print(f"Simple GPS Connection Test")
    print(f"Address: {address}")
    print(f"Port: {port}")
    print("-" * 40)
    
    # Test connection
    success = test_direct_connection(address, port)
    
    if not success:
        print("\nTroubleshooting:")
        print("1. Is the GPS app running on your phone?")
        print("2. Does it show 'Streaming' or 'Connected' status?")
        print("3. Try force-stopping the GPS app and restarting it")
        print("4. Try toggling Bluetooth off/on on the phone")
        print("5. The app might be using a different protocol (not RFCOMM/SPP)")
        
        # Try to check if device is actually connected
        print("\nChecking device connection status...")
        try:
            import subprocess
            result = subprocess.run(['bluetoothctl', 'info', address], 
                                  capture_output=True, text=True, timeout=3)
            if 'Connected: yes' in result.stdout:
                print("✓ Device is connected at system level")
            else:
                print("✗ Device is NOT connected at system level")
                print("Run: bluetoothctl connect " + address)
        except:
            pass

if __name__ == "__main__":
    main()
