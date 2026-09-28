import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';
import SearchIcon from './icons/SearchIcon';

const Directions = ({ onDestinationSelect, onToggle }) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setError(null);
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&autocomplete=true`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log(data);
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

  const inputRef = React.useRef(null);

  const handleToggle = () => {
    if (isExpanded && query === '') {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
      if (!isExpanded) {
        setTimeout(() => inputRef.current.focus(), 0);
      }
    }
  };

  return (
    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <form onSubmit={handleSearch}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            style={{
              width: isExpanded ? 200 : 0,
              padding: isExpanded ? '8px' : '8px 0',
              opacity: isExpanded ? 1 : 0,
              border: `1px solid ${colors['bg-tertiary']}`,
              borderRadius: 8,
              backgroundColor: colors['bg-tertiary'],
              color: colors['text-primary'],
              transition: 'all 0.3s ease-in-out',
              marginRight: 8,
            }}
          />
        </form>
        <button type="button" onClick={handleToggle} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <SearchIcon color={colors['text-primary']} />
        </button>
      </div>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 10, margin: 0, marginTop: 8, backgroundColor: colors['bg-secondary'], borderRadius: 8 }}>
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