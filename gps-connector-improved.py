#!/usr/bin/env python3
"""
Improved GPS Bluetooth Connector
Handles connection issues more robustly
"""

import sys
import json
import bluetooth
import time
import signal
import subprocess
import os

# Global socket for cleanup
sock = None

def signal_handler(sig, frame):
    """Handle termination signals"""
    cleanup_socket()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def cleanup_socket():
    """Properly cleanup the socket"""
    global sock
    if sock:
        try:
            sock.close()
            print("SOCKET_CLOSED", file=sys.stderr, flush=True)
        except:
            pass
        sock = None

def release_existing_connections(address):
    """Release any existing RFCOMM connections to this device"""
    try:
        # Check for existing connections
        result = subprocess.run(['rfcomm', '-a'], 
                              capture_output=True, text=True, timeout=2)
        
        if address.upper() in result.stdout.upper():
            print(f"RELEASING_EXISTING:{address}", file=sys.stderr, flush=True)
            # Try to release all RFCOMM devices
            subprocess.run(['sudo', 'rfcomm', 'release', 'all'], 
                         capture_output=True, timeout=2)
            time.sleep(1)  # Give time for cleanup
    except Exception as e:
        # Not critical if this fails
        pass

def find_best_channel(address, quick=False):
    """Find the best RFCOMM channel for the device"""
    try:
        if not quick:
            print(f"SCANNING_SERVICES:{address}", file=sys.stderr, flush=True)
            services = bluetooth.find_service(address=address)
            
            for svc in services:
                port = svc.get("port")
                name = svc.get("name")
                
                # Skip if name is None
                if not name:
                    continue
                    
                name_lower = name.lower()
                
                # Look for GPS/SPP services
                if port and any(x in name_lower for x in ['spp', 'serial', 'gps', 'location', 'nodenav']):
                    print(f"FOUND_SERVICE:port={port},name={name}", 
                          file=sys.stderr, flush=True)
                    return port
        
        # Default to channel 1 (standard SPP)
        return 1
        
    except Exception as e:
        print(f"SERVICE_SCAN_ERROR:{str(e)}", file=sys.stderr, flush=True)
        return 1

def reset_bluetooth_for_device(address):
    """Reset Bluetooth connection for specific device"""
    try:
        # Disconnect device if connected
        subprocess.run(['bluetoothctl', 'disconnect', address], 
                      capture_output=True, timeout=3)
        time.sleep(1)
        
        # Reconnect
        subprocess.run(['bluetoothctl', 'connect', address], 
                      capture_output=True, timeout=5)
        time.sleep(2)
        
        print(f"BLUETOOTH_RESET:{address}", file=sys.stderr, flush=True)
        return True
    except Exception as e:
        print(f"RESET_ERROR:{str(e)}", file=sys.stderr, flush=True)
        return False

def connect_with_retry(address, channel, max_retries=3):
    """Try to connect with retries and recovery"""
    global sock
    
    for attempt in range(max_retries):
        try:
            # Cleanup any existing socket
            cleanup_socket()
            
            # Create new socket
            sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
            
            # Set timeout for connection
            sock.settimeout(10)
            
            print(f"CONNECT_ATTEMPT:{attempt+1}/{max_retries},channel={channel}", 
                  file=sys.stderr, flush=True)
            
            # Try to connect
            sock.connect((address, channel))
            
            # Connection successful
            print("CONNECTED", file=sys.stderr, flush=True)
            
            # Remove timeout for data streaming
            sock.settimeout(None)
            
            return True
            
        except bluetooth.BluetoothError as e:
            error_str = str(e)
            print(f"CONNECT_ERROR:{error_str}", file=sys.stderr, flush=True)
            
            # Handle specific errors
            if "[Errno 77]" in error_str or "File descriptor" in error_str:
                # Socket in bad state - need cleanup
                cleanup_socket()
                
                if attempt == 0:
                    # First attempt - try releasing existing connections
                    release_existing_connections(address)
                elif attempt == 1:
                    # Second attempt - try resetting Bluetooth
                    reset_bluetooth_for_device(address)
                    time.sleep(2)
                    
            elif "[Errno 112]" in error_str or "Host is down" in error_str:
                # Device disconnected - try to reconnect at system level
                reset_bluetooth_for_device(address)
                
            elif "[Errno 111]" in error_str or "Connection refused" in error_str:
                # Wrong channel or service not available
                if attempt == 0 and channel == 1:
                    # Try to find the correct channel
                    new_channel = find_best_channel(address, quick=True)
                    if new_channel != channel:
                        channel = new_channel
                        print(f"TRYING_CHANNEL:{channel}", file=sys.stderr, flush=True)
                
            # Wait before retry
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"RETRY_WAIT:{wait_time}s", file=sys.stderr, flush=True)
                time.sleep(wait_time)
        
        except Exception as e:
            print(f"UNEXPECTED_ERROR:{str(e)}", file=sys.stderr, flush=True)
            cleanup_socket()
            time.sleep(2)
    
    return False

