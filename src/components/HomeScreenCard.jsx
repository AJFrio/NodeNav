import React from 'react';
import { styles, mergeStyles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const HomeScreenCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false,
  className = ""
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  
  const cardStyle = mergeStyles(
    {
      backgroundColor: colors['bg-secondary'],
      border: `1px solid ${colors['bg-tertiary']}`,
      borderRadius: '0.5rem',
      padding: '1.5rem',
      transition: 'all 300ms ease-in-out',
    },
    {
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
    }
  );

  return (
    <div
      style={cardStyle}
      onClick={disabled ? undefined : onClick}
      className={className}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
        <Icon size={48} color={colors['text-primary']} />
      </div>
      <div style={{
        ...styles.typography.h3,
        color: colors['text-primary'],
      }}>{title}</div>
      <div style={{
        ...styles.typography.caption,
        color: colors['text-secondary'],
        marginTop: '0.25rem'
      }}>{description}</div>
    </div>
  );
};

export default HomeScreenCard;
