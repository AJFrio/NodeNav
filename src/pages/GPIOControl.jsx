import React, { useState, useEffect, useRef } from 'react';
import { gpioAPI } from '../services/api';
import { styles, colors } from '../styles';

const GPIOControl = () => {
  const [currentColor, setCurrentColor] = useState({ h: 0, s: 100, l: 50 });
  const [brightness, setBrightness] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);

  useEffect(() => {
    drawColorWheel();
  }, []);

  useEffect(() => {
    drawColorWheel();
  }, [currentColor]);

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

  const applyColor = async () => {
    try {
      // Convert HSL to RGB for backend
      const rgbColor = hslToRgb(currentColor.h, currentColor.s, currentColor.l);
      await gpioAPI.pwmWrite(2, rgbColor.r);
      await gpioAPI.pwmWrite(3, rgbColor.g);
      await gpioAPI.pwmWrite(4, rgbColor.b);
    } catch (err) {
      setError('Failed to apply color');
      console.error('Error applying color:', err);
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
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '2rem',
        alignItems: 'flex-start',
      }}>
        {/* Color Wheel Section */}
        <div style={{
          ...styles.card,
          textAlign: 'center',
          flex: 1,
        }}>
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            onMouseDown={handleColorWheelMouseDown}
            style={{
              borderRadius: '50%',
              cursor: isDragging ? 'grabbing' : 'grab',
              border: `2px solid ${colors['bg-tertiary']}`,
              display: 'block',
              margin: '0 auto 1rem auto',
            }}
          />
        </div>

        {/* Brightness & Controls Section */}
        <div style={{
          ...styles.card,
          textAlign: 'center',
          width: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.5rem',
        }}>
          <h2 style={{
            ...styles.typography.h2,
            color: colors['text-primary'],
            marginBottom: '2rem',
          }}>Controls</h2>

          {/* Vertical Brightness Slider */}
          <div style={{
            marginBottom: '2rem',
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
              <div>Brightness: {brightness}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPIOControl;
