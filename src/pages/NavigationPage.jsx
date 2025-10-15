import React, { useState, useEffect, useRef } from 'react';
import MapBox from '../components/MapBox';
import MusicControlWidget from '../components/MusicControlWidget';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';
import { bluetoothAPI } from '../services/api';

const NavigationPage = () => {
  const { theme, isDark } = useTheme();
  const colors = getColors(theme);
  const mapInstanceRef = useRef(null);

  // Music state from localStorage
  const [musicState, setMusicState] = useState({
    isPlaying: false,
    currentTrack: null,
  });

  // Check if 3D maps are enabled
  const [enable3DMaps, setEnable3DMaps] = useState(() => {
    try {
      const saved = localStorage.getItem('nodenav-3d-maps');
      return saved === 'true';
    } catch (error) {
      return false;
    }
  });

  // Map state - Navigation view optimized for driving
  const [center, setCenter] = useState([-105.2705, 40.0150]); // Boulder, CO
  const [zoom, setZoom] = useState(16.5); // Zoomed in for navigation
  const [bearing, setBearing] = useState(0); // Rotation (can be set to compass heading)
  const [pitch, setPitch] = useState(60); // 60 degrees tilt for 3rd person car view

  // Check if MapBox token is configured
  const hasToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  // Listen for changes to 3D maps setting
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('nodenav-3d-maps');
      setEnable3DMaps(saved === 'true');
    };

    // Listen for storage events (fired when localStorage changes in another tab/window)
    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for changes within the same tab
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
    console.log('Map loaded successfully');
    
    // Store map instance in a ref so we can update it when theme changes
    mapInstanceRef.current = mapInstance;
    
    // Only configure Standard style if 3D is enabled
    if (enable3DMaps) {
      mapInstance.on('style.load', () => {
        // Set light preset based on theme (day, dusk, dawn, or night)
        try {
          mapInstance.setConfigProperty('basemap', 'lightPreset', isDark ? 'night' : 'day');
          
          // Ensure 3D objects (buildings, landmarks, trees) are enabled
          mapInstance.setConfigProperty('basemap', 'show3dObjects', true);
          
          console.log('3D map configured with light preset:', isDark ? 'night' : 'day');
        } catch (error) {
          console.error('Error setting map config:', error);
        }
      });
    }
  };

  // Update light preset when theme changes (only for 3D maps)
  useEffect(() => {
    if (enable3DMaps && mapInstanceRef.current) {
      try {
        // Check if the map style is loaded and is the Standard style
        const style = mapInstanceRef.current.getStyle();
        if (style && style.name === 'Mapbox Standard') {
          mapInstanceRef.current.setConfigProperty('basemap', 'lightPreset', isDark ? 'night' : 'day');
          console.log('Updated light preset to:', isDark ? 'night' : 'day');
        }
      } catch (error) {
        console.error('Error updating light preset:', error);
      }
    }
  }, [isDark, enable3DMaps]);

  // Poll for music state updates from localStorage
  useEffect(() => {
    const updateMusicState = () => {
      try {
        const saved = localStorage.getItem('nodenav-music-state');
        if (saved) {
          const state = JSON.parse(saved);
          // Only show if there's a real track playing (not "No Track Playing")
          if (state.currentTrack && state.currentTrack.title !== 'No Track Playing') {
            // Check if track actually changed
            const trackChanged = 
              !musicState.currentTrack || 
              musicState.currentTrack.title !== state.currentTrack.title ||
              musicState.currentTrack.artist !== state.currentTrack.artist;
            
            if (trackChanged || musicState.isPlaying !== state.isPlaying) {
              console.log('[Navigation] Music state updated:', {
                track: state.currentTrack.title,
                artist: state.currentTrack.artist,
                isPlaying: state.isPlaying
              });
            }
            
            setMusicState({
              isPlaying: state.isPlaying,
              currentTrack: state.currentTrack,
            });
          } else {
            // No valid track - hide widget
            if (musicState.currentTrack !== null) {
              console.log('[Navigation] No music playing, hiding widget');
            }
            setMusicState({
              isPlaying: false,
              currentTrack: null,
            });
          }
        }
      } catch (error) {
        console.error('[Navigation] Failed to load music state:', error);
      }
    };

    // Initial load
    updateMusicState();

    // Poll every 500ms for more responsive updates
    const interval = setInterval(updateMusicState, 500);

    return () => clearInterval(interval);
  }, [musicState]);

  // Music control handlers - matching MediaPlayer implementation
  const handlePlayPause = async () => {
    try {
      const wasPlaying = musicState.isPlaying;
      if (wasPlaying) {
        await bluetoothAPI.pauseMedia();
        console.log('[Navigation] Paused music');
      } else {
        await bluetoothAPI.playMedia();
        console.log('[Navigation] Playing music');
      }
      // Force update music state after a short delay
      setTimeout(() => {
        const saved = localStorage.getItem('nodenav-music-state');
        if (saved) {
          const state = JSON.parse(saved);
          setMusicState({
            isPlaying: !wasPlaying, // Toggle immediately
            currentTrack: state.currentTrack,
          });
        }
      }, 100);
    } catch (error) {
      console.error('[Navigation] Play/Pause failed:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await bluetoothAPI.previousTrack();
      console.log('[Navigation] Went to previous track');
    } catch (error) {
      console.error('[Navigation] Previous track failed:', error);
    }
  };

  const handleNext = async () => {
    try {
      await bluetoothAPI.nextTrack();
      console.log('[Navigation] Skipped to next track');
    } catch (error) {
      console.error('[Navigation] Next track failed:', error);
    }
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
          style={getMapStyle()}
          onMapLoad={handleMapLoad}
        />
      </div>

      {/* Music Control Widget - shows when music is playing */}
      <MusicControlWidget
        isPlaying={musicState.isPlaying}
        currentTrack={musicState.currentTrack}
        onPlayPause={handlePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </div>
  );
};

export default NavigationPage;

