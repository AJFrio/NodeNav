import React, { useState } from 'react';
import GPIOControl from './pages/GPIOControl';
import BluetoothSettings from './pages/BluetoothSettings';
import MediaPlayer from './pages/MediaPlayer';
import HomeScreenCard from './components/HomeScreenCard';
import SettingsButton from './components/SettingsButton';
import NavigationItem from './components/NavigationItem';
import { styles, colors } from './styles';
import {
  Home,
  Lightbulb,
  Wrench,
  Map,
  Music,
  BarChart3,
  Settings,
  Smartphone
} from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('home');

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'gpio', label: 'GPIO Control', icon: Lightbulb },
    { id: 'navigation', label: 'Navigation', icon: Map },
    { id: 'media', label: 'Media', icon: Music },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'gpio':
        return <GPIOControl />;
      case 'media':
        return <MediaPlayer />;
      case 'settings':
        return (
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
                icon={Settings}
                title="Display"
                description="Display settings (Coming Soon)"
                disabled={true}
                variant="secondary"
              />

              <SettingsButton
                icon={BarChart3}
                title="Data"
                description="Data management (Coming Soon)"
                disabled={true}
                variant="tertiary"
              />
            </div>

            <div style={{
              marginTop: '2rem',
              ...styles.card,
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
        );
      case 'bluetooth':
        return <BluetoothSettings />;
      case 'home':
      default:
        return (
          <div style={{
            height: '100vh',
            backgroundColor: colors['bg-primary'],
            color: colors['text-primary'],
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            overflow: 'hidden',
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
                  icon={Wrench}
                  title="GPIO Control"
                  description="Control hardware pins"
                  onClick={() => setCurrentView('gpio')}
                />

                <HomeScreenCard
                  icon={Map}
                  title="Navigation"
                  description="GPS and routing"
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
    }}>

      {/* Main Content */}
      <main style={{
        height: '100%',
        paddingBottom: '5rem', // Account for bottom navbar
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {renderView()}
      </main>

      {/* Bottom Navigation Bar */}
      <nav style={styles.navigation.bottombar}>
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

export default App;
