import React from 'react';
import { styles, mergeStyles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const NavigationItem = ({
  icon: Icon,
  label,
  isActive = false,
  onClick,
  className = ""
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  
  const itemStyle = mergeStyles(
    styles.navigation.item,
    isActive ? styles.navigation.itemActive : styles.navigation.itemInactive
  );

  const iconContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem', // 40px
    height: '2.5rem', // 40px
    borderRadius: '50%',
    transition: 'background-color 150ms ease-in-out',
    backgroundColor: isActive ? colors.primary : 'transparent',
  };

  return (
    <button
      style={itemStyle}
      onClick={onClick}
      title={label}
      className={className}
    >
      <div style={iconContainerStyle}>
        <Icon 
          size={24}
          color={isActive ? colors['bg-primary'] : 'currentColor'}
        />
      </div>
    </button>
  );
};

export default NavigationItem;
