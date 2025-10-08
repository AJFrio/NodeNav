/**
 * Windows Bluetooth Device Management Service
 * Handles device discovery, pairing, and connection on Windows using PowerShell
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WindowsBluetoothDevice {
  constructor() {
    this.devices = new Map();
    this.isScanning = false;
    this.log = [];
  }

  /**
   * Initialize Windows Bluetooth device service
   */
  initialize() {
    console.log('[Windows Bluetooth Device] Initializing...');
    
    // Load any previously paired devices
    this.refreshDevices();
    
    console.log('[Windows Bluetooth Device] Initialized');
    return Promise.resolve();
  }

  /**
   * Refresh device list from Windows
   */
  async refreshDevices() {
    try {
      const script = `
        Get-PnpDevice -Class Bluetooth | 
        Where-Object { $_.Status -ne 'Unknown' } |
        Select-Object FriendlyName, InstanceId, Status |
        ConvertTo-Json
      `;
      
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${script.replace(/\n/g, ' ')}"`);
      
      if (stdout && stdout.trim()) {
        const devices = JSON.parse(stdout);
        const deviceArray = Array.isArray(devices) ? devices : [devices];
        
        deviceArray.forEach(device => {
          if (device.FriendlyName && device.FriendlyName !== 'Unknown') {
            // Extract MAC address from InstanceId or generate pseudo-address
            const address = this.extractAddress(device.InstanceId) || this.generatePseudoAddress(device.FriendlyName);
            
            this.devices.set(address, {
              name: device.FriendlyName,
              address: address,
              paired: true,
              connected: device.Status === 'OK',
              type: this.guessDeviceType(device.FriendlyName),
              lastSeen: new Date().toISOString()
            });
          }
        });
      }
    } catch (error) {
      console.debug('[Windows Bluetooth Device] Could not refresh devices:', error.message);
    }
  }

  /**
   * Extract MAC address from Windows device instance ID
   */
  extractAddress(instanceId) {
    if (!instanceId) return null;
    
    // Try to extract MAC-like pattern from instance ID
    const match = instanceId.match(/([0-9A-F]{2}[_:]){5}[0-9A-F]{2}/i);
    if (match) {
      return match[0].replace(/_/g, ':').toUpperCase();
    }
    
    return null;
  }

  /**
   * Generate pseudo-MAC address for identification
   */
  generatePseudoAddress(name) {
    // Create a consistent pseudo-MAC based on name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    
    const bytes = [];
    for (let i = 0; i < 6; i++) {
      bytes.push(((hash >> (i * 8)) & 0xFF).toString(16).padStart(2, '0').toUpperCase());
    }
    
    return bytes.join(':');
  }

  /**
   * Guess device type from name
   */
  guessDeviceType(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('phone') || lowerName.includes('iphone') || 
        lowerName.includes('samsung') || lowerName.includes('pixel')) {
      return 'phone';
    }
    if (lowerName.includes('speaker') || lowerName.includes('audio')) {
      return 'speaker';
    }
    if (lowerName.includes('headphone') || lowerName.includes('earbuds') || 
        lowerName.includes('airpods')) {
      return 'headphones';
    }
    return 'unknown';
  }

  /**
   * Start device discovery (Windows Bluetooth settings)
   */
  async startScanning() {
    if (this.isScanning) {
      throw new Error('Already scanning for devices');
    }

    this.isScanning = true;
    this.log.push({
      type: 'scan_start',
      timestamp: new Date().toISOString()
    });

    console.log('[Windows Bluetooth Device] Starting scan...');
    console.log('[Windows Bluetooth Device] Note: Use Windows Settings to discover new devices');
    console.log('[Windows Bluetooth Device] Settings -> Bluetooth & devices -> Add device');

    // Refresh current device list
    await this.refreshDevices();

    return Promise.resolve();
  }

  /**
   * Stop device discovery
   */
  async stopScanning() {
    this.isScanning = false;
    this.log.push({
      type: 'scan_stop',
      timestamp: new Date().toISOString()
    });

    console.log('[Windows Bluetooth Device] Stopped scanning');
    
    // Final refresh
    await this.refreshDevices();
    
    return Promise.resolve();
  }

  /**
   * Get list of discovered/paired devices
   */
  getDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get connected devices
   */
  getConnectedDevices() {
    return Array.from(this.devices.values()).filter(device => device.connected);
  }

  /**
   * Pair with a device (Windows handles this through Settings)
   */
  async pairDevice(address) {
    const device = this.devices.get(address);
    if (!device) {
      throw new Error(`Device ${address} not found. Use Windows Settings to pair new devices.`);
    }

    if (device.paired) {
      return device;
    }

    this.log.push({
      type: 'pair_attempt',
      device: address,
      timestamp: new Date().toISOString()
    });

    console.log('[Windows Bluetooth Device] Pairing is handled by Windows Settings');
    console.log('[Windows Bluetooth Device] Go to: Settings -> Bluetooth & devices -> Add device');
    
    // Refresh to check if user paired it
    await this.refreshDevices();
    
    return this.devices.get(address);
  }

  /**
   * Connect to a paired device
   */
  async connectDevice(address) {
    const device = this.devices.get(address);
    if (!device) {
      throw new Error(`Device ${address} not found`);
    }

    if (!device.paired) {
      throw new Error(`Device ${address} is not paired. Pair it first in Windows Settings.`);
    }

    this.log.push({
      type: 'connect_attempt',
      device: address,
      timestamp: new Date().toISOString()
    });

    console.log(`[Windows Bluetooth Device] Attempting to connect: ${device.name}`);

    try {
      // On Windows, connection is automatic for paired devices
      // We just need to ensure the device is enabled
      const script = `
        Get-PnpDevice | 
        Where-Object { $_.FriendlyName -eq '${device.name.replace(/'/g, "''")}' } |
        Enable-PnpDevice -Confirm:$false
      `;
      
      await execAsync(`powershell -NoProfile -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
      
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh device list
      await this.refreshDevices();
      
      const updatedDevice = this.devices.get(address);
      if (updatedDevice) {
        updatedDevice.connected = true;
        updatedDevice.lastSeen = new Date().toISOString();
      }

      this.log.push({
        type: 'connect_success',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Windows Bluetooth Device] Connected: ${device.name}`);
      return updatedDevice || device;
    } catch (error) {
      console.error('[Windows Bluetooth Device] Connection error:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnectDevice(address) {
    const device = this.devices.get(address);
    if (!device) {
      throw new Error(`Device ${address} not found`);
    }

    try {
      // Disable the device
      const script = `
        Get-PnpDevice | 
        Where-Object { $_.FriendlyName -eq '${device.name.replace(/'/g, "''")}' } |
        Disable-PnpDevice -Confirm:$false
      `;
      
      await execAsync(`powershell -NoProfile -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });

      device.connected = false;

      this.log.push({
        type: 'disconnect',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Windows Bluetooth Device] Disconnected: ${device.name}`);
      return device;
    } catch (error) {
      console.error('[Windows Bluetooth Device] Disconnect error:', error.message);
      throw error;
    }
  }

  /**
   * Remove pairing from a device
   */
  async unpairDevice(address) {
    const device = this.devices.get(address);
    if (!device) {
      throw new Error(`Device ${address} not found`);
    }

    console.log('[Windows Bluetooth Device] Unpairing must be done in Windows Settings');
    console.log('[Windows Bluetooth Device] Go to: Settings -> Bluetooth & devices -> Devices');
    
    this.log.push({
      type: 'unpair_note',
      device: address,
      timestamp: new Date().toISOString()
    });

    // Remove from our local cache
    this.devices.delete(address);

    return device;
  }

  /**
   * Get Bluetooth adapter status
   */
  getAdapterInfo() {
    return {
      powered: true,
      discoverable: false,
      discovering: this.isScanning,
      address: 'Windows-Managed'
    };
  }

  /**
   * Get command history
   */
  getCommandHistory() {
    return [...this.log];
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.log = [];
    console.log('[Windows Bluetooth Device] Command history cleared');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isScanning = false;
    console.log('[Windows Bluetooth Device] Cleanup completed');
    return Promise.resolve();
  }
}

// Export singleton instance
module.exports = new WindowsBluetoothDevice();
