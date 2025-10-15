import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Load MapBox access token from environment variable
// Get your token from https://account.mapbox.com and add it to your .env file
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

const MapBox = ({
  center = [-105.2705, 40.0150], // Default to Boulder, CO [lng, lat]
  zoom = 13,
  bearing = 0, // Rotation in degrees
  pitch = 0, // Tilt angle in degrees (0-85 in v3)
  style = 'mapbox://styles/mapbox/streets-v12', // Default to streets style
  onMapLoad = null,
  currentPosition = null, // { latitude, longitude, accuracy, bearing }
  ...props
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const currentPositionMarker = useRef(null);
  const accuracyCircle = useRef(null);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Check if access token is set
    if (!mapboxgl.accessToken) {
      console.error('MapBox access token is missing. Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file.');
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style,
      center: center,
      zoom: zoom,
      bearing: bearing,
      pitch: pitch,
      attributionControl: false,
    });

    // Map loaded event
    map.current.on('load', () => {
      setMapLoaded(true);
      if (onMapLoad && typeof onMapLoad === 'function') {
        onMapLoad(map.current);
      }
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  // Update map camera when props change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    map.current.easeTo({
      center: center,
      zoom: zoom,
      bearing: bearing,
      pitch: pitch,
      duration: 1000, // Smooth transition over 1 second
    });
  }, [center, zoom, bearing, pitch, mapLoaded]);

  // Update current position marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // If no current position, remove marker and return
    if (!currentPosition || !currentPosition.latitude || !currentPosition.longitude) {
      if (currentPositionMarker.current) {
        currentPositionMarker.current.remove();
        currentPositionMarker.current = null;
      }
      if (accuracyCircle.current && map.current.getLayer('accuracy-circle')) {
        map.current.removeLayer('accuracy-circle');
        map.current.removeSource('accuracy-circle');
        accuracyCircle.current = null;
      }
      return;
    }

    const lngLat = [currentPosition.longitude, currentPosition.latitude];

    // Create or update the position marker
    if (!currentPositionMarker.current) {
      // Create a custom marker element
      const el = document.createElement('div');
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#4A90E2';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 10px rgba(74, 144, 226, 0.5)';
      el.style.cursor = 'pointer';

      // Add a pulsing animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(74, 144, 226, 0); }
          100% { box-shadow: 0 0 0 0 rgba(74, 144, 226, 0); }
        }
      `;
      document.head.appendChild(style);
      el.style.animation = 'pulse 2s infinite';

      currentPositionMarker.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat(lngLat)
        .addTo(map.current);
    } else {
      // Update existing marker position
      currentPositionMarker.current.setLngLat(lngLat);
    }

    // Add/update accuracy circle if accuracy is available
    if (currentPosition.accuracy) {
      const accuracyRadiusInMeters = currentPosition.accuracy;
      
      // Convert meters to degrees (approximate)
      // At the equator, 1 degree of longitude ≈ 111,320 meters
      const metersPerDegree = 111320 * Math.cos(currentPosition.latitude * Math.PI / 180);
      const radiusInDegrees = accuracyRadiusInMeters / metersPerDegree;

      // Create circle GeoJSON
      const circleGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: lngLat
        }
      };

      if (accuracyCircle.current) {
        // Update existing circle
        const source = map.current.getSource('accuracy-circle');
        if (source) {
          source.setData(circleGeoJSON);
        }
      } else {
        // Create new circle
        if (!map.current.getSource('accuracy-circle')) {
          map.current.addSource('accuracy-circle', {
            type: 'geojson',
            data: circleGeoJSON
          });

          map.current.addLayer({
            id: 'accuracy-circle',
            type: 'circle',
            source: 'accuracy-circle',
            paint: {
              'circle-radius': {
                stops: [
                  [0, 0],
                  [20, radiusInDegrees * 100000] // Scale appropriately
                ],
                base: 2
              },
              'circle-color': '#4A90E2',
              'circle-opacity': 0.1,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#4A90E2',
              'circle-stroke-opacity': 0.3
            }
          });
          
          accuracyCircle.current = true;
        }
      }
    }
  }, [currentPosition, mapLoaded]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        ...props.style,
      }}
    />
  );
};

export default MapBox;

