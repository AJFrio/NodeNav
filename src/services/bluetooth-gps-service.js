/**
 * Bluetooth GPS Service
 * 
 * Receives GPS location data from an Android device over Bluetooth RFCOMM.
 * The Android app streams JSON location data using the Serial Port Profile (SPP).
 * 
 * Service Name: NodeNav-GPS
 * Service UUID: 00001101-0000-1000-8000-00805F9B34FB (Standard SPP UUID)
 * Protocol: Bluetooth RFCOMM
 * 
 * Data Format: Newline-delimited JSON messages
 * {
 *   "latitude": 37.7749,
 *   "longitude": -122.4194,
 *   "accuracy": 5.2,
 *   "bearing": 45.8,
 *   "timestamp": 1697654321000
 * }
 */

const platform = process.platform;

// Platform-specific GPS service implementation
let GPSService;

if (platform === 'win32') {
  console.log('[GPS] Loading Windows Bluetooth RFCOMM implementation');
  
  // Windows implementation using bluetooth-serial-port
  class WindowsGPSService {
    constructor() {
      this.currentLocation = null;
      this.isConnected = false;
      this.deviceAddress = null;
      this.serial = null;
      this.buffer = '';
      this.listeners = [];
      
      // Try to load bluetooth-serial-port (optional dependency)
      try {
        const btSerial = require('@abandonware/bluetooth-serial-port');
        this.BluetoothSerialPort = btSerial.BluetoothSerialPort;
        this.hasBluetoothSupport = true;
        console.log('[GPS] Bluetooth serial port module loaded');
      } catch (error) {
        console.log('[GPS] Bluetooth serial port module not available. Run: npm install @abandonware/bluetooth-serial-port');
        this.hasBluetoothSupport = false;
      }
    }

    async initialize() {
      console.log('[GPS] GPS service initialized (Windows)');
      if (!this.hasBluetoothSupport) {
        console.warn('[GPS] Bluetooth support not available. Install @abandonware/bluetooth-serial-port to enable GPS streaming.');
      }
      return Promise.resolve();
    }

    async startListening(deviceAddress) {
      if (!this.hasBluetoothSupport) {
        throw new Error('Bluetooth support not available. Install @abandonware/bluetooth-serial-port package.');
      }

      if (this.isConnected) {
        console.log('[GPS] Already listening for GPS data');
        return;
      }

      this.deviceAddress = deviceAddress;
      this.serial = new this.BluetoothSerialPort();

      return new Promise((resolve, reject) => {
        // Find the GPS service channel
        this.serial.findSerialPortChannel(deviceAddress, (channel) => {
          console.log(`[GPS] Found GPS service on channel ${channel}`);
          
          // Connect to the device
          this.serial.connect(deviceAddress, channel, () => {
            console.log('[GPS] Connected to GPS service');
            this.isConnected = true;

            // Listen for incoming data
            this.serial.on('data', (data) => {
              this.handleIncomingData(data);
            });

            // Handle disconnection
            this.serial.on('closed', () => {
              console.log('[GPS] GPS connection closed');
              this.isConnected = false;
              this.deviceAddress = null;
            });

            this.serial.on('failure', (error) => {
              console.error('[GPS] Connection failure:', error);
              this.isConnected = false;
              this.deviceAddress = null;
            });

            resolve();
          }, (error) => {
            console.error('[GPS] Connection error:', error);
            reject(error);
          });
        }, () => {
          const error = new Error('Could not find GPS service on device');
          console.error('[GPS]', error.message);
          reject(error);
        });
      });
    }

    async stopListening() {
      if (this.serial && this.isConnected) {
        try {
          this.serial.close();
          console.log('[GPS] Stopped listening for GPS data');
        } catch (error) {
          console.error('[GPS] Error closing connection:', error);
        }
      }
      this.isConnected = false;
      this.deviceAddress = null;
      this.buffer = '';
    }

    handleIncomingData(data) {
      try {
        // Append to buffer
        this.buffer += data.toString('utf-8');

        // Process complete lines (newline-delimited)
        const lines = this.buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        this.buffer = lines.pop() || '';

        // Process each complete line
        for (const line of lines) {
          if (line.trim()) {
            try {
              const location = JSON.parse(line);
              this.updateLocation(location);
            } catch (parseError) {
              console.error('[GPS] Failed to parse location data:', parseError.message);
            }
          }
        }
      } catch (error) {
        console.error('[GPS] Error handling incoming data:', error);
      }
    }

    updateLocation(location) {
      // Validate location data
      if (!location.latitude || !location.longitude) {
        console.warn('[GPS] Incomplete location data received');
        return;
      }

      // Store current location
      this.currentLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || null,
        bearing: location.bearing || null,
        timestamp: location.timestamp || Date.now()
      };

      console.log(`[GPS] Location updated: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);

      // Notify listeners
      this.notifyListeners(this.currentLocation);
    }

    getCurrentLocation() {
      return this.currentLocation;
    }

    isListening() {
      return this.isConnected;
    }

    getConnectionInfo() {
      return {
        connected: this.isConnected,
        deviceAddress: this.deviceAddress,
        hasLocation: this.currentLocation !== null,
        lastUpdate: this.currentLocation?.timestamp || null
      };
    }

    // Event listener management
    addListener(callback) {
      this.listeners.push(callback);
    }

    removeListener(callback) {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    notifyListeners(location) {
      for (const callback of this.listeners) {
        try {
          callback(location);
        } catch (error) {
          console.error('[GPS] Error in listener callback:', error);
        }
      }
    }

    async cleanup() {
      await this.stopListening();
      this.listeners = [];
      console.log('[GPS] GPS service cleaned up');
    }
  }

  GPSService = WindowsGPSService;

} else if (platform === 'linux') {
  console.log('[GPS] Loading Linux Bluetooth RFCOMM implementation');
  
  // Linux implementation using Python bridge (since Node.js Bluetooth support is limited on Linux)
  class LinuxGPSService {
    constructor() {
      this.currentLocation = null;
      this.isConnected = false;
      this.deviceAddress = null;
      this.pythonProcess = null;
      this.listeners = [];
    }

    async initialize() {
      console.log('[GPS] GPS service initialized (Linux)');
      console.log('[GPS] Note: Requires pybluez package. Install with: sudo apt-get install python3-bluez');
      return Promise.resolve();
    }

    async startListening(deviceAddress) {
      if (this.isConnected) {
        console.log('[GPS] Already listening for GPS data');
        return;
      }

      const { spawn } = require('child_process');

      // Create a Python script inline to handle Bluetooth connection
      const pythonScript = `
import sys
import json
import bluetooth
import time

def connect_gps(address):
    try:
        sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        print(f"Connecting to {address}...", file=sys.stderr)
        sock.connect((address, 1))
        print("Connected!", file=sys.stderr)
        
        buffer = ""
        while True:
            try:
                data = sock.recv(1024).decode('utf-8')
                buffer += data
                
                while '\\n' in buffer:
                    line, buffer = buffer.split('\\n', 1)
                    if line.strip():
                        # Output to stdout (will be captured by Node.js)
                        print(line)
                        sys.stdout.flush()
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error receiving data: {e}", file=sys.stderr)
                time.sleep(1)
    except Exception as e:
        print(f"Connection error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        sock.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python gps_bridge.py <bluetooth_address>", file=sys.stderr)
        sys.exit(1)
    
    address = sys.argv[1]
    connect_gps(address)
`;

      // Spawn Python process
      this.pythonProcess = spawn('python3', ['-c', pythonScript, deviceAddress]);
      this.deviceAddress = deviceAddress;

      // Handle stdout (GPS data)
      this.pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const location = JSON.parse(line);
              this.updateLocation(location);
              if (!this.isConnected) {
                this.isConnected = true;
                console.log('[GPS] GPS streaming started');
              }
            } catch (error) {
              console.error('[GPS] Failed to parse location data:', error.message);
            }
          }
        }
      });

      // Handle stderr (logs)
      this.pythonProcess.stderr.on('data', (data) => {
        console.log('[GPS Python]', data.toString().trim());
      });

      // Handle process exit
      this.pythonProcess.on('close', (code) => {
        console.log(`[GPS] Python process exited with code ${code}`);
        this.isConnected = false;
        this.deviceAddress = null;
      });

      console.log('[GPS] Started GPS listener process');
    }

    async stopListening() {
      if (this.pythonProcess) {
        this.pythonProcess.kill();
        this.pythonProcess = null;
        console.log('[GPS] Stopped listening for GPS data');
      }
      this.isConnected = false;
      this.deviceAddress = null;
    }

    updateLocation(location) {
      if (!location.latitude || !location.longitude) {
        console.warn('[GPS] Incomplete location data received');
        return;
      }

      this.currentLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || null,
        bearing: location.bearing || null,
        timestamp: location.timestamp || Date.now()
      };

      console.log(`[GPS] Location updated: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
      this.notifyListeners(this.currentLocation);
    }

    getCurrentLocation() {
      return this.currentLocation;
    }

    isListening() {
      return this.isConnected;
    }

    getConnectionInfo() {
      return {
        connected: this.isConnected,
        deviceAddress: this.deviceAddress,
        hasLocation: this.currentLocation !== null,
        lastUpdate: this.currentLocation?.timestamp || null
      };
    }

    addListener(callback) {
      this.listeners.push(callback);
    }

    removeListener(callback) {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    notifyListeners(location) {
      for (const callback of this.listeners) {
        try {
          callback(location);
        } catch (error) {
          console.error('[GPS] Error in listener callback:', error);
        }
      }
    }

    async cleanup() {
      await this.stopListening();
      this.listeners = [];
      console.log('[GPS] GPS service cleaned up');
    }
  }

  GPSService = LinuxGPSService;

} else {
  console.log('[GPS] Unsupported platform, using simulation mode');
  
  // Simulation mode for development/testing
  class SimulationGPSService {
    constructor() {
      this.currentLocation = null;
      this.isConnected = false;
      this.deviceAddress = null;
      this.simulationInterval = null;
      this.listeners = [];
      
      // Simulate movement around Boulder, CO
      this.simulationCenter = { lat: 40.0150, lng: -105.2705 };
      this.simulationStep = 0;
    }

    async initialize() {
      console.log('[GPS] GPS service initialized (simulation mode)');
      return Promise.resolve();
    }

    async startListening(deviceAddress) {
      if (this.isConnected) {
        console.log('[GPS] Already listening for GPS data (simulation)');
        return;
      }

      this.deviceAddress = deviceAddress;
      this.isConnected = true;
      console.log('[GPS] Started GPS simulation');

      // Simulate GPS updates every 2 seconds
      this.simulationInterval = setInterval(() => {
        this.simulateGPSUpdate();
      }, 2000);

      // Send initial location
      this.simulateGPSUpdate();
    }

    async stopListening() {
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }
      this.isConnected = false;
      this.deviceAddress = null;
      console.log('[GPS] Stopped GPS simulation');
    }

    simulateGPSUpdate() {
      // Simulate circular movement
      const radius = 0.005; // ~500 meters
      const angle = (this.simulationStep * Math.PI * 2) / 60; // Complete circle in 60 steps (2 minutes)
      
      const location = {
        latitude: this.simulationCenter.lat + Math.sin(angle) * radius,
        longitude: this.simulationCenter.lng + Math.cos(angle) * radius,
        accuracy: 5 + Math.random() * 10, // 5-15 meters
        bearing: (this.simulationStep * 6) % 360, // Rotating bearing
        timestamp: Date.now()
      };

      this.currentLocation = location;
      this.simulationStep++;

      console.log(`[GPS Sim] Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
      this.notifyListeners(location);
    }

    getCurrentLocation() {
      return this.currentLocation;
    }

    isListening() {
      return this.isConnected;
    }

    getConnectionInfo() {
      return {
        connected: this.isConnected,
        deviceAddress: this.deviceAddress,
        hasLocation: this.currentLocation !== null,
        lastUpdate: this.currentLocation?.timestamp || null,
        simulation: true
      };
    }

    addListener(callback) {
      this.listeners.push(callback);
    }

    removeListener(callback) {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    notifyListeners(location) {
      for (const callback of this.listeners) {
        try {
          callback(location);
        } catch (error) {
          console.error('[GPS] Error in listener callback:', error);
        }
      }
    }

    async cleanup() {
      await this.stopListening();
      this.listeners = [];
      console.log('[GPS] GPS service cleaned up');
    }
  }

  GPSService = SimulationGPSService;
}

// Export singleton instance
module.exports = new GPSService();

