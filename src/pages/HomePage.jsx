import React, { useState, useEffect, useRef } from 'react';
import MapBox from '../components/MapBox';
import MediaControlPanel from '../components/MediaControlPanel';
import LightControlPanel from '../components/LightControlPanel';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';
import { useMapSync } from '../hooks/useMapSync';

const HomePage = () => {
  const { theme, isDark } = useTheme();
  const colors = getColors(theme);
  const mapInstanceRef = useRef(null);

  // Check if 3D maps are enabled from localStorage
  const [enable3DMaps, setEnable3DMaps] = useState(() => {
    try {
      return localStorage.getItem('nodenav-3d-maps') === 'true';
    } catch (error) {
      return false;
    }
  });

  // Use the synchronized map state
  const { center, zoom, bearing, pitch, route } = useMapSync();

  // Check if MapBox token is configured
  const hasToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  // Listen for changes to 3D maps setting
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('nodenav-3d-maps');
      setEnable3DMaps(saved === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Determine map style based on 3D setting and theme
  const getMapStyle = () => {
    if (enable3DMaps) {
      return 'mapbox://styles/mapbox/standard';
    }
    return isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
  };

  const handleMapLoad = (mapInstance) => {
    mapInstanceRef.current = mapInstance;
    if (enable3DMaps) {
      mapInstance.on('style.load', () => {
        try {
          mapInstance.setConfigProperty('basemap', 'lightPreset', isDark ? 'night' : 'day');
          mapInstance.setConfigProperty('basemap', 'show3dObjects', true);
        } catch (error) {
          console.error('Error setting map config:', error);
        }
      });
    }
  };

  // Update light preset when theme changes (only for 3D maps)
  useEffect(() => {
    if (enable3DMaps && mapInstanceRef.current) {
      const style = mapInstanceRef.current.getStyle();
      if (style && style.name === 'Mapbox Standard') {
        mapInstanceRef.current.setConfigProperty('basemap', 'lightPreset', isDark ? 'night' : 'day');
      }
    }
  }, [isDark, enable3DMaps]);

  // Show error if token is missing
  if (!hasToken) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem' }}>
        <div style={{ backgroundColor: colors['bg-secondary'], border: `1px solid ${colors['bg-tertiary']}`, borderRadius: '0.5rem', padding: '2rem', maxWidth: '600px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: colors['text-primary'], marginBottom: '1rem' }}>
            MapBox Access Token Required
          </h2>
          <p style={{ fontSize: '1rem', color: colors['text-secondary'], marginBottom: '1.5rem' }}>
            A MapBox access token is required for the map on the home page.
          </p>
          <div style={{ backgroundColor: colors['bg-tertiary'], borderRadius: '0.375rem', padding: '1rem', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.875rem', color: colors['text-tertiary'] }}>
            <p style={{ margin: '0.5rem 0' }}>Please refer to <strong>MAPBOX_SETUP.md</strong> for instructions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr',
      gap: '2rem',
      height: '100%',
      padding: '2rem',
      boxSizing: 'border-box',
    }}>
      {/* Left side: Map */}
      <div style={{
        gridColumn: '1 / 2',
        gridRow: '1 / 2',
        borderRadius: '1rem',
        overflow: 'hidden',
        border: `2px solid ${colors['bg-tertiary']}`,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      }}>
        <MapBox
          center={center}
          zoom={zoom}
          bearing={bearing}
          pitch={pitch}
          style={getMapStyle()}
          onMapLoad={handleMapLoad}
          route={route}
        />
      </div>

      {/* Right side: Panels */}
      <div style={{
        gridColumn: '2 / 3',
        gridRow: '1 / 2',
        display: 'grid',
        gridTemplateRows: '1fr 1fr',
        gap: '2rem'
      }}>
        <div style={{
          gridRow: '1 / 2',
          backgroundColor: colors['bg-secondary'],
          borderRadius: '1rem',
          padding: '1.5rem',
          border: `1px solid ${colors['bg-tertiary']}`,
        }}>
          <MediaControlPanel />
        </div>
        <div style={{
          gridRow: '2 / 3',
          backgroundColor: colors['bg-secondary'],
          borderRadius: '1rem',
          padding: '1.5rem',
          border: `1px solid ${colors['bg-tertiary']}`,
        }}>
          <LightControlPanel />
        </div>
      </div>
    </div>
  );
};

export default HomePage;