/**
 * API service for communicating with the GPIO backend
 */
const API_BASE_URL = 'http://localhost:3001/api';

class GPIOAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Pin state management
  async getAllPinStates() {
    return this.request('/pins');
  }

  async getPinState(pin) {
    return this.request(`/pins/${pin}`);
  }

  async setPinMode(pin, mode) {
    return this.request(`/pins/${pin}/mode`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async digitalWrite(pin, value) {
    return this.request(`/pins/${pin}/write`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  }

  async pwmWrite(pin, value) {
    return this.request(`/pins/${pin}/pwm`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  }

  // History management
  async getCommandHistory() {
    return this.request('/history');
  }

  async clearCommandHistory() {
    return this.request('/history', {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

/**
 * Bluetooth API service
 */
class BluetoothAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Bluetooth API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Adapter management
  async getAdapterInfo() {
    return this.request('/bluetooth/adapter');
  }

  // Device management
  async getDevices() {
    return this.request('/bluetooth/devices');
  }

  async getConnectedDevices() {
    return this.request('/bluetooth/devices/connected');
  }

  async startScanning() {
    return this.request('/bluetooth/scan/start', {
      method: 'POST',
    });
  }

  async stopScanning() {
    return this.request('/bluetooth/scan/stop', {
      method: 'POST',
    });
  }

  async pairDevice(address) {
    return this.request(`/bluetooth/devices/${address}/pair`, {
      method: 'POST',
    });
  }

  async connectDevice(address) {
    return this.request(`/bluetooth/devices/${address}/connect`, {
      method: 'POST',
    });
  }

  async disconnectDevice(address) {
    return this.request(`/bluetooth/devices/${address}/disconnect`, {
      method: 'POST',
    });
  }

  async unpairDevice(address) {
    return this.request(`/bluetooth/devices/${address}`, {
      method: 'DELETE',
    });
  }

  // History management
  async getBluetoothHistory() {
    return this.request('/bluetooth/history');
  }

  async clearBluetoothHistory() {
    return this.request('/bluetooth/history', {
      method: 'DELETE',
    });
  }

  // Bluetooth Audio methods
  async connectAudio(address) {
    return this.request(`/bluetooth/audio/connect/${address}`, {
      method: 'POST',
    });
  }

  async disconnectAudio() {
    return this.request('/bluetooth/audio/disconnect', {
      method: 'POST',
    });
  }

  async getMediaState() {
    return this.request('/bluetooth/audio/state');
  }

  async playMedia() {
    return this.request('/bluetooth/audio/play', {
      method: 'POST',
    });
  }

  async pauseMedia() {
    return this.request('/bluetooth/audio/pause', {
      method: 'POST',
    });
  }

  async nextTrack() {
    return this.request('/bluetooth/audio/next', {
      method: 'POST',
    });
  }

  async previousTrack() {
    return this.request('/bluetooth/audio/previous', {
      method: 'POST',
    });
  }

  async stopMedia() {
    return this.request('/bluetooth/audio/stop', {
      method: 'POST',
    });
  }
}

/**
 * Lights API service
 */
class LightsAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Lights API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get all lights
  async getAllLights() {
    return this.request('/lights');
  }

  // Get specific light
  async getLight(unitId) {
    return this.request(`/lights/${unitId}`);
  }

  // Set color for all lights
  async setAllLightsColor(r, g, b) {
    return this.request('/lights/all/color', {
      method: 'POST',
      body: JSON.stringify({ r, g, b }),
    });
  }

  // Set brightness for all lights
  async setAllLightsBrightness(brightness) {
    return this.request('/lights/all/brightness', {
      method: 'POST',
      body: JSON.stringify({ value: brightness }),
    });
  }

  // Set color for specific light
  async setLightColor(unitId, r, g, b) {
    return this.request(`/lights/${unitId}/color`, {
      method: 'POST',
      body: JSON.stringify({ r, g, b }),
    });
  }

  // Set brightness for specific light
  async setLightBrightness(unitId, brightness) {
    return this.request(`/lights/${unitId}/brightness`, {
      method: 'POST',
      body: JSON.stringify({ value: brightness }),
    });
  }

  // Trigger identify on specific light
  async identifyLight(unitId) {
    return this.request(`/lights/${unitId}/identify`, {
      method: 'POST',
    });
  }

  // Set friendly name for light
  async setLightName(unitId, name) {
    return this.request(`/lights/${unitId}/name`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  // Get command history
  async getLightsHistory() {
    return this.request('/lights/history');
  }

  // Clear command history
  async clearLightsHistory() {
    return this.request('/lights/history', {
      method: 'DELETE',
    });
  }
}

/**
 * GPS API service
 */
class GPSAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`GPS API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get current GPS location
  async getLocation() {
    return this.request('/gps/location');
  }

  // Get GPS connection status
  async getStatus() {
    return this.request('/gps/status');
  }

  // Start GPS listening
  async startListening(deviceAddress) {
    return this.request('/gps/start', {
      method: 'POST',
      body: JSON.stringify({ deviceAddress }),
    });
  }

  // Stop GPS listening
  async stopListening() {
    return this.request('/gps/stop', {
      method: 'POST',
    });
  }
}

// Export singleton instances
export const gpioAPI = new GPIOAPI();
export const bluetoothAPI = new BluetoothAPI();
export const lightsAPI = new LightsAPI();
export const gpsAPI = new GPSAPI();
export default gpioAPI;
