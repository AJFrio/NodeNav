/**
 * ESP-01 Light Controller
 * 
 * WebSocket-based RGB LED controller for NodeNav wireless lights system
 * 
 * Hardware:
 *   - ESP-01 module (ESP8266)
 *   - RGB LED strip or individual RGB LEDs
 * 
 * Wiring:
 *   - GPIO0 (D3) → Red LED PWM
 *   - GPIO2 (D4) → Green LED PWM
 *   - TX/GPIO1 (D10) → Blue LED PWM (optional, conflicts with serial)
 * 
 * Libraries Required:
 *   - ESP8266WiFi (built-in)
 *   - ArduinoWebsockets by Gil Maimon
 *   - ArduinoJson by Benoit Blanchon
 * 
 * Network:
 *   - SSID: NodeNav-Lights
 *   - Password: NodeNavPassword
 *   - Server: ws://192.168.4.1:3001/ws/lights
 */

#include <ESP8266WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

using namespace websockets;

// Network Configuration
const char* SSID = "NodeNav-Lights";
const char* PASSWORD = "NodeNavPassword";
const char* WS_SERVER = "192.168.4.1";
const int WS_PORT = 3001;
const char* WS_PATH = "/ws/lights";

// GPIO Pin Configuration
const int RED_PIN = 0;    // GPIO0 (D3)
const int GREEN_PIN = 2;  // GPIO2 (D4)
const int BLUE_PIN = 1;   // GPIO1/TX (D10) - Use with caution, conflicts with Serial

// LED State
struct LightState {
  uint8_t r = 255;
  uint8_t g = 255;
  uint8_t b = 255;
  float brightness = 1.0;
  bool isOn = true;
} lightState;

// WebSocket client
WebsocketsClient wsClient;

// Connection state
bool isConnected = false;
unsigned long lastReconnectAttempt = 0;
const unsigned long RECONNECT_INTERVAL = 5000; // 5 seconds

// Heartbeat
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds

// EEPROM addresses
const int EEPROM_SIZE = 512;
const int EEPROM_INITIALIZED_ADDR = 0;
const int EEPROM_BOOT_COUNT_ADDR = 1;
const int EEPROM_LAST_BOOT_TIME_ADDR = 2;
const byte EEPROM_MAGIC = 0xAB;

// Factory reset detection
const int FACTORY_RESET_BOOT_COUNT = 3;
const unsigned long FACTORY_RESET_WINDOW = 10000; // 10 seconds

// Forward declarations
void connectToWiFi();
void connectToWebSocket();
void onWebSocketMessage(WebsocketsMessage message);
void onWebSocketEvent(WebsocketsEvent event, String data);
void handleCommand(JsonDocument& doc);
void setLEDColor(uint8_t r, uint8_t g, uint8_t b);
void setBrightness(float brightness);
void identifyBlink();
void checkFactoryReset();
String getMACAddress();

void setup() {
  // Initialize Serial (comment out if using GPIO1 for Blue LED)
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\nESP-01 Light Controller");
  Serial.println("======================");
  
  // Initialize EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // Check for factory reset
  checkFactoryReset();
  
  // Initialize GPIO pins
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  // pinMode(BLUE_PIN, OUTPUT); // Uncomment if not using Serial
  
  // Set initial LED state (white, full brightness)
  setLEDColor(lightState.r, lightState.g, lightState.b);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Connect to WebSocket server
  connectToWebSocket();
  
  Serial.println("Setup complete!");
}

void loop() {
  // Handle WebSocket events
  if (wsClient.available()) {
    wsClient.poll();
  }
  
  // Check connection status and attempt reconnection
  if (!isConnected) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > RECONNECT_INTERVAL) {
      lastReconnectAttempt = now;
      Serial.println("Attempting to reconnect...");
      
      // Check WiFi connection first
      if (WiFi.status() != WL_CONNECTED) {
        connectToWiFi();
      }
      
      // Try WebSocket reconnection
      if (WiFi.status() == WL_CONNECTED) {
        connectToWebSocket();
      }
    }
  }
  
  // Send heartbeat
  if (isConnected) {
    unsigned long now = millis();
    if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
      lastHeartbeat = now;
      
      StaticJsonDocument<128> doc;
      doc["event"] = "pong";
      
      String message;
      serializeJson(doc, message);
      wsClient.send(message);
    }
  }
  
  delay(10);
}

