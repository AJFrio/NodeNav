import { useState, useEffect, useCallback } from 'react';

// Key for localStorage
const MAP_STATE_KEY = 'nodenav-map-state';

// Custom hook to synchronize map state and route across components
export const useMapSync = () => {
  // Load initial state from localStorage or use default values
  const getInitialState = () => {
    try {
      const savedState = localStorage.getItem(MAP_STATE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Ensure all required fields are present
        return {
          center: parsed.center || [-105.2705, 40.0150],
          zoom: parsed.zoom || 16.5,
          bearing: parsed.bearing || 0,
          pitch: parsed.pitch || 60,
          route: parsed.route || null,
        };
      }
    } catch (error) {
      console.error('Failed to parse map state from localStorage:', error);
    }
    // Default state if nothing in localStorage or parsing fails
    return {
      center: [-105.2705, 40.0150], // Boulder, CO
      zoom: 16.5,
      bearing: 0,
      pitch: 60,
      route: null,
    };
  };

  const [mapState, setMapState] = useState(getInitialState);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(MAP_STATE_KEY, JSON.stringify(mapState));
    } catch (error) {
      console.error('Failed to save map state to localStorage:', error);
    }
  }, [mapState]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === MAP_STATE_KEY) {
        try {
          const newState = JSON.parse(event.newValue);
          if (newState) {
            setMapState(newState);
          }
        } catch (error) {
          console.error('Failed to parse updated map state from localStorage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Update a specific part of the map state
  const updateMapState = useCallback((newState) => {
    setMapState((prevState) => ({ ...prevState, ...newState }));
  }, []);

  // Clear the route from the map state
  const clearRoute = useCallback(() => {
    setMapState((prevState) => ({ ...prevState, route: null }));
  }, []);

  return { ...mapState, updateMapState, clearRoute };
};