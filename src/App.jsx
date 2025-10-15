import React, { useState } from 'react';
import GPIOControl from './pages/GPIOControl';
import BluetoothSettings from './pages/BluetoothSettings';
import MediaPlayer from './pages/MediaPlayer';
import DataPage from './pages/DataPage';
import DisplaySettings from './pages/DisplaySettings';
import NavigationPage from './pages/NavigationPage';
import HomeScreenCard from './components/HomeScreenCard';
import SettingsButton from './components/SettingsButton';
import NavigationItem from './components/NavigationItem';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { styles, getColors } from './styles';
import {
  Home,
  Lightbulb,
  Wrench,
  Map,
  Music,
  BarChart3,
  Settings,
  Smartphone,
  Monitor
} from 'lucide-react';

function AppContent() {
  const { theme } = useTheme();
  const colors = getColors(theme);
  
  // Load default page from localStorage
  const [currentView, setCurrentView] = useState(() => {
    try {
      return localStorage.getItem('nodenav-default-page') || 'home';
    } catch (error) {
      console.error('Failed to load default page:', error);
      return 'home';
    }
  });

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'gpio', label: 'Lights', icon: Lightbulb },
    { id: 'navigation', label: 'Navigation', icon: Map },
    { id: 'media', label: 'Media', icon: Music },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderView = (viewId) => {
    const isActive = currentView === viewId;
    const commonStyle = {
      opacity: isActive ? 1 : 0,
      pointerEvents: isActive ? 'auto' : 'none',
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: isActive ? 10 : 1,
      transition: 'opacity 0.15s ease-in-out',
    };

    switch (viewId) {
      case 'gpio':
        return <div key="gpio" style={{...commonStyle, overflowY: 'auto'}}><GPIOControl /></div>;
      case 'navigation':
        // Always keep navigation mounted for preloading
        return <div key="navigation" style={commonStyle}><NavigationPage /></div>;
      case 'media':
        return <div key="media" style={{...commonStyle, overflowY: 'auto'}}><MediaPlayer /></div>;
      case 'settings':
        return (
          <div key="settings" style={{...commonStyle, overflowY: 'auto'}}>
            <div style={{
              padding: '1.5rem',
              maxWidth: '64rem', // 1024px
              margin: '0 auto',
            }}>
              <h1 style={{
                ...styles.typography.h1,
                color: colors['text-primary'],
                marginBottom: '2rem',
              }}>Settings</h1>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}>
                <SettingsButton
                  icon={Smartphone}
                  title="Bluetooth"
                  description="Pair and manage Bluetooth devices"
                  onClick={() => setCurrentView('bluetooth')}
                />

                <SettingsButton
                  icon={Monitor}
                  title="Display"
                  description="Theme and display preferences"
                  onClick={() => setCurrentView('display')}
                  variant="secondary"
                />

                <SettingsButton
                  icon={BarChart3}
                  title="Data"
                  description="View command history"
                  onClick={() => setCurrentView('data')}
                  variant="tertiary"
                />
              </div>

              <div style={{
                marginTop: '2rem',
                backgroundColor: colors['bg-secondary'],
                border: `1px solid ${colors['bg-tertiary']}`,
                borderRadius: '0.5rem',
                padding: '1.5rem',
                transition: 'background-color 150ms ease-in-out',
              }}>
                <h2 style={{
                  ...styles.typography.h2,
                  color: colors['text-primary'],
                  marginBottom: '1rem',
                }}>System Information</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.875rem',
                }}>
                  <div>
                    <span style={{ color: colors['text-secondary'] }}>GPIO Backend:</span>
                    <span style={{ color: colors['text-primary'], marginLeft: '0.5rem' }}>Active (Logging Mode)</span>
                  </div>
                  <div>
                    <span style={{ color: colors['text-secondary'] }}>Bluetooth Backend:</span>
                    <span style={{ color: colors['text-primary'], marginLeft: '0.5rem' }}>Active (Simulation Mode)</span>
                  </div>
                  <div>
                    <span style={{ color: colors['text-secondary'] }}>Version:</span>
                    <span style={{ color: colors['text-tertiary'], marginLeft: '0.5rem' }}>1.0.0</span>
                  </div>
                  <div>
                    <span style={{ color: colors['text-secondary'] }}>Last Updated:</span>
                    <span style={{ color: colors['text-tertiary'], marginLeft: '0.5rem' }}>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'bluetooth':
        return <div key="bluetooth" style={{...commonStyle, overflowY: 'auto'}}><BluetoothSettings /></div>;
      case 'display':
        return <div key="display" style={{...commonStyle, overflowY: 'auto'}}><DisplaySettings /></div>;
      case 'data':
        return <div key="data" style={{...commonStyle, overflowY: 'auto'}}><DataPage /></div>;
      case 'home':
      default:
        return (
          <div key="home" style={{
            ...commonStyle,
            display: 'flex',
            backgroundColor: colors['bg-primary'],
            color: colors['text-primary'],
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}>
            <div style={{
              textAlign: 'center',
              maxWidth: '50rem',
              width: '100%',
            }}>
              <p style={{
                fontSize: '1.125rem',
                color: colors['text-secondary'],
                marginBottom: '3rem',
                fontWeight: '300',
              }}>
                Open Source Headunit Interface
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(2, 1fr)',
                gap: '1.5rem',
                maxWidth: '900px',
                margin: '0 auto',
              }}>
                <HomeScreenCard
                  icon={Lightbulb}
                  title="Lights"
                  description="Control lighting"
                  onClick={() => setCurrentView('gpio')}
                />

                <HomeScreenCard
                  icon={Map}
                  title="Navigation"
                  description="GPS and routing"
                  onClick={() => setCurrentView('navigation')}
                />

                <HomeScreenCard
                  icon={Music}
                  title="Media"
                  description="Music and radio"
                  onClick={() => setCurrentView('media')}
                />

                <HomeScreenCard
                  icon={BarChart3}
                  title="Diagnostics"
                  description="System monitoring"
                />

                <HomeScreenCard
                  icon={Settings}
                  title="Settings"
                  description="Configuration"
                  onClick={() => setCurrentView('settings')}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{
      height: '100vh',
      backgroundColor: colors['bg-primary'],
      color: colors['text-primary'],
      overflow: 'hidden',
      transition: 'background-color 300ms ease-in-out, color 300ms ease-in-out',
    }}>

      {/* Main Content */}
      <main style={{
        height: 'calc(100% - 5rem)', // Account for bottom navbar
        overflowY: currentView === 'navigation' ? 'hidden' : 'auto',
        overflowX: 'hidden',
        position: 'relative',
      }}>
        {/* Render all views but only show the active one */}
        {renderView('home')}
        {renderView('gpio')}
        {renderView('navigation')}
        {renderView('media')}
        {renderView('settings')}
        {renderView('bluetooth')}
        {renderView('display')}
        {renderView('data')}
      </main>

      {/* Bottom Navigation Bar */}
      <nav style={{
        ...styles.navigation.bottombar,
        backgroundColor: colors['bg-secondary'],
        borderTop: `1px solid ${colors['bg-tertiary']}`,
        transition: 'background-color 300ms ease-in-out, border-color 300ms ease-in-out',
      }}>
        {navigationItems.map((item) => (
          <NavigationItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={currentView === item.id}
            onClick={() => setCurrentView(item.id)}
            variant="bottombar"
          />
        ))}
      </nav>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
