import React, { useState, useEffect, useRef } from 'react';
import { styles, colors } from '../styles';
import { Play, Pause, SkipBack, SkipForward, Smartphone } from 'lucide-react';
import { bluetoothAPI } from '../services/api';

const MediaPlayer = () => {
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

    // Poll for media state updates every 2 seconds
    statePollingInterval.current = setInterval(updateMediaState, 2000);

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
      height: 'calc(100vh - 5rem)',
      backgroundColor: colors['bg-primary'],
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1rem 2rem 1.5rem 2rem',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexShrink: 0,
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

      {/* Album Art Placeholder */}
      <div style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        <div style={{
          width: 'min(280px, 60vw)',
          height: 'min(280px, 60vw)',
          maxWidth: '280px',
          maxHeight: '280px',
          backgroundColor: colors['bg-secondary'],
          border: `2px solid ${colors['bg-tertiary']}`,
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            textAlign: 'center',
          }}>
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
            <div style={{
              ...styles.typography.caption,
              color: colors['text-tertiary'],
              fontSize: '0.75rem',
            }}>
              Album Artwork
            </div>
          </div>
        </div>
      </div>

      {/* Track Info */}
      <div style={{
        textAlign: 'center',
        marginBottom: '1.25rem',
        flexShrink: 0,
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '400',
          color: colors['text-primary'],
          marginBottom: '0.375rem',
          margin: 0,
        }}>
          {currentTrack.title}
        </h2>
        <p style={{
          fontSize: '0.875rem',
          color: colors['text-secondary'],
          margin: '0.375rem 0 0 0',
        }}>
          {currentTrack.artist}
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ 
        marginBottom: '1.25rem',
        flexShrink: 0,
      }}>
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
        
        {/* Time Labels */}
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
        marginBottom: '0.5rem',
        flexShrink: 0,
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
