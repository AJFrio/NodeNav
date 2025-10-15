#!/usr/bin/env python3
"""
Improved GPS Connector for NodeNav
Connects to Android device running NodeNav GPS service over Bluetooth RFCOMM
"""

import sys
import json
import time
import signal
import traceback

try:
    import bluetooth
except ImportError:
    print("ERROR:Bluetooth module not installed. Install with: sudo apt-get install python3-bluez", file=sys.stderr)
    sys.exit(1)

# Global socket for cleanup
sock = None

def signal_handler(sig, frame):
    """Handle termination signals"""
    global sock
    if sock:
        try:
            sock.close()
        except:
            pass
    print("DISCONNECTED", file=sys.stderr, flush=True)
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def find_gps_service(address):
    """
    Find the NodeNav-GPS service on the Android device
    Returns the RFCOMM channel number or None if not found
    """
    print(f"DISCOVERING_SERVICES:{address}", file=sys.stderr, flush=True)
    
    try:
        # Search for services on the device
        services = bluetooth.find_service(address=address)
        
        for service in services:
            name = service.get("name", "")
            protocol = service.get("protocol", "")
            port = service.get("port", 0)
            service_id = service.get("service-id", "")
            
            print(f"SERVICE_FOUND:{name}|{protocol}|{port}", file=sys.stderr, flush=True)
            
            # Look for our GPS service
            if "NodeNav" in name or "GPS" in name:
                if protocol == "RFCOMM" and port:
                    print(f"GPS_SERVICE_FOUND:{name} on channel {port}", file=sys.stderr, flush=True)
                    return port
        
        # If no services found with SDP, try known SPP UUID
        # Standard Serial Port Profile UUID
        SPP_UUID = "00001101-0000-1000-8000-00805F9B34FB"
        
        print(f"TRYING_SPP_UUID", file=sys.stderr, flush=True)
        services = bluetooth.find_service(uuid=SPP_UUID, address=address)
        
        if services:
            # Use the first SPP service found
            port = services[0].get("port", 1)
            print(f"SPP_SERVICE_FOUND:Using channel {port}", file=sys.stderr, flush=True)
            return port
            
    except Exception as e:
        print(f"SERVICE_DISCOVERY_ERROR:{str(e)}", file=sys.stderr, flush=True)
    
    return None

def connect_gps(address):
    """Connect to GPS device and stream data"""
    global sock
    
    try:
        # Try to find the service first
        channel = find_gps_service(address)
        
        if not channel:
            print(f"NO_SERVICE_FOUND:Trying default channels", file=sys.stderr, flush=True)
            # Try common RFCOMM channels if service discovery fails
            channels_to_try = [1, 2, 3, 4, 5]
        else:
            channels_to_try = [channel]
        
        connected = False
        for ch in channels_to_try:
            try:
                print(f"CONNECTING:{address} channel {ch}", file=sys.stderr, flush=True)
                
                sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
                sock.settimeout(5)  # 5 second timeout for connection
                sock.connect((address, ch))
                
                print(f"CONNECTED:Channel {ch}", file=sys.stderr, flush=True)
                connected = True
                break
                
            except bluetooth.BluetoothError as e:
                error_msg = str(e)
                if "Connection refused" in error_msg:
                    print(f"CHANNEL_{ch}_REFUSED", file=sys.stderr, flush=True)
                elif "Host is down" in error_msg:
                    print(f"HOST_DOWN", file=sys.stderr, flush=True)
                    break  # No point trying other channels
                else:
                    print(f"CHANNEL_{ch}_ERROR:{error_msg}", file=sys.stderr, flush=True)
                
                if sock:
                    try:
                        sock.close()
                    except:
                        pass
                    sock = None
                    
        if not connected:
            print("CONNECTION_FAILED:Could not connect to any RFCOMM channel", file=sys.stderr, flush=True)
            sys.exit(1)
        
        # Connection successful - remove timeout for streaming
        sock.settimeout(None)
        
        # Send initial handshake/identification
        try:
            handshake = json.dumps({"type": "client", "name": "NodeNav-PC"}) + "\n"
            sock.send(handshake.encode('utf-8'))
            print("HANDSHAKE_SENT", file=sys.stderr, flush=True)
        except:
            # Handshake optional - some servers don't expect it
            pass
        
        # Start receiving data
        buffer = ""
        last_heartbeat = time.time()
        
        while True:
            try:
                # Read data in chunks
                data = sock.recv(1024)
                
                if not data:
                    print("CONNECTION_LOST:No data received", file=sys.stderr, flush=True)
                    break
                
                # Decode and add to buffer
                try:
                    decoded = data.decode('utf-8', errors='ignore')
                    buffer += decoded
                except:
                    print(f"DECODE_ERROR:Skipping malformed data", file=sys.stderr, flush=True)
                    continue
                
                # Process complete JSON lines
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    
                    if line:
                        # Validate and output JSON
                        try:
                            parsed = json.loads(line)
                            
                            # Check if it's GPS data
                            if "latitude" in parsed and "longitude" in parsed:
                                # Valid GPS data - output it
                                print(line, flush=True)
                                last_heartbeat = time.time()
                            else:
                                # Other data type - log it
                                print(f"NON_GPS_DATA:{line[:50]}", file=sys.stderr, flush=True)
                                
                        except json.JSONDecodeError:
                            print(f"PARSE_ERROR:{line[:50]}", file=sys.stderr, flush=True)
                
                # Check for connection timeout (no data for 30 seconds)
                if time.time() - last_heartbeat > 30:
                    print("TIMEOUT:No GPS data received for 30 seconds", file=sys.stderr, flush=True)
                    break
                    
            except bluetooth.BluetoothError as e:
                print(f"BT_ERROR:{str(e)}", file=sys.stderr, flush=True)
                break
            except KeyboardInterrupt:
                print("INTERRUPTED", file=sys.stderr, flush=True)
                break
            except Exception as e:
                print(f"ERROR:{str(e)}", file=sys.stderr, flush=True)
                traceback.print_exc(file=sys.stderr)
                time.sleep(0.1)
                
    except bluetooth.BluetoothError as e:
        print(f"CONNECTION_FAILED:{str(e)}", file=sys.stderr, flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"FATAL_ERROR:{str(e)}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    finally:
        if sock:
            try:
                sock.close()
            except:
                pass
        print("DISCONNECTED", file=sys.stderr, flush=True)

def main():
    """Main entry point"""
    if len(sys.argv) != 2:
        print("Usage: python3 gps-connector-improved.py <bluetooth_address>", file=sys.stderr)
        print("Example: python3 gps-connector-improved.py AA:BB:CC:DD:EE:FF", file=sys.stderr)
        sys.exit(1)
    
    address = sys.argv[1]
    
    # Validate address format
    if not all(c in "0123456789ABCDEFabcdef:" for c in address):
        print(f"ERROR:Invalid Bluetooth address format: {address}", file=sys.stderr, flush=True)
        sys.exit(1)
    
    if address.count(':') != 5:
        print(f"ERROR:Invalid Bluetooth address format: {address}", file=sys.stderr, flush=True)
        sys.exit(1)
    
    # Start connection
    connect_gps(address)

if __name__ == "__main__":
    main()