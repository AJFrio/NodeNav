import React, { useState, useEffect } from 'react';
import { gpioAPI, bluetoothAPI } from '../services/api';
import { styles, colors } from '../styles';

const DataPage = () => {
  const [lightCommands, setLightCommands] = useState([]);
  const [bluetoothCommands, setBluetoothCommands] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllHistory();

    // Set up polling for real-time updates (every 2 seconds)
    const interval = setInterval(loadAllHistory, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadAllHistory = async () => {
    try {
      setLoading(true);
      const [lightHistory, bluetoothHistory] = await Promise.all([
        gpioAPI.getCommandHistory(),
        bluetoothAPI.getBluetoothHistory()
      ]);
      setLightCommands(lightHistory.slice(-10)); // Last 10 commands
      setBluetoothCommands(bluetoothHistory.slice(-10)); // Last 10 commands
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearLightHistory = async () => {
    try {
      await gpioAPI.clearCommandHistory();
      setLightCommands([]);
    } catch (err) {
      console.error('Error clearing light history:', err);
    }
  };

  const clearBluetoothHistory = async () => {
    try {
      await bluetoothAPI.clearBluetoothHistory();
      setBluetoothCommands([]);
    } catch (err) {
      console.error('Error clearing bluetooth history:', err);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div style={{
      padding: '1.5rem',
      maxWidth: '64rem',
      margin: '0 auto',
    }}>
      <h1 style={{
        ...styles.typography.h1,
        color: colors['text-primary'],
        marginBottom: '2rem',
      }}>Data & Command History</h1>

      {/* Recent Light Commands */}
      <div style={{
        marginBottom: '2rem',
        ...styles.card,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h2 style={{
            ...styles.typography.h2,
            color: colors['text-primary'],
          }}>Recent Light Commands</h2>
          <button
            onClick={clearLightHistory}
            style={{
              ...styles.button.secondary,
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
            }}
          >
            Clear
          </button>
        </div>

        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          backgroundColor: colors['bg-tertiary'],
          borderRadius: '0.375rem',
          padding: '1rem',
        }}>
          {loading ? (
            <div style={{
              textAlign: 'center',
              color: colors['text-secondary'],
            }}>Loading...</div>
          ) : lightCommands.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: colors['text-secondary'],
            }}>No commands yet</div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {lightCommands.map((cmd, index) => (
                <div key={index} style={{
                  backgroundColor: colors['bg-quaternary'],
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}>
                  <div style={{
                    color: colors['text-primary'],
                    fontWeight: '500',
                  }}>
                    {cmd.type.toUpperCase()} - Pin {cmd.pin}
                  </div>
                  <div style={{
                    color: colors['text-secondary'],
                    fontSize: '0.75rem',
                  }}>
                    {formatTime(cmd.timestamp)}
                  </div>
                  {cmd.value !== undefined && (
                    <div style={{ color: colors.info }}>Value: {cmd.value}</div>
                  )}
                  {cmd.mode && (
                    <div style={{ color: colors.success }}>Mode: {cmd.mode}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Bluetooth Commands */}
      <div style={{
        ...styles.card,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h2 style={{
            ...styles.typography.h2,
            color: colors['text-primary'],
          }}>Recent Bluetooth Commands</h2>
          <button
            onClick={clearBluetoothHistory}
            style={{
              backgroundColor: colors['bg-tertiary'],
              color: colors['text-primary'],
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'background-color 150ms ease-in-out',
              border: 'none',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors['bg-quaternary']}
            onMouseLeave={(e) => e.target.style.backgroundColor = colors['bg-tertiary']}
          >
            Clear
          </button>
        </div>

        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          backgroundColor: colors['bg-tertiary'],
          borderRadius: '0.375rem',
          padding: '1rem',
        }}>
          {loading ? (
            <div style={{
              color: colors['text-secondary'],
              textAlign: 'center',
            }}>Loading...</div>
          ) : bluetoothCommands.length === 0 ? (
            <div style={{
              color: colors['text-secondary'],
              textAlign: 'center',
            }}>No commands yet</div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {bluetoothCommands.map((cmd, index) => (
                <div key={index} style={{
                  backgroundColor: colors['bg-quaternary'],
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}>
                  <div style={{
                    color: colors['text-primary'],
                    fontWeight: '500',
                  }}>
                    {cmd.type.replace('_', ' ').toUpperCase()}
                    {cmd.device && ` - ${cmd.device}`}
                  </div>
                  <div style={{
                    color: colors['text-secondary'],
                    fontSize: '0.75rem',
                  }}>
                    {formatTime(cmd.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataPage;

