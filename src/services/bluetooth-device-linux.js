/**
 * Linux Bluetooth Device Management Service
 * Uses BlueZ (Linux Bluetooth stack) via D-Bus
 * 
 * This implementation provides full Bluetooth device management:
 * - Device discovery (scanning)
 * - Pairing with devices
 * - Connecting/disconnecting devices
 * - Removing paired devices
 */

const dbus = require('dbus-next');
const { systemBus } = dbus;

// BlueZ D-Bus constants
const BLUEZ_SERVICE = 'org.bluez';
const ADAPTER_INTERFACE = 'org.bluez.Adapter1';
const DEVICE_INTERFACE = 'org.bluez.Device1';
const OBJECT_MANAGER_INTERFACE = 'org.freedesktop.DBus.ObjectManager';
const PROPERTIES_INTERFACE = 'org.freedesktop.DBus.Properties';

class LinuxBluetoothDevice {
  constructor() {
    this.bus = null;
    this.adapter = null;
    this.adapterPath = null;
    this.devices = new Map();
    this.isScanning = false;
    this.log = [];
    this.initialized = false;
    this.objectManager = null;
    this.deviceAddedHandler = null;
    this.scanTimeout = null;
  }

  /**
   * Initialize Linux Bluetooth service
   */
  async initialize() {
    try {
      console.log('[Linux Bluetooth] Initializing BlueZ D-Bus connection...');
      
      // Check if running on Linux
      if (process.platform !== 'linux') {
        throw new Error('Linux Bluetooth service only works on Linux');
      }
      
      // Connect to system D-Bus
      try {
        this.bus = systemBus();
      } catch (error) {
        throw new Error('Failed to connect to D-Bus. Is D-Bus running?');
      }
      
      // Get BlueZ object manager
      try {
        const bluezObj = await this.bus.getProxyObject(BLUEZ_SERVICE, '/');
        this.objectManager = bluezObj.getInterface(OBJECT_MANAGER_INTERFACE);
      } catch (error) {
        throw new Error('Failed to connect to BlueZ. Is BlueZ/bluetooth service running? Try: sudo systemctl start bluetooth');
      }
      
      // Find the default Bluetooth adapter
      await this.findAdapter();
      
      if (!this.adapter) {
        throw new Error('No Bluetooth adapter found. Please ensure Bluetooth hardware is available.');
      }
      
      // Check if adapter is powered
      try {
        const props = await this.adapterProps.GetAll(ADAPTER_INTERFACE);
        if (!props.Powered?.value) {
          console.warn('[Linux Bluetooth] Adapter is powered off. Attempting to power on...');
          try {
            await this.adapterProps.Set(ADAPTER_INTERFACE, 'Powered', { type: 'b', value: true });
            console.log('[Linux Bluetooth] Adapter powered on successfully');
          } catch (powerError) {
            console.warn('[Linux Bluetooth] Could not power on adapter. You may need to enable Bluetooth manually.');
          }
        }
      } catch (error) {
        console.warn('[Linux Bluetooth] Could not check adapter power state:', error.message);
      }
      
      // Load existing paired devices
      await this.refreshDevices();
      
      // Listen for new devices
      this.setupDeviceListener();
      
      this.initialized = true;
      console.log('[Linux Bluetooth] Initialized successfully');
      console.log(`[Linux Bluetooth] Using adapter: ${this.adapterPath}`);
      
      return Promise.resolve();
    } catch (error) {
      console.error('[Linux Bluetooth] Initialization failed:', error.message);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Find the default Bluetooth adapter
   */
  async findAdapter() {
    try {
      const objects = await this.objectManager.GetManagedObjects();
      
      // Find first available adapter
      for (const [path, interfaces] of Object.entries(objects)) {
        if (interfaces[ADAPTER_INTERFACE]) {
          this.adapterPath = path;
          const adapterObj = await this.bus.getProxyObject(BLUEZ_SERVICE, path);
          this.adapter = adapterObj.getInterface(ADAPTER_INTERFACE);
          this.adapterProps = adapterObj.getInterface(PROPERTIES_INTERFACE);
          break;
        }
      }
    } catch (error) {
      console.error('[Linux Bluetooth] Error finding adapter:', error.message);
      throw error;
    }
  }

  /**
   * Setup device discovery listener
   */
  setupDeviceListener() {
    if (!this.objectManager) return;
    
    // Listen for new interfaces (devices)
    this.objectManager.on('InterfacesAdded', async (objectPath, interfaces) => {
      if (interfaces[DEVICE_INTERFACE]) {
        await this.addDiscoveredDevice(objectPath);
      }
    });

    // Listen for removed interfaces
    this.objectManager.on('InterfacesRemoved', (objectPath, interfaces) => {
      if (interfaces.includes(DEVICE_INTERFACE)) {
        // Extract address from path
        const address = objectPath.split('/').pop().replace(/_/g, ':');
        this.devices.delete(address);
        console.log(`[Linux Bluetooth] Device removed: ${address}`);
      }
    });
  }

  /**
   * Add a discovered device to the list
   */
  async addDiscoveredDevice(devicePath) {
    try {
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, devicePath);
      const device = deviceObj.getInterface(DEVICE_INTERFACE);
      const props = deviceObj.getInterface(PROPERTIES_INTERFACE);
      
      const allProps = await props.GetAll(DEVICE_INTERFACE);
      
      const address = allProps.Address?.value || devicePath.split('/').pop().replace(/_/g, ':');
      const name = allProps.Name?.value || allProps.Alias?.value || 'Unknown Device';
      const paired = allProps.Paired?.value || false;
      const connected = allProps.Connected?.value || false;
      const rssi = allProps.RSSI?.value || null;
      
      // Determine device type from Icon or Class
      const icon = allProps.Icon?.value || '';
      const deviceClass = allProps.Class?.value || 0;
      const type = this.guessDeviceType(icon, deviceClass, name);
      
      const deviceInfo = {
        name,
        address,
        paired,
        connected,
        type,
        rssi,
        lastSeen: new Date().toISOString(),
        path: devicePath
      };
      
      this.devices.set(address, deviceInfo);
      
      if (this.isScanning) {
        this.log.push({
          type: 'device_discovered',
          device: address,
          name: name,
          timestamp: new Date().toISOString()
        });
        console.log(`[Linux Bluetooth] Discovered: ${name} (${address})`);
      }
    } catch (error) {
      console.error('[Linux Bluetooth] Error adding discovered device:', error.message);
    }
  }

  /**
   * Refresh device list from BlueZ
   */
  async refreshDevices() {
    try {
      const objects = await this.objectManager.GetManagedObjects();
      
      for (const [path, interfaces] of Object.entries(objects)) {
        if (interfaces[DEVICE_INTERFACE]) {
          await this.addDiscoveredDevice(path);
        }
      }
    } catch (error) {
      console.error('[Linux Bluetooth] Error refreshing devices:', error.message);
    }
  }

  /**
   * Guess device type from icon, class, and name
   */
  guessDeviceType(icon, deviceClass, name) {
    const lowerName = name.toLowerCase();
    const lowerIcon = icon.toLowerCase();
    
    // Check icon first
    if (lowerIcon.includes('phone')) return 'phone';
    if (lowerIcon.includes('audio') || lowerIcon.includes('headset') || lowerIcon.includes('headphone')) return 'headphones';
    if (lowerIcon.includes('speaker')) return 'speaker';
    if (lowerIcon.includes('computer')) return 'computer';
    if (lowerIcon.includes('input') || lowerIcon.includes('keyboard') || lowerIcon.includes('mouse')) return 'input';
    
    // Check name
    if (lowerName.includes('phone') || lowerName.includes('iphone') || 
        lowerName.includes('samsung') || lowerName.includes('pixel')) return 'phone';
    if (lowerName.includes('speaker')) return 'speaker';
    if (lowerName.includes('headphone') || lowerName.includes('earbuds') || 
        lowerName.includes('airpods') || lowerName.includes('buds')) return 'headphones';
    if (lowerName.includes('keyboard')) return 'input';
    if (lowerName.includes('mouse')) return 'input';
    if (lowerName.includes('laptop') || lowerName.includes('computer') || lowerName.includes('pc')) return 'computer';
    
    // Check device class (major device class is bits 8-12)
    const majorClass = (deviceClass >> 8) & 0x1F;
    
    switch (majorClass) {
      case 0x01: return 'computer';
      case 0x02: return 'phone';
      case 0x04: return 'audio';
      case 0x05: return 'input';
      default: return 'unknown';
    }
  }

  /**
   * Start device discovery
   */
  async startScanning() {
    if (!this.initialized) {
      throw new Error('Bluetooth service not initialized');
    }

    if (this.isScanning) {
      throw new Error('Already scanning for devices');
    }

    try {
      this.isScanning = true;
      
      this.log.push({
        type: 'scan_start',
        timestamp: new Date().toISOString()
      });

      console.log('[Linux Bluetooth] Starting device discovery...');
      
      // Set discovery filter for better results
      await this.adapter.SetDiscoveryFilter({
        Transport: { type: 's', value: 'auto' },
        DuplicateData: { type: 'b', value: false }
      });
      
      // Start scanning
      await this.adapter.StartDiscovery();
      
      // Auto-stop scanning after 30 seconds
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }
      this.scanTimeout = setTimeout(() => {
        if (this.isScanning) {
          console.log('[Linux Bluetooth] Auto-stopping scan after 30 seconds');
          this.stopScanning().catch(console.error);
        }
      }, 30000);
      
      return Promise.resolve();
    } catch (error) {
      this.isScanning = false;
      console.error('[Linux Bluetooth] Error starting scan:', error.message);
      throw error;
    }
  }

