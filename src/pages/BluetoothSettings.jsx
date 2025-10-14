import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { bluetoothAPI } from '../services/api';
import { styles, getColors } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import DeviceConnectionModal from '../components/DeviceConnectionModal';

const BluetoothSettings = () => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [adapterInfo, setAdapterInfo] = useState(null);
  const [devices, setDevices] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasAdapter, setHasAdapter] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleSelectDeviceFromModal = async (device) => {
    try {
      // First, pair if not already paired
      if (!device.paired) {
        await bluetoothAPI.pairDevice(device.address);
      }
      
      // Then connect
      await bluetoothAPI.connectDevice(device.address);
      
      // Stop scanning
      if (isScanning) {
        await bluetoothAPI.stopScanning();
        setIsScanning(false);
      }
      
      // Refresh data
      await loadAllData();
      
      // Close modal
      setIsModalOpen(false);
    } catch (err) {
      setError(`Failed to connect to device: ${err.message}`);
      console.error('Error connecting device:', err);
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

      {/* Connected Devices Section */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{
            ...styles.typography.h2,
            color: colors['text-primary'],
            margin: 0,
          }}>Connected Devices</h2>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!hasAdapter}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: hasAdapter ? colors.primary : colors['bg-surface'],
              color: hasAdapter ? colors['bg-primary'] : colors['text-disabled'],
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: hasAdapter ? 'pointer' : 'not-allowed',
              transition: 'background-color 150ms ease-in-out',
            }}
            onMouseEnter={(e) => {
              if (hasAdapter) {
                e.target.style.backgroundColor = colors['primary-hover'];
              }
            }}
            onMouseLeave={(e) => {
              if (hasAdapter) {
                e.target.style.backgroundColor = colors.primary;
              }
            }}
          >
            <Plus size={18} />
            Connect New Device
          </button>
        </div>

        {loading ? (
          <div style={{
            color: colors['text-secondary'],
            textAlign: 'center',
            padding: '2rem',
          }}>Loading...</div>
        ) : connectedDevices.length === 0 ? (
          <div style={{
            backgroundColor: colors['bg-secondary'],
            border: `1px solid ${colors['bg-tertiary']}`,
            borderRadius: '0.5rem',
            padding: '2rem',
            textAlign: 'center',
            color: colors['text-secondary'],
          }}>
            No devices connected. Click "Connect New Device" to get started.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {connectedDevices.map((device) => (
              <div key={device.address} style={{
                backgroundColor: colors['bg-secondary'],
                border: `1px solid ${colors['bg-tertiary']}`,
                borderRadius: '0.5rem',
                padding: '1.5rem',
                transition: 'background-color 150ms ease-in-out',
              }}>
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
                    color: colors['bg-primary'],
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
                      backgroundColor: colors.primary,
                      color: colors['bg-primary'],
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
                    Disconnect
                  </button>

                  <button
                    onClick={() => handleUnpairDevice(device.address)}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      backgroundColor: colors['bg-tertiary'],
                      color: colors['text-primary'],
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease-in-out',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors['bg-quaternary']}
                    onMouseLeave={(e) => e.target.style.backgroundColor = colors['bg-tertiary']}
                  >
                    Unpair
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Device Connection Modal */}
      <DeviceConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        devices={devices}
        isScanning={isScanning}
        onStartScan={handleStartScan}
        onStopScan={handleStopScan}
        onSelectDevice={handleSelectDeviceFromModal}
        hasAdapter={hasAdapter}
      />
    </div>
  );
};

export default BluetoothSettings;