/**
 * Connect to WiFi network
 */
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("MAC Address: ");
    Serial.println(getMACAddress());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

/**
 * Connect to WebSocket server
 */
void connectToWebSocket() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot connect to WebSocket");
    return;
  }
  
  // Build WebSocket URL
  String wsUrl = "ws://";
  wsUrl += WS_SERVER;
  wsUrl += ":";
  wsUrl += WS_PORT;
  wsUrl += WS_PATH;
  
  Serial.print("Connecting to WebSocket: ");
  Serial.println(wsUrl);
  
  // Set callbacks
  wsClient.onMessage(onWebSocketMessage);
  wsClient.onEvent(onWebSocketEvent);
  
  // Connect
  bool connected = wsClient.connect(wsUrl);
  
  if (connected) {
    Serial.println("WebSocket connected!");
    isConnected = true;
    
    // Send registration message
    StaticJsonDocument<256> doc;
    doc["event"] = "register";
    JsonObject payload = doc.createNestedObject("payload");
    payload["unitId"] = getMACAddress();
    payload["lightType"] = "RGB-STRIP-1M";
    
    String message;
    serializeJson(doc, message);
    wsClient.send(message);
    
    Serial.println("Registration sent");
    
    // Blink to indicate successful connection
    identifyBlink();
  } else {
    Serial.println("WebSocket connection failed!");
    isConnected = false;
  }
}

/**
 * Handle incoming WebSocket messages
 */
void onWebSocketMessage(WebsocketsMessage message) {
  Serial.print("Received message: ");
  Serial.println(message.data());
  
  // Parse JSON
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message.data());
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  handleCommand(doc);
}

/**
 * Handle WebSocket events
 */
void onWebSocketEvent(WebsocketsEvent event, String data) {
  switch (event) {
    case WebsocketsEvent::ConnectionOpened:
      Serial.println("WebSocket connection opened");
      isConnected = true;
      break;
      
    case WebsocketsEvent::ConnectionClosed:
      Serial.println("WebSocket connection closed");
      isConnected = false;
      break;
      
    case WebsocketsEvent::GotPing:
      Serial.println("Received ping");
      wsClient.pong();
      break;
      
    case WebsocketsEvent::GotPong:
      Serial.println("Received pong");
      break;
  }
}

/**
 * Handle commands from server
 */
void handleCommand(JsonDocument& doc) {
  const char* command = doc["command"];
  
  if (command == nullptr) {
    // Check for event-based messages
    const char* event = doc["event"];
    if (event != nullptr && strcmp(event, "registered") == 0) {
      Serial.println("Successfully registered with server");
    }
    return;
  }
  
  Serial.print("Command: ");
  Serial.println(command);
  
  if (strcmp(command, "setColor") == 0) {
    JsonObject payload = doc["payload"];
    uint8_t r = payload["r"];
    uint8_t g = payload["g"];
    uint8_t b = payload["b"];
    
    Serial.printf("Setting color: R=%d, G=%d, B=%d\n", r, g, b);
    
    lightState.r = r;
    lightState.g = g;
    lightState.b = b;
    setLEDColor(r, g, b);
    
  } else if (strcmp(command, "setBrightness") == 0) {
    JsonObject payload = doc["payload"];
    float brightness = payload["value"];
    
    Serial.printf("Setting brightness: %.2f\n", brightness);
    
    lightState.brightness = brightness;
    setBrightness(brightness);
    
  } else if (strcmp(command, "identify") == 0) {
    Serial.println("Identify command received");
    identifyBlink();
    
  } else {
    Serial.print("Unknown command: ");
    Serial.println(command);
  }
}

/**
 * Set LED color (with current brightness applied)
 */
