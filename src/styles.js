/**
 * Centralized Style Objects
 * All styling is defined here and imported where needed
 * Changes in this file will propagate throughout the application
 */

// Tesla-inspired dark theme
const darkTheme = {
  // Accent blue for interactive elements
  primary: '#3E6AE1',
  'primary-hover': '#3458B8',

  // Background hierarchy (dark grays)
  'bg-primary': '#1A1B1E',      // Main background
  'bg-secondary': '#24252A',    // Cards, modals
  'bg-tertiary': '#2E3035',     // Hover states, borders
  'bg-quaternary': '#383A3F',   // Subtle highlights

  // Text hierarchy (light grays)
  'text-primary': '#F2F2F2',     // Primary text
  'text-secondary': '#B3B3B3',   // Secondary text
  'text-tertiary': '#7F7F7F',    // Tertiary/placeholder text
  'text-disabled': '#5A5B5E',    // Disabled text

  // Status colors
  success: '#3E6AE1', // Use primary blue for success
  danger: '#E13E3E',
  warning: '#E1A33E',
  info: '#3E6AE1',
};

// Tesla-inspired light theme
const lightTheme = {
  // Accent blue for interactive elements
  primary: '#3E6AE1',
  'primary-hover': '#3458B8',

  // Background hierarchy (light grays)
  'bg-primary': '#FFFFFF',      // Main background
  'bg-secondary': '#F2F2F2',    // Cards, modals
  'bg-tertiary': '#E5E5E5',     // Hover states, borders
  'bg-quaternary': '#D9D9D9',   // Subtle highlights

  // Text hierarchy (dark grays)
  'text-primary': '#1A1B1E',     // Primary text
  'text-secondary': '#5A5B5E',   // Secondary text
  'text-tertiary': '#9A9A9A',    // Tertiary/placeholder text
  'text-disabled': '#B3B3B3',    // Disabled text

  // Status colors
  success: '#3E6AE1',
  danger: '#E13E3E',
  warning: '#E1A33E',
  info: '#3E6AE1',
};

// Function to get colors based on theme
export const getColors = (theme = 'dark') => {
  return theme === 'dark' ? darkTheme : lightTheme;
};

// Default export for backward compatibility
export const colors = darkTheme;

