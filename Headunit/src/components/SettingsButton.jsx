import React, { useState } from 'react';
import { styles, mergeStyles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const SettingsButton = ({
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false,
  className = ""
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle = mergeStyles(
    styles.card,
    {
      textAlign: 'left',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 150ms ease-in-out',
      display: 'flex',
      alignItems: 'center',
      padding: '1.5rem',
      backgroundColor: isHovered ? colors['bg-tertiary'] : colors['bg-secondary'],
      borderColor: isHovered ? colors['bg-quaternary'] : colors['bg-tertiary'],
    }
  );

  return (
    <button
      style={buttonStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
    >
      <div style={{ marginRight: '1.5rem' }}>
        <Icon size={32} color={colors['text-primary']} />
      </div>
      <div>
        <div style={{ ...styles.typography.h3, color: colors['text-primary'], marginBottom: '0.25rem' }}>
          {title}
        </div>
        <div style={{ ...styles.typography.body, color: colors['text-secondary'] }}>
          {description}
        </div>
      </div>
    </button>
  );
};

export default SettingsButton;
