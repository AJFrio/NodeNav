import React from 'react';
import { styles, mergeStyles, colors } from '../styles';

const SettingsButton = ({
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false,
  variant = 'primary', // primary, secondary, tertiary
  className = ""
}) => {
  const getButtonStyle = () => {
    if (disabled) {
      return mergeStyles(
        styles.card,
        {
          cursor: 'not-allowed',
          opacity: 0.6,
        }
      );
    }

    const baseStyle = {
      ...styles.card,
      cursor: 'pointer',
      transition: 'all 200ms ease-in-out',
    };

    switch (variant) {
      case 'primary':
        return mergeStyles(
          baseStyle,
          {
            ':hover': {
              borderColor: colors.info,
              transform: 'scale(1.05)',
            },
          }
        );
      case 'secondary':
        return mergeStyles(
          baseStyle,
          {
            ':hover': {
              borderColor: '#a855f7', // Purple-500
              transform: 'scale(1.05)',
            },
          }
        );
      case 'tertiary':
        return mergeStyles(
          baseStyle,
          {
            ':hover': {
              borderColor: colors.success,
              transform: 'scale(1.05)',
            },
          }
        );
      default:
        return baseStyle;
    }
  };

  return (
    <button
      style={getButtonStyle()}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <Icon
          size={80}
          style={{
            transition: 'transform 200ms ease-in-out',
          }}
        />
      </div>
      <div style={{
        ...styles.typography.h3,
        color: colors['text-primary'],
        marginBottom: '0.5rem',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '0.875rem',
        color: disabled ? colors['text-disabled'] : colors['text-secondary'],
      }}>
        {description}
      </div>
    </button>
  );
};

export default SettingsButton;