def stream_gps_data():
    """Stream GPS data from the connected socket"""
    global sock
    
    if not sock:
        return
    
    buffer = ""
    last_data_time = time.time()
    
    while True:
        try:
            # Check for timeout (no data for 30 seconds)
            if time.time() - last_data_time > 30:
                print("DATA_TIMEOUT", file=sys.stderr, flush=True)
                break
            
            # Set a short timeout to check periodically
            sock.settimeout(1.0)
            
            try:
                # Read data in chunks
                data = sock.recv(1024).decode('utf-8', errors='ignore')
                
                if not data:
                    print("CONNECTION_LOST", file=sys.stderr, flush=True)
                    break
                
                last_data_time = time.time()
                buffer += data
                
                # Process complete JSON lines
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    
                    if line:
                        # Validate JSON before sending
                        try:
                            parsed = json.loads(line)
                            # Add timestamp if missing
                            if 'timestamp' not in parsed:
                                parsed['timestamp'] = int(time.time() * 1000)
                            print(json.dumps(parsed), flush=True)
                        except json.JSONDecodeError:
                            print(f"PARSE_ERROR:{line[:50]}", file=sys.stderr, flush=True)
                            
            except bluetooth.btcommon.BluetoothError as e:
                if "timed out" in str(e).lower():
                    # Timeout is expected, continue
                    continue
                else:
                    raise
                    
        except bluetooth.BluetoothError as e:
            print(f"BT_ERROR:{str(e)}", file=sys.stderr, flush=True)
            break
        except Exception as e:
            print(f"STREAM_ERROR:{str(e)}", file=sys.stderr, flush=True)
            time.sleep(0.1)

def main(address):
    """Main connection logic"""
    try:
        # Find best channel
        channel = find_best_channel(address, quick=False)
        
        # Try to connect with discovered channel
        if connect_with_retry(address, channel):
            # Stream data
            stream_gps_data()
        else:
            # If that fails, try common GPS ports
            print(f"TRYING_COMMON_PORTS", file=sys.stderr, flush=True)
            common_ports = [17, 1, 2, 3, 4, 5]  # 17 is common for GPS services
            
            for port in common_ports:
                if port == channel:
                    continue  # Already tried
                    
                print(f"TRYING_PORT:{port}", file=sys.stderr, flush=True)
                cleanup_socket()  # Clean up before each attempt
                
                if connect_with_retry(address, port, max_retries=1):
                    # Stream data
                    stream_gps_data()
                    return
                    
                time.sleep(1)
            
            print(f"CONNECTION_FAILED:Could not establish connection on any port", 
                  file=sys.stderr, flush=True)
            sys.exit(1)
            
    except Exception as e:
        print(f"FATAL_ERROR:{str(e)}", file=sys.stderr, flush=True)
        sys.exit(1)
    finally:
        cleanup_socket()
        print("DISCONNECTED", file=sys.stderr, flush=True)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("ERROR:Invalid arguments", file=sys.stderr, flush=True)
        sys.exit(1)
    
    address = sys.argv[1]
    main(address)
