const express = require('express');
const cors = require('cors');
const http = require('http');
const os = require('os');
const gpioService = require('./services/gpio-service');
const bluetoothService = require('./services/bluetooth-service');
const lightsService = require('./services/lights-service');

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
if (os.platform() === 'linux') {
  console.log('Linux platform detected. Initializing hardware services.');
  gpioService.initialize().catch(err => console.error('GPIO init failed:', err.message));
  bluetoothService.initialize().catch(err => console.error('Bluetooth init failed:', err.message));
  lightsService.initialize(server).catch(err => console.error('Lights init failed:', err.message));
} else {
  console.log('Non-Linux platform. Hardware services disabled.');
}

// --- GPIO Endpoints ---
app.get('/api/pins', (req, res) => res.json(gpioService.getAllPinStates()));
// ... other GPIO endpoints

// --- Bluetooth Endpoints ---
app.get('/api/bluetooth/devices', (req, res) => res.json(bluetoothService.getDevices()));
app.post('/api/bluetooth/scan/start', async (req, res) => {
  try {
    await bluetoothService.startScanning();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/bluetooth/scan/stop', async (req, res) => {
  try {
    await bluetoothService.stopScanning();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/bluetooth/devices/:address/pair', async (req, res) => {
  try {
    await bluetoothService.pairDevice(req.params.address);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/bluetooth/devices/:address/connect', async (req, res) => {
  try {
    await bluetoothService.connectDevice(req.params.address);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/bluetooth/devices/:address/disconnect', async (req, res) => {
  try {
    await bluetoothService.disconnectDevice(req.params.address);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete('/api/bluetooth/devices/:address', async (req, res) => {
  try {
    await bluetoothService.unpairDevice(req.params.address);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Bluetooth Audio Endpoints ---
app.get('/api/bluetooth/audio/state', (req, res) => res.json(bluetoothService.getMediaState()));
app.post('/api/bluetooth/audio/play', async (req, res) => {
  try {
    await bluetoothService.play();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/bluetooth/audio/pause', async (req, res) => {
  try {
    await bluetoothService.pause();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/bluetooth/audio/next', async (req, res) => {
  try {
    await bluetoothService.next();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/bluetooth/audio/previous', async (req, res) => {
  try {
    await bluetoothService.previous();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Lights Endpoints ---
// ... lights endpoints

// --- Server Startup ---
const startServer = () => {
  server.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
};

startServer();

// Graceful shutdown
const cleanup = () => {
  console.log('Shutting down services...');
  Promise.all([
    gpioService.cleanup(),
    bluetoothService.cleanup(),
    lightsService.cleanup(),
  ]).finally(() => process.exit(0));
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = { app, server };