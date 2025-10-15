import React, { useState, useEffect, useRef } from 'react';
import { lightsAPI } from '../services/api';
import { styles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { Zap, Edit2, Check, X } from 'lucide-react';

const GPIOControl = () => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [currentColor, setCurrentColor] = useState({ h: 0, s: 100, l: 50 });
  const [brightness, setBrightness] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  
  // Lights management
  const [lights, setLights] = useState([]);
  const [expandedLight, setExpandedLight] = useState(null);
  const [editingLightId, setEditingLightId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  // Debouncing
  const colorUpdateTimeout = useRef(null);
  const brightnessUpdateTimeout = useRef(null);

  const canvasRef = useRef(null);

  useEffect(() => {
    drawColorWheel();
  }, []);

  useEffect(() => {
    drawColorWheel();
  }, [currentColor]);

  // Fetch lights periodically
  useEffect(() => {
    const fetchLights = async () => {
      try {
        const fetchedLights = await lightsAPI.getAllLights();
        setLights(fetchedLights);
      } catch (err) {
        console.error('Failed to fetch lights:', err);
      }
    };

    fetchLights();
    const interval = setInterval(fetchLights, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Apply color and brightness changes with debouncing
  useEffect(() => {
    if (colorUpdateTimeout.current) {
      clearTimeout(colorUpdateTimeout.current);
    }

    colorUpdateTimeout.current = setTimeout(() => {
      applyColorToAllLights();
    }, 150); // 150ms debounce

    return () => {
      if (colorUpdateTimeout.current) {
        clearTimeout(colorUpdateTimeout.current);
      }
    };
  }, [currentColor, brightness]);

  const drawColorWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use image data for more efficient and artifact-free rendering
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const deltaX = x - centerX;
        const deltaY = y - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance <= radius) {
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
          const hue = ((angle + 360) % 360);
          const saturation = (distance / radius) * 100;
          const lightness = 50;

          // Convert HSL to RGB
          const rgb = hslToRgbDirect(hue, saturation, lightness);
          
          const index = (y * canvas.width + x) * 4;
          data[index] = rgb.r;
          data[index + 1] = rgb.g;
          data[index + 2] = rgb.b;
          data[index + 3] = 255; // Alpha
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw brightness overlay (darker in center)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw selection indicator
    const selectionRadius = 8;
    const selectionX = centerX + (currentColor.s / 100) * radius * Math.cos((currentColor.h * Math.PI) / 180);
    const selectionY = centerY + (currentColor.s / 100) * radius * Math.sin((currentColor.h * Math.PI) / 180);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(selectionX, selectionY, selectionRadius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(selectionX, selectionY, selectionRadius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  // Helper function to convert HSL to RGB for direct pixel manipulation
  const hslToRgbDirect = (h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  const updateColorFromPosition = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const deltaX = x - centerX;
    const deltaY = y - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance <= radius) {
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      const hue = ((angle + 360) % 360);
      const saturation = Math.min((distance / radius) * 100, 100);

      setCurrentColor({
        h: Math.round(hue),
        s: Math.round(saturation),
        l: currentColor.l
      });
    }
  };

  const handleColorWheelMouseDown = (event) => {
    setIsDragging(true);
    updateColorFromPosition(event.clientX, event.clientY);
  };

  const handleColorWheelMouseMove = (event) => {
    if (isDragging) {
      updateColorFromPosition(event.clientX, event.clientY);
    }
  };

  const handleColorWheelMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging outside canvas
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (isDragging) {
        updateColorFromPosition(event.clientX, event.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleBrightnessChange = (value) => {
    setBrightness(value);
    setCurrentColor(prev => ({ ...prev, l: value }));
  };

  const handleBrightnessSliderMouseDown = (event) => {
    const slider = event.currentTarget;
    
    const updateBrightness = (clientY) => {
      const rect = slider.getBoundingClientRect();
      const height = rect.height;
      const y = clientY - rect.top;
      const percentage = Math.max(0, Math.min(100, ((height - y) / height) * 100));
      handleBrightnessChange(Math.round(percentage));
    };

    updateBrightness(event.clientY);

    const handleMouseMove = (e) => {
      updateBrightness(e.clientY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Brightness < 5% = OFF, >= 5% = ON
  const isLightOn = brightness >= 5;

  const applyColorToAllLights = async () => {
    try {
      // Convert HSL to RGB for backend
      const rgbColor = hslToRgb(currentColor.h, currentColor.s, currentColor.l);
      const brightnessValue = brightness / 100; // Convert to 0.0-1.0
      
      await lightsAPI.setAllLightsColor(rgbColor.r, rgbColor.g, rgbColor.b);
      await lightsAPI.setAllLightsBrightness(brightnessValue);
    } catch (err) {
      console.error('Error applying color to all lights:', err);
    }
  };

  const handleIdentifyLight = async (unitId) => {
    try {
      await lightsAPI.identifyLight(unitId);
    } catch (err) {
      setError(`Failed to identify light: ${err.message}`);
      console.error('Error identifying light:', err);
    }
  };

  const handleEditLightName = (light) => {
    setEditingLightId(light.unitId);
    setEditingName(light.friendlyName);
  };

  const handleSaveLightName = async (unitId) => {
    try {
      await lightsAPI.setLightName(unitId, editingName);
      setEditingLightId(null);
      // Refresh lights list
      const fetchedLights = await lightsAPI.getAllLights();
      setLights(fetchedLights);
    } catch (err) {
      setError(`Failed to update light name: ${err.message}`);
      console.error('Error updating light name:', err);
    }
  };

  const handleCancelEditName = () => {
    setEditingLightId(null);
    setEditingName('');
  };

  const handleIndividualLightColor = async (unitId, h, s, l) => {
    try {
      const rgbColor = hslToRgb(h, s, l);
      await lightsAPI.setLightColor(unitId, rgbColor.r, rgbColor.g, rgbColor.b);
    } catch (err) {
      setError(`Failed to set light color: ${err.message}`);
      console.error('Error setting individual light color:', err);
    }
  };

  const handleIndividualLightBrightness = async (unitId, brightnessPercent) => {
    try {
      const brightnessValue = brightnessPercent / 100;
      await lightsAPI.setLightBrightness(unitId, brightnessValue);
    } catch (err) {
      setError(`Failed to set light brightness: ${err.message}`);
      console.error('Error setting individual light brightness:', err);
    }
  };

  // Helper function to convert HSL to RGB
  const hslToRgb = (h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  const currentRgb = hslToRgb(currentColor.h, currentColor.s, currentColor.l);

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '80rem',
      margin: '0 auto',
    }}>

      {error && (
        <div style={{
          backgroundColor: colors.danger,
          color: colors['text-primary'],
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          cursor: 'pointer',
        }}
        onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {/* All Lights Control Section */}
      <div style={{
        ...styles.card,
        marginBottom: '2rem',
      }}>
        <h2 style={{
          ...styles.typography.h2,
          color: colors['text-primary'],
          marginBottom: '1.5rem',
        }}>Light Control</h2>
        
        <div style={{
          display: 'flex',
          gap: '2rem',
          alignItems: 'flex-start',
        }}>
          {/* Color Wheel Section */}
          <div style={{
            textAlign: 'center',
            flex: 1,
          }}>
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              onMouseDown={handleColorWheelMouseDown}
              style={{
                borderRadius: '50%',
                cursor: isDragging ? 'grabbing' : 'grab',
                border: `2px solid ${colors['bg-tertiary']}`,
                display: 'block',
                margin: '0 auto',
              }}
            />
          </div>

          {/* Brightness & Controls Section */}
          <div style={{
            textAlign: 'center',
            width: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <h3 style={{
              ...styles.typography.h3,
              color: colors['text-primary'],
              marginBottom: '1.5rem',
            }}>Brightness</h3>

            {/* Vertical Brightness Slider */}
            <div style={{
              marginBottom: '1.5rem',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div
                style={{
                  width: '40px',
                  height: '200px',
                  backgroundColor: colors['bg-tertiary'],
                  borderRadius: '20px',
                  border: `2px solid ${colors['bg-quaternary']}`,
                  position: 'relative',
                  marginBottom: '1rem',
                  cursor: 'ns-resize',
                }}
                onMouseDown={handleBrightnessSliderMouseDown}
              >
                {/* Fill from bottom to current brightness level */}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  height: `${brightness}%`,
                  backgroundColor: colors['text-primary'],
                  borderRadius: brightness >= 98 ? '18px' : '0 0 18px 18px',
                  transition: 'height 0.1s ease-out, border-radius 0.1s ease-out',
                }} />
              </div>

              <div style={{
                fontSize: '0.875rem',
                color: colors['text-secondary'],
                textAlign: 'center',
              }}>
                {brightness}%
              </div>
            </div>

            {/* Current Settings Display */}
            <div style={{
              backgroundColor: colors['bg-tertiary'],
              padding: '1rem',
              borderRadius: '0.5rem',
              textAlign: 'center',
              width: '100%',
            }}>
              <div style={{
                fontSize: '0.875rem',
                color: colors['text-secondary'],
                lineHeight: '1.5',
              }}>
                <div>Status: <span style={{ color: isLightOn ? colors.success : colors.danger }}>
                  {isLightOn ? 'ON' : 'OFF'}
                </span></div>
                <div>Connected: {lights.filter(l => l.connected).length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Lights Section */}
      <div style={{
        ...styles.card,
      }}>
        <h2 style={{
          ...styles.typography.h2,
          color: colors['text-primary'],
          marginBottom: '1.5rem',
        }}>Individual Lights</h2>

        {lights.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: colors['text-secondary'],
          }}>
            <p>No light units connected.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Make sure ESP-01 units are powered on and connected to the NodeNav-Lights network.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {lights.map((light) => (
              <div
                key={light.unitId}
                style={{
                  backgroundColor: colors['bg-tertiary'],
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${light.connected ? colors.success : colors['bg-quaternary']}`,
                }}
              >
                {/* Light Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}>
                  {editingLightId === light.unitId ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.25rem 0.5rem',
                          backgroundColor: colors['bg-primary'],
                          color: colors['text-primary'],
                          border: `1px solid ${colors['bg-quaternary']}`,
                          borderRadius: '0.25rem',
                        }}
                      />
                      <button
                        onClick={() => handleSaveLightName(light.unitId)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: colors.success,
                          color: colors['text-primary'],
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={handleCancelEditName}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: colors.danger,
                          color: colors['text-primary'],
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 'bold',
                          color: colors['text-primary'],
                          marginBottom: '0.25rem',
                        }}>
                          {light.friendlyName}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: colors['text-secondary'],
                        }}>
                          {light.unitId.slice(-17)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditLightName(light)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: colors['bg-quaternary'],
                          color: colors['text-primary'],
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}
                </div>

                {/* Color Preview */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '0.5rem',
                      backgroundColor: `rgb(${light.state.r}, ${light.state.g}, ${light.state.b})`,
                      border: `2px solid ${colors['bg-quaternary']}`,
                    }}
                  />
                  <div style={{ flex: 1, fontSize: '0.875rem', color: colors['text-secondary'] }}>
                    <div>RGB: {light.state.r}, {light.state.g}, {light.state.b}</div>
                    <div>Brightness: {Math.round(light.state.brightness * 100)}%</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                }}>
                  <button
                    onClick={() => handleIdentifyLight(light.unitId)}
                    disabled={!light.connected}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: light.connected ? colors['accent-primary'] : colors['bg-quaternary'],
                      color: colors['text-primary'],
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: light.connected ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Zap size={16} />
                    Identify
                  </button>
                </div>

                {/* Connection Status */}
                <div style={{
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: light.connected ? colors.success : colors.danger,
                  textAlign: 'center',
                }}>
                  {light.connected ? '● Connected' : '● Disconnected'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GPIOControl;
