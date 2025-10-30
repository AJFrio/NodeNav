const express = require('express');
const router = express.Router();
const lightsService = require('../services/lights-service');

/**
 * GET /api/lights - Get all connected lights
 */
router.get('/', (req, res) => {
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
router.get('/:unitId', (req, res) => {
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
router.post('/all/color', (req, res) => {
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
router.post('/all/brightness', (req, res) => {
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
router.post('/:unitId/color', (req, res) => {
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
router.post('/:unitId/brightness', (req, res) => {
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
router.post('/:unitId/identify', (req, res) => {
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
router.put('/:unitId/name', (req, res) => {
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
router.get('/history', (req, res) => {
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
router.delete('/history', (req, res) => {
  try {
    lightsService.clearHistory();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing lights command history:', error);
    res.status(500).json({ error: 'Failed to clear command history' });
  }
});

module.exports = router;
