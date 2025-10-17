/**
 * Bluetooth Audio Service - Linux Implementation
 * Manages Bluetooth audio playback (AVRCP) via D-Bus on Linux.
 */

const dbus = require('dbus-next');
const { systemBus } = dbus;

// BlueZ D-Bus constants
const BLUEZ_SERVICE = 'org.bluez';
const MEDIA_PLAYER_INTERFACE = 'org.bluez.MediaPlayer1';
const OBJECT_MANAGER_INTERFACE = 'org.freedesktop.DBus.ObjectManager';
const PROPERTIES_INTERFACE = 'org.freedesktop.DBus.Properties';

class BluetoothAudioServiceLinux {
  constructor() {
    this.bus = null;
    this.objectManager = null;
    this.mediaPlayers = new Map(); // Tracks media players by device address
    this.activePlayerAddress = null;
    this.mediaState = {
      connected: false,
      isPlaying: false,
      track: {},
    };
    this.onStateChange = () => {}; // Callback for state changes
  }

  /**
   * Initialize the Bluetooth audio service
   */
  async initialize() {
    if (process.platform !== 'linux') {
      console.warn('[Bluetooth Audio] Service is intended for Linux only.');
      return;
    }
    console.log('[Bluetooth Audio] Initializing Linux D-Bus connection...');
    try {
      this.bus = systemBus();
      const bluezObj = await this.bus.getProxyObject(BLUEZ_SERVICE, '/');
      this.objectManager = bluezObj.getInterface(OBJECT_MANAGER_INTERFACE);
      this.setupMediaPlayersListener();
      await this.discoverMediaPlayers();
      console.log('[Bluetooth Audio] Initialized successfully.');
    } catch (error) {
      console.error(`[Bluetooth Audio] Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set up a listener for media player appearances and disappearances
   */
  setupMediaPlayersListener() {
    this.objectManager.on('InterfacesAdded', async (path, interfaces) => {
      if (interfaces[MEDIA_PLAYER_INTERFACE]) {
        console.log(`[Bluetooth Audio] New media player detected at ${path}`);
        await this.addMediaPlayer(path);
      }
    });

    this.objectManager.on('InterfacesRemoved', (path, interfaces) => {
      if (interfaces.includes(MEDIA_PLAYER_INTERFACE)) {
        console.log(`[Bluetooth Audio] Media player at ${path} was removed.`);
        this.removeMediaPlayer(path);
      }
    });
  }

  /**
   * Discover all existing media players
   */
  async discoverMediaPlayers() {
    console.log('[Bluetooth Audio] Discovering existing media players...');
    const objects = await this.objectManager.GetManagedObjects();
    for (const path in objects) {
      if (objects[path][MEDIA_PLAYER_INTERFACE]) {
        await this.addMediaPlayer(path);
      }
    }
  }

  /**
   * Add a media player to the service
   */
  async addMediaPlayer(path) {
    try {
      const playerObj = await this.bus.getProxyObject(BLUEZ_SERVICE, path);
      const playerProps = playerObj.getInterface(PROPERTIES_INTERFACE);
      const devicePath = (await playerProps.Get(MEDIA_PLAYER_INTERFACE, 'Device')).value;

      const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, devicePath);
      const deviceProps = await deviceObj.getInterface(PROPERTIES_INTERFACE).GetAll('org.bluez.Device1');
      const address = deviceProps.Address.value;

      console.log(`[Bluetooth Audio] Associated media player ${path} with device ${address}`);

      const player = {
        path,
        address,
        player: playerObj.getInterface(MEDIA_PLAYER_INTERFACE),
        props: playerProps,
      };

      this.mediaPlayers.set(address, player);

      // Listen for property changes (e.g., track change, play/pause)
      playerProps.on('PropertiesChanged', (iface, changed, invalidated) => {
        if (iface === MEDIA_PLAYER_INTERFACE) {
          console.log(`[Bluetooth Audio] Properties changed for ${address}`);
          this.updateMediaState(address, changed);
        }
      });

      // If this is the first or only player, make it active
      if (!this.activePlayerAddress) {
        this.setActivePlayer(address);
      }
    } catch (error) {
      console.error(`[Bluetooth Audio] Error adding media player ${path}: ${error.message}`);
    }
  }

  /**
   * Remove a media player from the service
   */
  removeMediaPlayer(path) {
    for (const [address, player] of this.mediaPlayers.entries()) {
      if (player.path === path) {
        this.mediaPlayers.delete(address);
        console.log(`[Bluetooth Audio] Removed media player for device ${address}`);
        if (this.activePlayerAddress === address) {
          this.setActivePlayer(null); // Clear active player
        }
        break;
      }
    }
  }

  /**
   * Set the active media player
   */
  setActivePlayer(address) {
    if (this.activePlayerAddress === address) return;

    this.activePlayerAddress = address;
    console.log(`[Bluetooth Audio] Active media player set to: ${address || 'None'}`);

    if (address) {
      this.updateMediaState(address);
    } else {
      this.mediaState = { connected: false, isPlaying: false, track: {} };
      this.onStateChange(this.mediaState);
    }
  }

  /**
   * Update the media state from a player's properties
   */
  async updateMediaState(address, changedProps = null) {
    const player = this.mediaPlayers.get(address);
    if (!player || address !== this.activePlayerAddress) return;

    try {
      const props = changedProps || await player.props.GetAll(MEDIA_PLAYER_INTERFACE);

      const status = props.Status?.value || 'stopped';
      const track = props.Track?.value || {};
      const position = props.Position?.value || 0;

      this.mediaState = {
        connected: true,
        device: address,
        isPlaying: status === 'playing',
        track: {
          title: track.Title?.value || 'Unknown Title',
          artist: track.Artist?.value || 'Unknown Artist',
          album: track.Album?.value || 'Unknown Album',
          duration: track.Duration?.value ? track.Duration.value / 1000 : 0,
          position: position / 1000,
        },
      };

      this.onStateChange(this.mediaState);
      console.log(`[Bluetooth Audio] State updated for ${address}: ${status}`);
    } catch (error) {
      console.error(`[Bluetooth Audio] Error updating media state for ${address}: ${error.message}`);
    }
  }

  /**
   * Get the current media state
   */
  getMediaState() {
    return this.mediaState;
  }

  /**
   * Send a media control command to the active player
   */
  async sendMediaControl(command) {
    if (!this.activePlayerAddress) throw new Error('No active media player.');

    const player = this.mediaPlayers.get(this.activePlayerAddress);
    if (!player) throw new Error('Active media player not found.');

    try {
      console.log(`[Bluetooth Audio] Sending command "${command}" to ${this.activePlayerAddress}`);
      await player.player[command]();
      return { success: true, command };
    } catch (error) {
      console.error(`[Bluetooth Audio] Media control '${command}' failed: ${error.message}`);
      throw new Error(`Command failed: ${error.dbusName || error.message}`);
    }
  }

  // Public playback controls
  async play() { return this.sendMediaControl('Play'); }
  async pause() { return this.sendMediaControl('Pause'); }
  async stop() { return this.sendMediaControl('Stop'); }
  async next() { return this.sendMediaControl('Next'); }
  async previous() { return this.sendMediaControl('Previous'); }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('[Bluetooth Audio] Service cleaned up.');
  }
}

// Export a singleton instance based on platform
let serviceInstance;
if (process.platform === 'linux') {
  serviceInstance = new BluetoothAudioServiceLinux();
} else {
  // Stub service for non-Linux platforms
  serviceInstance = {
    initialize: async () => {},
    getMediaState: () => ({ connected: false, isPlaying: false, track: {} }),
    play: async () => console.warn('Not on Linux'),
    pause: async () => console.warn('Not on Linux'),
    stop: async () => console.warn('Not on Linux'),
    next: async () => console.warn('Not on Linux'),
    previous: async () => console.warn('Not on Linux'),
    cleanup: () => {},
    onStateChange: () => {},
  };
}

module.exports = serviceInstance;