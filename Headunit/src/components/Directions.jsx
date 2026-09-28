import React, { useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';

const Directions = ({ onDestinationSelect }) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);
  const searchRequestIdRef = useRef(0);

  const handleSearch = async (event) => {
    event.preventDefault();
    const searchTerm = query.trim();
    if (!searchTerm || isSearching) return;

    const requestId = ++searchRequestIdRef.current;
    setError('');
    setResults([]);
    setHasSearched(false);
    setIsSearching(true);
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const params = new URLSearchParams({
      access_token: accessToken,
      autocomplete: 'true',
      limit: '5',
    });

    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?${params}`);
      if (!response.ok) throw new Error('Place search is unavailable. Try again.');
      const data = await response.json();
      if (requestId !== searchRequestIdRef.current) return;
      const places = Array.isArray(data.features) ? data.features : [];
      setResults(places);
      setHasSearched(true);
    } catch (searchError) {
      if (requestId !== searchRequestIdRef.current) return;
      setResults([]);
      setError(searchError.message || 'Could not search places. Check your connection and try again.');
    } finally {
      if (requestId === searchRequestIdRef.current) setIsSearching(false);
    }
  };

  const handleSelect = (place) => {
    onDestinationSelect(place.center, place.place_name);
    setResults([]);
    setQuery('');
    setHasSearched(false);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    searchRequestIdRef.current += 1;
    setQuery('');
    setResults([]);
    setError('');
    setHasSearched(false);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  return (
    <section
      className="map-overlay-surface"
      aria-label="Destination search"
      style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, width: 'min(420px, calc(100vw - 32px))', padding: 9 }}
    >
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <MapPin aria-hidden="true" size={19} color={colors['text-tertiary']} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            ref={inputRef}
            className="map-search-input"
            type="search"
            value={query}
            inputMode="search"
            onChange={(event) => {
              searchRequestIdRef.current += 1;
              setQuery(event.target.value);
              setResults([]);
              setError('');
              setHasSearched(false);
              setIsSearching(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                searchRequestIdRef.current += 1;
                setResults([]);
                setIsSearching(false);
                inputRef.current?.blur();
              }
            }}
            placeholder="Where to?"
            aria-label="Search for a destination"
            aria-controls="destination-results"
            aria-expanded={results.length > 0}
            style={{ paddingLeft: 43, paddingRight: query ? 44 : 14 }}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear destination search"
              style={{ position: 'absolute', top: 4, right: 4, width: 44, height: 44, display: 'grid', placeItems: 'center', color: '#b7bdc7', border: 0, borderRadius: 12, background: 'transparent', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button className="map-touch-control" type="submit" aria-label="Search destinations" disabled={!query.trim() || isSearching} style={{ flex: '0 0 50px', width: 50, height: 52, borderRadius: 14, color: '#11151a', background: '#f6f8fb' }}>
          {isSearching ? <LoaderCircle size={20} className="search-spinner" /> : <Search size={20} />}
        </button>
      </form>

      {(results.length > 0 || error || (hasSearched && results.length === 0)) && (
        <div style={{ marginTop: 8, overflow: 'hidden', borderRadius: 14, background: 'rgba(14,16,20,.97)' }}>
          {results.length > 0 ? (
            <div id="destination-results" role="listbox" aria-label="Destination results">
              {results.map((place) => (
                <button key={place.id} className="map-search-result" type="button" role="option" onClick={() => handleSelect(place)}>
                  <span style={{ display: 'grid', width: 36, height: 36, flex: '0 0 36px', placeItems: 'center', borderRadius: 11, color: '#a9d4ff', background: 'rgba(113,183,255,.12)' }}>
                    <MapPin size={17} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', overflow: 'hidden', fontSize: 14, fontWeight: 650, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.text}</span>
                    <span style={{ display: 'block', overflow: 'hidden', marginTop: 3, color: '#9da4af', fontSize: 12, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.place_name}</span>
                  </span>
                  <ArrowUpRight size={16} color="#89919d" />
                </button>
              ))}
            </div>
          ) : (
            <div role="status" style={{ padding: '15px 16px', color: error ? '#ffaaa7' : '#c4c9d1', fontSize: 13 }}>
              {error || 'No places found. Try a nearby city or street.'}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default Directions;
