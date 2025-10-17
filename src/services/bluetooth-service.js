/**
 * Consolidated Linux Bluetooth Service
 * Manages all Bluetooth functionalities including device management (discovery, pairing, connection)
 * and audio control (AVRCP) using BlueZ via D-Bus.
 */

const dbus = require('dbus-next');
const { systemBus, Variant } = dbus;

// D-Bus constants
const BLUEZ_SERVICE = 'org.bluez';
const ADAPTER_INTERFACE = 'org.bluez.Adapter1';
const DEVICE_INTERFACE = 'org.bluez.Device1';
const MEDIA_PLAYER_INTERFACE = 'org.bluez.MediaPlayer1';
const OBJECT_MANAGER_INTERFACE = 'org.freedesktop.DBus.ObjectManager';
const PROPERTIES_INTERFACE = 'org.freedesktop.DBus.Properties';
const AGENT_MANAGER_INTERFACE = 'org.bluez.AgentManager1';
const AGENT_INTERFACE = 'org.bluez.Agent1';

class BluetoothService {
  constructor() {
    this.bus = null;
    this.objectManager = null;
    this.adapter = null;
    this.adapterPath = null;
    this.agentManager = null;
    this.agentPath = '/org/bluez/agent/nodenav';

    this.devices = new Map();
    this.mediaPlayers = new Map();

    this.isScanning = false;
    this.activePlayerAddress = null;

    this.onDeviceUpdate = () => {};
    this.onMediaStateChange = () => {};

    this.mediaState = {
      connected: false,
      isPlaying: false,
      track: {},
    };
  }