  /**
   * Stop device discovery
   */
  async stopScanning() {
    if (!this.isScanning) {
      return Promise.resolve();
    }

    try {
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = null;
      }
      
      await this.adapter.StopDiscovery();
      
      this.isScanning = false;
      
      this.log.push({
        type: 'scan_stop',
        timestamp: new Date().toISOString()
      });

      console.log('[Linux Bluetooth] Stopped device discovery');
      return Promise.resolve();
    } catch (error) {
      // Ignore errors if discovery wasn't running
      if (!error.message.includes('No discovery started')) {
        console.error('[Linux Bluetooth] Error stopping scan:', error.message);
      }
      this.isScanning = false;
      return Promise.resolve();
    }
  }

  /**
   * Get list of discovered devices
   */
  getDevices() {
    return Array.from(this.devices.values()).map(device => {
      // Don't include the internal path in the response
      const { path, ...deviceData } = device;
      return deviceData;
    });
  }

  /**
   * Get connected devices
   */
  getConnectedDevices() {
    return this.getDevices().filter(device => device.connected);
  }

  /**
   * Pair with a device
   */
  async pairDevice(address) {
    if (!this.initialized) {
      throw new Error('Bluetooth service not initialized');
    }

    const device = this.devices.get(address);
    if (!device) {
      throw new Error(`Device ${address} not found`);
    }

    if (device.paired) {
      throw new Error(`Device ${address} is already paired`);
    }

    try {
      this.log.push({
        type: 'pair_attempt',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Linux Bluetooth] Pairing with device: ${device.name} (${address})`);
      
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
      const deviceInterface = deviceObj.getInterface(DEVICE_INTERFACE);
      
      // Pair with the device (this may take a while and may require user confirmation)
      await deviceInterface.Pair();
      
      // Update device info
      await this.addDiscoveredDevice(device.path);
      
      const updatedDevice = this.devices.get(address);
      
      this.log.push({
        type: 'pair_success',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Linux Bluetooth] Successfully paired with: ${device.name} (${address})`);
      return updatedDevice;
    } catch (error) {
      this.log.push({
        type: 'pair_failed',
        device: address,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.error(`[Linux Bluetooth] Failed to pair with ${address}:`, error.message);
      throw new Error(`Failed to pair: ${error.message}`);
    }
  }

  /**
   * Connect to a paired device
   */
  async connectDevice(address) {
    if (!this.initialized) {
      throw new Error('Bluetooth service not initialized');
    }

    const device = this.devices.get(address);
    if (!device) {
      throw new Error(`Device ${address} not found`);
    }

    if (!device.paired) {
      throw new Error(`Device ${address} is not paired. Pair it first.`);
    }

    if (device.connected) {
      throw new Error(`Device ${address} is already connected`);
    }

    try {
      this.log.push({
        type: 'connect_attempt',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Linux Bluetooth] Connecting to device: ${device.name} (${address})`);
      
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
      const deviceInterface = deviceObj.getInterface(DEVICE_INTERFACE);
      
      // Connect to the device
      await deviceInterface.Connect();
      
      // Wait a moment for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update device info
      await this.addDiscoveredDevice(device.path);
      
      const updatedDevice = this.devices.get(address);
      
      this.log.push({
        type: 'connect_success',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Linux Bluetooth] Successfully connected to: ${device.name} (${address})`);
      return updatedDevice;
    } catch (error) {
      this.log.push({
        type: 'connect_failed',
        device: address,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.error(`[Linux Bluetooth] Failed to connect to ${address}:`, error.message);
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnectDevice(address) {
    if (!this.initialized) {
      throw new Error('Bluetooth service not initialized');
    }

    const device = this.devices.get(address);
    if (!device) {
      throw new Error(`Device ${address} not found`);
    }

    if (!device.connected) {
      throw new Error(`Device ${address} is not connected`);
    }

    try {
      console.log(`[Linux Bluetooth] Disconnecting from device: ${device.name} (${address})`);
      
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
      const deviceInterface = deviceObj.getInterface(DEVICE_INTERFACE);
      
      // Disconnect from the device
      await deviceInterface.Disconnect();
      
      // Update device info
      await this.addDiscoveredDevice(device.path);
      
      const updatedDevice = this.devices.get(address);
      
      this.log.push({
        type: 'disconnect',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Linux Bluetooth] Disconnected from: ${device.name} (${address})`);
      return updatedDevice;
    } catch (error) {
      console.error(`[Linux Bluetooth] Error disconnecting from ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove pairing from a device
   */
  async unpairDevice(address) {
    if (!this.initialized) {
      throw new Error('Bluetooth service not initialized');
    }

    const device = this.devices.get(address);
    if (!device) {
      throw new Error(`Device ${address} not found`);
    }

    try {
      // Disconnect first if connected
      if (device.connected) {
        await this.disconnectDevice(address);
      }

      console.log(`[Linux Bluetooth] Unpairing device: ${device.name} (${address})`);
      
      // Remove the device from BlueZ
      await this.adapter.RemoveDevice(device.path);
      
      // Remove from our local cache
      this.devices.delete(address);
      
      this.log.push({
        type: 'unpair',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Linux Bluetooth] Unpaired device: ${device.name} (${address})`);
      
      return device;
    } catch (error) {
      console.error(`[Linux Bluetooth] Error unpairing ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Get Bluetooth adapter status
   */
  async getAdapterInfo() {
    if (!this.initialized || !this.adapterProps) {
      return {
        powered: false,
        discoverable: false,
        discovering: false,
        address: 'Not initialized'
      };
    }

    try {
      const props = await this.adapterProps.GetAll(ADAPTER_INTERFACE);
      
      return {
        powered: props.Powered?.value || false,
        discoverable: props.Discoverable?.value || false,
        discovering: props.Discovering?.value || this.isScanning,
        address: props.Address?.value || 'Unknown',
        name: props.Alias?.value || props.Name?.value || 'Bluetooth Adapter'
      };
    } catch (error) {
      console.error('[Linux Bluetooth] Error getting adapter info:', error.message);
      return {
        powered: false,
        discoverable: false,
        discovering: this.isScanning,
        address: 'Error'
      };
    }
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
    console.log('[Linux Bluetooth] Command history cleared');
  }

  /**
   * Cleanup Bluetooth resources
   */
  async cleanup() {
    try {
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }
      
      if (this.isScanning) {
        await this.stopScanning();
      }
      
      console.log('[Linux Bluetooth] Cleanup completed');
      return Promise.resolve();
    } catch (error) {
      console.error('[Linux Bluetooth] Error during cleanup:', error.message);
      return Promise.resolve();
    }
  }
}

// Export singleton instance
module.exports = new LinuxBluetoothDevice();

