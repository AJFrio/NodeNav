import React from 'react';

const LightbulbIcon = ({ color = 'currentColor', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18h6"></path>
    <path d="M10 22h4"></path>
    <path d="M12 2a7 7 0 0 0-5 11.94V18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4.06A7 7 0 0 0 12 2z"></path>
  </svg>
);

export default LightbulbIcon;