// Common style patterns
export const styles = {
  // Layout styles
  container: {
    maxWidth: '7xl',
    margin: '0 auto',
    padding: '1.5rem',
  },

  // Card styles
  card: {
    backgroundColor: colors['bg-secondary'],
    border: `1px solid ${colors['bg-tertiary']}`,
    borderRadius: '0.75rem', // Slightly larger radius
    padding: '1.5rem',
    transition: 'all 150ms ease-in-out',
  },

  cardHover: {
    ':hover': {
      backgroundColor: colors['bg-tertiary'],
      borderColor: colors['bg-quaternary'],
    },
  },

  // Button styles
  button: {
    primary: {
      backgroundColor: colors.primary,
      color: '#FFFFFF', // White text on primary buttons
      border: 'none',
      borderRadius: '0.5rem',
      padding: '0.75rem 1.5rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 150ms ease-in-out',
      ':hover': {
        backgroundColor: colors['primary-hover'],
      },
      ':disabled': {
        backgroundColor: colors['bg-tertiary'],
        color: colors['text-disabled'],
        cursor: 'not-allowed',
      },
    },

    secondary: {
      backgroundColor: colors['bg-tertiary'],
      color: colors['text-primary'],
      border: `1px solid ${colors['bg-tertiary']}`,
      borderRadius: '0.5rem',
      padding: '0.75rem 1.5rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 150ms ease-in-out',
      ':hover': {
        backgroundColor: colors['bg-quaternary'],
      },
      ':disabled': {
        backgroundColor: colors['bg-tertiary'],
        color: colors['text-disabled'],
        cursor: 'not-allowed',
      },
    },

    ghost: {
      backgroundColor: 'transparent',
      color: colors['text-secondary'],
      border: 'none',
      padding: '0.5rem 0.75rem',
      cursor: 'pointer',
      borderRadius: '0.5rem',
      transition: 'all 150ms ease-in-out',
      ':hover': {
        backgroundColor: colors['bg-secondary'],
        color: colors['text-primary'],
      },
    },
  },

  // Input styles
  input: {
    backgroundColor: colors['bg-secondary'],
    color: colors['text-primary'],
    border: `1px solid ${colors['bg-tertiary']}`,
    borderRadius: '0.5rem',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    transition: 'all 150ms ease-in-out',
    ':focus': {
      borderColor: colors.primary,
      outline: 'none',
      boxShadow: `0 0 0 2px ${colors['bg-primary']}, 0 0 0 4px ${colors.primary}`,
    },
    '::placeholder': {
      color: colors['text-tertiary'],
    },
  },

  // GPIO Pin styles
  gpioPin: {
    backgroundColor: colors['bg-secondary'],
    border: `1px solid ${colors['bg-tertiary']}`,
    borderRadius: '0.75rem',
    padding: '1rem',
    transition: 'background-color 150ms ease-in-out',
    ':hover': {
      backgroundColor: colors['bg-tertiary'],
    },
  },

  gpioButton: {
    active: {
      backgroundColor: colors.danger,
      color: '#FFFFFF',
      ':hover': {
        backgroundColor: '#C83A3A', // Darker red on hover
      },
    },
    inactive: {
      backgroundColor: colors['bg-tertiary'],
      ':hover': {
        backgroundColor: colors['bg-quaternary'],
      },
    },
  },

  // Bluetooth Device styles
  bluetoothDevice: {
    backgroundColor: colors['bg-secondary'],
    border: `1px solid ${colors['bg-tertiary']}`,
    borderRadius: '0.75rem',
    padding: '1rem',
    transition: 'background-color 150ms ease-in-out',
    ':hover': {
      backgroundColor: colors['bg-tertiary'],
    },
  },

  // Status indicator styles
  statusIndicator: {
    connected: {
      backgroundColor: colors.success,
    },
    disconnected: {
      backgroundColor: colors.danger,
    },
    paired: {
      backgroundColor: colors.info,
    },
    discovering: {
      backgroundColor: colors.warning,
    },
    logging: {
      backgroundColor: colors.warning,
    },
  },

  // Navigation styles
  navigation: {
    bottombar: {
      backgroundColor: 'rgba(26, 27, 30, 0.8)', // Semi-transparent background
      backdropFilter: 'blur(10px)',
      borderTop: `1px solid ${colors['bg-tertiary']}`,
      height: '5rem', // Increased height
      width: '100vw',
      position: 'fixed',
      bottom: '0',
      left: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center', // Center the items
      padding: '0 2rem',
      zIndex: 1000,
    },

    item: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 150ms ease-in-out',
      color: colors['text-secondary'],
      padding: '0 1.5rem', // Add horizontal padding for spacing
      height: '100%',
    },

    itemActive: {
      color: colors.primary,
    },

    itemInactive: {
      color: colors['text-secondary'],
      ':hover': {
        color: colors['text-primary'],
      },
    },
  },

  // Typography styles
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: '500',
      color: colors['text-primary'],
      marginBottom: '2rem',
      letterSpacing: '-0.02em',
    },

    h2: {
      fontSize: '1.75rem',
      fontWeight: '500',
      color: colors['text-primary'],
      marginBottom: '1.5rem',
    },

    h3: {
      fontSize: '1.25rem',
      fontWeight: '500',
      color: colors['text-primary'],
      marginBottom: '1rem',
    },

    body: {
      fontSize: '1rem',
      color: colors['text-primary'],
      lineHeight: '1.6',
      fontWeight: '400',
    },

    caption: {
      fontSize: '0.875rem',
      color: colors['text-secondary'],
      fontWeight: '400',
    },

    label: {
      fontSize: '0.875rem',
      fontWeight: '400',
      color: colors['text-secondary'],
      marginBottom: '0.5rem',
      display: 'block',
    },
  },

  // Spacing utilities
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },

  // Border radius utilities
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
  },

  // Shadow utilities
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },

  // Animation utilities
  animations: {
    'pulse-slow': {
      animation: 'pulse 2s ease-in-out infinite',
    },

    'loading-shimmer': {
      background: `linear-gradient(90deg, ${colors['bg-tertiary']} 25%, ${colors['bg-quaternary']} 50%, ${colors['bg-tertiary']} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'loading 1.5s infinite',
    },
  },

  // Focus styles
  focus: {
    ring: {
      ':focus': {
        outline: `2px solid ${colors.primary}`,
        outlineOffset: '2px',
      },
    },
  },

  // Responsive utilities
  responsive: {
    mobile: {
      '@media (max-width: 768px)': {
        display: 'none',
      },
    },

    desktop: {
      '@media (min-width: 769px)': {
        display: 'block',
      },
    },
  },
};

// Helper function to get styles with theme-aware colors
export const getStyles = (theme = 'dark') => {
  const themeColors = getColors(theme);
  
  return {
    ...styles,
    // Override card styles with theme colors
    card: {
      backgroundColor: themeColors['bg-secondary'],
      border: `1px solid ${themeColors['bg-tertiary']}`,
      borderRadius: '0.5rem',
      padding: '1.5rem',
      transition: 'all 300ms ease-in-out',
    },
    // Override button styles with theme colors
    button: {
      primary: {
        backgroundColor: themeColors.primary,
        color: themeColors['bg-primary'],
        border: 'none',
        borderRadius: '0.5rem',
        padding: '0.75rem 1.5rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 300ms ease-in-out',
      },
      secondary: {
        backgroundColor: themeColors['bg-tertiary'],
        color: themeColors['text-primary'],
        border: `1px solid ${themeColors['bg-quaternary']}`,
        borderRadius: '0.5rem',
        padding: '0.75rem 1.5rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 300ms ease-in-out',
      },
    },
  };
};

// Helper function to merge styles
export const mergeStyles = (...styleObjects) => {
  return styleObjects.reduce((merged, current) => {
    return { ...merged, ...current };
  }, {});
};

// Helper function to create responsive styles
export const responsive = (styles) => {
  return {
    ...styles,
    ...styles.responsive,
  };
};

// Export everything
export default styles;
