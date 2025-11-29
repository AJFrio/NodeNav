/**
 * Bluetooth Device Management Service - Platform detector and loader
 * 
 * This module detects the platform and loads the appropriate implementation:
 * - Windows: PowerShell + Windows Device Management APIs
 * - Linux: bluetoothctl (BlueZ)
 * - Simulation: Mock devices for development/testing
 */

const platform = process.platform;

// Determine which implementation to use
let bluetoothService;

if (platform === 'linux') {
  console.log('[Bluetooth Device] Loading Linux implementation (BlueZ/D-Bus)');
  bluetoothService = require('./bluetooth-device-linux');
} else {
  console.log('[Bluetooth Device] Unsupported platform, using simulation mode');
  
  // Fallback simulation for unsupported platforms
  class BluetoothServiceSimulation {
    constructor() {
      this.devices = new Map();
      this.isScanning = false;
      this.log = [];
      this.mediaState = {
        connected: false,
        isPlaying: false,
        track: {
          title: 'Simulation Song',
          artist: 'Simulation Artist',
          album: 'Simulation Album',
          duration: 180,
          position: 0
        }
      };
      
      // Mock device
      this.devices.set('AA:BB:CC:DD:EE:11', {
        name: 'Mock Phone',
        address: 'AA:BB:CC:DD:EE:11',
        paired: true,
        connected: false,
        type: 'phone',
        lastSeen: new Date().toISOString()
      });
    }

    initialize() {
      console.log('[Bluetooth Device] Initialized (simulation mode)');
      return Promise.resolve();
    }

    async startScanning() {
      this.isScanning = true;
      return Promise.resolve();
    }

    async stopScanning() {
      this.isScanning = false;
      return Promise.resolve();
    }

    getDevices() {
      return Array.from(this.devices.values());
    }

    getConnectedDevices() {
      return Array.from(this.devices.values()).filter(d => d.connected);
    }

    async pairDevice(address) {
      const device = this.devices.get(address);
      if (device) {
        device.paired = true;
        return device;
      }
      throw new Error('Device not found');
    }

    async connectDevice(address) {
      const device = this.devices.get(address);
      if (device) {
        device.connected = true;
        this.mediaState.connected = true;
        return device;
      }
      throw new Error('Device not found');
    }

    async disconnectDevice(address) {
      const device = this.devices.get(address);
      if (device) {
        device.connected = false;
        this.mediaState.connected = false;
        this.mediaState.isPlaying = false;
        return device;
      }
      throw new Error('Device not found');
    }

    async unpairDevice(address) {
      const device = this.devices.get(address);
      if (device) {
        device.paired = false;
        return device;
      }
      throw new Error('Device not found');
    }

    getAdapterInfo() {
      return {
        powered: true,
        discoverable: false,
        discovering: this.isScanning,
        address: 'Simulation'
      };
    }

    getCommandHistory() {
      return [];
    }

    clearHistory() {}

    cleanup() {
      return Promise.resolve();
    }

    // Audio / Media Methods
    async connectAudioDevice(address) {
      return this.connectDevice(address);
    }

    async getMediaState() {
      if (this.mediaState.isPlaying) {
        this.mediaState.track.position = (this.mediaState.track.position + 1) % this.mediaState.track.duration;
      }
      return this.mediaState;
    }

    async play() {
      this.mediaState.isPlaying = true;
      return { success: true };
    }

    async pause() {
      this.mediaState.isPlaying = false;
      return { success: true };
    }

    async next() {
      this.mediaState.track.title = `Song ${Math.floor(Math.random() * 100)}`;
      this.mediaState.track.position = 0;
      return { success: true };
    }

    async previous() {
      this.mediaState.track.position = 0;
      return { success: true };
    }

    async stop() {
      this.mediaState.isPlaying = false;
      this.mediaState.track.position = 0;
      return { success: true };
    }
  }

  bluetoothService = new BluetoothServiceSimulation();
}

// Export the platform-specific service
module.exports = bluetoothService;
