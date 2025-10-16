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

import HomeIcon from './components/icons/HomeIcon';
import LightbulbIcon from './components/icons/LightbulbIcon';
import MapIcon from './components/icons/MapIcon';
import MusicIcon from './components/icons/MusicIcon';
import SettingsIcon from './components/icons/SettingsIcon';
import SmartphoneIcon from './components/icons/SmartphoneIcon';
import MonitorIcon from './components/icons/MonitorIcon';
import BarChart3Icon from './components/icons/BarChart3Icon';

function AppContent() {
  const { theme } = useTheme();
  const colors = getColors(theme);
  
  const [currentView, setCurrentView] = useState(() => {
    try {
      return localStorage.getItem('nodenav-default-page') || 'home';
    } catch (error) {
      console.error('Failed to load default page:', error);
      return 'home';
    }
  });

  const navigationItems = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'gpio', label: 'Lights', icon: LightbulbIcon },
    { id: 'navigation', label: 'Navigation', icon: MapIcon },
    { id: 'media', label: 'Media', icon: MusicIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
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
      transition: 'opacity 0.2s ease-in-out',
      padding: '2rem',
    };

    switch (viewId) {
      case 'gpio':
        return <div key="gpio" style={{...commonStyle, overflowY: 'auto'}}><GPIOControl /></div>;
      case 'navigation':
        return <div key="navigation" style={{...commonStyle, padding: 0}}><NavigationPage /></div>;
      case 'media':
        return <div key="media" style={{...commonStyle, overflowY: 'auto'}}><MediaPlayer /></div>;
      case 'settings':
        return (
          <div key="settings" style={{...commonStyle, overflowY: 'auto'}}>
            <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
              <h1 style={{ ...styles.typography.h1, color: colors['text-primary'] }}>
                Settings
              </h1>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}>
                <SettingsButton
                  icon={SmartphoneIcon}
                  title="Bluetooth"
                  description="Pair and manage devices"
                  onClick={() => setCurrentView('bluetooth')}
                />
                <SettingsButton
                  icon={MonitorIcon}
                  title="Display"
                  description="Theme and appearance"
                  onClick={() => setCurrentView('display')}
                />
                <SettingsButton
                  icon={BarChart3Icon}
                  title="Data"
                  description="View command history"
                  onClick={() => setCurrentView('data')}
                />
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
          <div key="home" style={{ ...commonStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              width: '100%',
              maxWidth: '900px',
            }}>
              <HomeScreenCard
                icon={LightbulbIcon}
                title="Lights"
                onClick={() => setCurrentView('gpio')}
              />
              <HomeScreenCard
                icon={MapIcon}
                title="Navigation"
                onClick={() => setCurrentView('navigation')}
              />
              <HomeScreenCard
                icon={MusicIcon}
                title="Media"
                onClick={() => setCurrentView('media')}
              />
              <HomeScreenCard
                icon={SettingsIcon}
                title="Settings"
                onClick={() => setCurrentView('settings')}
              />
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
      <main style={{ height: 'calc(100% - 5rem)', position: 'relative' }}>
        {renderView('home')}
        {renderView('gpio')}
        {renderView('navigation')}
        {renderView('media')}
        {renderView('settings')}
        {renderView('bluetooth')}
        {renderView('display')}
        {renderView('data')}
      </main>
      <nav style={{...styles.navigation.bottombar, borderTop: `1px solid ${colors['bg-tertiary']}`}}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={currentView === item.id}
              onClick={() => setCurrentView(item.id)}
            />
          ))}
        </div>
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
