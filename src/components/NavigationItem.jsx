import React from 'react';
import { styles, mergeStyles, colors } from '../styles';

const NavigationItem = ({
  icon: Icon,
  label,
  isActive = false,
  onClick,
  variant = 'bottombar', // 'sidebar' or 'bottombar'
  className = ""
}) => {
  const getItemStyle = () => {
    if (variant === 'bottombar') {
      return mergeStyles(
        styles.navigation.item,
        isActive ? styles.navigation.itemActive : styles.navigation.itemInactive,
        {
          transition: 'all 150ms ease-in-out',
        }
      );
    } else {
      // Legacy sidebar support (if needed)
      return mergeStyles(
        styles.navigation.item,
        isActive ? styles.navigation.itemActive : styles.navigation.itemInactive,
        {
          transition: 'all 150ms ease-in-out',
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
        <Icon size={variant === 'bottombar' ? 24 : 18} />
      </div>
    </button>
  );
};

export default NavigationItem;
