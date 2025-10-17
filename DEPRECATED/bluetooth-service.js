/**
 * Bluetooth Device Management Service - Linux Implementation
 *
 * This module directly loads the Linux implementation for Bluetooth services,
 * as the application is now targeted specifically for Linux environments.
 */

const platform = process.platform;

let bluetoothService;

if (platform === 'linux') {
  console.log('[Bluetooth Device] Loading Linux implementation (BlueZ/D-Bus)');
  bluetoothService = require('./bluetooth-device-linux');
} else {
  console.error(`[Bluetooth Device] Unsupported platform: ${platform}. This application is designed to run on Linux.`);

  // Provide a stub implementation for non-Linux environments
  class BluetoothServiceStub {
    initialize() { return Promise.reject(new Error('Unsupported platform')); }
    startScanning() { return Promise.reject(new Error('Unsupported platform')); }
    stopScanning() { return Promise.reject(new Error('Unsupported platform')); }
    getDevices() { return []; }
    getConnectedDevices() { return []; }
    pairDevice(address) { return Promise.reject(new Error('Unsupported platform')); }
    connectDevice(address) { return Promise.reject(new Error('Unsupported platform')); }
    disconnectDevice(address) { return Promise.reject(new Error('Unsupported platform')); }
    unpairDevice(address) { return Promise.reject(new Error('Unsupported platform')); }
    getAdapterInfo() { return { powered: false, discovering: false, address: 'N/A' }; }
    getCommandHistory() { return []; }
    clearHistory() {}
    cleanup() { return Promise.resolve(); }
  }

  bluetoothService = new BluetoothServiceStub();
}

module.exports = bluetoothService;