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
const { systemBus, Variant } = dbus;

// BlueZ D-Bus constants
const BLUEZ_SERVICE = 'org.bluez';
const ADAPTER_INTERFACE = 'org.bluez.Adapter1';
const DEVICE_INTERFACE = 'org.bluez.Device1';
const OBJECT_MANAGER_INTERFACE = 'org.freedesktop.DBus.ObjectManager';
const PROPERTIES_INTERFACE = 'org.freedesktop.DBus.Properties';
const AGENT_MANAGER_INTERFACE = 'org.bluez.AgentManager1';
const AGENT_INTERFACE = 'org.bluez.Agent1';
const MEDIA_PLAYER_INTERFACE = 'org.bluez.MediaPlayer1';
const MEDIA_CONTROL_INTERFACE = 'org.bluez.MediaControl1';

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
    this.agentPath = '/org/bluez/agent/nodenav';
    this.agentManager = null;
    this.mediaPlayers = new Map(); // Track media players by device address
    this.currentMediaPlayer = null;
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
      
      // Check and configure adapter properties
      try {
        const props = await this.adapterProps.GetAll(ADAPTER_INTERFACE);
        
        // Power on adapter if needed
        if (!props.Powered?.value) {
          console.warn('[Linux Bluetooth] Adapter is powered off. Attempting to power on...');
          try {
            await this.adapterProps.Set(ADAPTER_INTERFACE, 'Powered', new Variant('b', true));
            console.log('[Linux Bluetooth] Adapter powered on successfully');
          } catch (powerError) {
            console.warn('[Linux Bluetooth] Could not power on adapter. You may need to enable Bluetooth manually.');
          }
        }
        
        // Make adapter discoverable so other devices can see it
        if (!props.Discoverable?.value) {
          console.log('[Linux Bluetooth] Making adapter discoverable...');
          try {
            await this.adapterProps.Set(ADAPTER_INTERFACE, 'Discoverable', new Variant('b', true));
            // Set discoverable timeout to 0 (always discoverable)
            await this.adapterProps.Set(ADAPTER_INTERFACE, 'DiscoverableTimeout', new Variant('u', 0));
            console.log('[Linux Bluetooth] Adapter is now discoverable');
          } catch (discoverError) {
            console.warn('[Linux Bluetooth] Could not make adapter discoverable:', discoverError.message);
          }
        }
        
        // Make adapter pairable
        if (!props.Pairable?.value) {
          console.log('[Linux Bluetooth] Making adapter pairable...');
          try {
            await this.adapterProps.Set(ADAPTER_INTERFACE, 'Pairable', new Variant('b', true));
            // Set pairable timeout to 0 (always pairable)
            await this.adapterProps.Set(ADAPTER_INTERFACE, 'PairableTimeout', new Variant('u', 0));
            console.log('[Linux Bluetooth] Adapter is now pairable');
          } catch (pairError) {
            console.warn('[Linux Bluetooth] Could not make adapter pairable:', pairError.message);
          }
        }
        
        // Set a friendly name for the adapter
        try {
          const currentAlias = props.Alias?.value || props.Name?.value || 'Unknown';
          if (!currentAlias.includes('NodeNav')) {
            await this.adapterProps.Set(ADAPTER_INTERFACE, 'Alias', new Variant('s', 'NodeNav Headunit'));
            console.log('[Linux Bluetooth] Adapter name set to: NodeNav Headunit');
          }
        } catch (nameError) {
          console.warn('[Linux Bluetooth] Could not set adapter name:', nameError.message);
        }
      } catch (error) {
        console.warn('[Linux Bluetooth] Could not configure adapter properties:', error.message);
      }
      
      // Load existing paired devices
      await this.refreshDevices();
      
      // Listen for new devices
      this.setupDeviceListener();
      
      // Register pairing agent
      await this.setupPairingAgent();
      
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
   * Setup and register a pairing agent
   */
  async setupPairingAgent() {
    try {
      console.log('[Linux Bluetooth] Setting up pairing agent...');
      
      // Create agent interface implementation
      const agentInterface = {
        name: AGENT_INTERFACE,
        methods: {
          Release: {
            inSignature: '',
            outSignature: ''
          },
          RequestPinCode: {
            inSignature: 'o',
            outSignature: 's'
          },
          DisplayPinCode: {
            inSignature: 'os',
            outSignature: ''
          },
          RequestPasskey: {
            inSignature: 'o',
            outSignature: 'u'
          },
          DisplayPasskey: {
            inSignature: 'ouu',
            outSignature: ''
          },
          RequestConfirmation: {
            inSignature: 'ou',
            outSignature: ''
          },
          RequestAuthorization: {
            inSignature: 'o',
            outSignature: ''
          },
          AuthorizeService: {
            inSignature: 'os',
            outSignature: ''
          },
          Cancel: {
            inSignature: '',
            outSignature: ''
          }
        }
      };

      // Create agent object with method implementations
      const agent = {
        Release() {
          console.log('[Pairing Agent] Released');
        },
        RequestPinCode(devicePath) {
          const address = devicePath.split('/').pop().replace(/_/g, ':');
          console.log(`[Pairing Agent] PIN requested for ${address} - Using default PIN: 0000`);
          // Return default PIN for legacy devices
          return '0000';
        },
        DisplayPinCode(devicePath, pincode) {
          const address = devicePath.split('/').pop().replace(/_/g, ':');
          console.log(`\n═══════════════════════════════════════`);
          console.log(`[Pairing Agent] PIN CODE for ${address}`);
          console.log(`PIN: ${pincode}`);
          console.log(`═══════════════════════════════════════\n`);
        },
        RequestPasskey(devicePath) {
          const address = devicePath.split('/').pop().replace(/_/g, ':');
          console.log(`[Pairing Agent] Passkey requested for ${address} - Using default: 0`);
          // Return default passkey for legacy devices
          return 0;
        },
        DisplayPasskey(devicePath, passkey, entered) {
          const address = devicePath.split('/').pop().replace(/_/g, ':');
          const passStr = String(passkey).padStart(6, '0');
          console.log(`\n═══════════════════════════════════════`);
          console.log(`[Pairing Agent] PASSKEY for ${address}`);
          console.log(`Passkey: ${passStr}`);
          console.log(`Entered: ${entered}/6 digits`);
          console.log(`═══════════════════════════════════════\n`);
        },
        RequestConfirmation(devicePath, passkey) {
          const address = devicePath.split('/').pop().replace(/_/g, ':');
          const passStr = String(passkey).padStart(6, '0');
          console.log(`\n═══════════════════════════════════════`);
          console.log(`[Pairing Agent] CONFIRM PAIRING`);
          console.log(`Device: ${address}`);
          console.log(`Passkey: ${passStr}`);
          console.log(`Auto-accepting pairing...`);
          console.log(`═══════════════════════════════════════\n`);
          // Auto-accept confirmation
          return;
        },
        RequestAuthorization(devicePath) {
          const address = devicePath.split('/').pop().replace(/_/g, ':');
          console.log(`[Pairing Agent] Authorization requested for ${address} - Auto-authorizing`);
          // Auto-authorize
          return;
        },
        AuthorizeService(devicePath, uuid) {
          const address = devicePath.split('/').pop().replace(/_/g, ':');
          console.log(`[Pairing Agent] Service authorization for ${address}: ${uuid} - Auto-authorizing`);
          // Auto-authorize service
          return;
        },
        Cancel() {
          console.log('[Pairing Agent] Pairing cancelled by remote device');
        }
      };

      // Export agent on D-Bus
      this.bus.export(this.agentPath, {
        [AGENT_INTERFACE]: agent
      });

      // Get agent manager
      const agentManagerObj = await this.bus.getProxyObject(BLUEZ_SERVICE, '/org/bluez');
      this.agentManager = agentManagerObj.getInterface(AGENT_MANAGER_INTERFACE);

      // Register agent as default with KeyboardDisplay capability
      // This allows handling all pairing methods including modern phone passkey confirmation
      await this.agentManager.RegisterAgent(this.agentPath, 'KeyboardDisplay');
      await this.agentManager.RequestDefaultAgent(this.agentPath);

      console.log('[Linux Bluetooth] Pairing agent registered successfully (KeyboardDisplay capability)');
    } catch (error) {
      console.warn('[Linux Bluetooth] Failed to register pairing agent:', error.message);
      // Non-fatal, continue without agent
    }
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
      
      // Get name, but don't use it if it's just the address
      let name = allProps.Name?.value || allProps.Alias?.value || null;
      
      // If name is just the address (some devices report this), treat it as no name
      if (name && name.toUpperCase().replace(/:/g, '') === address.toUpperCase().replace(/:/g, '')) {
        name = null;
      }
      
      // Use a friendly fallback if no real name
      if (!name) {
        name = `Device ${address.slice(-8)}`;
      }
      
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
        Transport: new Variant('s', 'auto'),
        DuplicateData: new Variant('b', false)
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
      const deviceProps = deviceObj.getInterface(PROPERTIES_INTERFACE);
      
      // Pair with the device (this may take a while and may require user confirmation)
      await deviceInterface.Pair();
      
      // Set device as trusted to allow automatic reconnection
      try {
        await deviceProps.Set(DEVICE_INTERFACE, 'Trusted', new Variant('b', true));
        console.log(`[Linux Bluetooth] Device ${address} set as trusted`);
      } catch (trustError) {
        console.warn(`[Linux Bluetooth] Could not set device as trusted: ${trustError.message}`);
      }
      
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
      
      // Get fresh device object in case path is stale
      const { path, obj } = await this.getDeviceObject(address);
      const deviceInterface = obj.getInterface(DEVICE_INTERFACE);
      
      // Connect to the device
      await deviceInterface.Connect();
      
      // Wait a moment for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update device info with fresh path
      await this.addDiscoveredDevice(path);
      
      const updatedDevice = this.devices.get(address);
      
      this.log.push({
        type: 'connect_success',
        device: address,
        timestamp: new Date().toISOString()
      });

      console.log(`[Linux Bluetooth] Successfully connected to: ${device.name} (${address})`);
      
      // Try to find media player for this device
      setTimeout(async () => {
        try {
          await this.findMediaPlayer(address);
        } catch (error) {
          console.warn('[Linux Bluetooth] Could not find media player:', error.message);
        }
      }, 2000); // Wait 2 seconds for media player to appear
      
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
   * Get fresh device object from D-Bus (in case cached path is stale)
   */
  async getDeviceObject(address) {
    // Try to find device in BlueZ's managed objects
    const objects = await this.objectManager.GetManagedObjects();
    
    for (const [path, interfaces] of Object.entries(objects)) {
      if (interfaces[DEVICE_INTERFACE]) {
        const deviceAddress = interfaces[DEVICE_INTERFACE].Address?.value;
        if (deviceAddress && deviceAddress.toLowerCase() === address.toLowerCase()) {
          return {
            path,
            obj: await this.bus.getProxyObject(BLUEZ_SERVICE, path)
          };
        }
      }
    }
    
    throw new Error(`Device ${address} not found in BlueZ`);
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
      
      // Get fresh device object in case path is stale
      const { path, obj } = await this.getDeviceObject(address);
      const deviceInterface = obj.getInterface(DEVICE_INTERFACE);
      
      // Disconnect from the device
      await deviceInterface.Disconnect();
      
      // Update device info with fresh path
      await this.addDiscoveredDevice(path);
      
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
      console.log(`[Linux Bluetooth] Unpairing device: ${device.name} (${address})`);
      
      // Get fresh device object in case path is stale
      let devicePath;
      try {
        const deviceObj = await this.getDeviceObject(address);
        devicePath = deviceObj.path;
        
        // Try to disconnect first if connected
        if (device.connected) {
          try {
            const deviceInterface = deviceObj.obj.getInterface(DEVICE_INTERFACE);
            await deviceInterface.Disconnect();
            console.log(`[Linux Bluetooth] Disconnected ${address} before unpairing`);
          } catch (disconnectError) {
            console.warn(`[Linux Bluetooth] Could not disconnect before unpair: ${disconnectError.message}`);
            // Continue with unpair anyway
          }
        }
      } catch (error) {
        // If we can't get the device object, try using the cached path
        console.warn(`[Linux Bluetooth] Using cached device path: ${error.message}`);
        devicePath = device.path;
      }
      
      // Remove the device from BlueZ
      await this.adapter.RemoveDevice(devicePath);
      
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
        pairable: false,
        discovering: false,
        address: 'Not initialized'
      };
    }

    try {
      const props = await this.adapterProps.GetAll(ADAPTER_INTERFACE);
      
      return {
        powered: props.Powered?.value || false,
        discoverable: props.Discoverable?.value || false,
        pairable: props.Pairable?.value || false,
        discovering: props.Discovering?.value || this.isScanning,
        address: props.Address?.value || 'Unknown',
        name: props.Alias?.value || props.Name?.value || 'Bluetooth Adapter'
      };
    } catch (error) {
      console.error('[Linux Bluetooth] Error getting adapter info:', error.message);
      return {
        powered: false,
        discoverable: false,
        pairable: false,
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
      
      // Unregister pairing agent
      if (this.agentManager) {
        try {
          await this.agentManager.UnregisterAgent(this.agentPath);
          console.log('[Linux Bluetooth] Pairing agent unregistered');
        } catch (error) {
          console.warn('[Linux Bluetooth] Could not unregister agent:', error.message);
        }
      }
      
      console.log('[Linux Bluetooth] Cleanup completed');
      return Promise.resolve();
    } catch (error) {
      console.error('[Linux Bluetooth] Error during cleanup:', error.message);
      return Promise.resolve();
    }
  }

  /**
   * Find and setup media player for a connected device
   */
  async findMediaPlayer(deviceAddress) {
    try {
      const objects = await this.objectManager.GetManagedObjects();
      
      for (const [path, interfaces] of Object.entries(objects)) {
        if (interfaces[MEDIA_PLAYER_INTERFACE]) {
          // Check if this player belongs to our device
          const devicePath = path.substring(0, path.lastIndexOf('/'));
          const device = this.devices.get(deviceAddress);
          
          if (device && devicePath === device.path) {
            console.log(`[Linux Bluetooth] Found media player for ${deviceAddress}: ${path}`);
            
            const playerObj = await this.bus.getProxyObject(BLUEZ_SERVICE, path);
            const player = playerObj.getInterface(MEDIA_PLAYER_INTERFACE);
            const playerProps = playerObj.getInterface(PROPERTIES_INTERFACE);
            
            this.mediaPlayers.set(deviceAddress, {
              path,
              player,
              playerProps
            });
            
            this.currentMediaPlayer = deviceAddress;
            
            // Listen for property changes
            playerProps.on('PropertiesChanged', (iface, changedProps) => {
              if (iface === MEDIA_PLAYER_INTERFACE) {
                console.log('[Linux Bluetooth] Media player properties changed');
              }
            });
            
            return true;
          }
        }
      }
      
      console.log(`[Linux Bluetooth] No media player found for ${deviceAddress}`);
      return false;
    } catch (error) {
      console.error('[Linux Bluetooth] Error finding media player:', error.message);
      return false;
    }
  }

  /**
   * Get media metadata from connected device
   */
  async getMediaMetadata(deviceAddress) {
    const address = deviceAddress || this.currentMediaPlayer;
    
    if (!address) {
      return {
        connected: false,
        isPlaying: false,
        track: {
          title: 'No Device Connected',
          artist: 'Unknown',
          album: 'Unknown',
          duration: 0,
          position: 0
        }
      };
    }

    const playerInfo = this.mediaPlayers.get(address);
    if (!playerInfo) {
      // Try to find the media player
      await this.findMediaPlayer(address);
      const newPlayerInfo = this.mediaPlayers.get(address);
      
      if (!newPlayerInfo) {
        return {
          connected: true,
          isPlaying: false,
          track: {
            title: 'No Media Player',
            artist: 'Unknown',
            album: 'Unknown',
            duration: 0,
            position: 0
          }
        };
      }
    }

    try {
      const playerInfo = this.mediaPlayers.get(address);
      const props = await playerInfo.playerProps.GetAll(MEDIA_PLAYER_INTERFACE);
      
      const track = props.Track?.value || {};
      const status = props.Status?.value || 'stopped';
      const position = props.Position?.value || 0;
      
      return {
        connected: true,
        device: address,
        isPlaying: status === 'playing',
        track: {
          title: track.Title?.value || 'Unknown',
          artist: track.Artist?.value || 'Unknown',
          album: track.Album?.value || 'Unknown',
          duration: track.Duration?.value ? track.Duration.value / 1000 : 0,
          position: position ? position / 1000 : 0
        }
      };
    } catch (error) {
      console.error('[Linux Bluetooth] Error getting media metadata:', error.message);
      return {
        connected: true,
        isPlaying: false,
        track: {
          title: 'Unknown',
          artist: 'Unknown',
          album: 'Unknown',
          duration: 0,
          position: 0
        }
      };
    }
  }

  /**
   * Control media playback
   */
  async mediaControl(command, deviceAddress) {
    const address = deviceAddress || this.currentMediaPlayer;
    
    if (!address) {
      throw new Error('No media player available');
    }

    const playerInfo = this.mediaPlayers.get(address);
    if (!playerInfo) {
      throw new Error('Media player not found for device');
    }

    try {
      console.log(`[Linux Bluetooth] Sending media control: ${command}`);
      
      switch (command.toLowerCase()) {
        case 'play':
          await playerInfo.player.Play();
          break;
        case 'pause':
          await playerInfo.player.Pause();
          break;
        case 'stop':
          await playerInfo.player.Stop();
          break;
        case 'next':
          await playerInfo.player.Next();
          break;
        case 'previous':
          await playerInfo.player.Previous();
          break;
        default:
          throw new Error(`Unknown media control command: ${command}`);
      }
      
      return { success: true, command };
    } catch (error) {
      console.error(`[Linux Bluetooth] Media control '${command}' failed:`, error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new LinuxBluetoothDevice();

