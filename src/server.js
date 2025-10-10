const express = require('express');
const cors = require('cors');
const http = require('http');
const gpioService = require('./services/gpio-service');
const bluetoothService = require('./services/bluetooth-service');
const bluetoothAudioService = require('./services/bluetooth-audio-service');
const lightsService = require('./services/lights-service');

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
gpioService.initialize().catch(console.error);
bluetoothService.initialize().catch(console.error);
bluetoothAudioService.initialize().catch(console.error);
lightsService.initialize(server).catch(console.error);

/**
 * GET /api/pins - Get all pin states
 */
app.get('/api/pins', (req, res) => {
  try {
    const pinStates = gpioService.getAllPinStates();
    res.json(pinStates);
  } catch (error) {
    console.error('Error getting pin states:', error);
    res.status(500).json({ error: 'Failed to get pin states' });
  }
});

/**
 * GET /api/pins/:pin - Get specific pin state
 */
app.get('/api/pins/:pin', (req, res) => {
  try {
    const pin = parseInt(req.params.pin);
    const value = gpioService.digitalRead(pin);
    const state = gpioService.getAllPinStates()[pin];

    res.json({
      pin,
      value,
      mode: state?.mode || 'INPUT'
    });
  } catch (error) {
    console.error(`Error getting pin ${req.params.pin} state:`, error);
    res.status(500).json({ error: 'Failed to get pin state' });
  }
});

/**
 * POST /api/pins/:pin/mode - Set pin mode
 */
app.post('/api/pins/:pin/mode', (req, res) => {
  try {
    const pin = parseInt(req.params.pin);
    const { mode } = req.body;

    if (!mode) {
      return res.status(400).json({ error: 'Mode is required' });
    }

    gpioService.setPinMode(pin, mode);
    res.json({ success: true, pin, mode });
  } catch (error) {
    console.error(`Error setting pin ${req.params.pin} mode:`, error);
    res.status(500).json({ error: 'Failed to set pin mode' });
  }
});

/**
 * POST /api/pins/:pin/write - Write digital value to pin
 */
app.post('/api/pins/:pin/write', (req, res) => {
  try {
    const pin = parseInt(req.params.pin);
    const { value } = req.body;

    if (typeof value !== 'number' || (value !== 0 && value !== 1)) {
      return res.status(400).json({ error: 'Value must be 0 or 1' });
    }

    gpioService.digitalWrite(pin, value);
    res.json({ success: true, pin, value });
  } catch (error) {
    console.error(`Error writing to pin ${req.params.pin}:`, error);
    res.status(500).json({ error: 'Failed to write to pin' });
  }
});

/**
 * POST /api/pins/:pin/pwm - Write PWM value to pin
 */
app.post('/api/pins/:pin/pwm', (req, res) => {
  try {
    const pin = parseInt(req.params.pin);
    const { value } = req.body;

    if (typeof value !== 'number' || value < 0 || value > 255) {
      return res.status(400).json({ error: 'PWM value must be between 0 and 255' });
    }

    gpioService.pwmWrite(pin, value);
    res.json({ success: true, pin, value });
  } catch (error) {
    console.error(`Error writing PWM to pin ${req.params.pin}:`, error);
    res.status(500).json({ error: 'Failed to write PWM to pin' });
  }
});

/**
 * GET /api/history - Get command history
 */
app.get('/api/history', (req, res) => {
  try {
    const history = gpioService.getCommandHistory();
    res.json(history);
  } catch (error) {
    console.error('Error getting command history:', error);
    res.status(500).json({ error: 'Failed to get command history' });
  }
});

/**
 * DELETE /api/history - Clear command history
 */
