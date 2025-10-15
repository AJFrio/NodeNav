import React, { useState, useEffect, useRef } from 'react';
import MapBox from '../components/MapBox';
import MusicControlWidget from '../components/MusicControlWidget';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';
import { bluetoothAPI, gpsAPI } from '../services/api';

const NavigationPage = () => {
  const { theme, isDark } = useTheme();
  const colors = getColors(theme);
  const mapInstanceRef = useRef(null);

  // Music state from localStorage
  const [musicState, setMusicState] = useState({
    isPlaying: false,
    currentTrack: null,
    albumArtUrl: null,
  });

  // GPS state
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsConnected, setGpsConnected] = useState(false);
  const [hasStartedGPS, setHasStartedGPS] = useState(false);

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
  const [center, setCenter] = useState([-105.2705, 40.0150]); // Boulder, CO (default)
  const [zoom, setZoom] = useState(16.5); // Zoomed in for navigation
  const [bearing, setBearing] = useState(0); // Rotation (can be set to compass heading)
  const [pitch, setPitch] = useState(60); // 60 degrees tilt for 3rd person car view
  const [isFollowingGPS, setIsFollowingGPS] = useState(true); // Auto-center on GPS

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

  // Update media state from backend - SAME AS MEDIAPLAYER
  const updateMediaState = async () => {
    try {
      const state = await bluetoothAPI.getMediaState();
      
      if (state.connected && state.track) {
        const newIsPlaying = state.isPlaying;
        const newTrack = {
          title: state.track.title || 'Unknown',
          artist: state.track.artist || 'Unknown',
          album: state.track.album || 'Unknown',
        };
        
        // Only show widget if there's a real track (not "No Track Playing")
        if (newTrack.title !== 'No Track Playing' && newTrack.title !== 'Unknown') {
          // Try to get album art from localStorage (set by MediaPlayer)
          let albumArtUrl = null;
          try {
            const savedState = localStorage.getItem('nodenav-music-state');
            if (savedState) {
              const parsed = JSON.parse(savedState);
              albumArtUrl = parsed.albumArtUrl || null;
            }
          } catch (err) {
            console.debug('[Navigation] Could not read album art from localStorage');
          }

          setMusicState({
            isPlaying: newIsPlaying,
            currentTrack: newTrack,
            albumArtUrl,
          });
        } else {
          // Hide widget if no valid track
          setMusicState({
            isPlaying: false,
            currentTrack: null,
            albumArtUrl: null,
          });
        }
      } else {
        // No bluetooth connection or no track - hide widget
        setMusicState({
          isPlaying: false,
          currentTrack: null,
          albumArtUrl: null,
        });
      }
    } catch (error) {
      // Silently fail - backend might not be running
      console.debug('[Navigation] Could not fetch media state:', error.message);
    }
  };

  // Poll for music state updates from API - SAME AS MEDIAPLAYER
  useEffect(() => {
    // Initial load
    updateMediaState();

    // Poll every 1 second for updates
    const interval = setInterval(updateMediaState, 1000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array - no infinite loop!

  // Start GPS listener when a connected device is found
  useEffect(() => {
    const startGPSListener = async () => {
      if (hasStartedGPS) return;

      try {
        // Check if there's a connected Bluetooth device
        const connectedDevices = await bluetoothAPI.getConnectedDevices();
        
        if (connectedDevices && connectedDevices.length > 0) {
          // Use the first connected device
          const device = connectedDevices[0];
          const deviceAddress = device.address;
          
          console.log(`[Navigation] Starting GPS listener for device: ${deviceAddress}`);
          
          try {
            await gpsAPI.startListening(deviceAddress);
            setHasStartedGPS(true);
            console.log('[Navigation] GPS listener started successfully');
          } catch (error) {
            console.debug('[Navigation] GPS service not available or device not streaming GPS:', error.message);
          }
        }
      } catch (error) {
        console.debug('[Navigation] Could not start GPS listener:', error.message);
      }
    };

    // Try to start GPS listener after a short delay
    const timeout = setTimeout(startGPSListener, 2000);
    return () => clearTimeout(timeout);
  }, [hasStartedGPS]);

  // Poll for GPS location updates
  useEffect(() => {
    const updateGPSLocation = async () => {
      try {
        const location = await gpsAPI.getLocation();
        
        if (location && location.latitude && location.longitude) {
          setGpsLocation(location);
          setGpsConnected(true);
          
          // Auto-center map on GPS position if following
          if (isFollowingGPS) {
            setCenter([location.longitude, location.latitude]);
            
            // Update bearing if available
            if (location.bearing !== null && location.bearing !== undefined) {
              setBearing(location.bearing);
            }
          }
        } else {
          setGpsConnected(false);
        }
      } catch (error) {
        // Silently fail - GPS might not be available
        console.debug('[Navigation] Could not fetch GPS location:', error.message);
        setGpsConnected(false);
      }
    };

    // Initial fetch
    updateGPSLocation();

    // Poll every 1 second for GPS updates
    const interval = setInterval(updateGPSLocation, 1000);

    return () => clearInterval(interval);
  }, [isFollowingGPS]);

  // Music control handlers - SAME AS MEDIAPLAYER
  const handlePlayPause = async () => {
    try {
      if (musicState.isPlaying) {
        await bluetoothAPI.pauseMedia();
        console.log('[Navigation] Paused music');
      } else {
        await bluetoothAPI.playMedia();
        console.log('[Navigation] Playing music');
      }
      // Polling will automatically update the state
    } catch (error) {
      console.error('[Navigation] Play/Pause failed:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await bluetoothAPI.previousTrack();
      console.log('[Navigation] Went to previous track');
      // Polling will automatically update the state
    } catch (error) {
      console.error('[Navigation] Previous track failed:', error);
    }
  };

  const handleNext = async () => {
    try {
      await bluetoothAPI.nextTrack();
      console.log('[Navigation] Skipped to next track');
      // Polling will automatically update the state
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
        height: '100%',
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
          currentPosition={gpsLocation}
        />
      </div>

      {/* GPS Status Indicator */}
      {gpsConnected && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            backgroundColor: 'rgba(74, 144, 226, 0.9)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#00ff00',
              animation: 'pulse 2s infinite',
            }}
          />
          GPS Connected
        </div>
      )}

      {/* Music Control Widget - shows when music is playing */}
      <MusicControlWidget
        isPlaying={musicState.isPlaying}
        currentTrack={musicState.currentTrack}
        albumArtUrl={musicState.albumArtUrl}
        onPlayPause={handlePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </div>
  );
};

export default NavigationPage;

