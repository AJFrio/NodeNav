import React, { useState } from 'react';
import { styles, mergeStyles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const SettingsButton = ({
  as: Component = 'button',
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false,
  className = "",
  ...rest
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
      textDecoration: 'none',
    }
  );

  const componentProps = {
    style:buttonStyle,
    onClick: disabled ? undefined : onClick,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    className,
    ...rest,
  };

  if (Component === 'button') {
    componentProps.disabled = disabled;
  } else if (disabled) {
    componentProps.onClick = (e) => {
        e.preventDefault();
        // still call onClick if it exists
        if(onClick) onClick(e);
    };
    componentProps['aria-disabled'] = true;
  }

  return (
    <Component {...componentProps}>
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
    </Component>
  );
};

export default SettingsButton;
