import React, { useState } from 'react';
import MapBox from '../components/MapBox';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';

const NavigationPage = () => {
  const { theme } = useTheme();
  const colors = getColors(theme);

  // Map state - Navigation view optimized for driving
  const [center, setCenter] = useState([-105.2705, 40.0150]); // Boulder, CO
  const [zoom, setZoom] = useState(16.5); // Zoomed in for navigation
  const [bearing, setBearing] = useState(0); // Rotation (can be set to compass heading)
  const [pitch, setPitch] = useState(60); // 60 degrees tilt for 3rd person car view

  // Check if MapBox token is configured
  const hasToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  const handleMapLoad = (map) => {
    console.log('Map loaded successfully');
    // You can add additional map setup here
  };

  // Show error if token is missing
  if (!hasToken) {
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          backgroundColor: colors['bg-primary'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: colors['bg-secondary'],
            border: `1px solid ${colors['bg-tertiary']}`,
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '600px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: colors['text-primary'],
              marginBottom: '1rem',
            }}
          >
            MapBox Access Token Required
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: colors['text-secondary'],
              marginBottom: '1.5rem',
            }}
          >
            To use the Navigation feature, you need to configure your MapBox access token.
          </p>
          <div
            style={{
              backgroundColor: colors['bg-tertiary'],
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: colors['text-tertiary'],
              marginBottom: '1rem',
            }}
          >
            <p style={{ margin: '0.5rem 0' }}>1. Get a token from: https://account.mapbox.com</p>
            <p style={{ margin: '0.5rem 0' }}>2. Create a .env file in the root directory</p>
            <p style={{ margin: '0.5rem 0' }}>3. Add: VITE_MAPBOX_ACCESS_TOKEN=your_token_here</p>
            <p style={{ margin: '0.5rem 0' }}>4. Restart the development server</p>
          </div>
          <p
            style={{
              fontSize: '0.875rem',
              color: colors['text-secondary'],
            }}
          >
            See MAPBOX_SETUP.md for detailed instructions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        backgroundColor: colors['bg-primary'],
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Map Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <MapBox
          center={center}
          zoom={zoom}
          bearing={bearing}
          pitch={pitch}
          style={theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12'}
          onMapLoad={handleMapLoad}
        />
      </div>

      {/* Navigation Info Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          backgroundColor: colors['bg-secondary'],
          border: `1px solid ${colors['bg-tertiary']}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          zIndex: 1,
          maxWidth: '250px',
        }}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: colors['text-primary'],
            marginBottom: '0.5rem',
          }}
        >
          Navigation View
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: colors['text-secondary'],
            margin: 0,
          }}
        >
          Boulder, Colorado
        </p>
        <p
          style={{
            fontSize: '0.75rem',
            color: colors['text-tertiary'],
            margin: '0.5rem 0 0 0',
          }}
        >
          Drag to pan • Pinch to rotate • Scroll to zoom
        </p>
      </div>
    </div>
  );
};

export default NavigationPage;

