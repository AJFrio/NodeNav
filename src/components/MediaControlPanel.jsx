import React, { useState, useEffect } from 'react';
import { styles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { bluetoothAPI } from '../services/api';

const MediaControlPanel = () => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({
    title: 'No Track',
    artist: 'No Artist',
  });
  const [albumArtUrl, setAlbumArtUrl] = useState(null);

  const updateMediaState = async () => {
    try {
      const state = await bluetoothAPI.getMediaState();
      if (state.connected && state.track && state.track.title !== 'No Track Playing') {
        setIsPlaying(state.isPlaying);
        setCurrentTrack({
          title: state.track.title || 'Unknown Title',
          artist: state.track.artist || 'Unknown Artist',
        });
        // Retrieve album art from localStorage, set by the main MediaPlayer
        const savedState = localStorage.getItem('nodenav-music-state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          // Check if the track is the same to avoid showing stale art
          if (parsed.currentTrack && parsed.currentTrack.title === state.track.title) {
            setAlbumArtUrl(parsed.albumArtUrl || null);
          } else {
            setAlbumArtUrl(null); // Clear art if track is different
          }
        }
      } else {
        setIsPlaying(false);
        setCurrentTrack({ title: 'Not Connected', artist: 'Bluetooth' });
        setAlbumArtUrl(null);
      }
    } catch (error) {
      console.debug('[MediaPanel] Could not fetch media state:', error.message);
      setCurrentTrack({ title: 'Service Unavailable', artist: 'Backend' });
      setAlbumArtUrl(null);
    }
  };

  useEffect(() => {
    updateMediaState();
    const interval = setInterval(updateMediaState, 1000); // Poll every second
    return () => clearInterval(interval);
  }, []);

  const handlePlayPause = async () => {
    await bluetoothAPI[isPlaying ? 'pauseMedia' : 'playMedia']();
    setTimeout(updateMediaState, 200);
  };

  const handlePrevious = async () => {
    await bluetoothAPI.previousTrack();
    setTimeout(updateMediaState, 200);
  };

  const handleNext = async () => {
    await bluetoothAPI.nextTrack();
    setTimeout(updateMediaState, 200);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ ...styles.typography.h3, color: colors['text-primary'], marginBottom: '1rem', flexShrink: 0 }}>
        Media
      </h2>
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Album Art */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '0.5rem',
          backgroundColor: colors['bg-tertiary'],
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {albumArtUrl ? (
            <img src={albumArtUrl} alt="Album Art" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors['text-tertiary']} strokeWidth="1">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </div>
        {/* Track Info & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, overflow: 'hidden' }}>
          <p style={{ margin: 0, color: colors['text-primary'], fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.title}
          </p>
          <p style={{ margin: '0.25rem 0 1rem 0', color: colors['text-secondary'], fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.artist}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handlePrevious} style={controlButtonStyle(colors)}>
              <SkipBack size={20} color={colors['text-primary']} />
            </button>
            <button onClick={handlePlayPause} style={{ ...controlButtonStyle(colors), width: '45px', height: '45px', backgroundColor: colors.primary }}>
              {isPlaying ? <Pause size={22} color={colors['bg-primary']} fill={colors['bg-primary']} /> : <Play size={22} color={colors['bg-primary']} fill={colors['bg-primary']} style={{ marginLeft: '3px' }} />}
            </button>
            <button onClick={handleNext} style={controlButtonStyle(colors)}>
              <SkipForward size={20} color={colors['text-primary']} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const controlButtonStyle = (colors) => ({
  width: '40px',
  height: '40px',
  backgroundColor: colors['bg-tertiary'],
  border: `1px solid ${colors['bg-quaternary'] || colors['bg-tertiary']}`,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 150ms ease',
});

export default MediaControlPanel;