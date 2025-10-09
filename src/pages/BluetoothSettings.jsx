import React, { useState, useEffect } from 'react';
import { bluetoothAPI } from '../services/api';
import { styles, colors } from '../styles';

const BluetoothSettings = () => {
  const [adapterInfo, setAdapterInfo] = useState(null);
  const [devices, setDevices] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasAdapter, setHasAdapter] = useState(false);

  useEffect(() => {
    let interval;

    const initializeBluetooth = async () => {
      try {
        setLoading(true);
        await loadAllData();
        setLoading(false);

        // Only set up polling if we have an adapter (check will happen in loadAllData)
        // Set up interval after first load to poll for updates
        interval = setInterval(loadAllData, 3000);
      } catch (err) {
        console.error('Bluetooth initialization failed:', err);
        setError('Bluetooth adapter not found or unavailable');
        setLoading(false);
      }
    };

    initializeBluetooth();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []); // Only run once on mount

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [adapter, allDevices, connected] = await Promise.all([
        bluetoothAPI.getAdapterInfo(),
        bluetoothAPI.getDevices(),
        bluetoothAPI.getConnectedDevices()
      ]);

      setAdapterInfo(adapter);
      setDevices(allDevices);
      setConnectedDevices(connected);
      setError(null);
      setHasAdapter(!!adapter);
    } catch (err) {
      // If adapter is not found, set a specific error and don't retry
      if (err.message && err.message.includes('not found')) {
        setError('Bluetooth adapter not found');
        setAdapterInfo(null);
        setHasAdapter(false);
      } else {
        setError('Failed to load Bluetooth data from backend');
        console.error('Error loading Bluetooth data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = async () => {
    setError(null);
    setHasAdapter(false);
    await loadAllData();
  };

  const handleStartScan = async () => {
    if (!hasAdapter) {
      setError('No Bluetooth adapter available');
      return;
    }

    try {
      setIsScanning(true);
      await bluetoothAPI.startScanning();
      await loadAllData(); // Refresh to show scanning state
    } catch (err) {
      setError(`Failed to start scanning: ${err.message}`);
      console.error('Error starting scan:', err);
      setIsScanning(false);
    }
  };

  const handleStopScan = async () => {
    try {
      await bluetoothAPI.stopScanning();
      setIsScanning(false);
      await loadAllData(); // Refresh to show stopped scanning state
    } catch (err) {
      setError(`Failed to stop scanning: ${err.message}`);
      console.error('Error stopping scan:', err);
    }
  };

  const handlePairDevice = async (address) => {
    try {
      await bluetoothAPI.pairDevice(address);
      await loadAllData(); // Refresh data
    } catch (err) {
      setError(`Failed to pair device: ${err.message}`);
      console.error('Error pairing device:', err);
    }
  };

  const handleConnectDevice = async (address) => {
    try {
      await bluetoothAPI.connectDevice(address);
      await loadAllData(); // Refresh data
    } catch (err) {
      setError(`Failed to connect to device: ${err.message}`);
      console.error('Error connecting device:', err);
    }
  };

  const handleDisconnectDevice = async (address) => {
    try {
      await bluetoothAPI.disconnectDevice(address);
      await loadAllData(); // Refresh data
    } catch (err) {
      setError(`Failed to disconnect from device: ${err.message}`);
      console.error('Error disconnecting device:', err);
    }
  };

  const handleUnpairDevice = async (address) => {
    try {
      await bluetoothAPI.unpairDevice(address);
      await loadAllData(); // Refresh data
    } catch (err) {
      setError(`Failed to unpair device: ${err.message}`);
      console.error('Error unpairing device:', err);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getDeviceStatusColor = (device) => {
    if (device.connected) return 'bg-green-600';
    if (device.paired) return 'bg-blue-600';
    return 'bg-gray-600';
  };

  const getDeviceStatusText = (device) => {
    if (device.connected) return 'Connected';
    if (device.paired) return 'Paired';
    return 'Discovered';
  };

  const getSignalStrength = (rssi) => {
    if (!rssi) return 'Unknown';
    if (rssi >= -50) return 'Excellent';
    if (rssi >= -60) return 'Good';
    if (rssi >= -70) return 'Fair';
    if (rssi >= -80) return 'Weak';
    return 'Very Weak';
  };

  const getSignalBars = (rssi) => {
    if (!rssi) return '📶';
    if (rssi >= -50) return '📶📶📶📶';
    if (rssi >= -60) return '📶📶📶';
    if (rssi >= -70) return '📶📶';
    if (rssi >= -80) return '📶';
    return '📵';
  };

  // Sort and filter devices - show only top 5 by signal strength
  const getTopDevicesBySignal = (deviceList, limit = 5) => {
    return deviceList
      .filter(d => !d.connected) // Exclude connected devices
      .sort((a, b) => {
        // Sort by RSSI (higher is better, less negative means stronger)
        const rssiA = a.rssi || -100; // Default to very weak if no RSSI
        const rssiB = b.rssi || -100;
        return rssiB - rssiA; // Descending order
      })
      .slice(0, limit); // Take top 5
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '80rem',
      margin: '0 auto',
      height: '100vh',
      overflowY: 'auto',
      scrollbarWidth: 'none', // Firefox
      msOverflowStyle: 'none', // IE/Edge
    }}
    className="bluetooth-scroll"
    >

      {error && (
        <div style={{
          backgroundColor: colors.danger,
          color: colors['bg-primary'],
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button
            onClick={retryConnection}
            style={{
              backgroundColor: colors.primary,
              color: colors['bg-primary'],
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Bluetooth Adapter Info */}
        <div style={styles.card}>
          <h2 style={{
            ...styles.typography.h2,
            color: colors['text-primary'],
            marginBottom: '1rem',
          }}>Bluetooth Adapter</h2>

          {loading ? (
            <div style={{
              color: colors['text-secondary'],
            }}>Loading...</div>
          ) : adapterInfo ? (
            <div style={{
              display: 'grid',
              gap: '0.75rem',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: colors['text-secondary'] }}>Status:</span>
                <span style={{
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  backgroundColor: adapterInfo.powered ? colors.success : colors.danger,
                  color: colors['bg-primary'],
                }}>
                  {adapterInfo.powered ? 'Powered On' : 'Powered Off'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: colors['text-secondary'] }}>Discoverable:</span>
                <span style={{
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  backgroundColor: adapterInfo.discoverable ? colors.success : colors.warning,
                  color: colors['bg-primary'],
                }}>
                  {adapterInfo.discoverable ? 'Yes' : 'No'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: colors['text-secondary'] }}>Pairable:</span>
                <span style={{
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  backgroundColor: adapterInfo.pairable ? colors.success : colors.warning,
                  color: colors['bg-primary'],
                }}>
                  {adapterInfo.pairable ? 'Yes' : 'No'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: colors['text-secondary'] }}>Scanning:</span>
                <span style={{
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  backgroundColor: adapterInfo.discovering ? colors.info : colors['bg-quaternary'],
                  color: colors['text-primary'],
                }}>
                  {adapterInfo.discovering ? 'Yes' : 'No'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: colors['text-secondary'] }}>Address:</span>
                <span style={{
                  color: colors['text-tertiary'],
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                }}>{adapterInfo.address}</span>
              </div>
            </div>
          ) : (
            <div style={{
              color: colors['text-secondary'],
            }}>No adapter information available</div>
          )}
        </div>

        {/* Device Scanning Controls */}
        <div style={styles.card}>
          <h2 style={{
            ...styles.typography.h2,
            color: colors['text-primary'],
            marginBottom: '1rem',
          }}>Device Discovery</h2>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <button
              onClick={handleStartScan}
              disabled={isScanning || loading || !hasAdapter}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontWeight: '500',
                transition: 'background-color 150ms ease-in-out',
                backgroundColor: (isScanning || loading || !hasAdapter) ? colors['bg-surface'] : colors.primary,
                color: (isScanning || loading || !hasAdapter) ? colors['text-disabled'] : colors['bg-primary'],
                cursor: (isScanning || loading || !hasAdapter) ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                if (!(isScanning || loading || !hasAdapter)) {
                  e.target.style.backgroundColor = colors['primary-hover'];
                }
              }}
              onMouseLeave={(e) => {
                if (!(isScanning || loading || !hasAdapter)) {
                  e.target.style.backgroundColor = colors.primary;
                }
              }}
            >
              {isScanning ? 'Scanning...' : 'Start Scan'}
            </button>

            <button
              onClick={handleStopScan}
              disabled={!isScanning || loading || !hasAdapter}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontWeight: '500',
                transition: 'background-color 150ms ease-in-out',
                backgroundColor: (!isScanning || loading || !hasAdapter) ? colors['bg-surface'] : colors.danger,
                color: (!isScanning || loading || !hasAdapter) ? colors['text-disabled'] : colors['bg-primary'],
                cursor: (!isScanning || loading || !hasAdapter) ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                if (!(!isScanning || loading || !hasAdapter)) {
                  e.target.style.backgroundColor = colors['danger-hover'];
                }
              }}
              onMouseLeave={(e) => {
                if (!(!isScanning || loading || !hasAdapter)) {
                  e.target.style.backgroundColor = colors.danger;
                }
              }}
            >
              Stop Scan
            </button>
          </div>

          <div style={{
            fontSize: '0.875rem',
            color: colors['text-secondary'],
          }}>
            {isScanning ? '🔍 Scanning for devices...' : 'Click "Start Scan" to discover nearby Bluetooth devices'}
          </div>
          
          {adapterInfo && adapterInfo.discoverable && adapterInfo.pairable && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              backgroundColor: colors['bg-tertiary'],
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: colors['text-secondary'],
            }}>
              💡 <strong>Tip:</strong> You can also pair from your phone! Look for "{adapterInfo.name || 'NodeNav Headunit'}" in your phone's Bluetooth settings.
            </div>
          )}
        </div>
      </div>

      {/* Connected Devices */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{
          ...styles.typography.h2,
          color: colors['text-primary'],
          marginBottom: '1rem',
        }}>Connected Devices</h2>

        {loading ? (
          <div style={{
            color: colors['text-secondary'],
            textAlign: 'center',
            padding: '2rem',
          }}>Loading...</div>
        ) : connectedDevices.length === 0 ? (
          <div style={{
            ...styles.card,
            padding: '2rem',
            textAlign: 'center',
            color: colors['text-secondary'],
          }}>
            No devices connected
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {connectedDevices.map((device) => (
              <div key={device.address} style={styles.card}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: colors['text-primary'],
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginRight: '0.5rem',
                  }}>{device.name || device.address}</h3>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    backgroundColor: getDeviceStatusColor(device),
                    color: colors['text-primary'],
                  }}>
                    {getDeviceStatusText(device)}
                  </span>
                </div>

                <div style={{
                  fontSize: '0.875rem',
                  color: colors['text-secondary'],
                  marginBottom: '0.75rem',
                }}>
                  {device.name && device.name !== device.address && (
                    <div style={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      marginBottom: '0.25rem'
                    }}>
                      {device.address}
                    </div>
                  )}
                  <div>Type: {device.type}</div>
                  {device.rssi && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <span>{getSignalBars(device.rssi)}</span>
                      <span>Signal: {device.rssi} dBm ({getSignalStrength(device.rssi)})</span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem' }}>Last Seen: {formatTime(device.lastSeen)}</div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                }}>
                  <button
                    onClick={() => handleDisconnectDevice(device.address)}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease-in-out',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1a1a1a'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#000000'}
                  >
                    Disconnect
                  </button>

                  <button
                    onClick={() => handleUnpairDevice(device.address)}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease-in-out',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1a1a1a'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#000000'}
                  >
                    Unpair
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Devices */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{
          ...styles.typography.h2,
          color: colors['text-primary'],
          marginBottom: '1rem',
        }}>Available Devices (Top 5 by Signal)</h2>

        {loading ? (
          <div style={{
            color: colors['text-secondary'],
            textAlign: 'center',
            padding: '2rem',
          }}>Loading...</div>
        ) : getTopDevicesBySignal(devices).length === 0 ? (
          <div style={{
            ...styles.card,
            padding: '2rem',
            textAlign: 'center',
            color: colors['text-secondary'],
          }}>
            No devices found. Try starting a scan.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {getTopDevicesBySignal(devices).map((device) => (
              <div key={device.address} style={styles.card}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: colors['text-primary'],
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginRight: '0.5rem',
                  }}>{device.name || device.address}</h3>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    backgroundColor: getDeviceStatusColor(device),
                    color: colors['text-primary'],
                  }}>
                    {getDeviceStatusText(device)}
                  </span>
                </div>

                <div style={{
                  fontSize: '0.875rem',
                  color: colors['text-secondary'],
                  marginBottom: '0.75rem',
                }}>
                  {device.name && device.name !== device.address && (
                    <div style={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      marginBottom: '0.25rem'
                    }}>
                      {device.address}
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <span>{getSignalBars(device.rssi)}</span>
                    <span>Signal: {device.rssi ? `${device.rssi} dBm (${getSignalStrength(device.rssi)})` : 'Unknown'}</span>
                  </div>
                  <div>Type: {device.type}</div>
                  <div style={{ fontSize: '0.75rem' }}>Last Seen: {formatTime(device.lastSeen)}</div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                }}>
                  {!device.paired ? (
                    <button
                      onClick={() => handlePairDevice(device.address)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        backgroundColor: colors.primary,
                        color: colors['text-primary'],
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 150ms ease-in-out',
                        border: 'none',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = colors['primary-hover']}
                      onMouseLeave={(e) => e.target.style.backgroundColor = colors.primary}
                    >
                      Pair
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectDevice(device.address)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        backgroundColor: colors.success,
                        color: colors['text-primary'],
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 150ms ease-in-out',
                        border: 'none',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = colors['success-hover']}
                      onMouseLeave={(e) => e.target.style.backgroundColor = colors.success}
                    >
                      Connect
                    </button>
                  )}

                  {device.paired && (
                    <button
                      onClick={() => handleUnpairDevice(device.address)}
                      style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease-in-out',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1a1a1a'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#000000'}
                    >
                      Unpair
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BluetoothSettings;
