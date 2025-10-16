import { useState, useEffect, useCallback } from 'react';

const useMapSync = (initialState) => {
  const [mapState, setMapState] = useState(() => {
    try {
      const savedState = localStorage.getItem('nodenav-map-state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Combine saved state with initial state to ensure all keys are present
        return { ...initialState, ...parsed };
      }
    } catch (error) {
      console.error('Error reading map state from localStorage:', error);
    }
    return initialState;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nodenav-map-state', JSON.stringify(mapState));
    } catch (error) {
      console.error('Error saving map state to localStorage:', error);
    }
  }, [mapState]);

  const updateMapState = useCallback((newState) => {
    setMapState((prevState) => ({ ...prevState, ...newState }));
  }, []);

  return [mapState, updateMapState];
};

export default useMapSync;