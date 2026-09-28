import React, { useState, useEffect } from 'react';
import { Moon, Sun, Home, Lightbulb, Map, Settings } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { styles, getColors } from '../styles';

const DisplaySettings = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const colors = getColors(theme);

  // Default page state
  const [defaultPage, setDefaultPage] = useState(() => {
    try {
      return localStorage.getItem('nodenav-default-page') || 'home';
    } catch (error) {
      console.error('Failed to load default page from localStorage:', error);
      return 'home';
    }
  });

  // 3D Maps toggle state
  const [enable3DMaps, setEnable3DMaps] = useState(() => {
    try {
      const saved = localStorage.getItem('nodenav-3d-maps');
      return saved === 'true';
    } catch (error) {
      console.error('Failed to load 3D maps preference:', error);
      return false;
    }
  });

  // Save default page to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('nodenav-default-page', defaultPage);
    } catch (error) {
      console.error('Failed to save default page to localStorage:', error);
    }
  }, [defaultPage]);

  // Save 3D maps preference to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('nodenav-3d-maps', enable3DMaps.toString());
    } catch (error) {
      console.error('Failed to save 3D maps preference:', error);
    }
  }, [enable3DMaps]);

  const pageOptions = [
    { value: 'home', label: 'Home', icon: Home },
    { value: 'navigation', label: 'Navigation', icon: Map },
    { value: 'gpio', label: 'Lights', icon: Lightbulb },
    { value: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{
      padding: '1.5rem',
      maxWidth: '64rem',
      margin: '0 auto',
    }}>
      <h1 style={{
        ...styles.typography.h1,
        color: colors['text-primary'],
        marginBottom: '2rem',
      }}>Display Settings</h1>

      {/* Theme Toggle Section */}
      <div style={{
        backgroundColor: colors['bg-secondary'],
        border: `1px solid ${colors['bg-tertiary']}`,
        borderRadius: '0.5rem',
        padding: '1.5rem',
        transition: 'background-color 150ms ease-in-out',
      }}>
        <h2 style={{
          ...styles.typography.h2,
          color: colors['text-primary'],
          marginBottom: '1.5rem',
        }}>Theme</h2>

        {/* Dark Mode Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          backgroundColor: colors['bg-tertiary'],
          borderRadius: '0.5rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            {isDark ? <Moon size={24} color={colors['text-primary']} /> : <Sun size={24} color={colors['text-primary']} />}
            <div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '500',
                color: colors['text-primary'],
                marginBottom: '0.25rem',
              }}>
                Dark Mode
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: colors['text-secondary'],
              }}>
                {isDark ? 'Dark theme is active' : 'Light theme is active'}
              </div>
            </div>
          </div>

          {/* Custom Toggle Switch */}
          <button
            onClick={toggleTheme}
            style={{
              position: 'relative',
              width: '60px',
              height: '32px',
              backgroundColor: isDark ? colors.primary : colors['bg-quaternary'],
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 200ms ease-in-out',
              padding: 0,
            }}
            aria-label="Toggle dark mode"
          >
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: isDark ? '32px' : '4px',
                width: '24px',
                height: '24px',
                backgroundColor: colors['bg-primary'],
                borderRadius: '50%',
                transition: 'left 200ms ease-in-out',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            />
          </button>
        </div>
      </div>

      {/* 3D Maps Toggle Section */}
      <div style={{
        marginTop: '1.5rem',
        backgroundColor: colors['bg-secondary'],
        border: `1px solid ${colors['bg-tertiary']}`,
        borderRadius: '0.5rem',
        padding: '1.5rem',
        transition: 'background-color 150ms ease-in-out',
      }}>
        <h2 style={{
          ...styles.typography.h2,
          color: colors['text-primary'],
          marginBottom: '1.5rem',
        }}>Map Settings</h2>

        {/* 3D Maps Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          backgroundColor: colors['bg-tertiary'],
          borderRadius: '0.5rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <Map size={24} color={colors['text-primary']} />
            <div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '500',
                color: colors['text-primary'],
                marginBottom: '0.25rem',
              }}>
                3D Maps
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: colors['text-secondary'],
              }}>
                {enable3DMaps ? 'Show 3D buildings and landmarks' : 'Use flat 2D maps'}
              </div>
            </div>
          </div>

          {/* Custom Toggle Switch */}
          <button
            onClick={() => setEnable3DMaps(!enable3DMaps)}
            style={{
              position: 'relative',
              width: '60px',
              height: '32px',
              backgroundColor: enable3DMaps ? colors.primary : colors['bg-quaternary'],
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 200ms ease-in-out',
              padding: 0,
            }}
            aria-label="Toggle 3D maps"
          >
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: enable3DMaps ? '32px' : '4px',
                width: '24px',
                height: '24px',
                backgroundColor: colors['bg-primary'],
                borderRadius: '50%',
                transition: 'left 200ms ease-in-out',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            />
          </button>
        </div>
      </div>

      {/* Default Load Page Section */}
      <div style={{
        marginTop: '1.5rem',
        backgroundColor: colors['bg-secondary'],
        border: `1px solid ${colors['bg-tertiary']}`,
        borderRadius: '0.5rem',
        padding: '1.5rem',
        transition: 'background-color 150ms ease-in-out',
      }}>
        <h2 style={{
          ...styles.typography.h2,
          color: colors['text-primary'],
          marginBottom: '1.5rem',
        }}>Default Startup Page</h2>

        {/* Page Selector Dropdown */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          backgroundColor: colors['bg-tertiary'],
          borderRadius: '0.5rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            {pageOptions.find(opt => opt.value === defaultPage)?.icon && (
              React.createElement(pageOptions.find(opt => opt.value === defaultPage).icon, {
                size: 24,
                color: colors['text-primary']
              })
            )}
            <div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '500',
                color: colors['text-primary'],
                marginBottom: '0.25rem',
              }}>
                Default Page
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: colors['text-secondary'],
              }}>
                The app will open to this page on startup
              </div>
            </div>
          </div>

          {/* Dropdown Select */}
          <select
            value={defaultPage}
            onChange={(e) => setDefaultPage(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: colors['bg-quaternary'],
              color: colors['text-primary'],
              border: `1px solid ${colors['bg-surface']}`,
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '150px',
              transition: 'all 200ms ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors['bg-surface'];
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors['bg-quaternary'];
            }}
          >
            {pageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DisplaySettings;

