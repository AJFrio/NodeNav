/**
 * Bluetooth Audio Service - Platform detector and loader
 * 
 * This module detects the platform and loads the appropriate implementation:
 * - Linux: D-Bus (BlueZ)
 */

const platform = process.platform;

// Load platform-specific implementation
let bluetoothAudioService;

if (platform === 'linux') {
  console.log('[Bluetooth Audio] Loading Linux implementation (D-Bus)');
  
  const dbus = require('dbus-next');
  const { systemBus, Variant } = dbus;

  // BlueZ D-Bus constants
  const BLUEZ_SERVICE = 'org.bluez';
  const MEDIA_PLAYER_INTERFACE = 'org.bluez.MediaPlayer1';
  const OBJECT_MANAGER_INTERFACE = 'org.freedesktop.DBus.ObjectManager';
  const PROPERTIES_INTERFACE = 'org.freedesktop.DBus.Properties';

  class BluetoothAudioServiceLinux {
    constructor() {
      this.bus = null;
      this.objectManager = null;
      this.mediaPlayers = new Map(); // Track media players by device address
      this.currentMediaPlayer = null;
    }

    /**
     * Initialize the Bluetooth audio service (Linux)
     */
    async initialize() {
      console.log('[Bluetooth Audio Linux] Initializing...');
      try {
        this.bus = systemBus();
        const bluezObj = await this.bus.getProxyObject(BLUEZ_SERVICE, '/');
        this.objectManager = bluezObj.getInterface(OBJECT_MANAGER_INTERFACE);
        console.log('[Bluetooth Audio Linux] Initialized successfully');
        return true;
      } catch (error) {
        console.error('[Bluetooth Audio Linux] Initialization failed:', error);
        throw error;
      }
    }

    /**
     * Connect to a Bluetooth audio device (Linux)
     */
    async connectAudioDevice(deviceAddress) {
      console.log(`[Bluetooth Audio Linux] Connecting to device: ${deviceAddress}`);
      try {
        const found = await this.findMediaPlayer(deviceAddress);
        return { success: found, device: deviceAddress };
      } catch (error) {
        console.error('[Bluetooth Audio Linux] Connection failed:', error);
        throw error;
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
            const playerDevicePath = (await this.bus.getProxyObject(BLUEZ_SERVICE, path).then(obj => obj.getInterface(PROPERTIES_INTERFACE).Get(MEDIA_PLAYER_INTERFACE, 'Device'))).value;
            const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE, playerDevicePath);
            const deviceProps = await deviceObj.getInterface(PROPERTIES_INTERFACE).GetAll('org.bluez.Device1');
            const address = deviceProps.Address.value;

            if (address.toLowerCase() === deviceAddress.toLowerCase()) {
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
     * Get current media state
     */
    async getMediaState() {
      const address = this.currentMediaPlayer;

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

      try {
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
     * Send AVRCP command to device (Linux)
     */
    async sendMediaControl(command) {
      const address = this.currentMediaPlayer;

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

    /**
     * Play
     */
    async play() {
      return this.sendMediaControl('play');
    }

    /**
     * Pause
     */
    async pause() {
      return this.sendMediaControl('pause');
    }

    /**
     * Next track
     */
    async next() {
      return this.sendMediaControl('next');
    }

    /**
     * Previous track
     */
    async previous() {
      return this.sendMediaControl('previous');
    }

    /**
     * Stop playback
     */
    async stop() {
      return this.sendMediaControl('stop');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
      console.log('[Bluetooth Audio Linux] Service cleaned up');
    }
  }

  // Export Linux implementation
  bluetoothAudioService = new BluetoothAudioServiceLinux();
  
} else {
  console.error(`[Bluetooth Audio] Unsupported platform: ${platform}`);
  bluetoothAudioService = {
    initialize: async () => { throw new Error('Platform not supported'); },
    connectAudioDevice: async () => { throw new Error('Platform not supported'); },
    disconnectAudioDevice: async () => { throw new Error('Platform not supported'); },
    getMediaState: () => ({ connected: false, isPlaying: false, track: null }),
    play: async () => { throw new Error('Platform not supported'); },
    pause: async () => { throw new Error('Platform not supported'); },
    next: async () => { throw new Error('Platform not supported'); },
    previous: async () => { throw new Error('Platform not supported'); },
    stop: async () => { throw new Error('Platform not supported'); },
    cleanup: () => {}
  };
}

// Export the platform-specific service
module.exports = bluetoothAudioService;