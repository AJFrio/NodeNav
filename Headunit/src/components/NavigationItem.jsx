import React from 'react';
import { getColors } from '../styles';
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
  
  return (
    <button
      type="button"
      className={`bottom-nav-item${isActive ? ' is-active' : ''} ${className}`.trim()}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="bottom-nav-item__icon">
        <Icon size={21} color={isActive ? colors.primary : 'currentColor'} />
      </span>
      <span className="bottom-nav-item__label">{label}</span>
    </button>
  );
};

export default NavigationItem;
