import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';

const TripManager = ({ onBegin, onCancel, onStop, tripActive }) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger fade-in animation when tripActive becomes true
  useEffect(() => {
    if (tripActive) {
      setIsVisible(true);
    } else {
      // Allow fade-out animation before unmounting
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [tripActive]);

  const buttonBaseStyle = {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
  };

  const beginButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#FFFFFF', // White background
    color: '#1A1A1A', // Dark text
  };

  const cancelButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#333333', // Dark background
    color: '#FFFFFF', // White text
  };

  const stopButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#D32F2F', // Red for stop
    color: '#FFFFFF',
    width: '100%', // Take full width
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '2rem',
        left: '2rem',
        backgroundColor: colors['bg-secondary'],
        padding: '1rem',
        borderRadius: '1rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        transform: tripActive ? 'translateY(0)' : 'translateY(150%)',
        opacity: tripActive ? 1 : 0,
        transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
        zIndex: 1000,
      }}
    >
      {!tripActive ? (
        <>
          <button style={beginButtonStyle} onClick={onBegin}>
            Begin Drive
          </button>
          <button style={cancelButtonStyle} onClick={onCancel}>
            Cancel
          </button>
        </>
      ) : (
        <button style={stopButtonStyle} onClick={onStop}>
          Stop Trip
        </button>
      )}
    </div>
  );
};

export default TripManager;