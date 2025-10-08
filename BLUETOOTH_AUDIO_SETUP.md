# Bluetooth Audio Streaming Setup

This guide explains how to set up and use Bluetooth audio streaming with your phone in NodeNav.

## Overview

The media player feature allows you to:
- Connect your phone via Bluetooth
- Stream audio from your phone to the computer
- Control playback (play, pause, next, previous)
- View track information (title, artist, album)
- See playback progress with a seekable progress bar

## Architecture

The system consists of three main components:

1. **Frontend (MediaPlayer.jsx)** - React UI for controlling playback
2. **Backend API (server.js)** - Express API endpoints for Bluetooth control
3. **Bluetooth Audio Service** - System-level Bluetooth integration

## Platform Support

### Linux (Primary Support)
✅ **Fully Implemented** - Uses `bluetoothctl` and `PulseAudio`/`PipeWire`

### Windows
⚠️ **Requires Additional Setup** - Needs native Node.js modules

### macOS
⚠️ **Requires Additional Setup** - Needs native Node.js modules

## Linux Setup (Recommended)

### Prerequisites

1. **BlueZ** (Bluetooth stack)
```bash
sudo apt-get install bluez bluez-tools
```

2. **PulseAudio** or **PipeWire** (Audio routing)
```bash
# For PulseAudio
sudo apt-get install pulseaudio pulseaudio-module-bluetooth

# Or for PipeWire (modern systems)
sudo apt-get install pipewire wireplumber
```

3. **Bluetooth permissions**
```bash
# Add your user to the bluetooth group
sudo usermod -a -G bluetooth $USER

# Reboot or log out and back in for changes to take effect
```

### Configuration

1. **Enable Bluetooth**
```bash
sudo systemctl enable bluetooth
sudo systemctl start bluetooth
```

2. **Make system discoverable** (optional)
```bash
bluetoothctl
> power on
> discoverable on
> pairable on
> agent on
> default-agent
```

## Usage Instructions

### 1. Pair Your Phone

First, pair your phone with the system using the Bluetooth Settings page in NodeNav:

1. Navigate to **Settings → Bluetooth**
2. Click **Start Scanning**
3. Select your phone from the list
4. Click **Pair** (you may need to confirm on your phone)
5. Click **Connect**

### 2. Open Media Player

1. Navigate to the **Media** tab from the home screen or bottom navigation
2. The app will automatically:
   - Detect connected Bluetooth devices
   - Establish audio connection
   - Start displaying track information

### 3. Control Playback

- **Play/Pause**: Click the center button
- **Next Track**: Click the forward button on the right
- **Previous Track**: Click the back button on the left
- **Seek**: Click anywhere on the progress bar

### 4. Stream Audio

Once connected:
1. Play music on your phone (Spotify, Apple Music, YouTube, etc.)
2. Audio will automatically stream to your computer speakers
3. Track metadata will appear in the media player
4. Controls in NodeNav will work with your phone's media player

## How It Works

### A2DP Profile (Audio Streaming)

The A2DP (Advanced Audio Distribution Profile) allows your phone to stream high-quality audio to the computer:

- Your phone acts as the **source** (audio transmitter)
- Your computer acts as the **sink** (audio receiver)
- Audio is compressed and transmitted over Bluetooth
- PulseAudio/PipeWire routes the audio to your speakers

### AVRCP Profile (Media Control)

The AVRCP (Audio/Video Remote Control Profile) allows NodeNav to control playback:

- Send commands: play, pause, next, previous
- Receive metadata: song title, artist, album
- Get playback status: playing/paused, track position, duration

### Backend Service

The `bluetooth-audio-service.js` handles:

- Connecting to paired devices
- Setting up A2DP audio sink profile
- Sending AVRCP commands via `bluetoothctl`
- Polling for metadata updates
- Managing audio routing through PulseAudio

## Troubleshooting

### No Audio Output

**Problem**: Phone is connected but no audio is playing through computer speakers.

**Solutions**:
```bash
# Check Bluetooth audio device is detected
pactl list cards short

# Set Bluetooth profile to A2DP sink
pactl set-card-profile bluez_card.XX_XX_XX_XX_XX_XX a2dp_sink

# Make sure the device is not muted
pactl set-sink-mute bluez_sink.XX_XX_XX_XX_XX_XX 0
pactl set-sink-volume bluez_sink.XX_XX_XX_XX_XX_XX 100%
```

