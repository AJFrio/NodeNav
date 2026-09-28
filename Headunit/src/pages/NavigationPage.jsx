import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Minus, Plus, Route as RouteIcon, LoaderCircle, TriangleAlert } from 'lucide-react';
import MapBox from '../components/MapBox';
import MusicControlWidget from '../components/MusicControlWidget';
import Directions from '../components/Directions';
import TripManager from '../components/TripManager';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';
import { bluetoothAPI } from '../services/api';
import { useMapSync } from '../hooks/useMapSync';

const NavigationPage = () => {
  const { theme, isDark } = useTheme();
  const colors = getColors(theme);
  const mapInstanceRef = useRef(null);
  const routeRequestIdRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [destination, setDestination] = useState(null);
  const [tripActive, setTripActive] = useState(false);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  // Music state from localStorage
  const [musicState, setMusicState] = useState({
    isPlaying: false,
    currentTrack: null,
    albumArtUrl: null,
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

  // Use the synchronized map state
  const { center, zoom, bearing, pitch, route, updateMapState, clearRoute } = useMapSync();
  const hasMusicTrack = Boolean(musicState.currentTrack);

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
    setMapReady(true);
    
    // Only configure Standard style if 3D is enabled
    if (enable3DMaps) {
      try {
        mapInstance.setConfigProperty('basemap', 'lightPreset', isDark ? 'night' : 'day');
        mapInstance.setConfigProperty('basemap', 'show3dObjects', true);
        console.log('3D map configured with light preset:', isDark ? 'night' : 'day');
      } catch (error) {
        console.error('Error setting map config:', error);
      }
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

  const handleDestinationSelect = async (coords, placeName) => {
    const requestId = ++routeRequestIdRef.current;
    setDestination(placeName || 'Destination');
    setTripActive(false); // Reset trip state
    setRouteSummary(null);
    setRouteError('');
    setRouteLoading(true);
    clearRoute();

    const start = center; // Using current map center as start
    const end = coords;
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${accessToken}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Route service is unavailable. Try again.');
      const data = await response.json();
      const routeResult = data.routes?.[0];
      if (!routeResult?.geometry?.coordinates?.length) throw new Error('No drivable route found for this destination.');
      if (requestId !== routeRequestIdRef.current) return;
      setRouteSummary({ distance: routeResult.distance, duration: routeResult.duration });
      updateMapState({ route: routeResult.geometry });
    } catch (err) {
      if (requestId !== routeRequestIdRef.current) return;
      console.error('Failed to fetch directions:', err);
      setRouteError(err.message || 'Could not calculate this route. Check your connection and try again.');
    } finally {
      if (requestId === routeRequestIdRef.current) setRouteLoading(false);
    }
  };

  const fitRouteOverview = () => {
    if (!route?.coordinates?.length || !mapInstanceRef.current) return;
    const bounds = route.coordinates.reduce((currentBounds, coord) => currentBounds.extend(coord),
      new mapboxgl.LngLatBounds(route.coordinates[0], route.coordinates[0]));
    const mapWidth = mapInstanceRef.current.getContainer().clientWidth;
    mapInstanceRef.current.fitBounds(bounds, {
      // Keep the whole route visible beside the search and floating route card.
      padding: {
        top: hasMusicTrack ? 178 : 106,
        right: mapWidth < 520 ? 24 : 42,
        bottom: mapWidth < 520 ? 156 : 112,
        left: 28,
      },
      maxZoom: 14.25,
      pitch: 0,
      bearing: 0,
      duration: 1050,
    });
  };

  // Frame the whole route before showing the Begin drive action.
  useEffect(() => {
    if (route?.coordinates?.length && mapReady && !tripActive) fitRouteOverview();
  }, [route, tripActive, mapReady, hasMusicTrack]);

  // Handler for "Begin Drive"
  const handleBeginTrip = () => {
    setTripActive(true);
    // Reorient the map to the driver's perspective
    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({
        center: route?.coordinates?.[0] || center,
        zoom: 16,
        pitch: 52,
        bearing: 0,
        duration: 1100,
      });
    }
  };

  // Handler for "Cancel"
  const handleCancelTrip = () => {
    setDestination(null);
    setRouteSummary(null);
    setRouteError('');
    clearRoute();
    setTripActive(false);
  };

  // Handler for "Stop Trip"
  const handleStopTrip = () => {
    setDestination(null);
    setRouteSummary(null);
    setRouteError('');
    clearRoute();
    setTripActive(false);
  };



  // Show error if token is missing
  if (!hasToken) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
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
      <Directions onDestinationSelect={handleDestinationSelect} />

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
          onCameraChange={updateMapState}
          route={route}
        />
      </div>

      {/* Music Control Widget - shows when music is playing */}
      <MusicControlWidget
        isPlaying={musicState.isPlaying}
        currentTrack={musicState.currentTrack}
        albumArtUrl={musicState.albumArtUrl}
        onPlayPause={handlePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      <div
        aria-label="Map controls"
        style={{ position: 'absolute', top: '50%', right: 16, zIndex: 12, display: 'flex', flexDirection: 'column', gap: 8, transform: 'translateY(-50%)' }}
      >
        {route && !tripActive && (
          <button className="map-touch-control" type="button" onClick={fitRouteOverview} aria-label="Show full route" title="Show full route">
            <RouteIcon size={19} />
          </button>
        )}
        <button className="map-touch-control" type="button" onClick={() => mapInstanceRef.current?.zoomIn({ duration: 220 })} aria-label="Zoom in" title="Zoom in">
          <Plus size={21} />
        </button>
        <button className="map-touch-control" type="button" onClick={() => mapInstanceRef.current?.zoomOut({ duration: 220 })} aria-label="Zoom out" title="Zoom out">
          <Minus size={21} />
        </button>
      </div>

      {(routeLoading || routeError) && (
        <div
          className="map-overlay-surface"
          role={routeError ? 'alert' : 'status'}
          style={{ position: 'absolute', top: 82, left: '50%', zIndex: 14, display: 'flex', alignItems: 'center', gap: 9, maxWidth: 'min(460px, calc(100% - 32px))', padding: '12px 15px', color: routeError ? '#ffd1cf' : '#f4f6f9', fontSize: 13, transform: 'translateX(-50%)' }}
        >
          {routeError ? <TriangleAlert size={17} /> : <LoaderCircle size={17} className="search-spinner" />}
          <span>{routeError || `Finding a route to ${destination}…`}</span>
        </div>
      )}

      {/* Trip Manager */}
      {route && !routeLoading && (
        <TripManager
          tripActive={tripActive}
          onBegin={handleBeginTrip}
          onCancel={handleCancelTrip}
          onStop={handleStopTrip}
          destinationLabel={destination}
          routeSummary={routeSummary}
        />
      )}
    </div>
  );
};

export default NavigationPage;