  /**
   * Initialize the entire Bluetooth service
   */
  async initialize() {
    if (process.platform !== 'linux') {
      console.warn('[Bluetooth] Service is designed for Linux only. Skipping initialization.');
      return;
    }
    console.log('[Bluetooth] Initializing Linux Bluetooth service (D-Bus)...');
    try {
      this.bus = systemBus();
      const bluezObj = await this.bus.getProxyObject(BLUEZ_SERVICE, '/');
      this.objectManager = bluezObj.getInterface(OBJECT_MANAGER_INTERFACE);

      await this.findAdapter();
      if (!this.adapter) throw new Error('No Bluetooth adapter found.');

      await this.configureAdapter();
      await this.setupPairingAgent();

      this.setupEventListeners();
      await this.loadExistingDevices();

      console.log(`[Bluetooth] Initialized successfully using adapter ${this.adapterPath}.`);
    } catch (error) {
      console.error(`[Bluetooth] Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find and set up the primary Bluetooth adapter
   */
  async findAdapter() {
    const objects = await this.objectManager.GetManagedObjects();
    for (const path in objects) {
      if (objects[path][ADAPTER_INTERFACE]) {
        this.adapterPath = path;
        const adapterObj = await this.bus.getProxyObject(BLUEZ_SERVICE, path);
        this.adapter = adapterObj.getInterface(ADAPTER_INTERFACE);
        this.adapterProps = adapterObj.getInterface(PROPERTIES_INTERFACE);
        console.log(`[Bluetooth] Found adapter: ${path}`);
        return;
      }
    }
  }

  /**
   * Configure adapter properties (power, discoverability, etc.)
   */
  async configureAdapter() {
    const setProp = async (prop, value) => {
      try {
        await this.adapterProps.Set(ADAPTER_INTERFACE, prop, value);
      } catch (error) {
        console.warn(`[Bluetooth] Could not set adapter property ${prop}: ${error.message}`);
      }
    };

    await setProp('Powered', new Variant('b', true));
    await setProp('Discoverable', new Variant('b', true));
    await setProp('Pairable', new Variant('b', true));
    await setProp('Alias', new Variant('s', 'NodeNav Headunit'));
  }

  /**
   * Set up and register a D-Bus agent to handle pairing requests
   */
  async setupPairingAgent() {
    const agent = {
      Release: () => console.log('[Pairing Agent] Released'),
      RequestConfirmation: (devicePath, passkey) => {
        console.log(`[Pairing Agent] Auto-confirming pairing for ${devicePath} with passkey ${passkey}.`);
      },
      RequestAuthorization: (devicePath) => {
        console.log(`[Pairing Agent] Auto-authorizing connection for ${devicePath}.`);
      },
      AuthorizeService: (devicePath, uuid) => {
        console.log(`[Pairing Agent] Auto-authorizing service ${uuid} for ${devicePath}.`);
      },
      Cancel: () => console.log('[Pairing Agent] Pairing canceled.'),
    };

    this.bus.export(this.agentPath, { [AGENT_INTERFACE]: agent });
    const agentManagerObj = await this.bus.getProxyObject(BLUEZ_SERVICE, '/org/bluez');
    this.agentManager = agentManagerObj.getInterface(AGENT_MANAGER_INTERFACE);
    await this.agentManager.RegisterAgent(this.agentPath, 'KeyboardDisplay');
    await this.agentManager.RequestDefaultAgent(this.agentPath);
    console.log('[Bluetooth] Pairing agent registered.');
  }

  /**
   * Set up listeners for D-Bus signals (interfaces added/removed)
   */
  setupEventListeners() {
    this.objectManager.on('InterfacesAdded', this.handleInterfaceAdded.bind(this));
    this.objectManager.on('InterfacesRemoved', this.handleInterfaceRemoved.bind(this));
  }

  /**
   * Handle the appearance of a new D-Bus interface
   */
  async handleInterfaceAdded(path, interfaces) {
    if (interfaces[DEVICE_INTERFACE]) {
      console.log(`[Bluetooth] New device interface detected: ${path}`);
      await this.addOrUpdateDevice(path);
    } else if (interfaces[MEDIA_PLAYER_INTERFACE]) {
      console.log(`[Bluetooth] New media player detected: ${path}`);
      await this.addMediaPlayer(path);
    }
  }

  /**
   * Handle the disappearance of a D-Bus interface
   */
  handleInterfaceRemoved(path, interfaces) {
    if (interfaces.includes(DEVICE_INTERFACE)) {
      const address = Array.from(this.devices.values()).find(d => d.path === path)?.address;
      if (address) {
        this.devices.delete(address);
        console.log(`[Bluetooth] Device removed: ${address}`);
        this.onDeviceUpdate();
      }
    } else if (interfaces.includes(MEDIA_PLAYER_INTERFACE)) {
      this.removeMediaPlayer(path);
    }
  }

  /**
   * Load all existing devices and media players from BlueZ
   */
  async loadExistingDevices() {
    const objects = await this.objectManager.GetManagedObjects();
    for (const path in objects) {
      if (objects[path][DEVICE_INTERFACE]) await this.addOrUpdateDevice(path);
      if (objects[path][MEDIA_PLAYER_INTERFACE]) await this.addMediaPlayer(path);
    }
  }

  /**
   * Add or update a device in the local cache
   */
  async addOrUpdateDevice(path) {
    try {
      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, path);
      const props = await deviceObj.getInterface(PROPERTIES_INTERFACE).GetAll(DEVICE_INTERFACE);

      const address = props.Address?.value;
      if (!address) return;

      const deviceInfo = {
        path,
        address,
        name: props.Name?.value || props.Alias?.value || 'Unknown Device',
        paired: props.Paired?.value || false,
        connected: props.Connected?.value || false,
        trusted: props.Trusted?.value || false,
        type: this.guessDeviceType(props.Icon?.value, props.Class?.value),
      };

      this.devices.set(address, deviceInfo);
      this.onDeviceUpdate();
    } catch (error) {
      console.error(`[Bluetooth] Error updating device ${path}: ${error.message}`);
    }
  }

  /**
   * Add a media player and associate it with a device
   */
  async addMediaPlayer(path) {
    try {
      const playerObj = await this.bus.getProxyObject(BLUEZ_SERVICE, path);
      const props = playerObj.getInterface(PROPERTIES_INTERFACE);
      const devicePath = (await props.Get(MEDIA_PLAYER_INTERFACE, 'Device')).value;
      const address = Array.from(this.devices.values()).find(d => d.path === devicePath)?.address;

      if (!address) {
        console.warn(`[Bluetooth] Media player ${path} found for an unknown device.`);
        return;
      }

      const player = {
        path,
        address,
        player: playerObj.getInterface(MEDIA_PLAYER_INTERFACE),
        props,
      };

      this.mediaPlayers.set(address, player);
      props.on('PropertiesChanged', (iface, changed) => {
        if (iface === MEDIA_PLAYER_INTERFACE) this.updateMediaState(address, changed);
      });

      if (!this.activePlayerAddress) this.setActivePlayer(address);
      console.log(`[Bluetooth] Media player for ${address} is ready.`);
    } catch (error) {
      console.error(`[Bluetooth] Error adding media player ${path}: ${error.message}`);
    }
  }

  /**
   * Remove a media player
   */
  removeMediaPlayer(path) {
    const player = Array.from(this.mediaPlayers.values()).find(p => p.path === path);
    if (player) {
      this.mediaPlayers.delete(player.address);
      if (this.activePlayerAddress === player.address) this.setActivePlayer(null);
      console.log(`[Bluetooth] Media player for ${player.address} removed.`);
    }
  }

  /**
   * Set the active media player for controls
   */
  setActivePlayer(address) {
    this.activePlayerAddress = address;
    console.log(`[Bluetooth] Active media player set to: ${address || 'None'}`);
    this.updateMediaState(address);
  }

  /**
   * Update the global media state from player properties
   */
  async updateMediaState(address, props = null) {
    if (address !== this.activePlayerAddress) return;

    const player = this.mediaPlayers.get(address);
    if (!player) {
      this.mediaState = { connected: false, isPlaying: false, track: {} };
    } else {
      const allProps = props || await player.props.GetAll(MEDIA_PLAYER_INTERFACE);
      const status = allProps.Status?.value || 'stopped';
      const track = allProps.Track?.value || {};

      this.mediaState = {
        connected: true,
        device: address,
        isPlaying: status === 'playing',
        track: {
          title: track.Title?.value || 'Unknown Title',
          artist: track.Artist?.value || 'Unknown Artist',
          album: track.Album?.value || 'Unknown Album',
          duration: (track.Duration?.value || 0) / 1000,
          position: (allProps.Position?.value || 0) / 1000,
        },
      };
    }
    this.onMediaStateChange(this.mediaState);
  }

  /**
   * Guess device type from icon or class
   */
  guessDeviceType(icon = '', deviceClass = 0) {
    if (icon.includes('phone')) return 'phone';
    if (icon.includes('audio')) return 'audio';
    const majorClass = (deviceClass >> 8) & 0x1F;
    if (majorClass === 0x02) return 'phone';
    if (majorClass === 0x04) return 'audio';
    return 'unknown';
  }

  // --- Public API ---

  async startScanning() {
    if (this.isScanning) return;
    this.isScanning = true;
    await this.adapter.StartDiscovery();
    console.log('[Bluetooth] Started device scan.');
  }

  async stopScanning() {
    if (!this.isScanning) return;
    this.isScanning = false;
    await this.adapter.StopDiscovery();
    console.log('[Bluetooth] Stopped device scan.');
  }

  async pairDevice(address) {
    const device = this.devices.get(address);
    if (!device) throw new Error('Device not found.');
    if (device.paired) return;

    console.log(`[Bluetooth] Pairing with ${address}...`);
    const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
    await deviceObj.getInterface(DEVICE_INTERFACE).Pair();

    // Crucially, set the device as trusted to complete the bonding process
    await deviceObj.getInterface(PROPERTIES_INTERFACE).Set(DEVICE_INTERFACE, 'Trusted', new Variant('b', true));
    console.log(`[Bluetooth] Device ${address} paired and trusted.`);
  }

  async connectDevice(address) {
    const device = this.devices.get(address);
    if (!device) throw new Error('Device not found.');
    if (device.connected) return;

    console.log(`[Bluetooth] Connecting to ${address}...`);
    const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
    await deviceObj.getInterface(DEVICE_INTERFACE).Connect();
    this.setActivePlayer(address);
  }

  async disconnectDevice(address) {
    const device = this.devices.get(address);
    if (!device || !device.connected) return;

    console.log(`[Bluetooth] Disconnecting from ${address}...`);
    const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, device.path);
    await deviceObj.getInterface(DEVICE_INTERFACE).Disconnect();
  }

  async unpairDevice(address) {
    const device = this.devices.get(address);
    if (!device) return;

    console.log(`[Bluetooth] Unpairing ${address}...`);
    await this.adapter.RemoveDevice(device.path);
  }

  getDevices() {
    return Array.from(this.devices.values()).map(({ path, ...device }) => device);
  }

  getMediaState() {
    return this.mediaState;
  }

  async sendMediaControl(command) {
    if (!this.activePlayerAddress) throw new Error('No active media player.');
    const player = this.mediaPlayers.get(this.activePlayerAddress);
    if (!player) throw new Error('Media player not found.');

    await player.player[command]();
  }

  async play() { await this.sendMediaControl('Play'); }
  async pause() { await this.sendMediaControl('Pause'); }
  async next() { await this.sendMediaControl('Next'); }
  async previous() { await this.sendMediaControl('Previous'); }

  async cleanup() {
    console.log('[Bluetooth] Cleaning up...');
    if (this.agentManager) await this.agentManager.UnregisterAgent(this.agentPath);
    if (this.isScanning) await this.stopScanning();
  }
}

// Singleton instance
let serviceInstance;
if (process.platform === 'linux') {
  serviceInstance = new BluetoothService();
} else {
  // Stub for non-Linux environments
  serviceInstance = new (class BluetoothServiceStub {
    initialize = async () => {};
    getDevices = () => [];
    getMediaState = () => ({ connected: false, isPlaying: false, track: {} });
    startScanning = async () => {};
    stopScanning = async () => {};
    pairDevice = async () => {};
    connectDevice = async () => {};
    disconnectDevice = async () => {};
    unpairDevice = async () => {};
    play = async () => {};
    pause = async () => {};
    next = async () => {};
    previous = async () => {};
    cleanup = async () => {};
    onDeviceUpdate = () => {};
    onMediaStateChange = () => {};
  })();
}

module.exports = serviceInstance;