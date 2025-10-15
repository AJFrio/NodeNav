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
  ...props
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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

