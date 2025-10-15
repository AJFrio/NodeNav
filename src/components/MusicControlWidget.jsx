import React from 'react';
import { SkipBack, Play, Pause, SkipForward } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';

const MusicControlWidget = ({ 
  isPlaying = false,
  currentTrack = null,
  albumArtUrl = null,
  onPlayPause = () => {},
  onPrevious = () => {},
  onNext = () => {},
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);

  // Don't show if no track is loaded
  if (!currentTrack || !currentTrack.title) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        backgroundColor: colors['bg-secondary'],
        border: `1px solid ${colors['bg-tertiary']}`,
        borderRadius: '0.75rem',
        padding: '1rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
        minWidth: '300px',
        maxWidth: '400px',
        transition: 'all 300ms ease-in-out',
      }}
    >
      {/* Album Art and Track Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        {/* Small Album Art Thumbnail */}
        <div
          style={{
            width: '50px',
            height: '50px',
            minWidth: '50px',
            backgroundColor: colors['bg-tertiary'],
            borderRadius: '0.375rem',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {albumArtUrl ? (
            <img
              src={albumArtUrl}
              alt="Album art"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors['text-tertiary']}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </div>

        {/* Track Info */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: colors['text-primary'],
              marginBottom: '0.25rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentTrack.title}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: colors['text-secondary'],
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentTrack.artist || 'Unknown Artist'}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
        }}
      >
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: colors['bg-tertiary'],
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'all 200ms ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = colors['bg-quaternary'];
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = colors['bg-tertiary'];
            e.target.style.transform = 'scale(1)';
          }}
          aria-label="Previous track"
        >
          <SkipBack size={18} color={colors['text-primary']} />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '50px',
            height: '50px',
            backgroundColor: colors.primary,
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'all 200ms ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = colors['primary-hover'];
            e.target.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = colors.primary;
            e.target.style.transform = 'scale(1)';
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={22} color={colors['bg-primary']} fill={colors['bg-primary']} />
          ) : (
            <Play size={22} color={colors['bg-primary']} fill={colors['bg-primary']} />
          )}
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: colors['bg-tertiary'],
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'all 200ms ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = colors['bg-quaternary'];
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = colors['bg-tertiary'];
            e.target.style.transform = 'scale(1)';
          }}
          aria-label="Next track"
        >
          <SkipForward size={18} color={colors['text-primary']} />
        </button>
      </div>
    </div>
  );
};

export default MusicControlWidget;

