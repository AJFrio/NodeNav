# Linux Bluetooth Device Management Guide

## Overview

NodeNav now includes **full Bluetooth device management** for Linux systems! You can discover, pair, connect, and control Bluetooth devices directly from the application without needing to use system settings.

This implementation uses **BlueZ** (the official Linux Bluetooth stack) via D-Bus for direct hardware access and complete control.

## Features

✅ **Device Discovery** - Scan for nearby Bluetooth devices  
✅ **Device Pairing** - Pair with discovered devices  
✅ **Connect/Disconnect** - Connect to paired devices directly from the app  
✅ **Device Management** - Remove paired devices  
✅ **Real-time Updates** - Live device status updates  
✅ **Complete Control** - No need to use system Bluetooth settings  

## Requirements

### System Requirements

1. **Linux Operating System** (tested on Ubuntu, Debian, Fedora, Arch)
2. **BlueZ Bluetooth Stack** (pre-installed on most Linux distributions)
3. **D-Bus** (system message bus - pre-installed on most systems)
4. **Bluetooth Hardware** (built-in or USB Bluetooth adapter)

### Permissions

The application needs permission to access the Bluetooth adapter via D-Bus. There are two ways to handle this:

#### Option 1: Run with elevated privileges (Quick Testing)
```bash
sudo npm run electron-dev
```

#### Option 2: Add D-Bus policy (Recommended for Production)

Create a D-Bus policy file to allow your user to access Bluetooth:

```bash
sudo nano /etc/dbus-1/system.d/bluetooth-access.conf
```

Add the following content (replace `YOUR_USERNAME` with your actual username):

```xml
<!DOCTYPE busconfig PUBLIC
 "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
 "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>
  <policy user="YOUR_USERNAME">
    <allow send_destination="org.bluez"/>
    <allow send_interface="org.bluez.Adapter1"/>
    <allow send_interface="org.bluez.Device1"/>
    <allow send_interface="org.freedesktop.DBus.Properties"/>
    <allow send_interface="org.freedesktop.DBus.ObjectManager"/>
  </policy>
</busconfig>
```

Reload D-Bus configuration:
```bash
sudo systemctl reload dbus
```

#### Option 3: Add user to bluetooth group

On some systems, you may need to add your user to the `bluetooth` group:

```bash
sudo usermod -a -G bluetooth $USER
```

Then log out and log back in for the changes to take effect.

## How It Works

### Architecture

```
┌─────────────────────────────────────┐
│   NodeNav React Frontend            │
│   (BluetoothSettings.jsx)           │
└──────────────┬──────────────────────┘
               │ REST API
┌──────────────▼──────────────────────┐
│   Express Server (server.js)        │
│   /api/bluetooth/* endpoints        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   bluetooth-service.js              │
│   (Platform Detection)              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   bluetooth-device-linux.js         │
│   (BlueZ D-Bus Interface)           │
└──────────────┬──────────────────────┘
               │ D-Bus Protocol
┌──────────────▼──────────────────────┐
│   BlueZ (org.bluez)                 │
│   Linux Bluetooth Stack             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Bluetooth Hardware Adapter        │
└─────────────────────────────────────┘
```

### BlueZ D-Bus Communication

The implementation uses the following D-Bus interfaces:

- **org.bluez.Adapter1** - Bluetooth adapter control (scanning, etc.)
- **org.bluez.Device1** - Individual device control (pair, connect, etc.)
- **org.freedesktop.DBus.ObjectManager** - Device discovery and monitoring
- **org.freedesktop.DBus.Properties** - Reading device/adapter properties

## Usage

### Starting the Application

1. Make sure Bluetooth is enabled on your system:
   ```bash
   # Check if Bluetooth is running
   systemctl status bluetooth
   
   # If not running, start it
   sudo systemctl start bluetooth
   ```

2. Start NodeNav:
   ```bash
   npm run electron-dev
   ```

3. Navigate to the **Bluetooth Settings** page in the app

### Discovering Devices

1. Click the **"Start Scan"** button
2. Nearby Bluetooth devices will appear in the "Available Devices" section
3. Scanning automatically stops after 30 seconds (or click "Stop Scan")

### Pairing with a Device

1. Find the device you want to pair in the "Available Devices" section
2. Click the **"Pair"** button
3. If the device requires confirmation (PIN, passkey, etc.), you may need to:
   - Check the device for a PIN/passkey
   - Confirm the pairing on both devices
   - Some devices pair automatically without confirmation

### Connecting to a Device

1. Once paired, the device will show a **"Connect"** button
2. Click **"Connect"** to establish a connection
3. The device will move to the "Connected Devices" section
4. Connected devices can be used for audio, input, or other Bluetooth profiles

### Disconnecting/Unpairing

- Click **"Disconnect"** to disconnect while keeping the pairing
- Click **"Unpair"** to completely remove the device

## API Endpoints

The following REST API endpoints are available:

### Device Management

- `GET /api/bluetooth/devices` - Get all discovered devices
- `GET /api/bluetooth/devices/connected` - Get only connected devices
- `GET /api/bluetooth/adapter` - Get Bluetooth adapter information

### Device Control

- `POST /api/bluetooth/scan/start` - Start scanning for devices
- `POST /api/bluetooth/scan/stop` - Stop scanning
- `POST /api/bluetooth/devices/:address/pair` - Pair with a device
- `POST /api/bluetooth/devices/:address/connect` - Connect to a device
- `POST /api/bluetooth/devices/:address/disconnect` - Disconnect from a device
- `DELETE /api/bluetooth/devices/:address` - Unpair a device

