#!/usr/bin/env python3
"""
Alternative GPS Connector using subprocess and rfcomm tool
This bypasses Python bluetooth module issues
"""

import sys
import subprocess
import json
import time
import threading
import os
import signal

class RfcommGPSConnector:
    def __init__(self, address):
        self.address = address
        self.rfcomm_device = None
        self.process = None
        self.running = False
        
    def find_free_rfcomm(self):
        """Find a free rfcomm device number"""
        for i in range(10):
            if not os.path.exists(f"/dev/rfcomm{i}"):
                return i
        return 0
    
    def connect(self):
        """Connect using rfcomm command-line tool"""
        rfcomm_num = self.find_free_rfcomm()
        self.rfcomm_device = f"/dev/rfcomm{rfcomm_num}"
        
        print(f"CONNECTING:{self.address}", file=sys.stderr, flush=True)
        
        # Try different channels
        for channel in [1, 2, 3, 4, 5]:
            print(f"TRYING_CHANNEL:{channel}", file=sys.stderr, flush=True)
            
            # First, release any existing binding
            try:
                subprocess.run(
                    ['sudo', 'rfcomm', 'release', str(rfcomm_num)],
                    capture_output=True,
                    timeout=2
                )
            except:
                pass
            
            # Try to bind rfcomm device
            try:
                result = subprocess.run(
                    ['sudo', 'rfcomm', 'bind', str(rfcomm_num), self.address, str(channel)],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    # Check if device was created
                    time.sleep(1)
                    if os.path.exists(self.rfcomm_device):
                        print(f"CONNECTED:Channel {channel} via {self.rfcomm_device}", file=sys.stderr, flush=True)
                        return True
                    else:
                        print(f"CHANNEL_{channel}_FAILED:Device not created", file=sys.stderr, flush=True)
                else:
                    error = result.stderr if result.stderr else "Unknown error"
                    print(f"CHANNEL_{channel}_ERROR:{error}", file=sys.stderr, flush=True)
                    
            except subprocess.TimeoutExpired:
                print(f"CHANNEL_{channel}_TIMEOUT", file=sys.stderr, flush=True)
            except Exception as e:
                print(f"CHANNEL_{channel}_ERROR:{str(e)}", file=sys.stderr, flush=True)
        
        return False
    
    def stream_data(self):
        """Read GPS data from rfcomm device"""
        if not self.rfcomm_device or not os.path.exists(self.rfcomm_device):
            print("ERROR:No rfcomm device available", file=sys.stderr, flush=True)
            return
        
        print(f"STREAMING:Reading from {self.rfcomm_device}", file=sys.stderr, flush=True)
        
        try:
            # Open the device file for reading
            with open(self.rfcomm_device, 'rb') as device:
                buffer = b""
                while self.running:
                    try:
                        # Read data from device
                        data = device.read(1024)
                        if not data:
                            print("CONNECTION_LOST:No data received", file=sys.stderr, flush=True)
                            break
                        
                        buffer += data
                        
                        # Process complete lines
                        while b'\n' in buffer:
                            line, buffer = buffer.split(b'\n', 1)
                            try:
                                line_str = line.decode('utf-8', errors='ignore').strip()
                                if line_str:
                                    # Validate JSON
                                    json.loads(line_str)
                                    # Output valid GPS data
                                    print(line_str, flush=True)
                            except json.JSONDecodeError:
                                print(f"PARSE_ERROR:Invalid JSON", file=sys.stderr, flush=True)
                            except Exception as e:
                                print(f"ERROR:{str(e)}", file=sys.stderr, flush=True)
                                
                    except IOError as e:
                        if e.errno == 11:  # Resource temporarily unavailable
                            time.sleep(0.1)
                            continue
                        else:
                            print(f"IO_ERROR:{str(e)}", file=sys.stderr, flush=True)
                            break
                    except Exception as e:
                        print(f"READ_ERROR:{str(e)}", file=sys.stderr, flush=True)
                        time.sleep(0.1)
                        
        except Exception as e:
            print(f"FATAL_ERROR:{str(e)}", file=sys.stderr, flush=True)
        finally:
            print("DISCONNECTED", file=sys.stderr, flush=True)
    
    def cleanup(self):
        """Clean up rfcomm device"""
        self.running = False
        if self.rfcomm_device:
            rfcomm_num = self.rfcomm_device.replace("/dev/rfcomm", "")
            try:
                subprocess.run(
                    ['sudo', 'rfcomm', 'release', rfcomm_num],
                    capture_output=True,
                    timeout=2
                )
                print(f"CLEANUP:Released {self.rfcomm_device}", file=sys.stderr, flush=True)
            except:
                pass

def signal_handler(signum, frame):
    """Handle termination signals"""
    print("SIGNAL:Shutting down", file=sys.stderr, flush=True)
    sys.exit(0)

def main():
    if len(sys.argv) != 2:
        print("ERROR:Usage: python3 alternative-gps-connector.py <address>", file=sys.stderr, flush=True)
        sys.exit(1)
    
    address = sys.argv[1]
    
    # Validate address format
    if not all(c in "0123456789ABCDEFabcdef:" for c in address):
        print(f"ERROR:Invalid address format: {address}", file=sys.stderr, flush=True)
        sys.exit(1)
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create connector
    connector = RfcommGPSConnector(address)
    
    try:
        # Try to connect
        if connector.connect():
            connector.running = True
            # Start streaming data
            connector.stream_data()
        else:
            print("CONNECTION_FAILED:Could not establish rfcomm connection", file=sys.stderr, flush=True)
            sys.exit(1)
    finally:
        connector.cleanup()

if __name__ == "__main__":
    # Check if running with sudo (required for rfcomm)
    if os.geteuid() != 0:
        print("WARNING:This script needs sudo for rfcomm. Trying to elevate...", file=sys.stderr, flush=True)
        # Re-run with sudo
        import sys
        os.execvp("sudo", ["sudo", "python3"] + sys.argv)
    
    main()
