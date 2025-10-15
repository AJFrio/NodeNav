import React from 'react';
import { styles, mergeStyles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const NavigationItem = ({
  icon: Icon,
  label,
  isActive = false,
  onClick,
  variant = 'bottombar', // 'sidebar' or 'bottombar'
  className = ""
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  
  const getItemStyle = () => {
    if (variant === 'bottombar') {
      return mergeStyles(
        styles.navigation.item,
        {
          backgroundColor: isActive ? colors.primary : 'transparent',
          color: isActive ? colors['bg-primary'] : colors['text-secondary'],
          transition: 'all 300ms ease-in-out',
        }
      );
    } else {
      // Legacy sidebar support (if needed)
      return mergeStyles(
        styles.navigation.item,
        {
          backgroundColor: isActive ? colors.primary : 'transparent',
          color: isActive ? colors['bg-primary'] : colors['text-secondary'],
          transition: 'all 300ms ease-in-out',
        }
      );
    }
  };

  return (
    <button
      style={getItemStyle()}
      onClick={onClick}
      title={label}
      className={className}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Icon 
          size={variant === 'bottombar' ? 24 : 18}
          color={isActive ? colors['bg-primary'] : colors['text-secondary']}
        />
      </div>
    </button>
  );
};

export default NavigationItem;
