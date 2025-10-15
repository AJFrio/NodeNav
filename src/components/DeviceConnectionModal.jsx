import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../styles';

const DeviceConnectionModal = ({
  isOpen,
  onClose,
  devices,
  isScanning,
  onStartScan,
  onStopScan,
  onSelectDevice,
  hasAdapter,
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const getDeviceStatusColor = (device) => {
    if (device.connected) return colors.success;
    if (device.paired) return colors.info;
    return colors['bg-surface'];
  };

  const getDeviceStatusText = (device) => {
    if (device.connected) return 'Connected';
    if (device.paired) return 'Paired';
    return 'Discovered';
  };

  // Filter out already connected devices and sort by signal strength
  const availableDevices = devices
    .filter(d => !d.connected)
    .sort((a, b) => {
      const rssiA = a.rssi || -100;
      const rssiB = b.rssi || -100;
      return rssiB - rssiA;
    });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors['bg-primary'],
          borderRadius: '0.75rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${colors['bg-tertiary']}`,
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            borderBottom: `1px solid ${colors['bg-tertiary']}`,
          }}
        >
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: colors['text-primary'],
              margin: 0,
            }}
          >
            Connect New Device
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: colors['text-secondary'],
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 150ms ease-in-out',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors['bg-tertiary']}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Scanning Controls */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: `1px solid ${colors['bg-tertiary']}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <button
              onClick={onStartScan}
              disabled={isScanning || !hasAdapter}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                fontSize: '0.875rem',
                transition: 'background-color 150ms ease-in-out',
                backgroundColor: (isScanning || !hasAdapter) ? colors['bg-surface'] : colors.primary,
                color: (isScanning || !hasAdapter) ? colors['text-disabled'] : colors['bg-primary'],
                cursor: (isScanning || !hasAdapter) ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {isScanning ? 'Scanning...' : 'Start Scanning'}
            </button>

            <button
              onClick={onStopScan}
              disabled={!isScanning || !hasAdapter}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                fontSize: '0.875rem',
                transition: 'background-color 150ms ease-in-out',
                backgroundColor: (!isScanning || !hasAdapter) ? colors['bg-surface'] : colors.danger,
                color: (!isScanning || !hasAdapter) ? colors['text-disabled'] : colors['bg-primary'],
                cursor: (!isScanning || !hasAdapter) ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              Stop Scanning
            </button>
          </div>

          <div
            style={{
              fontSize: '0.875rem',
              color: colors['text-secondary'],
              textAlign: 'center',
            }}
          >
            {isScanning ? '🔍 Scanning for devices...' : 'Click "Start Scanning" to discover nearby devices'}
          </div>
        </div>

        {/* Device List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
          }}
        >
          {availableDevices.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: colors['text-secondary'],
              }}
            >
              {isScanning ? 'Looking for devices...' : 'No devices found. Start scanning to discover devices.'}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {availableDevices.map((device) => (
                <div
                  key={device.address}
                  onClick={() => onSelectDevice(device)}
                  style={{
                    backgroundColor: colors['bg-secondary'],
                    border: `1px solid ${colors['bg-tertiary']}`,
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 150ms ease-in-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors['bg-tertiary'];
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors['bg-secondary'];
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: colors['text-primary'],
                        margin: 0,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginRight: '0.5rem',
                      }}
                    >
                      {device.name || device.address}
                    </h3>
                    <span
                      style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: getDeviceStatusColor(device),
                        color: colors['bg-primary'],
                      }}
                    >
                      {getDeviceStatusText(device)}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: colors['text-secondary'],
                    }}
                  >
                    {device.name && device.name !== device.address && (
                      <div
                        style={{
                          fontFamily: 'monospace',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {device.address}
                      </div>
                    )}
                    {device.rssi && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span>{getSignalBars(device.rssi)}</span>
                        <span>
                          Signal: {device.rssi} dBm ({getSignalStrength(device.rssi)})
                        </span>
                      </div>
                    )}
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

export default DeviceConnectionModal;

