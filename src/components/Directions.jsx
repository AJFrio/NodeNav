import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';
import SearchIcon from './icons/SearchIcon';

const Directions = ({ onDestinationSelect }) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setError(null);
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&autocomplete=true`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.features) {
        setResults(data.features);
      } else {
        setResults([]);
      }
    } catch (err) {
      setError('Failed to fetch results');
      console.error(err);
    }
  };

  const handleSelect = (result) => {
    onDestinationSelect(result.center);
    setResults([]);
    setQuery('');
  };

  return (
    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1, backgroundColor: colors['bg-secondary'], padding: 10, borderRadius: 8 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a destination"
          style={{
            backgroundColor: colors['bg-tertiary'],
            color: colors['text-primary'],
            border: `1px solid ${colors['bg-tertiary']}`,
            borderRadius: 4,
            padding: 8,
            marginRight: 8
          }}
        />
        <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <SearchIcon color={colors['text-primary']} />
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: 8 }}>
          {results.map((result) => (
            <li
              key={result.id}
              onClick={() => handleSelect(result)}
              style={{
                padding: 8,
                cursor: 'pointer',
                borderBottom: `1px solid ${colors['bg-tertiary']}`,
                color: colors['text-primary']
              }}
            >
              {result.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Directions;