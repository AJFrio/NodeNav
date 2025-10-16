import React, { useState } from 'react';
import { styles, mergeStyles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const HomeScreenCard = ({
  icon: Icon,
  title,
  onClick,
  disabled = false,
  className = ""
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [isHovered, setIsHovered] = useState(false);

  const cardStyle = mergeStyles(
    styles.card,
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      aspectRatio: '1 / 1', // Maintain a square aspect ratio
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 150ms ease-in-out',
      backgroundColor: isHovered ? colors['bg-tertiary'] : colors['bg-secondary'],
      borderColor: isHovered ? colors['bg-quaternary'] : colors['bg-tertiary'],
    }
  );

  return (
    <div
      style={cardStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
    >
      <div style={{ marginBottom: '1rem' }}>
        <Icon size={48} color={colors['text-primary']} />
      </div>
      <div style={{ ...styles.typography.h3, color: colors['text-primary'], fontSize: '1.25rem' }}>
        {title}
      </div>
    </div>
  );
};

export default HomeScreenCard;
