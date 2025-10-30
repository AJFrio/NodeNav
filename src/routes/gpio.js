const express = require('express');
const router = express.Router();
const gpioService = require('../services/gpio-service');

/**
 * GET /api/pins - Get all pin states
 */
router.get('/pins', (req, res) => {
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
router.get('/pins/:pin', (req, res) => {
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
router.post('/pins/:pin/mode', (req, res) => {
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
router.post('/pins/:pin/write', (req, res) => {
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
router.post('/pins/:pin/pwm', (req, res) => {
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
router.get('/history', (req, res) => {
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
router.delete('/history', (req, res) => {
  try {
    gpioService.clearHistory();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing command history:', error);
    res.status(500).json({ error: 'Failed to clear command history' });
  }
});

module.exports = router;