app.delete('/api/history', (req, res) => {
  try {
    gpioService.clearHistory();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing command history:', error);
    res.status(500).json({ error: 'Failed to clear command history' });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    gpioMode: 'logging'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * BLUETOOTH API ENDPOINTS
 */

/**
 * GET /api/bluetooth/adapter - Get Bluetooth adapter info
 */
app.get('/api/bluetooth/adapter', (req, res) => {
  try {
    const adapterInfo = bluetoothService.getAdapterInfo();
    res.json(adapterInfo);
  } catch (error) {
    console.error('Error getting Bluetooth adapter info:', error);
    res.status(500).json({ error: 'Failed to get adapter info' });
  }
});

/**
 * GET /api/bluetooth/devices - Get discovered Bluetooth devices
 */
app.get('/api/bluetooth/devices', (req, res) => {
  try {
    const devices = bluetoothService.getDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error getting Bluetooth devices:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

/**
 * GET /api/bluetooth/devices/connected - Get connected Bluetooth devices
 */
app.get('/api/bluetooth/devices/connected', (req, res) => {
  try {
    const connectedDevices = bluetoothService.getConnectedDevices();
    res.json(connectedDevices);
  } catch (error) {
    console.error('Error getting connected Bluetooth devices:', error);
    res.status(500).json({ error: 'Failed to get connected devices' });
  }
});

/**
 * POST /api/bluetooth/scan/start - Start Bluetooth device scanning
 */
app.post('/api/bluetooth/scan/start', async (req, res) => {
  try {
    await bluetoothService.startScanning();
    res.json({ success: true, message: 'Bluetooth scanning started' });
  } catch (error) {
    console.error('Error starting Bluetooth scan:', error);
    res.status(500).json({ error: error.message || 'Failed to start scanning' });
  }
});

/**
 * POST /api/bluetooth/scan/stop - Stop Bluetooth device scanning
 */
app.post('/api/bluetooth/scan/stop', async (req, res) => {
  try {
    await bluetoothService.stopScanning();
    res.json({ success: true, message: 'Bluetooth scanning stopped' });
  } catch (error) {
    console.error('Error stopping Bluetooth scan:', error);
    res.status(500).json({ error: error.message || 'Failed to stop scanning' });
  }
});

/**
 * POST /api/bluetooth/devices/:address/pair - Pair with a Bluetooth device
 */
app.post('/api/bluetooth/devices/:address/pair', async (req, res) => {
  try {
    const { address } = req.params;
    const device = await bluetoothService.pairDevice(address);
    res.json({ success: true, device });
  } catch (error) {
    console.error(`Error pairing with device ${req.params.address}:`, error);
    res.status(500).json({ error: error.message || 'Failed to pair device' });
  }
});

/**
 * POST /api/bluetooth/devices/:address/connect - Connect to a paired Bluetooth device
 */
app.post('/api/bluetooth/devices/:address/connect', async (req, res) => {
  try {
    const { address } = req.params;
    const device = await bluetoothService.connectDevice(address);
    res.json({ success: true, device });
  } catch (error) {
    console.error(`Error connecting to device ${req.params.address}:`, error);
    res.status(500).json({ error: error.message || 'Failed to connect device' });
  }
});

/**
 * POST /api/bluetooth/devices/:address/disconnect - Disconnect from a Bluetooth device
 */
app.post('/api/bluetooth/devices/:address/disconnect', async (req, res) => {
  try {
    const { address } = req.params;
    const device = await bluetoothService.disconnectDevice(address);
    res.json({ success: true, device });
  } catch (error) {
    console.error(`Error disconnecting from device ${req.params.address}:`, error);
    res.status(500).json({ error: error.message || 'Failed to disconnect device' });
  }
});

/**
 * DELETE /api/bluetooth/devices/:address - Unpair a Bluetooth device
 */
app.delete('/api/bluetooth/devices/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const device = await bluetoothService.unpairDevice(address);
    res.json({ success: true, device });
  } catch (error) {
    console.error(`Error unpairing device ${req.params.address}:`, error);
    res.status(500).json({ error: error.message || 'Failed to unpair device' });
  }
});

/**
 * GET /api/bluetooth/history - Get Bluetooth command history
 */
app.get('/api/bluetooth/history', (req, res) => {
  try {
    const history = bluetoothService.getCommandHistory();
    res.json(history);
  } catch (error) {
    console.error('Error getting Bluetooth command history:', error);
    res.status(500).json({ error: 'Failed to get command history' });
  }
});

/**
 * DELETE /api/bluetooth/history - Clear Bluetooth command history
 */
app.delete('/api/bluetooth/history', (req, res) => {
  try {
    bluetoothService.clearHistory();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing Bluetooth command history:', error);
    res.status(500).json({ error: 'Failed to clear command history' });
  }
});

/**
 * BLUETOOTH AUDIO API ENDPOINTS
 */

/**
 * POST /api/bluetooth/audio/connect/:address - Connect audio to a device
 */
app.post('/api/bluetooth/audio/connect/:address', async (req, res) => {
  try {
    const { address } = req.params;
    // Find media player for the device
    const found = await bluetoothService.findMediaPlayer(address);
    res.json({ success: found, device: address });
  } catch (error) {
    console.error(`Error connecting audio to device ${req.params.address}:`, error);
    res.status(500).json({ error: error.message || 'Failed to connect audio' });
  }
});

/**
 * POST /api/bluetooth/audio/disconnect - Disconnect audio device
 */
app.post('/api/bluetooth/audio/disconnect', async (req, res) => {
  try {
    // Media player will be cleared when device disconnects
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting audio device:', error);
    res.status(500).json({ error: error.message || 'Failed to disconnect audio' });
  }
});

/**
 * GET /api/bluetooth/audio/state - Get current media playback state
 */
app.get('/api/bluetooth/audio/state', async (req, res) => {
  try {
    const state = await bluetoothService.getMediaMetadata();
    res.json(state);
  } catch (error) {
    console.error('Error getting media state:', error);
    res.status(500).json({ error: 'Failed to get media state' });
  }
});

/**
 * POST /api/bluetooth/audio/play - Play media
 */
app.post('/api/bluetooth/audio/play', async (req, res) => {
  try {
    const result = await bluetoothService.mediaControl('play');
    res.json(result);
  } catch (error) {
    console.error('Error playing media:', error);
    res.status(500).json({ error: error.message || 'Failed to play' });
  }
});

/**
 * POST /api/bluetooth/audio/pause - Pause media
 */
app.post('/api/bluetooth/audio/pause', async (req, res) => {
  try {
    const result = await bluetoothService.mediaControl('pause');
    res.json(result);
  } catch (error) {
    console.error('Error pausing media:', error);
    res.status(500).json({ error: error.message || 'Failed to pause' });
  }
});

/**
 * POST /api/bluetooth/audio/next - Skip to next track
 */
app.post('/api/bluetooth/audio/next', async (req, res) => {
  try {
    const result = await bluetoothService.mediaControl('next');
    res.json(result);
  } catch (error) {
    console.error('Error skipping to next track:', error);
    res.status(500).json({ error: error.message || 'Failed to skip track' });
  }
});

/**
 * POST /api/bluetooth/audio/previous - Go to previous track
 */
app.post('/api/bluetooth/audio/previous', async (req, res) => {
  try {
    const result = await bluetoothService.mediaControl('previous');
    res.json(result);
  } catch (error) {
    console.error('Error going to previous track:', error);
    res.status(500).json({ error: error.message || 'Failed to go to previous track' });
  }
});

/**
 * POST /api/bluetooth/audio/stop - Stop playback
 */
app.post('/api/bluetooth/audio/stop', async (req, res) => {
  try {
    const result = await bluetoothService.mediaControl('stop');
    res.json(result);
  } catch (error) {
    console.error('Error stopping playback:', error);
    res.status(500).json({ error: error.message || 'Failed to stop' });
  }
});

/**
 * LIGHTS API ENDPOINTS
 */

/**
 * GET /api/lights - Get all connected lights
 */
app.get('/api/lights', (req, res) => {
  try {
    const lights = lightsService.getAllLights();
    res.json(lights);
  } catch (error) {
    console.error('Error getting lights:', error);
    res.status(500).json({ error: 'Failed to get lights' });
  }
});

/**
 * GET /api/lights/:unitId - Get specific light info
 */
app.get('/api/lights/:unitId', (req, res) => {
  try {
    const { unitId } = req.params;
    const light = lightsService.getLight(unitId);
    
    if (!light) {
      return res.status(404).json({ error: 'Light not found' });
    }
    
    res.json(light);
  } catch (error) {
    console.error(`Error getting light ${req.params.unitId}:`, error);
    res.status(500).json({ error: 'Failed to get light' });
  }
});

/**
 * POST /api/lights/all/color - Set color for all lights
 */
app.post('/api/lights/all/color', (req, res) => {
  try {
    const { r, g, b } = req.body;
    
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      return res.status(400).json({ error: 'r, g, and b values are required and must be numbers' });
    }
    
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      return res.status(400).json({ error: 'RGB values must be between 0 and 255' });
    }
    
    const result = lightsService.setAllLightsColor(r, g, b);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error setting all lights color:', error);
    res.status(500).json({ error: 'Failed to set color for all lights' });
  }
});

/**
 * POST /api/lights/all/brightness - Set brightness for all lights
 */
app.post('/api/lights/all/brightness', (req, res) => {
  try {
    const { value } = req.body;
    
    if (typeof value !== 'number') {
      return res.status(400).json({ error: 'Brightness value is required and must be a number' });
    }
    
    if (value < 0 || value > 1) {
      return res.status(400).json({ error: 'Brightness value must be between 0.0 and 1.0' });
    }
    
    const result = lightsService.setAllLightsBrightness(value);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error setting all lights brightness:', error);
    res.status(500).json({ error: 'Failed to set brightness for all lights' });
  }
});

/**
 * POST /api/lights/:unitId/color - Set color for specific light
 */
app.post('/api/lights/:unitId/color', (req, res) => {
  try {
    const { unitId } = req.params;
    const { r, g, b } = req.body;
    
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      return res.status(400).json({ error: 'r, g, and b values are required and must be numbers' });
    }
    
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      return res.status(400).json({ error: 'RGB values must be between 0 and 255' });
    }
    
    lightsService.setLightColor(unitId, r, g, b);
    res.json({ success: true, unitId, color: { r, g, b } });
  } catch (error) {
    console.error(`Error setting color for light ${req.params.unitId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to set light color' });
  }
});

/**
 * POST /api/lights/:unitId/brightness - Set brightness for specific light
 */
app.post('/api/lights/:unitId/brightness', (req, res) => {
  try {
    const { unitId } = req.params;
    const { value } = req.body;
    
    if (typeof value !== 'number') {
      return res.status(400).json({ error: 'Brightness value is required and must be a number' });
    }
    
    if (value < 0 || value > 1) {
      return res.status(400).json({ error: 'Brightness value must be between 0.0 and 1.0' });
    }
    
    lightsService.setLightBrightness(unitId, value);
    res.json({ success: true, unitId, brightness: value });
  } catch (error) {
    console.error(`Error setting brightness for light ${req.params.unitId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to set light brightness' });
  }
});

/**
 * POST /api/lights/:unitId/identify - Trigger identify (blink) on specific light
 */
app.post('/api/lights/:unitId/identify', (req, res) => {
  try {
    const { unitId } = req.params;
    
    lightsService.identifyLight(unitId);
    res.json({ success: true, unitId });
  } catch (error) {
    console.error(`Error identifying light ${req.params.unitId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to identify light' });
  }
});

/**
 * PUT /api/lights/:unitId/name - Set friendly name for light unit
 */
app.put('/api/lights/:unitId/name', (req, res) => {
  try {
    const { unitId } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required and must be a string' });
    }
    
    lightsService.setLightName(unitId, name);
    res.json({ success: true, unitId, name });
  } catch (error) {
    console.error(`Error setting name for light ${req.params.unitId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to set light name' });
  }
});

/**
 * GET /api/lights/history - Get lights command history
 */
app.get('/api/lights/history', (req, res) => {
  try {
    const history = lightsService.getCommandHistory();
    res.json(history);
  } catch (error) {
    console.error('Error getting lights command history:', error);
    res.status(500).json({ error: 'Failed to get command history' });
  }
});

/**
 * DELETE /api/lights/history - Clear lights command history
 */
app.delete('/api/lights/history', (req, res) => {
  try {
    lightsService.clearHistory();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing lights command history:', error);
    res.status(500).json({ error: 'Failed to clear command history' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down services...');
  Promise.all([
    gpioService.cleanup(),
    bluetoothService.cleanup(),
    bluetoothAudioService.cleanup(),
    lightsService.cleanup()
  ]).then(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down services...');
  Promise.all([
    gpioService.cleanup(),
    bluetoothService.cleanup(),
    bluetoothAudioService.cleanup(),
    lightsService.cleanup()
  ]).then(() => {
    process.exit(0);
  });
});

module.exports = {
  app,
  server,
  startServer: () => {
    return new Promise((resolve) => {
      server.listen(PORT, () => {
        console.log(`NodeNav API server running on port ${PORT}`);
        console.log(`HTTP API endpoints available at http://localhost:${PORT}/api`);
        console.log(`WebSocket server available at ws://localhost:${PORT}/ws/lights`);
        resolve(server);
      });
    });
  }
};
