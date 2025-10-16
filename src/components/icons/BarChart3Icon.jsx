import React from 'react';

const BarChart3Icon = ({ color = 'currentColor', size = 24 }) => (
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
    <path d="M3 3v18h18"></path>
    <path d="M7 16V8"></path>
    <path d="M12 16v-4"></path>
    <path d="M17 16v-8"></path>
  </svg>
);

export default BarChart3Icon;