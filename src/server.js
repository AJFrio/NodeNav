const express = require('express');
const cors = require('cors');
const http = require('http');
const os = require('os');
const gpioService = require('./services/gpio-service');
const bluetoothService = require('./services/bluetooth-service');
const bluetoothAudioService = require('./services/bluetooth-audio-service');
const lightsService = require('./services/lights-service');

const gpioRoutes = require('./routes/gpio');
const bluetoothRoutes = require('./routes/bluetooth');
const lightsRoutes = require('./routes/lights');

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const isLinux = os.platform() === 'linux';
if (isLinux) {
  console.log('Linux platform detected. Initializing hardware services.');
} else {
  console.log('Non-Linux platform detected. Hardware services will be unavailable.');
  console.log('Application is running in GUI-only/simulation mode.');
}

gpioService.initialize().catch(console.error);
bluetoothService.initialize().catch(console.error);
bluetoothAudioService.initialize().catch(console.error);
lightsService.initialize(server).catch(console.error);

// API Routes
app.use('/api/gpio', gpioRoutes);
app.use('/api/bluetooth', bluetoothRoutes);
app.use('/api/lights', lightsRoutes);

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
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
