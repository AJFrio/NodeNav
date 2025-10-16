import React, { useState, useEffect, useCallback } from 'react';
import { styles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { lightsAPI } from '../services/api';
import { Zap, Sun, Moon } from 'lucide-react';

const LightControlPanel = () => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [lights, setLights] = useState([]);
  const [globalBrightness, setGlobalBrightness] = useState(0);
  const [isLightOn, setIsLightOn] = useState(false);

  // Debounce helper
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  // Fetch lights state
  const fetchLightsState = async () => {
    try {
      const fetchedLights = await lightsAPI.getAllLights();
      setLights(fetchedLights);

      if (fetchedLights.length > 0) {
        // Use the brightness of the first light as the global state
        const firstLight = fetchedLights[0];
        const brightnessPercent = Math.round(firstLight.state.brightness * 100);
        setGlobalBrightness(brightnessPercent);
        setIsLightOn(brightnessPercent >= 5);
      }
    } catch (err) {
      console.error('[LightPanel] Failed to fetch lights:', err);
    }
  };

  useEffect(() => {
    fetchLightsState();
    const interval = setInterval(fetchLightsState, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Debounced function to set brightness for all lights
  const setAllLightsBrightness = useCallback(
    debounce(async (brightnessValue) => {
      try {
        await lightsAPI.setAllLightsBrightness(brightnessValue / 100);
      } catch (err) {
        console.error('[LightPanel] Failed to set brightness:', err);
      }
    }, 200),
    []
  );

  const handleBrightnessChange = (e) => {
    const newBrightness = parseInt(e.target.value, 10);
    setGlobalBrightness(newBrightness);
    setIsLightOn(newBrightness >= 5);
    setAllLightsBrightness(newBrightness);
  };

  const toggleLights = () => {
    const newBrightness = isLightOn ? 0 : 50; // Turn off or to a default 50%
    setGlobalBrightness(newBrightness);
    setIsLightOn(!isLightOn);
    setAllLightsBrightness(newBrightness);
  };

  const connectedLightsCount = lights.filter(l => l.connected).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ ...styles.typography.h3, color: colors['text-primary'], marginBottom: '1rem', flexShrink: 0 }}>
        Lights
      </h2>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Main Control Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* On/Off Button */}
          <button
            onClick={toggleLights}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '0.75rem',
              border: `2px solid ${isLightOn ? colors.primary : colors['bg-tertiary']}`,
              backgroundColor: colors['bg-tertiary'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
          >
            {isLightOn ? (
              <Sun size={32} color={colors.primary} />
            ) : (
              <Moon size={32} color={colors['text-secondary']} />
            )}
          </button>

          {/* Brightness Slider */}
          <div style={{ flexGrow: 1 }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: colors['text-secondary'] }}>
              Brightness
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={globalBrightness}
                onChange={handleBrightnessChange}
                style={sliderStyle(colors, globalBrightness)}
                disabled={!isLightOn}
              />
              <span style={{ color: colors['text-primary'], fontWeight: '600', width: '40px' }}>
                {globalBrightness}%
              </span>
            </div>
          </div>
        </div>

        {/* Status Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: colors['bg-tertiary'],
          borderRadius: '0.5rem',
          marginTop: '1rem',
          flexShrink: 0,
        }}>
          <Zap size={16} color={connectedLightsCount > 0 ? colors.success : colors.danger} />
          <span style={{ fontSize: '0.875rem', color: colors['text-secondary'] }}>
            {connectedLightsCount} of {lights.length} lights connected
          </span>
        </div>
      </div>
    </div>
  );
};

const sliderStyle = (colors, progress) => ({
  flexGrow: 1,
  WebkitAppearance: 'none',
  appearance: 'none',
  width: '100%',
  height: '8px',
  borderRadius: '4px',
  background: `linear-gradient(to right, ${colors.primary} ${progress}%, ${colors['bg-quaternary']} ${progress}%)`,
  outline: 'none',
  opacity: '0.9',
  transition: 'opacity .15s ease-in-out',
  cursor: 'pointer',
});

export default LightControlPanel;