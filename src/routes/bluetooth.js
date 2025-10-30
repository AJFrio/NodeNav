const express = require('express');
const router = express.Router();
const bluetoothService = require('../services/bluetooth-service');
const bluetoothAudioService = require('../services/bluetooth-audio-service');

/**
 * GET /api/bluetooth/adapter - Get Bluetooth adapter info
 */
router.get('/adapter', (req, res) => {
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
router.get('/devices', (req, res) => {
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
router.get('/devices/connected', (req, res) => {
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
router.post('/scan/start', async (req, res) => {
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
router.post('/scan/stop', async (req, res) => {
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
router.post('/devices/:address/pair', async (req, res) => {
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
router.post('/devices/:address/connect', async (req, res) => {
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
router.post('/devices/:address/disconnect', async (req, res) => {
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
router.delete('/devices/:address', async (req, res) => {
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
router.get('/history', (req, res) => {
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
router.delete('/history', (req, res) => {
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
router.post('/audio/connect/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await bluetoothAudioService.connectAudioDevice(address);
    res.json(result);
  } catch (error) {
    console.error(`Error connecting audio to device ${req.params.address}:`, error);
    res.status(500).json({ error: error.message || 'Failed to connect audio' });
  }
});

/**
 * POST /api/bluetooth/audio/disconnect - Disconnect audio device
 */
router.post('/audio/disconnect', async (req, res) => {
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
router.get('/audio/state', async (req, res) => {
  try {
    const state = await bluetoothAudioService.getMediaState();
    res.json(state);
  } catch (error) {
    console.error('Error getting media state:', error);
    res.status(500).json({ error: 'Failed to get media state' });
  }
});

/**
 * POST /api/bluetooth/audio/play - Play media
 */
router.post('/audio/play', async (req, res) => {
  try {
    const result = await bluetoothAudioService.play();
    res.json(result);
  } catch (error) {
    console.error('Error playing media:', error);
    res.status(500).json({ error: error.message || 'Failed to play' });
  }
});

/**
 * POST /api/bluetooth/audio/pause - Pause media
 */
router.post('/audio/pause', async (req, res) => {
  try {
    const result = await bluetoothAudioService.pause();
    res.json(result);
  } catch (error) {
    console.error('Error pausing media:', error);
    res.status(500).json({ error: error.message || 'Failed to pause' });
  }
});

/**
 * POST /api/bluetooth/audio/next - Skip to next track
 */
router.post('/audio/next', async (req, res) => {
  try {
    const result = await bluetoothAudioService.next();
    res.json(result);
  } catch (error) {
    console.error('Error skipping to next track:', error);
    res.status(500).json({ error: error.message || 'Failed to skip track' });
  }
});

/**
 * POST /api/bluetooth/audio/previous - Go to previous track
 */
router.post('/audio/previous', async (req, res) => {
  try {
    const result = await bluetoothAudioService.previous();
    res.json(result);
  } catch (error) {
    console.error('Error going to previous track:', error);
    res.status(500).json({ error: error.message || 'Failed to go to previous track' });
  }
});

/**
 * POST /api/bluetooth/audio/stop - Stop playback
 */
router.post('/audio/stop', async (req, res) => {
  try {
    const result = await bluetoothAudioService.stop();
    res.json(result);
  } catch (error) {
    console.error('Error stopping playback:', error);
    res.status(500).json({ error: error.message || 'Failed to stop' });
  }
});

module.exports = router;