### Metadata Not Showing

**Problem**: Audio plays but track information doesn't appear.

**Solutions**:
- Some phones don't support AVRCP metadata
- Try playing from a different app (Spotify usually has good support)
- Check phone's Bluetooth settings for media controls permissions

### Connection Drops

**Problem**: Bluetooth keeps disconnecting.

**Solutions**:
```bash
# Increase Bluetooth connection interval
echo "FastConnectable = true" | sudo tee -a /etc/bluetooth/main.conf

# Restart Bluetooth service
sudo systemctl restart bluetooth

# Trust the device to auto-reconnect
bluetoothctl
> trust XX:XX:XX:XX:XX:XX
```

### Control Commands Not Working

**Problem**: Play/pause/next buttons don't work.

**Solutions**:
- Ensure your phone's media app supports AVRCP
- Some apps (like YouTube) have limited Bluetooth control support
- Try a dedicated music app like Spotify, Apple Music, or VLC

## Testing Without a Phone

If you want to test the media player without a Bluetooth connection:

The backend includes a simulation mode that provides mock track data. Simply start the backend server:

```bash
cd src
node server.js
```

## Advanced Configuration

### Custom Audio Routing

Edit PulseAudio configuration:
```bash
nano ~/.config/pulse/default.pa
```

Add:
```
# Load Bluetooth modules
load-module module-bluetooth-policy
load-module module-bluetooth-discover

# Auto-switch to Bluetooth when connected
load-module module-switch-on-connect
```

### Bluetooth Audio Quality

For better quality (at the cost of some latency):
```bash
# Edit BlueZ config
sudo nano /etc/bluetooth/main.conf

# Add under [General]
ControllerMode = dual
FastConnectable = true
Privacy = device
```

## API Reference

### REST Endpoints

```
POST   /api/bluetooth/audio/connect/:address  - Connect audio to device
POST   /api/bluetooth/audio/disconnect        - Disconnect audio
GET    /api/bluetooth/audio/state             - Get media state
POST   /api/bluetooth/audio/play              - Play media
POST   /api/bluetooth/audio/pause             - Pause media
POST   /api/bluetooth/audio/next              - Next track
POST   /api/bluetooth/audio/previous          - Previous track
POST   /api/bluetooth/audio/stop              - Stop playback
```

### Media State Response

```json
{
  "connected": true,
  "device": "AA:BB:CC:DD:EE:FF",
  "audioActive": true,
  "isPlaying": true,
  "track": {
    "title": "Blinding Lights",
    "artist": "The Weeknd",
    "album": "After Hours",
    "duration": 200,
    "position": 45
  }
}
```

## Known Limitations

1. **Seek functionality**: AVRCP doesn't support seeking to arbitrary positions (progress bar click won't work with real devices)
2. **Album art**: Currently not implemented (would require additional AVRCP support)
3. **Multiple devices**: Only one audio device can be active at a time
4. **Windows/macOS**: Require native modules that aren't yet implemented

## Future Improvements

- [ ] Album artwork display via AVRCP
- [ ] Windows native Bluetooth support
- [ ] macOS native Bluetooth support
- [ ] Playlist view
- [ ] Audio equalizer
- [ ] Volume control
- [ ] Multiple device support
- [ ] Bluetooth codec selection (SBC, AAC, aptX, LDAC)

## Contributing

To add support for other platforms:

1. Implement platform-specific methods in `bluetooth-audio-service.js`
2. Use native Node.js modules:
   - Windows: `windows.devices.bluetooth` via `node-ffi-napi`
   - macOS: `IOBluetooth` framework via `node-ffi-napi` or native addon
3. Follow the same API interface for consistency

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review system logs: `journalctl -u bluetooth`
3. Check BlueZ logs: `bluetoothctl` then `show`
4. Verify audio system: `pactl info`

---

**Note**: This is a headunit interface designed for automotive use. Audio latency of 100-300ms is normal for Bluetooth and acceptable for music playback.
