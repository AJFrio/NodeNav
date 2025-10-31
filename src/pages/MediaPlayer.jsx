import React, { useState, useEffect, useRef } from 'react';
import { styles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { Play, Pause, SkipBack, SkipForward, Smartphone } from 'lucide-react';
import { bluetoothAPI } from '../services/api';
import { lastFmService } from '../services/lastfm-service';

const MediaPlayer = () => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  // Media state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({
    title: 'No Track Playing',
    artist: 'No Artist',
    album: 'Unknown Album',
    duration: 0,
    position: 0
  });
  const [connectedDevice, setConnectedDevice] = useState(null);
  
  // Album art state
  const [albumArtUrl, setAlbumArtUrl] = useState(null);
  const [isLoadingArt, setIsLoadingArt] = useState(false);

  // Save music state to localStorage for other components (like NavigationPage)
  useEffect(() => {
    try {
      const musicState = {
        isPlaying,
        currentTrack,
        albumArtUrl,
        timestamp: Date.now(),
      };
      localStorage.setItem('nodenav-music-state', JSON.stringify(musicState));
      console.log('[Media Player] Saved music state:', {
        track: currentTrack.title,
        artist: currentTrack.artist,
        isPlaying
      });
    } catch (error) {
      console.error('[Media Player] Failed to save music state:', error);
    }
  }, [isPlaying, currentTrack, albumArtUrl]);

  // Fetch album art when track changes
  useEffect(() => {
    const fetchAlbumArt = async () => {
      // Don't fetch if track is invalid
      if (!currentTrack || 
          currentTrack.title === 'No Track Playing' || 
          currentTrack.title === 'Unknown' ||
          currentTrack.artist === 'No Artist' ||
          currentTrack.artist === 'Unknown') {
        setAlbumArtUrl(null);
        return;
      }

      setIsLoadingArt(true);
      
      try {
        const artUrl = await lastFmService.getAlbumArt(
          currentTrack.artist,
          currentTrack.title,
          currentTrack.album
        );
        setAlbumArtUrl(artUrl);
        console.log('[Media Player] Album art fetched:', artUrl ? 'Success' : 'Not found');
      } catch (error) {
        console.error('[Media Player] Failed to fetch album art:', error);
        setAlbumArtUrl(null);
      } finally {
        setIsLoadingArt(false);
      }
    };

    // Debounce the fetch to avoid excessive API calls
    const timeoutId = setTimeout(fetchAlbumArt, 500);
    return () => clearTimeout(timeoutId);
  }, [currentTrack.title, currentTrack.artist, currentTrack.album]);

  // Audio reference
  const audioRef = useRef(null);
  const progressInterval = useRef(null);
  const statePollingInterval = useRef(null);

  // Get connected bluetooth device and media state
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Get connected bluetooth devices
        const connectedDevices = await bluetoothAPI.getConnectedDevices();
        
        if (connectedDevices && connectedDevices.length > 0) {
          const device = connectedDevices[0];
          setConnectedDevice(device);
          
          // Connect audio stream to this device
          try {
            await bluetoothAPI.connectAudio(device.address);
            console.log('[Media Player] Audio connected to:', device.name);
          } catch (audioError) {
            console.warn('[Media Player] Audio connection failed, may already be connected:', audioError);
          }
          
          // Get initial media state
          updateMediaState();
        } else {
          console.log('[Media Player] No Bluetooth devices connected');
        }
      } catch (error) {
        console.error('[Media Player] Failed to check Bluetooth connection:', error);
      }
    };

    checkConnection();

    // Poll for media state updates every 1 second for responsive UI
    statePollingInterval.current = setInterval(updateMediaState, 1000);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (statePollingInterval.current) {
        clearInterval(statePollingInterval.current);
      }
    };
  }, []);

  // Track last known position from backend to detect track changes
  const lastBackendPosition = useRef(0);
  
  // Update media state from backend
  const updateMediaState = async () => {
    try {
      const state = await bluetoothAPI.getMediaState();
      
      if (state.connected && state.track) {
        const backendPosition = state.track.position || 0;
        
        // Check if track changed (position jumped backwards significantly)
        if (lastBackendPosition.current > 10 && backendPosition < 5) {
          console.log('[Media Player] Track changed detected');
        }
        lastBackendPosition.current = backendPosition;
        
        setIsPlaying(state.isPlaying);
        setCurrentTrack({
          title: state.track.title || 'Unknown',
          artist: state.track.artist || 'Unknown',
          album: state.track.album || 'Unknown',
          duration: state.track.duration || 0,
          position: backendPosition
        });
      }
    } catch (error) {
      // Silently fail - backend might not be running
      console.debug('[Media Player] Could not fetch media state:', error.message);
    }
  };

  // Update progress when playing (only for smooth UI updates between backend polls)
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setCurrentTrack(prev => {
          // Just increment position for smooth progress bar
          // Don't auto-skip - let the backend handle track changes
          const newPosition = prev.position + 1;
          
          // Cap at duration to prevent overflow
          if (prev.duration > 0 && newPosition > prev.duration) {
            return prev; // Stop incrementing past duration
          }
          
          return {
            ...prev,
            position: newPosition
          };
        });
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying]);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await bluetoothAPI.pauseMedia();
        setIsPlaying(false);
        console.log(`[Media Player] Paused: ${currentTrack.title}`);
      } else {
        await bluetoothAPI.playMedia();
        setIsPlaying(true);
        console.log(`[Media Player] Playing: ${currentTrack.title}`);
      }
      // Immediate state update
      setTimeout(updateMediaState, 500);
    } catch (error) {
      console.error('[Media Player] Play/Pause failed:', error);
      // Toggle locally on error
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = async () => {
    try {
      await bluetoothAPI.nextTrack();
      console.log('[Media Player] Skipped to next track');
      setIsPlaying(true);
      // Update state after a brief delay
      setTimeout(updateMediaState, 500);
    } catch (error) {
      console.error('[Media Player] Next track failed:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await bluetoothAPI.previousTrack();
      console.log('[Media Player] Went to previous track');
      setIsPlaying(true);
      // Update state after a brief delay
      setTimeout(updateMediaState, 500);
    } catch (error) {
      console.error('[Media Player] Previous track failed:', error);
    }
  };

  const handleProgressClick = (e) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newPosition = Math.floor(percentage * currentTrack.duration);
    
    setCurrentTrack(prev => ({ ...prev, position: newPosition }));
    console.log(`[Media] Seeked to ${formatTime(newPosition)}`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = currentTrack.duration > 0 
    ? (currentTrack.position / currentTrack.duration) * 100 
    : 0;

  return (
    <div style={{
      height: '100%',
      backgroundColor: colors['bg-primary'],
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'absolute',
        top: '2rem',
        left: '2rem',
        right: '2rem',
      }}>
        <h1 style={{
          ...styles.typography.h2,
          color: colors['text-primary'],
          margin: 0,
        }}>
          Now Playing
        </h1>
        
        {connectedDevice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: colors['bg-secondary'],
            borderRadius: '0.5rem',
            border: `1px solid ${colors['bg-tertiary']}`,
          }}>
            <Smartphone size={16} color={colors['text-secondary']} />
            <span style={{
              ...styles.typography.caption,
              color: colors['text-secondary'],
            }}>
              {connectedDevice.name}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '320px',
      }}>
        {/* Album Art */}
        <div style={{
          width: '100%',
          paddingTop: '100%', // Aspect ratio 1:1
          backgroundColor: colors['bg-secondary'],
          border: `2px solid ${colors['bg-tertiary']}`,
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '2rem',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isLoadingArt ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  margin: '0 auto 0.75rem',
                  border: `4px solid ${colors['bg-tertiary']}`,
                  borderTop: `4px solid ${colors.primary}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <div style={{ ...styles.typography.caption, color: colors['text-tertiary'], fontSize: '0.75rem' }}>
                  Loading...
                </div>
              </div>
            ) : albumArtUrl ? (
              <img
                src={albumArtUrl}
                alt={`${currentTrack.album} by ${currentTrack.artist}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setAlbumArtUrl(null)}
              />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  margin: '0 auto 0.75rem',
                  backgroundColor: colors['bg-tertiary'],
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg
                    width="45"
                    height="45"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors['text-tertiary']}
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div style={{ ...styles.typography.caption, color: colors['text-tertiary'], fontSize: '0.75rem' }}>
                  No Artwork
                </div>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        {/* Track Info */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '400',
            color: colors['text-primary'],
            marginBottom: '0.375rem',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {currentTrack.title}
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: colors['text-secondary'],
            margin: '0.375rem 0 0 0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {currentTrack.artist}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
          <div
            onClick={handleProgressClick}
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: colors['bg-tertiary'],
              borderRadius: '4px',
              cursor: 'pointer',
              position: 'relative',
              marginBottom: '0.5rem',
            }}
          >
            <div style={{
              width: `${progressPercentage}%`,
              height: '100%',
              backgroundColor: colors.primary,
              borderRadius: '4px',
              transition: 'width 0.1s linear',
            }} />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: colors['text-tertiary'],
          }}>
            <span>{formatTime(currentTrack.position)}</span>
            <span>{formatTime(currentTrack.duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
        }}>
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          style={{
            width: '55px',
            height: '55px',
            backgroundColor: colors['bg-secondary'],
            border: `1px solid ${colors['bg-tertiary']}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors['bg-tertiary'];
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors['bg-secondary'];
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <SkipBack size={26} color={colors['text-primary']} />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          style={{
            width: '70px',
            height: '70px',
            backgroundColor: colors.primary,
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease-in-out',
            boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)';
          }}
        >
          {isPlaying ? (
            <Pause size={32} color={colors['bg-primary']} fill={colors['bg-primary']} />
          ) : (
            <Play size={32} color={colors['bg-primary']} fill={colors['bg-primary']} style={{ marginLeft: '3px' }} />
          )}
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          style={{
            width: '55px',
            height: '55px',
            backgroundColor: colors['bg-secondary'],
            border: `1px solid ${colors['bg-tertiary']}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors['bg-tertiary'];
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors['bg-secondary'];
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <SkipForward size={26} color={colors['text-primary']} />
        </button>
      </div>
      </div>

      {/* Hidden audio element for actual audio streaming */}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
      />

      {/* Connection Status */}
      {!connectedDevice && (
        <div style={{
          ...styles.card,
          textAlign: 'center',
          padding: '0.75rem',
          backgroundColor: colors['bg-secondary'],
          flexShrink: 0,
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: colors['text-tertiary'],
            margin: 0,
          }}>
            No Bluetooth device connected. Connect a device in Settings to stream audio.
          </p>
        </div>
      )}
    </div>
  );
};

export default MediaPlayer;
