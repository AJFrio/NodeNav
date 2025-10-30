import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import GPIOControl from './pages/GPIOControl';
import BluetoothSettings from './pages/BluetoothSettings';
import MediaPlayer from './pages/MediaPlayer';
import DataPage from './pages/DataPage';
import DisplaySettings from './pages/DisplaySettings';
import NavigationPage from './pages/NavigationPage';
import HomePage from './pages/HomePage';
import SettingsButton from './components/SettingsButton';
import View from './components/View';
import ErrorBoundary from './components/ErrorBoundary';
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

const navigationItems = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/gpio', label: 'Lights', icon: LightbulbIcon },
  { path: '/navigation', label: 'Navigation', icon: MapIcon },
  { path: '/media', label: 'Media', icon: MusicIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

function NavigationItem({ icon: Icon, label, ...rest }) {
  const { theme } = useTheme();
  const colors = getColors(theme);

  return (
    <NavLink
      {...rest}
      style={({ isActive }) => ({
        ...styles.navigation.item,
        color: isActive ? colors['accent-primary'] : colors['text-secondary'],
        flexDirection: 'column',
      })}
    >
      <Icon size={24} />
      <span>{label}</span>
    </NavLink>
  );
}

function SettingsPage() {
  const { theme } = useTheme();
  const colors = getColors(theme);

  return (
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
          as={NavLink}
          to="/settings/bluetooth"
        />
        <SettingsButton
          icon={MonitorIcon}
          title="Display"
          description="Theme and appearance"
          as={NavLink}
          to="/settings/display"
        />
        <SettingsButton
          icon={BarChart3Icon}
          title="Data"
          description="View command history"
          as={NavLink}
          to="/settings/data"
        />
      </div>
    </div>
  );
}

function Layout({ children }) {
  const { theme } = useTheme();
  const colors = getColors(theme);

  return (
    <div style={{
      height: '100vh',
      backgroundColor: colors['bg-primary'],
      color: colors['text-primary'],
      overflow: 'hidden',
      transition: 'background-color 300ms ease-in-out, color 300ms ease-in-out',
    }}>
      <main style={{ height: 'calc(100% - 5rem)', position: 'relative' }}>
        {children}
      </main>
      <nav style={{...styles.navigation.bottombar, borderTop: `1px solid ${colors['bg-tertiary']}`}}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function AppContent() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<View><HomePage /></View>} />
          <Route path="/gpio" element={<View><GPIOControl /></View>} />
          <Route path="/navigation" element={<View><NavigationPage /></View>} />
          <Route path="/media" element={<View><MediaPlayer /></View>} />
          <Route path="/settings" element={<View><SettingsPage /></View>} />
          <Route path="/settings/bluetooth" element={<View><BluetoothSettings /></View>} />
          <Route path="/settings/display" element={<View><DisplaySettings /></View>} />
          <Route path="/settings/data" element={<View><DataPage /></View>} />
        </Routes>
      </Layout>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
