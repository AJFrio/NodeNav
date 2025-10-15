/**
 * Bluetooth GPS Service - Linux Optimized
 * 
 * Receives GPS location data from an Android device over Bluetooth RFCOMM.
 * Optimized for Linux with BlueZ stack using Python bridge.
 * 
 * Service Name: NodeNav-GPS
 * Service UUID: 00001101-0000-1000-8000-00805F9B34FB (Standard SPP UUID)
 * Protocol: Bluetooth RFCOMM (Serial Port Profile)
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

const { spawn } = require('child_process');
const EventEmitter = require('events');

class BluetoothGPSService extends EventEmitter {
  constructor() {
    super();
    
    // State
    this.currentLocation = null;
    this.isConnected = false;
    this.deviceAddress = null;
    this.pythonProcess = null;
    
    // Statistics
    this.stats = {
      totalUpdates: 0,
      lastUpdateTime: null,
      connectionTime: null,
      errors: 0,
      parseErrors: 0
    };
    
    // Buffering for incomplete JSON
    this.dataBuffer = '';
    
    // Reconnection handling
    this.reconnectTimer = null;
    this.autoReconnect = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    console.log('[GPS] Linux Bluetooth GPS service initialized');
  }

  /**
   * Initialize the GPS service
   */
  async initialize() {
    console.log('[GPS] Initializing GPS service...');
    
    // Skip checks on Windows (development environment)
    if (process.platform === 'win32') {
      console.log('[GPS] ⚠️  Running on Windows - GPS service requires Linux for operation');
      console.log('[GPS] Please test on a Linux system (Raspberry Pi, WSL2, or Linux PC)');
      return Promise.resolve();
    }
    
    // Verify Python 3 is installed
    try {
      await new Promise((resolve, reject) => {
        const pythonCheck = spawn('python3', ['--version']);
        pythonCheck.on('error', (error) => {
          reject(new Error('Python3 not found'));
        });
        pythonCheck.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Python3 check failed'));
          }
        });
      });
      console.log('[GPS] ✓ Python3 found');
    } catch (error) {
      console.error('[GPS] ✗ Python3 not found');
      console.error('[GPS] Install with: sudo apt-get install python3');
      return Promise.resolve();
    }
    
    // Verify python3-bluez is installed
    try {
      await new Promise((resolve, reject) => {
        const bluetoothCheck = spawn('python3', ['-c', 'import bluetooth; print("OK")']);
        let hasModule = false;
        
        bluetoothCheck.stdout.on('data', (data) => {
          if (data.toString().includes('OK')) {
            hasModule = true;
          }
        });
        
        bluetoothCheck.stderr.on('data', (data) => {
          const error = data.toString();
          if (error.includes('No module named') && error.includes('bluetooth')) {
            reject(new Error('Bluetooth module not found'));
          }
        });
        
        bluetoothCheck.on('close', (code) => {
          if (hasModule) {
            resolve();
          } else {
            reject(new Error('Bluetooth module check failed'));
          }
        });
      });
      console.log('[GPS] ✓ Python bluetooth module found');
    } catch (error) {
      console.error('[GPS] ✗ Python bluetooth module not installed');
      console.error('[GPS] ═══════════════════════════════════════════════════');
      console.error('[GPS] To install, run the following commands:');
      console.error('[GPS]   sudo apt-get update');
      console.error('[GPS]   sudo apt-get install -y python3-bluez');
      console.error('[GPS] ═══════════════════════════════════════════════════');
      return Promise.resolve();
    }
    
    console.log('[GPS] ✓ GPS service ready for connections');
    return Promise.resolve();
  }

  /**
   * Start listening for GPS data from a Bluetooth device
   * @param {string} deviceAddress - Bluetooth MAC address (XX:XX:XX:XX:XX:XX)
   * @param {boolean} autoReconnect - Automatically reconnect on disconnect
   */
  async startListening(deviceAddress, autoReconnect = true) {
    if (this.isConnected) {
      console.log('[GPS] Already connected to GPS device');
      return;
    }

    if (!deviceAddress || !/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(deviceAddress)) {
      throw new Error('Invalid Bluetooth address format. Expected: XX:XX:XX:XX:XX:XX');
    }

    this.deviceAddress = deviceAddress;
    this.autoReconnect = autoReconnect;
    this.reconnectAttempts = 0;
    
    console.log(`[GPS] Connecting to GPS device: ${deviceAddress}`);
    
    return this._connect();
  }

  /**
   * Internal connection method
   */
  _connect() {
    return new Promise((resolve, reject) => {
      // Python script for Bluetooth RFCOMM connection
      const pythonScript = `
import sys
import json
import bluetooth
import time
import signal

# Global socket for cleanup
sock = None

def signal_handler(sig, frame):
    """Handle termination signals"""
    if sock:
        try:
            sock.close()
        except:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def connect_gps(address):
    """Connect to GPS device and stream data"""
    global sock
    
    try:
        sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        
        # Set socket timeout for better responsiveness
        sock.settimeout(10)
        
        print(f"CONNECTING:{address}", file=sys.stderr, flush=True)
        sock.connect((address, 1))
        
        # Connection successful
        print("CONNECTED", file=sys.stderr, flush=True)
        
        # Remove timeout for data streaming
        sock.settimeout(None)
        
        buffer = ""
        while True:
            try:
                # Read data in chunks
                data = sock.recv(1024).decode('utf-8', errors='ignore')
                
                if not data:
                    print("CONNECTION_LOST", file=sys.stderr, flush=True)
                    break
                
                buffer += data
                
                # Process complete JSON lines
                while '\\n' in buffer:
                    line, buffer = buffer.split('\\n', 1)
                    line = line.strip()
                    
                    if line:
                        # Validate JSON before sending
                        try:
                            json.loads(line)
                            print(line, flush=True)
                        except json.JSONDecodeError:
                            print(f"PARSE_ERROR:{line[:50]}", file=sys.stderr, flush=True)
                        
            except bluetooth.BluetoothError as e:
                print(f"BT_ERROR:{str(e)}", file=sys.stderr, flush=True)
                break
            except Exception as e:
                print(f"ERROR:{str(e)}", file=sys.stderr, flush=True)
                time.sleep(0.1)
                
    except bluetooth.BluetoothError as e:
        print(f"CONNECTION_FAILED:{str(e)}", file=sys.stderr, flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"FATAL_ERROR:{str(e)}", file=sys.stderr, flush=True)
        sys.exit(1)
    finally:
        if sock:
            try:
                sock.close()
            except:
                pass
        print("DISCONNECTED", file=sys.stderr, flush=True)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("ERROR:Invalid arguments", file=sys.stderr, flush=True)
        sys.exit(1)
    
    address = sys.argv[1]
    connect_gps(address)
`;

      // Spawn Python process
      this.pythonProcess = spawn('python3', ['-u', '-c', pythonScript, this.deviceAddress]);
      
      let connectionResolved = false;

      // Handle GPS data (stdout)
      this.pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const location = JSON.parse(line);
            this._updateLocation(location);
            
            // Resolve promise on first successful data
            if (!connectionResolved) {
              connectionResolved = true;
              resolve();
            }
          } catch (error) {
            this.stats.parseErrors++;
            console.error('[GPS] Failed to parse location data:', error.message);
          }
        }
      });

      // Handle Python messages (stderr)
      this.pythonProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        
        // Parse structured messages
        if (message.startsWith('CONNECTING:')) {
          const address = message.split(':')[1];
          console.log(`[GPS] Connecting to ${address}...`);
        } 
        else if (message === 'CONNECTED') {
          console.log('[GPS] ✓ Connected to GPS device');
          this.isConnected = true;
          this.stats.connectionTime = Date.now();
          this.reconnectAttempts = 0;
          this.emit('connected', { deviceAddress: this.deviceAddress });
        }
        else if (message === 'CONNECTION_LOST') {
          console.warn('[GPS] Connection lost to GPS device');
          this._handleDisconnect();
        }
        else if (message === 'DISCONNECTED') {
          console.log('[GPS] Disconnected from GPS device');
          this._handleDisconnect();
        }
        else if (message.startsWith('CONNECTION_FAILED:')) {
          const reason = message.split(':').slice(1).join(':');
          console.error(`[GPS] Connection failed: ${reason}`);
          this.stats.errors++;
          
          if (!connectionResolved) {
            connectionResolved = true;
            reject(new Error(`Connection failed: ${reason}`));
          }
          
          this._handleDisconnect();
        }
        else if (message.startsWith('BT_ERROR:')) {
          const error = message.split(':').slice(1).join(':');
          console.error(`[GPS] Bluetooth error: ${error}`);
          this.stats.errors++;
        }
        else if (message.startsWith('PARSE_ERROR:')) {
          const snippet = message.split(':')[1];
          console.warn(`[GPS] Parse error in received data: ${snippet}...`);
          this.stats.parseErrors++;
        }
        else if (message.startsWith('ERROR:') || message.startsWith('FATAL_ERROR:')) {
          const error = message.split(':').slice(1).join(':');
          console.error(`[GPS] Error: ${error}`);
          this.stats.errors++;
        }
        else {
          // Other Python output
          console.log(`[GPS Python] ${message}`);
        }
      });

      // Handle process exit
      this.pythonProcess.on('close', (code) => {
        console.log(`[GPS] Python process exited with code ${code}`);
        this._handleDisconnect();
        
        if (!connectionResolved) {
          connectionResolved = true;
          reject(new Error(`Connection process exited with code ${code}`));
        }
      });

      this.pythonProcess.on('error', (error) => {
        console.error('[GPS] Failed to start Python process:', error.message);
        console.error('[GPS] Make sure python3 and python3-bluez are installed');
        
        if (!connectionResolved) {
          connectionResolved = true;
          reject(error);
        }
      });

      // Timeout for connection
      setTimeout(() => {
        if (!connectionResolved) {
          connectionResolved = true;
          reject(new Error('Connection timeout after 30 seconds'));
          this.stopListening();
        }
      }, 30000);
    });
  }

  /**
   * Handle disconnection and auto-reconnect
   */
  _handleDisconnect() {
    const wasConnected = this.isConnected;
    
    this.isConnected = false;
    
    if (wasConnected) {
      this.emit('disconnected', {
        deviceAddress: this.deviceAddress,
        stats: this.getStats()
      });
    }
    
    // Auto-reconnect if enabled
    if (this.autoReconnect && this.deviceAddress && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff
      
      console.log(`[GPS] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
      
      this.reconnectTimer = setTimeout(() => {
        if (this.deviceAddress) {
          this._connect().catch((error) => {
            console.error('[GPS] Reconnection failed:', error.message);
          });
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[GPS] Max reconnection attempts reached. Call startListening() to try again.');
      this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
    }
  }

  /**
   * Update current location
   */
  _updateLocation(location) {
    // Validate location data
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      console.warn('[GPS] Invalid location data received');
      return;
    }

    // Validate coordinates
    if (location.latitude < -90 || location.latitude > 90 || 
        location.longitude < -180 || location.longitude > 180) {
      console.warn('[GPS] Coordinates out of range');
      return;
    }

    // Store location
    this.currentLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy || null,
      bearing: location.bearing !== undefined ? location.bearing : null,
      timestamp: location.timestamp || Date.now()
    };

    // Update statistics
    this.stats.totalUpdates++;
    this.stats.lastUpdateTime = Date.now();

    // Log (throttled to every 5 updates to reduce noise)
    if (this.stats.totalUpdates % 5 === 0) {
      console.log(`[GPS] Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} ` +
                  `(${this.stats.totalUpdates} updates)`);
    }

    // Emit event
    this.emit('location', this.currentLocation);
  }

  /**
   * Stop listening for GPS data
   */
  async stopListening() {
    console.log('[GPS] Stopping GPS listener...');
    
    // Clear auto-reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.autoReconnect = false;
    
    // Kill Python process
    if (this.pythonProcess) {
      try {
        this.pythonProcess.kill('SIGTERM');
        
        // Force kill after 2 seconds if still alive
        setTimeout(() => {
          if (this.pythonProcess && !this.pythonProcess.killed) {
            this.pythonProcess.kill('SIGKILL');
          }
        }, 2000);
      } catch (error) {
        console.error('[GPS] Error stopping Python process:', error.message);
      }
      
      this.pythonProcess = null;
    }
    
    this.isConnected = false;
    this.deviceAddress = null;
    
    console.log('[GPS] GPS listener stopped');
  }

  /**
   * Get current GPS location
   */
  getCurrentLocation() {
    return this.currentLocation;
  }

  /**
   * Check if GPS is connected
   */
  isListening() {
    return this.isConnected;
  }

  /**
   * Get connection information
   */
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      deviceAddress: this.deviceAddress,
      hasLocation: this.currentLocation !== null,
      lastUpdate: this.stats.lastUpdateTime,
      connectionTime: this.stats.connectionTime,
      autoReconnect: this.autoReconnect,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const uptime = this.stats.connectionTime ? Date.now() - this.stats.connectionTime : 0;
    const updatesPerSecond = uptime > 0 ? (this.stats.totalUpdates / (uptime / 1000)).toFixed(2) : '0.00';
    
    return {
      totalUpdates: this.stats.totalUpdates,
      lastUpdateTime: this.stats.lastUpdateTime,
      connectionTime: this.stats.connectionTime,
      uptime: uptime,
      updatesPerSecond: parseFloat(updatesPerSecond),
      errors: this.stats.errors,
      parseErrors: this.stats.parseErrors,
      currentLocation: this.currentLocation
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalUpdates: 0,
      lastUpdateTime: null,
      connectionTime: null,
      errors: 0,
      parseErrors: 0
    };
    console.log('[GPS] Statistics reset');
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup() {
    console.log('[GPS] Cleaning up GPS service...');
    await this.stopListening();
    this.removeAllListeners();
    console.log('[GPS] GPS service cleaned up');
  }
}

// Export singleton instance
module.exports = new BluetoothGPSService();
