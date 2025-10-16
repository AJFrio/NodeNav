/**
 * Bluetooth Audio Service - Platform detector and loader
 * 
 * This module detects the platform and loads the appropriate implementation:
 * - Linux: bluetoothctl + PulseAudio/PipeWire
 * - Windows: PowerShell + Windows Runtime APIs
 * - macOS: Native implementation (to be added)
 */

const platform = process.platform;

// Load platform-specific implementation
let bluetoothAudioService;

if (platform === 'linux') {
  console.log('[Bluetooth Audio] Loading Linux implementation');
  
  // Keep the Linux implementation here
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  class BluetoothAudioServiceLinux {
    constructor() {
      this.connectedDevice = null;
      this.mediaState = {
        isPlaying: false,
        track: {
          title: 'Unknown',
          artist: 'Unknown',
          album: 'Unknown',
          duration: 0,
          position: 0
        }
      };
      this.audioStreamActive = false;
      
      // Polling interval for metadata updates
      this.metadataInterval = null;
      this.positionInterval = null;
    }

  /**
   * Initialize the Bluetooth audio service (Linux)
   */
  async initialize() {
    console.log('[Bluetooth Audio Linux] Initializing...');
    
    try {
      await this.initializeLinux();
      console.log('[Bluetooth Audio Linux] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Bluetooth Audio Linux] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize for Linux (using bluetoothctl and PulseAudio/PipeWire)
   */
  async initializeLinux() {
    // Check if bluetoothctl is available
    try {
      await execAsync('which bluetoothctl');
      console.log('[Bluetooth Audio] bluetoothctl found');
    } catch (error) {
      throw new Error('bluetoothctl not found. Install bluez package.');
    }

    // Check for audio system (PulseAudio or PipeWire)
    try {
      await execAsync('which pactl');
      console.log('[Bluetooth Audio] PulseAudio found');
    } catch (error) {
      console.warn('[Bluetooth Audio] PulseAudio not found, audio routing may not work');
    }
  }


  /**
   * Connect to a Bluetooth audio device (Linux)
   */
  async connectAudioDevice(deviceAddress) {
    console.log(`[Bluetooth Audio Linux] Connecting to device: ${deviceAddress}`);
    
    try {
      return await this.connectLinux(deviceAddress);
    } catch (error) {
      console.error('[Bluetooth Audio Linux] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Connect on Linux using bluetoothctl
   */
  async connectLinux(deviceAddress) {
    try {
      // Connect to device
      const { stdout } = await execAsync(`echo "connect ${deviceAddress}" | bluetoothctl`);
      console.log('[Bluetooth Audio] Connect output:', stdout);

      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Trust the device
      await execAsync(`echo "trust ${deviceAddress}" | bluetoothctl`);

      // Set as A2DP sink
      await execAsync(`pactl set-card-profile bluez_card.${deviceAddress.replace(/:/g, '_')} a2dp_sink`).catch(() => {
        console.warn('[Bluetooth Audio] Could not set A2DP profile, device may already be configured');
      });

      this.connectedDevice = deviceAddress;
      this.audioStreamActive = true;

      // Start monitoring metadata
      this.startMetadataMonitoring();

      return { success: true, device: deviceAddress };
    } catch (error) {
      console.error('[Bluetooth Audio] Linux connection error:', error);
      throw error;
    }
  }


  /**
   * Disconnect from current audio device
   */
  async disconnectAudioDevice() {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    console.log(`[Bluetooth Audio] Disconnecting from: ${this.connectedDevice}`);

    try {
      if (this.platform === 'linux') {
        await execAsync(`echo "disconnect ${this.connectedDevice}" | bluetoothctl`);
      }

      this.stopMetadataMonitoring();
      this.connectedDevice = null;
      this.audioStreamActive = false;

      return { success: true };
    } catch (error) {
      console.error('[Bluetooth Audio] Disconnect error:', error);
      throw error;
    }
  }

  /**
   * Start monitoring metadata from connected device (AVRCP)
   */
  startMetadataMonitoring() {
    if (this.metadataInterval) {
      clearInterval(this.metadataInterval);
    }

    // Poll for metadata updates every 2 seconds
    this.metadataInterval = setInterval(async () => {
      try {
        await this.updateMetadata();
      } catch (error) {
        console.error('[Bluetooth Audio] Metadata update failed:', error);
      }
    }, 2000);

    // Update position every second when playing
    this.positionInterval = setInterval(() => {
      if (this.mediaState.isPlaying) {
        this.mediaState.track.position = Math.min(
          this.mediaState.track.position + 1,
          this.mediaState.track.duration
        );
      }
    }, 1000);
  }

  /**
   * Stop monitoring metadata
   */
  stopMetadataMonitoring() {
    if (this.metadataInterval) {
      clearInterval(this.metadataInterval);
      this.metadataInterval = null;
    }
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }

  /**
   * Update metadata from device using AVRCP (Linux)
   */
  async updateMetadata() {
    if (!this.connectedDevice) {
      return;
    }

    try {
      // Get device info including media player metadata
      const { stdout } = await execAsync(
        `echo "info ${this.connectedDevice}" | bluetoothctl | grep -A 20 "Player"`
      );

      // Parse metadata from bluetoothctl output
      const titleMatch = stdout.match(/Title: (.+)/);
      const artistMatch = stdout.match(/Artist: (.+)/);
      const albumMatch = stdout.match(/Album: (.+)/);
      const durationMatch = stdout.match(/Duration: (\d+)/);
      const positionMatch = stdout.match(/Position: (\d+)/);
      const statusMatch = stdout.match(/Status: (\w+)/);

      if (titleMatch || artistMatch || albumMatch) {
        this.mediaState.track = {
          title: titleMatch ? titleMatch[1].trim() : this.mediaState.track.title,
          artist: artistMatch ? artistMatch[1].trim() : this.mediaState.track.artist,
          album: albumMatch ? albumMatch[1].trim() : this.mediaState.track.album,
          duration: durationMatch ? parseInt(durationMatch[1]) / 1000 : this.mediaState.track.duration,
          position: positionMatch ? parseInt(positionMatch[1]) / 1000 : this.mediaState.track.position
        };
      }

      if (statusMatch) {
        this.mediaState.isPlaying = statusMatch[1].toLowerCase() === 'playing';
      }
    } catch (error) {
      // Metadata not available or parsing failed (normal when phone isn't playing)
      // Don't log this as an error
    }
  }

  /**
   * Get current media state
   */
  getMediaState() {
    return {
      connected: !!this.connectedDevice,
      device: this.connectedDevice,
      audioActive: this.audioStreamActive,
      ...this.mediaState
    };
  }

  /**
   * Send AVRCP command to device (Linux)
   */
  async sendMediaControl(command) {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    console.log(`[Bluetooth Audio Linux] Sending control: ${command}`);

    try {
      // Send media control command via bluetoothctl
      await execAsync(`echo "player.${command}" | bluetoothctl`);
      
      // Update state immediately
      if (command === 'play') {
        this.mediaState.isPlaying = true;
      } else if (command === 'pause') {
        this.mediaState.isPlaying = false;
      }

      // Refresh metadata after control change
      setTimeout(() => this.updateMetadata(), 500);
      
      return { success: true, command };
    } catch (error) {
      console.error('[Bluetooth Audio Linux] Media control failed:', error);
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
    this.stopMetadataMonitoring();
    console.log('[Bluetooth Audio Linux] Service cleaned up');
  }
}

  // Export Linux implementation
  bluetoothAudioService = new BluetoothAudioServiceLinux();
  
} else if (platform === 'darwin') {
  console.warn('[Bluetooth Audio] macOS implementation not yet available');
  // Placeholder for macOS
  bluetoothAudioService = {
    initialize: async () => { throw new Error('macOS not yet implemented'); },
    connectAudioDevice: async () => { throw new Error('macOS not yet implemented'); },
    disconnectAudioDevice: async () => { throw new Error('macOS not yet implemented'); },
    getMediaState: () => ({ connected: false, isPlaying: false, track: null }),
    play: async () => { throw new Error('macOS not yet implemented'); },
    pause: async () => { throw new Error('macOS not yet implemented'); },
    next: async () => { throw new Error('macOS not yet implemented'); },
    previous: async () => { throw new Error('macOS not yet implemented'); },
    stop: async () => { throw new Error('macOS not yet implemented'); },
    cleanup: () => {}
  };
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
