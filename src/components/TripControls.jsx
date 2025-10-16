import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';

const TripControls = ({ tripState, onBegin, onCancel, onStop }) => {
  const { theme } = useTheme();
  const colors = getColors(theme);

  const containerStyle = {
    position: 'absolute',
    bottom: tripState === 'inactive' ? '-100px' : '20px',
    left: '20px',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    gap: '10px',
    transition: 'bottom 0.3s ease-in-out',
    zIndex: 10,
  };

  const buttonStyle = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s, color 0.3s',
  };

  const beginButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#FFFFFF',
    color: '#000000',
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#333333',
    color: '#FFFFFF',
  };

  const stopButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#A00000',
    color: '#FFFFFF',
  };

  if (tripState === 'prompting') {
    return (
      <div style={containerStyle}>
        <button style={beginButtonStyle} onClick={onBegin}>
          Begin Drive
        </button>
        <button style={cancelButtonStyle} onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  if (tripState === 'active') {
    return (
      <div style={containerStyle}>
        <button style={stopButtonStyle} onClick={onStop}>
          Stop Trip
        </button>
      </div>
    );
  }

  return null;
};

export default TripControls;