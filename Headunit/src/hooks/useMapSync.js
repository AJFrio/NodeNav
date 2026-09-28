import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const MAP_STATE_KEY = 'nodenav-map-state';
const DEFAULT_MAP_STATE = {
  center: [-105.2705, 40.0150], // Boulder, CO
  zoom: 16.5,
  bearing: 0,
  pitch: 60,
  route: null,
};
const MapSyncContext = createContext(null);

const loadMapState = () => {
  try {
    const savedState = localStorage.getItem(MAP_STATE_KEY);
    if (!savedState) return DEFAULT_MAP_STATE;

    const parsed = JSON.parse(savedState);
    return {
      center: Array.isArray(parsed.center) && parsed.center.length === 2
        ? parsed.center
        : DEFAULT_MAP_STATE.center,
      zoom: Number.isFinite(parsed.zoom) ? parsed.zoom : DEFAULT_MAP_STATE.zoom,
      bearing: Number.isFinite(parsed.bearing) ? parsed.bearing : DEFAULT_MAP_STATE.bearing,
      pitch: Number.isFinite(parsed.pitch) ? parsed.pitch : DEFAULT_MAP_STATE.pitch,
      route: parsed.route || null,
    };
  } catch (error) {
    console.error('Failed to load map state from localStorage:', error);
    return DEFAULT_MAP_STATE;
  }
};

const sameCamera = (left, right) =>
  Array.isArray(left.center) && Array.isArray(right.center) &&
  Math.abs(left.center[0] - right.center[0]) < 1e-7 &&
  Math.abs(left.center[1] - right.center[1]) < 1e-7 &&
  Math.abs(left.zoom - right.zoom) < 1e-4 &&
  Math.abs(left.bearing - right.bearing) < 1e-3 &&
  Math.abs(left.pitch - right.pitch) < 1e-3;

export const MapSyncProvider = ({ children }) => {
  const [mapState, setMapState] = useState(loadMapState);

  useEffect(() => {
    try {
      localStorage.setItem(MAP_STATE_KEY, JSON.stringify(mapState));
    } catch (error) {
      console.error('Failed to save map state to localStorage:', error);
    }
  }, [mapState]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key !== MAP_STATE_KEY || !event.newValue) return;
      try {
        const nextState = JSON.parse(event.newValue);
        if (nextState && Array.isArray(nextState.center)) {
          setMapState({ ...DEFAULT_MAP_STATE, ...nextState });
        }
      } catch (error) {
        console.error('Failed to parse updated map state from localStorage:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateMapState = useCallback((newState) => {
    setMapState((previousState) => {
      const nextState = { ...previousState, ...newState };
      if (sameCamera(previousState, nextState) && previousState.route === nextState.route) {
        return previousState;
      }
      return nextState;
    });
  }, []);

  const clearRoute = useCallback(() => {
    setMapState((previousState) => previousState.route === null
      ? previousState
      : { ...previousState, route: null });
  }, []);

  const value = useMemo(() => ({ ...mapState, updateMapState, clearRoute }), [
    mapState,
    updateMapState,
    clearRoute,
  ]);

  return React.createElement(MapSyncContext.Provider, { value }, children);
};

export const useMapSync = () => {
  const context = useContext(MapSyncContext);
  if (!context) {
    throw new Error('useMapSync must be used within a MapSyncProvider');
  }
  return context;
};