void setLEDColor(uint8_t r, uint8_t g, uint8_t b) {
  // Apply brightness
  uint8_t adjustedR = (uint8_t)(r * lightState.brightness);
  uint8_t adjustedG = (uint8_t)(g * lightState.brightness);
  uint8_t adjustedB = (uint8_t)(b * lightState.brightness);
  
  // Write PWM values (inverted for common anode, remove inversion for common cathode)
  analogWrite(RED_PIN, adjustedR);
  analogWrite(GREEN_PIN, adjustedG);
  // analogWrite(BLUE_PIN, adjustedB); // Uncomment if not using Serial
  
  Serial.printf("LED set to: R=%d, G=%d, B=%d (brightness: %.2f)\n", 
                adjustedR, adjustedG, adjustedB, lightState.brightness);
}

/**
 * Set brightness (reapply current color with new brightness)
 */
void setBrightness(float brightness) {
  lightState.brightness = constrain(brightness, 0.0, 1.0);
  setLEDColor(lightState.r, lightState.g, lightState.b);
}

/**
 * Blink LED for identification
 */
void identifyBlink() {
  Serial.println("Blinking for identification...");
  
  // Save current state
  uint8_t savedR = lightState.r;
  uint8_t savedG = lightState.g;
  uint8_t savedB = lightState.b;
  float savedBrightness = lightState.brightness;
  
  // Blink pattern: 3 quick flashes
  for (int i = 0; i < 3; i++) {
    // White
    lightState.brightness = 1.0;
    setLEDColor(255, 255, 255);
    delay(200);
    
    // Off
    lightState.brightness = 0.0;
    setLEDColor(0, 0, 0);
    delay(200);
  }
  
  // Restore previous state
  lightState.r = savedR;
  lightState.g = savedG;
  lightState.b = savedB;
  lightState.brightness = savedBrightness;
  setLEDColor(savedR, savedG, savedB);
  
  Serial.println("Blink complete");
}

/**
 * Check for factory reset condition
 */
void checkFactoryReset() {
  // Read EEPROM data
  byte magic = EEPROM.read(EEPROM_INITIALIZED_ADDR);
  
  if (magic != EEPROM_MAGIC) {
    // First boot, initialize EEPROM
    Serial.println("First boot detected, initializing EEPROM");
    EEPROM.write(EEPROM_INITIALIZED_ADDR, EEPROM_MAGIC);
    EEPROM.write(EEPROM_BOOT_COUNT_ADDR, 1);
    EEPROM.put(EEPROM_LAST_BOOT_TIME_ADDR, millis());
    EEPROM.commit();
    return;
  }
  
  // Read boot count and last boot time
  byte bootCount = EEPROM.read(EEPROM_BOOT_COUNT_ADDR);
  unsigned long lastBootTime;
  EEPROM.get(EEPROM_LAST_BOOT_TIME_ADDR, lastBootTime);
  
  unsigned long currentTime = millis();
  unsigned long timeSinceLastBoot = currentTime - lastBootTime;
  
  Serial.printf("Boot count: %d, Time since last boot: %lu ms\n", bootCount, timeSinceLastBoot);
  
  // Check if within factory reset window
  if (timeSinceLastBoot < FACTORY_RESET_WINDOW) {
    bootCount++;
    Serial.printf("Rapid boot detected, count: %d\n", bootCount);
    
    if (bootCount >= FACTORY_RESET_BOOT_COUNT) {
      // Factory reset triggered!
      Serial.println("FACTORY RESET TRIGGERED!");
      
      // Blink red rapidly to indicate reset
      for (int i = 0; i < 10; i++) {
        analogWrite(RED_PIN, 255);
        delay(100);
        analogWrite(RED_PIN, 0);
        delay(100);
      }
      
      // Clear EEPROM (except magic byte)
      for (int i = 1; i < EEPROM_SIZE; i++) {
        EEPROM.write(i, 0);
      }
      EEPROM.write(EEPROM_BOOT_COUNT_ADDR, 0);
      EEPROM.commit();
      
      Serial.println("Factory reset complete. Rebooting...");
      delay(1000);
      ESP.restart();
    }
  } else {
    // Reset boot count
    bootCount = 1;
  }
  
  // Update EEPROM
  EEPROM.write(EEPROM_BOOT_COUNT_ADDR, bootCount);
  EEPROM.put(EEPROM_LAST_BOOT_TIME_ADDR, currentTime);
  EEPROM.commit();
}

/**
 * Get MAC address as string
 */
String getMACAddress() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[18];
  sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", 
          mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(macStr);
}