### Monitoring

- `GET /api/bluetooth/history` - Get Bluetooth command history
- `DELETE /api/bluetooth/history` - Clear command history

## Troubleshooting

### "Bluetooth adapter not found"

**Cause**: BlueZ is not running or no Bluetooth adapter is present

**Solution**:
```bash
# Check if BlueZ is running
systemctl status bluetooth

# Start BlueZ
sudo systemctl start bluetooth

# Enable BlueZ to start on boot
sudo systemctl enable bluetooth

# Check if adapter is detected
hciconfig
```

### "Failed to start scanning"

**Cause**: Permission denied or adapter is busy

**Solution**:
1. Make sure you have the correct D-Bus permissions (see Permissions section)
2. Try stopping any other Bluetooth managers:
   ```bash
   # Check for other Bluetooth processes
   ps aux | grep bluetooth
   
   # Kill bluetoothctl if running
   killall bluetoothctl
   ```

### "Failed to pair device"

**Cause**: Device not in pairing mode, PIN required, or already paired

**Solution**:
1. Make sure the device is in pairing/discoverable mode
2. Check if the device is already paired:
   ```bash
   bluetoothctl devices
   ```
3. If already paired, try unpairing first from the app
4. For devices requiring a PIN, check the device manual

### "Connection failed" after successful pairing

**Cause**: Missing Bluetooth profile support or driver issues

**Solution**:
1. Check if required Bluetooth profiles are installed:
   ```bash
   # For audio devices
   sudo apt install pulseaudio-module-bluetooth
   
   # Restart PulseAudio
   pulseaudio -k
   pulseaudio --start
   ```

2. Check device capabilities:
   ```bash
   bluetoothctl info [device_address]
   ```

### D-Bus permission errors

**Cause**: User doesn't have permission to access BlueZ via D-Bus

**Solution**: Follow the Permission setup in the Requirements section above

## Testing Without Bluetooth Hardware

If you want to test the app without Bluetooth hardware, you can create a virtual Bluetooth adapter:

```bash
# Load dummy Bluetooth module
sudo modprobe btusb
sudo modprobe bluetooth

# Or use vhci for virtual HCI
sudo modprobe hci_vhci
```

## Platform Support

- ✅ **Linux** - Full native support via BlueZ/D-Bus (this guide)
- ✅ **Windows** - Native support via PowerShell
- ⚠️ **macOS** - Simulation mode (limited OS access)

## Technical Details

### Device Type Detection

The implementation automatically detects device types using multiple methods:

1. **Icon property** from BlueZ (most reliable)
2. **Device name** pattern matching
3. **Bluetooth device class** (major/minor class codes)

Supported device types:
- Phone
- Headphones/Earbuds
- Speaker
- Computer
- Input devices (keyboard, mouse)
- Audio devices
- Unknown (generic)

### Auto-Discovery Updates

The implementation uses D-Bus signals to receive real-time device updates:

- **InterfacesAdded** - New devices discovered
- **InterfacesRemoved** - Devices removed
- **PropertiesChanged** - Device properties updated (connection state, etc.)

### Scanning Behavior

- Scans use the default BlueZ discovery filter
- Auto-stops after 30 seconds to conserve battery
- Discovery filter settings:
  - Transport: auto (BR/EDR and LE)
  - DuplicateData: false (reduce redundant discoveries)

## Security Considerations

1. **D-Bus Access**: The app requires D-Bus access to BlueZ, which is a system-level service. Use proper D-Bus policies in production.

2. **Bluetooth Security**: Always verify device identity before pairing with sensitive devices.

3. **PIN/Passkey**: Some devices require PIN confirmation. The app relies on BlueZ's agent system for pairing authentication.

4. **User Permissions**: Consider running the app with user-level permissions using D-Bus policies rather than root access.

## Development

### Adding New Features

The Linux Bluetooth implementation is modular and easy to extend:

1. **bluetooth-device-linux.js** - Core BlueZ/D-Bus implementation
2. **bluetooth-service.js** - Platform detection and service loading
3. **server.js** - REST API endpoints
4. **BluetoothSettings.jsx** - React UI component

### Debugging

Enable verbose BlueZ logging:

```bash
# Edit BlueZ service
sudo systemctl edit bluetooth

# Add these lines:
[Service]
ExecStart=
ExecStart=/usr/lib/bluetooth/bluetoothd -d

# Restart BlueZ
sudo systemctl restart bluetooth

# View logs
journalctl -u bluetooth -f
```

### Testing D-Bus Communication

You can test D-Bus communication manually:

```bash
# List available adapters
dbus-send --system --print-reply --dest=org.bluez / org.freedesktop.DBus.ObjectManager.GetManagedObjects

# Start discovery
dbus-send --system --print-reply --dest=org.bluez /org/bluez/hci0 org.bluez.Adapter1.StartDiscovery
```

## Additional Resources

- [BlueZ Documentation](http://www.bluez.org/)
- [BlueZ D-Bus API](https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc)
- [D-Bus Specification](https://dbus.freedesktop.org/doc/dbus-specification.html)
- [Linux Bluetooth Wiki](https://wiki.archlinux.org/title/Bluetooth)

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/AJFrio/NodeNav).

---

**Note**: This implementation provides direct hardware access to Bluetooth via BlueZ. Make sure to follow security best practices and properly manage device permissions in production environments.

