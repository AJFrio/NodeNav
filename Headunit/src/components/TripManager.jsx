import React, { useEffect, useRef, useState } from 'react';
import { Clock3, MapPin, Navigation2, Square, X } from 'lucide-react';

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return null;
  const miles = meters / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
};

const TripManager = ({ onBegin, onCancel, onStop, tripActive, destinationLabel, routeSummary }) => {
  const [isVisible, setIsVisible] = useState(true);
  const exitTimer = useRef(null);
  const distance = formatDistance(routeSummary?.distance);
  const duration = formatDuration(routeSummary?.duration);

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  const dismiss = (callback) => {
    setIsVisible(false);
    exitTimer.current = setTimeout(callback, 220);
  };

  return (
    <section
      className="map-overlay-surface trip-manager"
      data-testid="trip-manager"
      aria-live="polite"
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        left: 16,
        zIndex: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        maxWidth: 720,
        padding: '10px 11px 10px 15px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 180ms ease, transform 180ms ease',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="trip-manager__summary" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ display: 'grid', width: 40, height: 40, flex: '0 0 40px', placeItems: 'center', borderRadius: 13, color: '#a9d4ff', background: 'rgba(113,183,255,.13)' }}>
          {tripActive ? <Navigation2 size={19} /> : <MapPin size={19} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ overflow: 'hidden', color: '#f4f6f9', fontSize: 14, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tripActive ? 'Drive in progress' : destinationLabel || 'Route ready'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, color: '#b3bac5', fontSize: 12 }}>
            {!tripActive && duration && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock3 size={13} />{duration}</span>}
            {!tripActive && duration && distance && <span aria-hidden="true" style={{ opacity: 0.6 }}>·</span>}
            {!tripActive && distance && <span>{distance}</span>}
            {tripActive && <span>Follow the highlighted route</span>}
            {!tripActive && !duration && !distance && <span>Review the route, then begin</span>}
          </div>
        </div>
      </div>

      {!tripActive ? (
        <div className="trip-manager__actions" style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
          <button className="trip-action-button trip-action-button--primary" type="button" onClick={onBegin}>
            <Navigation2 size={17} />
            <span>Begin drive</span>
          </button>
          <button
            className="trip-action-button trip-action-button--quiet"
            type="button"
            onClick={() => dismiss(onCancel)}
            aria-label="Cancel route"
            title="Cancel route"
            style={{ width: 48, minWidth: 48, padding: 0 }}
          >
            <X size={19} />
          </button>
        </div>
      ) : (
        <div className="trip-manager__actions" style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
          <button className="trip-action-button trip-action-button--stop" type="button" onClick={() => dismiss(onStop)}>
            <Square size={16} fill="currentColor" />
            <span>End drive</span>
          </button>
        </div>
      )}
    </section>
  );
};

export default TripManager;
