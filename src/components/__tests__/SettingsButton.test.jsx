import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsButton from '../SettingsButton';
import { ThemeProvider } from '../../contexts/ThemeContext';

const MockIcon = () => <svg />;

describe('SettingsButton', () => {
  it('renders the button with the correct title', () => {
    render(
      <ThemeProvider>
        <SettingsButton
          icon={MockIcon}
          title="Test Button"
          description="This is a test button"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });
});
