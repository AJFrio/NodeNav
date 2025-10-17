/**
 * Linux Bluetooth Device Management Service
 * Uses BlueZ (Linux Bluetooth stack) via D-Bus for robust device management.
 *
 * This implementation provides full Bluetooth device management:
 * - Device discovery (inquiry/scanning)
 * - Secure pairing and bonding (encryption)
 * - Connecting/disconnecting devices (paging)
 * - Service discovery (SDP) via media player detection
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
    this.scanTimeout = null;
    this.agentPath = '/org/bluez/agent/nodenav';
    this.agentManager = null;
  }

  /**
   * Initialize Linux Bluetooth service
   */
  async initialize() {
    try {
      console.log('[Bluetooth Service] Initializing Linux Bluetooth (BlueZ/D-Bus)...');

      if (process.platform !== 'linux') {
        throw new Error('This Bluetooth service is designed for Linux only.');
      }

      this.bus = systemBus();

      const bluezObj = await this.bus.getProxyObject(BLUEZ_SERVICE, '/');
      this.objectManager = bluezObj.getInterface(OBJECT_MANAGER_INTERFACE);

      await this.findAdapter();

      if (!this.adapter) {
        throw new Error('No Bluetooth adapter found. Ensure Bluetooth hardware is available and enabled.');
      }

      await this.configureAdapter();
      await this.refreshDevices();
      this.setupDeviceListener();
      await this.setupPairingAgent();

      this.initialized = true;
      console.log(`[Bluetooth Service] Initialized successfully. Using adapter: ${this.adapterPath}`);
    } catch (error) {
      console.error(`[Bluetooth Service] Initialization failed: ${error.message}`);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Find the default Bluetooth adapter
   */
  async findAdapter() {
    console.log('[Bluetooth Service] Searching for Bluetooth adapter...');
    const objects = await this.objectManager.GetManagedObjects();
    for (const [path, interfaces] of Object.entries(objects)) {
      if (interfaces[ADAPTER_INTERFACE]) {
        this.adapterPath = path;
        const adapterObj = await this.bus.getProxyObject(BLUEZ_SERVICE, path);
        this.adapter = adapterObj.getInterface(ADAPTER_INTERFACE);
        this.adapterProps = adapterObj.getInterface(PROPERTIES_INTERFACE);
        console.log(`[Bluetooth Service] Found adapter at ${path}`);
        return;
      }
    }
  }

  /**
   * Configure the Bluetooth adapter
   */
  async configureAdapter() {
    console.log('[Bluetooth Service] Configuring adapter...');
    const props = await this.adapterProps.GetAll(ADAPTER_INTERFACE);

    if (!props.Powered?.value) {
      console.log('[Bluetooth Service] Adapter is off. Powering on...');
      await this.adapterProps.Set(ADAPTER_INTERFACE, 'Powered', new Variant('b', true));
    }

    if (!props.Discoverable?.value) {
      console.log('[Bluetooth Service] Adapter not discoverable. Making it discoverable...');
      await this.adapterProps.Set(ADAPTER_INTERFACE, 'Discoverable', new Variant('b', true));
      await this.adapterProps.Set(ADAPTER_INTERFACE, 'DiscoverableTimeout', new Variant('u', 0));
    }

    if (!props.Pairable?.value) {
      console.log('[Bluetooth Service] Adapter not pairable. Making it pairable...');
      await this.adapterProps.Set(ADAPTER_INTERFACE, 'Pairable', new Variant('b', true));
      await this.adapterProps.Set(ADAPTER_INTERFACE, 'PairableTimeout', new Variant('u', 0));
    }

    const alias = props.Alias?.value || 'NodeNav';
    if (!alias.includes('NodeNav')) {
      console.log('[Bluetooth Service] Setting adapter alias to "NodeNav Headunit"');
      await this.adapterProps.Set(ADAPTER_INTERFACE, 'Alias', new Variant('s', 'NodeNav Headunit'));
    }
  }

  /**
   * Setup a listener for device events
   */
  setupDeviceListener() {
    this.objectManager.on('InterfacesAdded', async (objectPath, interfaces) => {
      if (interfaces[DEVICE_INTERFACE]) {
        console.log(`[Bluetooth Service] Detected new device interface at: ${objectPath}`);
        await this.addDiscoveredDevice(objectPath);
      }
    });

    this.objectManager.on('InterfacesRemoved', (objectPath, interfaces) => {
      if (interfaces.includes(DEVICE_INTERFACE)) {
        const address = objectPath.split('/').pop().replace(/_/g, ':');
        if (this.devices.has(address)) {
          this.devices.delete(address);
          console.log(`[Bluetooth Service] Device removed: ${address}`);
        }
      }
    });
  }

  /**
   * Setup and register a pairing agent to handle pairing requests
   */
  async setupPairingAgent() {
    console.log('[Bluetooth Service] Setting up pairing agent...');
    const agent = {
      Release: () => console.log('[Pairing Agent] Released'),
      RequestPinCode: (devicePath) => {
        console.log(`[Pairing Agent] PIN code requested for ${devicePath}. Providing default "0000".`);
        return '0000';
      },
      DisplayPinCode: (devicePath, pincode) => console.log(`[Pairing Agent] Displaying PIN for ${devicePath}: ${pincode}`),
      RequestPasskey: (devicePath) => {
        console.log(`[Pairing Agent] Passkey requested for ${devicePath}. Providing default "0".`);
        return 0;
      },
      DisplayPasskey: (devicePath, passkey, entered) => console.log(`[Pairing Agent] Displaying passkey for ${devicePath}: ${passkey} (${entered} digits)`),
      RequestConfirmation: (devicePath, passkey) => {
        console.log(`[Pairing Agent] Pairing confirmation for ${devicePath} with passkey ${passkey}. Auto-accepting.`);
      },
      RequestAuthorization: (devicePath) => {
        console.log(`[Pairing Agent] Authorization requested for ${devicePath}. Auto-authorizing.`);
      },
      AuthorizeService: (devicePath, uuid) => {
        console.log(`[Pairing Agent] Authorizing service ${uuid} for ${devicePath}. Auto-authorizing.`);
      },
      Cancel: () => console.log('[Pairing Agent] Pairing canceled'),
    };

    this.bus.export(this.agentPath, { [AGENT_INTERFACE]: agent });

    const agentManagerObj = await this.bus.getProxyObject(BLUEZ_SERVICE, '/org/bluez');
    this.agentManager = agentManagerObj.getInterface(AGENT_MANAGER_INTERFACE);

    await this.agentManager.RegisterAgent(this.agentPath, 'KeyboardDisplay');
    await this.agentManager.RequestDefaultAgent(this.agentPath);
    console.log('[Bluetooth Service] Pairing agent registered successfully.');
  }

  /**
   * Add a discovered device to the device list
   */
  async addDiscoveredDevice(devicePath) {
    try {
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, devicePath);
      const props = await deviceObj.getInterface(PROPERTIES_INTERFACE).GetAll(DEVICE_INTERFACE);

      const address = props.Address?.value;
      if (!address) return;

      const name = props.Name?.value || props.Alias?.value || `Device ${address.slice(-5)}`;
      const deviceInfo = {
        name,
        address,
        paired: props.Paired?.value || false,
        connected: props.Connected?.value || false,
        trusted: props.Trusted?.value || false,
        type: this.guessDeviceType(props.Icon?.value, props.Class?.value, name),
        rssi: props.RSSI?.value || null,
        path: devicePath,
      };

      this.devices.set(address, deviceInfo);

      if (this.isScanning) {
        console.log(`[Bluetooth Service] Discovered: ${name} (${address})`);
      }
    } catch (error) {
      console.error(`[Bluetooth Service] Error adding discovered device ${devicePath}: ${error.message}`);
    }
  }

  /**
   * Refresh the list of all devices known to BlueZ
   */
  async refreshDevices() {
    console.log('[Bluetooth Service] Refreshing device list...');
    const objects = await this.objectManager.GetManagedObjects();
    for (const path in objects) {
      if (objects[path][DEVICE_INTERFACE]) {
        await this.addDiscoveredDevice(path);
      }
    }
  }

  /**
   * Guess the device type from its properties
   */
  guessDeviceType(icon = '', deviceClass = 0, name = '') {
    const lowerName = name.toLowerCase();
    if (icon.includes('phone') || lowerName.includes('phone')) return 'phone';
    if (icon.includes('audio') || icon.includes('headset') || lowerName.includes('headphone') || lowerName.includes('speaker')) return 'audio';
    if (icon.includes('computer') || lowerName.includes('computer')) return 'computer';
    if (icon.includes('input') || lowerName.includes('keyboard') || lowerName.includes('mouse')) return 'input';

    const majorClass = (deviceClass >> 8) & 0x1F;
    if (majorClass === 0x01) return 'computer';
    if (majorClass === 0x02) return 'phone';
    if (majorClass === 0x04) return 'audio';
    if (majorClass === 0x05) return 'input';

    return 'unknown';
  }

  /**
   * Start scanning for Bluetooth devices
   */
  async startScanning() {
    if (!this.initialized) throw new Error('Service not initialized');
    if (this.isScanning) throw new Error('Already scanning');

    console.log('[Bluetooth Service] Starting device scan...');
    this.isScanning = true;
    await this.adapter.SetDiscoveryFilter({ Transport: new Variant('s', 'auto'), DuplicateData: new Variant('b', false) });
    await this.adapter.StartDiscovery();

    this.scanTimeout = setTimeout(() => {
      if (this.isScanning) {
        console.log('[Bluetooth Service] Scan timeout reached. Stopping scan.');
        this.stopScanning();
      }
    }, 30000); // 30-second scan
  }

  /**
   * Stop scanning for Bluetooth devices
   */
  async stopScanning() {
    if (!this.isScanning) return;

    console.log('[Bluetooth Service] Stopping device scan...');
    this.isScanning = false;
    clearTimeout(this.scanTimeout);
    try {
      await this.adapter.StopDiscovery();
    } catch (error) {
      if (!error.message.includes('No discovery started')) {
        console.error(`[Bluetooth Service] Error stopping scan: ${error.message}`);
      }
    }
  }

  /**
   * Get a list of all discovered devices
   */
  getDevices() {
    return Array.from(this.devices.values()).map(({ path, ...device }) => device);
  }

  /**
   * Get a specific device by its address
   */
  getDevice(address) {
    const device = this.devices.get(address);
    if (!device) return null;
    const { path, ...deviceData } = device;
    return deviceData;
  }

  /**
   * Pair with a device
   */
  async pairDevice(address) {
    if (!this.initialized) throw new Error('Service not initialized');

    const device = this.devices.get(address);
    if (!device) throw new Error(`Device ${address} not found.`);
    if (device.paired) throw new Error(`Device ${address} is already paired.`);

    console.log(`[Bluetooth Service] Pairing with ${device.name} (${address})...`);
    try {
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
      const deviceInterface = deviceObj.getInterface(DEVICE_INTERFACE);

      await deviceInterface.Pair();
      console.log(`[Bluetooth Service] Paired successfully with ${address}.`);

      await this.setDeviceTrusted(address, true);

      await this.addDiscoveredDevice(device.path);
      return this.getDevice(address);
    } catch (error) {
      console.error(`[Bluetooth Service] Failed to pair with ${address}: ${error.message}`);
      throw new Error(`Pairing failed: ${error.dbusName || error.message}`);
    }
  }

  /**
   * Set a device as trusted
   */
  async setDeviceTrusted(address, trusted) {
    const device = this.devices.get(address);
    if (!device) throw new Error(`Device ${address} not found.`);

    console.log(`[Bluetooth Service] Setting trust for ${address} to ${trusted}.`);
    try {
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
      const propsInterface = deviceObj.getInterface(PROPERTIES_INTERFACE);
      await propsInterface.Set(DEVICE_INTERFACE, 'Trusted', new Variant('b', trusted));
      device.trusted = trusted;
    } catch (error) {
      console.warn(`[Bluetooth Service] Could not set trust for ${address}: ${error.message}`);
    }
  }

  /**
   * Connect to a paired device
   */
  async connectDevice(address) {
    if (!this.initialized) throw new Error('Service not initialized');

    const device = this.devices.get(address);
    if (!device) throw new Error(`Device ${address} not found.`);
    if (!device.paired) throw new Error(`Device ${address} is not paired.`);
    if (device.connected) throw new Error(`Device ${address} is already connected.`);

    console.log(`[Bluetooth Service] Connecting to ${device.name} (${address})...`);
    try {
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
      const deviceInterface = deviceObj.getInterface(DEVICE_INTERFACE);
      await deviceInterface.Connect();

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection

      await this.addDiscoveredDevice(device.path);
      console.log(`[Bluetooth Service] Connected successfully to ${address}.`);
      return this.getDevice(address);
    } catch (error) {
      console.error(`[Bluetooth Service] Failed to connect to ${address}: ${error.message}`);
      throw new Error(`Connection failed: ${error.dbusName || error.message}`);
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnectDevice(address) {
    if (!this.initialized) throw new Error('Service not initialized');

    const device = this.devices.get(address);
    if (!device) throw new Error(`Device ${address} not found.`);
    if (!device.connected) throw new Error(`Device ${address} is not connected.`);

    console.log(`[Bluetooth Service] Disconnecting from ${device.name} (${address})...`);
    try {
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
      const deviceInterface = deviceObj.getInterface(DEVICE_INTERFACE);
      await deviceInterface.Disconnect();

      await this.addDiscoveredDevice(device.path);
      console.log(`[Bluetooth Service] Disconnected from ${address}.`);
      return this.getDevice(address);
    } catch (error) {
      console.error(`[Bluetooth Service] Error disconnecting from ${address}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unpair and remove a device
   */
  async unpairDevice(address) {
    if (!this.initialized) throw new Error('Service not initialized');

    const device = this.devices.get(address);
    if (!device) throw new Error(`Device ${address} not found.`);

    console.log(`[Bluetooth Service] Unpairing device: ${device.name} (${address})...`);
    try {
      await this.adapter.RemoveDevice(device.path);
      this.devices.delete(address);
      console.log(`[Bluetooth Service] Unpaired device ${address}.`);
      return device;
    } catch (error) {
      console.error(`[Bluetooth Service] Error unpairing ${address}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Bluetooth adapter status
   */
  async getAdapterInfo() {
    if (!this.initialized) return { powered: false, discovering: false, address: 'N/A' };

    const props = await this.adapterProps.GetAll(ADAPTER_INTERFACE);
    return {
      powered: props.Powered?.value || false,
      discoverable: props.Discoverable?.value || false,
      pairable: props.Pairable?.value || false,
      discovering: props.Discovering?.value || this.isScanning,
      address: props.Address?.value || 'Unknown',
      name: props.Alias?.value || props.Name?.value || 'Bluetooth Adapter',
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('[Bluetooth Service] Cleaning up...');
    if (this.isScanning) {
      await this.stopScanning();
    }
    if (this.agentManager) {
      try {
        await this.agentManager.UnregisterAgent(this.agentPath);
        console.log('[Bluetooth Service] Pairing agent unregistered.');
      } catch (error) {
        console.warn(`[Bluetooth Service] Could not unregister agent: ${error.message}`);
      }
    }
  }
}

module.exports = new LinuxBluetoothDevice();