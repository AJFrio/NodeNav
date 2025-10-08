/**
 * Centralized Style Objects
 * All styling is defined here and imported where needed
 * Changes in this file will propagate throughout the application
 */

// Minimalist Black Theme Color tokens
export const colors = {
  // Primary accent (minimal blue)
  primary: '#ffffff',
  'primary-hover': '#f0f0f0',
  'primary-light': '#e0e0e0',
  'primary-dark': '#d0d0d0',

  // Secondary accent (subtle gray)
  secondary: '#333333',
  'secondary-hover': '#444444',

  // Status colors (minimal and monochromatic)
  success: '#ffffff',
  'success-hover': '#f0f0f0',
  danger: '#ffffff',
  'danger-hover': '#f0f0f0',
  warning: '#ffffff',
  'warning-hover': '#f0f0f0',
  info: '#ffffff',
  'info-hover': '#f0f0f0',

  // Pure black background hierarchy
  'bg-primary': '#000000',      // Pure black background
  'bg-secondary': '#0a0a0a',    // Almost black
  'bg-tertiary': '#111111',     // Dark gray
  'bg-quaternary': '#1a1a1a',   // Medium gray
  'bg-surface': '#222222',      // Light gray

  // White text hierarchy
  'text-primary': '#ffffff',     // Pure white
  'text-secondary': '#f0f0f0',   // Off-white
  'text-tertiary': '#e0e0e0',    // Light gray
  'text-muted': '#cccccc',       // Medium gray
  'text-disabled': '#999999',    // Darker gray
};

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
    borderRadius: '0.5rem',
    padding: '1.5rem',
    transition: 'background-color 150ms ease-in-out',
  },

  cardHover: {
    ':hover': {
      backgroundColor: colors['bg-tertiary'],
    },
  },

  // Button styles
  button: {
    primary: {
      backgroundColor: colors.primary,
      color: colors['text-primary'],
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
        backgroundColor: colors['bg-surface'],
        color: colors['text-disabled'],
        cursor: 'not-allowed',
      },
    },

    secondary: {
      backgroundColor: colors['bg-tertiary'],
      color: colors['text-primary'],
      border: `1px solid ${colors['bg-quaternary']}`,
      borderRadius: '0.5rem',
      padding: '0.75rem 1.5rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 150ms ease-in-out',
      ':hover': {
        backgroundColor: colors['bg-quaternary'],
      },
      ':disabled': {
        backgroundColor: colors['bg-surface'],
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
      borderRadius: '0.25rem',
      transition: 'color 150ms ease-in-out',
      ':hover': {
        color: colors['text-primary'],
      },
    },
  },

  // Input styles
  input: {
    backgroundColor: colors['bg-tertiary'],
    color: colors['text-primary'],
    border: `1px solid ${colors['bg-quaternary']}`,
    borderRadius: '0.375rem',
    padding: '0.75rem',
    fontSize: '0.875rem',
    transition: 'border-color 150ms ease-in-out',
    ':focus': {
      borderColor: colors.primary,
      outline: 'none',
    },
    '::placeholder': {
      color: colors['text-tertiary'],
    },
  },

  // GPIO Pin styles
  gpioPin: {
    backgroundColor: colors['bg-secondary'],
    border: `1px solid ${colors['bg-tertiary']}`,
    borderRadius: '0.5rem',
    padding: '1rem',
    transition: 'background-color 150ms ease-in-out',
    ':hover': {
      backgroundColor: colors['bg-tertiary'],
    },
  },

  gpioButton: {
    active: {
      backgroundColor: colors.danger,
      ':hover': {
        backgroundColor: colors['danger-hover'],
      },
    },
    inactive: {
      backgroundColor: colors['bg-quaternary'],
      ':hover': {
        backgroundColor: colors['bg-tertiary'],
      },
    },
  },

  // Bluetooth Device styles
  bluetoothDevice: {
    backgroundColor: colors['bg-secondary'],
    border: `1px solid ${colors['bg-tertiary']}`,
    borderRadius: '0.5rem',
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

  // Navigation styles (horizontal bottom navbar)
  navigation: {
    bottombar: {
      backgroundColor: colors['bg-secondary'],
      borderTop: `1px solid ${colors['bg-tertiary']}`,
      height: '4rem',
      width: '100vw',
      position: 'fixed',
      bottom: '0',
      left: '0',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 1rem',
      zIndex: 1000,
    },

    item: {
      width: '3rem',
      height: '3rem',
      borderRadius: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.75rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 150ms ease-in-out',
    },

    itemActive: {
      backgroundColor: colors.primary,
      color: colors['bg-primary'],
    },

    itemInactive: {
      backgroundColor: 'transparent',
      color: colors['text-secondary'],
      ':hover': {
        color: colors['text-primary'],
        backgroundColor: colors['bg-tertiary'],
      },
    },
  },

  // Typography styles (lighter weights)
  typography: {
    h1: {
      fontSize: '3rem',
      fontWeight: '300',
      color: colors['text-primary'],
      marginBottom: '2rem',
    },

    h2: {
      fontSize: '1.875rem',
      fontWeight: '300',
      color: colors['text-primary'],
      marginBottom: '1rem',
    },

    h3: {
      fontSize: '1.5rem',
      fontWeight: '300',
      color: colors['text-primary'],
      marginBottom: '0.75rem',
    },

    body: {
      fontSize: '1rem',
      color: colors['text-primary'],
      lineHeight: '1.5',
      fontWeight: '300',
    },

    caption: {
      fontSize: '0.875rem',
      color: colors['text-secondary'],
      fontWeight: '300',
    },

    label: {
      fontSize: '0.875rem',
      fontWeight: '300',
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
