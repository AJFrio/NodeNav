import React from 'react';
import { useLocation } from 'react-router-dom';

const View = ({ children }) => {
  const location = useLocation();

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        transition: 'opacity 0.2s ease-in-out',
        padding: '2rem',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
};

export default View;
