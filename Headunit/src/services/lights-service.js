/**
 * Lights Service - WebSocket-based light management
 * Manages ESP-01 light units connected via WebSocket
 */

const WebSocket = require('ws');

class LightsService {
  constructor() {
    this.wss = null;
    this.lights = new Map(); // unitId -> { connection, metadata, state }
    this.commandHistory = [];
    this.maxHistorySize = 100;
    this.heartbeatInterval = null;
  }

  /**
   * Initialize the WebSocket server
   */
  initialize(server) {
    console.log('Initializing Lights WebSocket service...');
    
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/lights'
    });

    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection established');
      
      ws.isAlive = true;
      
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
        }
      });

      ws.on('close', () => {
        // Find and remove the light unit
        for (const [unitId, light] of this.lights.entries()) {
          if (light.connection === ws) {
            console.log(`Light unit ${unitId} disconnected`);
            this.lights.delete(unitId);
            this.addToHistory('disconnect', { unitId });
            break;
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Start heartbeat interval (ping every 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          // Client didn't respond to last ping, terminate
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('Lights WebSocket service initialized');
    return Promise.resolve();
  }

  /**
   * Handle incoming messages from clients
   */
  handleClientMessage(ws, message) {
    const { event, payload } = message;

    switch (event) {
      case 'register':
        this.handleRegistration(ws, payload);
        break;
      
      case 'state':
        this.handleStateUpdate(ws, payload);
        break;
      
      case 'pong':
        // Heartbeat response
        ws.isAlive = true;
        break;
      
      default:
        console.warn(`Unknown event type: ${event}`);
        ws.send(JSON.stringify({ error: `Unknown event: ${event}` }));
    }
  }

  /**
   * Handle light unit registration
   */
  handleRegistration(ws, payload) {
    const { unitId, lightType } = payload;
    
    if (!unitId) {
      ws.send(JSON.stringify({ error: 'unitId is required' }));
      return;
    }

    console.log(`Registering light unit: ${unitId} (${lightType || 'unknown'})`);

    // Store or update light unit
    const existingLight = this.lights.get(unitId);
    
    this.lights.set(unitId, {
      connection: ws,
      metadata: {
        unitId,
        lightType: lightType || 'RGB-STRIP',
        friendlyName: existingLight?.metadata.friendlyName || `Light ${unitId.slice(-8)}`,
        registeredAt: new Date().toISOString(),
      },
      state: existingLight?.state || {
        r: 255,
        g: 255,
        b: 255,
        brightness: 1.0,
        isOn: true,
      }
    });

    // Send acknowledgment
    ws.send(JSON.stringify({
      event: 'registered',
      payload: {
        unitId,
        success: true,
      }
    }));

    // Send current state to newly connected light
    this.sendCommandToLight(unitId, 'setColor', {
      r: this.lights.get(unitId).state.r,
      g: this.lights.get(unitId).state.g,
      b: this.lights.get(unitId).state.b,
    });

    this.sendCommandToLight(unitId, 'setBrightness', {
      value: this.lights.get(unitId).state.brightness,
    });

    this.addToHistory('register', { unitId, lightType });
  }

  /**
   * Handle state update from light unit
   */
  handleStateUpdate(ws, payload) {
    // Find the unit
    for (const [unitId, light] of this.lights.entries()) {
      if (light.connection === ws) {
        light.state = { ...light.state, ...payload };
        console.log(`State update from ${unitId}:`, payload);
        break;
      }
    }
  }

  /**
   * Send a command to a specific light unit
   */
  sendCommandToLight(unitId, command, payload) {
    const light = this.lights.get(unitId);
    
    if (!light) {
      throw new Error(`Light unit ${unitId} not found`);
    }

    if (light.connection.readyState !== WebSocket.OPEN) {
      throw new Error(`Light unit ${unitId} is not connected`);
    }

    const message = {
      command,
      payload,
    };

    light.connection.send(JSON.stringify(message));
    
    // Update cached state
    if (command === 'setColor') {
      light.state.r = payload.r;
      light.state.g = payload.g;
      light.state.b = payload.b;
    } else if (command === 'setBrightness') {
      light.state.brightness = payload.value;
    }

    this.addToHistory(command, { unitId, ...payload });
  }

  /**
   * Send a command to all connected light units
   */
  broadcastCommand(command, payload) {
    let successCount = 0;
    let errorCount = 0;

    for (const [unitId, light] of this.lights.entries()) {
      try {
        this.sendCommandToLight(unitId, command, payload);
        successCount++;
      } catch (error) {
        console.error(`Failed to send ${command} to ${unitId}:`, error);
        errorCount++;
      }
    }

    this.addToHistory(`broadcast_${command}`, { 
      ...payload, 
      successCount, 
      errorCount 
    });

    return { successCount, errorCount };
  }

  /**
   * Set color for a specific light
   */
  setLightColor(unitId, r, g, b) {
    this.sendCommandToLight(unitId, 'setColor', { r, g, b });
  }

  /**
   * Set brightness for a specific light
   */
  setLightBrightness(unitId, brightness) {
    this.sendCommandToLight(unitId, 'setBrightness', { value: brightness });
  }

  /**
   * Trigger identify on a specific light (blink pattern)
   */
  identifyLight(unitId) {
    this.sendCommandToLight(unitId, 'identify', {});
  }

  /**
   * Set color for all lights
   */
  setAllLightsColor(r, g, b) {
    return this.broadcastCommand('setColor', { r, g, b });
  }

  /**
   * Set brightness for all lights
   */
  setAllLightsBrightness(brightness) {
    return this.broadcastCommand('setBrightness', { value: brightness });
  }

  /**
   * Update friendly name for a light unit
   */
  setLightName(unitId, name) {
    const light = this.lights.get(unitId);
    
    if (!light) {
      throw new Error(`Light unit ${unitId} not found`);
    }

    light.metadata.friendlyName = name;
    this.addToHistory('rename', { unitId, name });
  }

  /**
   * Get all connected lights
   */
  getAllLights() {
    const lights = [];
    
    for (const [unitId, light] of this.lights.entries()) {
      lights.push({
        unitId: light.metadata.unitId,
        friendlyName: light.metadata.friendlyName,
        lightType: light.metadata.lightType,
        registeredAt: light.metadata.registeredAt,
        state: light.state,
        connected: light.connection.readyState === WebSocket.OPEN,
      });
    }
    
    return lights;
  }

  /**
   * Get specific light info
   */
  getLight(unitId) {
    const light = this.lights.get(unitId);
    
    if (!light) {
      return null;
    }

    return {
      unitId: light.metadata.unitId,
      friendlyName: light.metadata.friendlyName,
      lightType: light.metadata.lightType,
      registeredAt: light.metadata.registeredAt,
      state: light.state,
      connected: light.connection.readyState === WebSocket.OPEN,
    };
  }

  /**
   * Add command to history
   */
  addToHistory(action, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      details,
    };

    this.commandHistory.unshift(entry);

    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory = this.commandHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get command history
   */
  getCommandHistory() {
    return this.commandHistory;
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('Cleaning up Lights service...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      // Close all connections
      this.wss.clients.forEach((ws) => {
        ws.close();
      });
      
      // Close server
      return new Promise((resolve) => {
        this.wss.close(() => {
          console.log('Lights WebSocket server closed');
          resolve();
        });
      });
    }
    
    return Promise.resolve();
  }
}

// Export singleton instance
const lightsService = new LightsService();
module.exports = lightsService;

