import React from 'react';
import { styles, mergeStyles } from '../styles';

const HomeScreenCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false,
  className = ""
}) => {
  const cardStyle = mergeStyles(
    styles.card,
    !disabled && styles.cardHover,
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
        <Icon size={48} />
      </div>
      <div style={styles.typography.h3}>{title}</div>
      <div style={{ ...styles.typography.caption, marginTop: '0.25rem' }}>{description}</div>
    </div>
  );
};

export default HomeScreenCard;
