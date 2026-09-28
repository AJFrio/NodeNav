# NodeNav

**Open Source Headunit Interface for Automotive Systems**

A modern, minimalist car headunit interface built with React and Node.js. Control your car's hardware, connect your phone via Bluetooth, stream music, and more - all through a beautiful, touch-friendly interface.

![NodeNav Banner](https://via.placeholder.com/800x200/000000/FFFFFF?text=NodeNav+-+Open+Source+Headunit)

## Features

### Bluetooth Media Player
- **Full Audio Streaming**: Stream music from your phone to your car's speakers via A2DP
- **Media Controls**: Play, pause, skip tracks directly from the interface
- **Live Metadata**: View song title, artist, album, and playback progress in real-time
- **AVRCP Support**: Full integration with your phone's media apps (Spotify, Apple Music, etc.)
- **Linux Focused**: Built and optimized for Linux-based systems (via BlueZ).

### Bluetooth Device Management
- **Device Discovery**: Scan for nearby Bluetooth devices with live updates
- **Pairing & Connection**: Easy device pairing and connection management directly from the app
- **Native Platform Support**: BlueZ/D-Bus on Linux.
- **Device Information**: View connection status, device type, signal strength, and last seen
- **Smart Device Detection**: Automatically identifies phones, headphones, speakers, and more
- **History Tracking**: Monitor all Bluetooth operations with detailed logs
- **No System Settings Required**: Complete device management without leaving the app!

### GPIO Control
- **Hardware Pin Control**: Control GPIO pins on Raspberry Pi and similar devices
- **Multiple Modes**: Support for INPUT, OUTPUT, and PWM modes
- **Real-time Monitoring**: Live status updates for all configured pins
- **PWM Support**: Control LED brightness, motor speeds, and more
- **Command History**: Track all GPIO operations for debugging

### Modern UI/UX
- **Minimalist Black Theme**: High-contrast design optimized for automotive use
- **Touch-Friendly**: Large buttons and controls designed for gloves and on-the-go use
- **Responsive Layout**: Adapts to different screen sizes and orientations
- **Bottom Navigation**: Quick access to all major features
- **No Scrolling**: All content fits on screen for safe driving

## Screenshots

### Home Screen
Clean, organized home screen with quick access cards for all major features.

### Media Player
Beautiful media player with album art placeholder, progress bar, and playback controls.

### Bluetooth Settings
Comprehensive Bluetooth management with device scanning, pairing, and connection.

### GPIO Control
Intuitive GPIO pin control with real-time status indicators.

## Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **npm** v7 or higher
- **Bluetooth adapter** (built-in or USB)
- **Optional**: Raspberry Pi or similar for GPIO functionality

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/NodeNav.git
cd NodeNav

# Install dependencies
npm install

# Start the backend server
cd Headunit/src
node server.js

# In another terminal, start the frontend
npm run dev
```

The application will be available at `http://localhost:5173`

## Platform-Specific Setup

### Windows and macOS
On Windows and macOS, the application runs in a GUI-only testing mode. Hardware-related features like Bluetooth and GPIO control are disabled. This is useful for developing and testing the user interface without requiring a Linux environment.

### Linux Setup

**NEW: Full native Bluetooth device management!** Connect to devices directly from the app using BlueZ/D-Bus - no system settings required!

1. Ensure BlueZ is running:
```bash
sudo systemctl start bluetooth
sudo systemctl enable bluetooth
```

2. Set up D-Bus permissions (choose one):

**Option A: Quick testing (run with sudo)**
```bash
sudo npm run electron-dev
```

**Option B: Production setup (recommended)**
```bash
# Add yourself to bluetooth group
sudo usermod -a -G bluetooth $USER

# Or create D-Bus policy file (see LINUX_BLUETOOTH_GUIDE.md)
```

3. For Bluetooth audio streaming, run the automated setup:
```bash
chmod +x setup-bluetooth-audio.sh
./setup-bluetooth-audio.sh
```

4. Log out and back in for permissions to take effect

5. Start NodeNav and discover/pair/connect devices in **Settings** → **Bluetooth**

**Requirements:**
- BlueZ 5.50+ (pre-installed on most distros)
- D-Bus (pre-installed)
- PulseAudio 10.0+ or PipeWire 0.3+ (for audio streaming)

**Detailed Guides**: 
- [LINUX_BLUETOOTH_GUIDE.md](docs/LINUX_BLUETOOTH_GUIDE.md) - Device management (NEW!)
- [BLUETOOTH_AUDIO_SETUP.md](docs/BLUETOOTH_AUDIO_SETUP.md) - Audio streaming setup

### Raspberry Pi GPIO Setup

For GPIO functionality on Raspberry Pi:

```bash
# The backend will automatically detect GPIO availability
# No additional setup required
```

**Note**: GPIO functionality requires running on compatible hardware.

## Usage

### Connecting Your Phone

1. **Pair Device** (one-time setup):
   - Navigate to **Settings** → **Bluetooth**
   - Click **Start Scanning**
   - Select your phone from the list
   - Click **Pair** and accept on your phone
   - Click **Connect**

2. **Stream Music**:
   - Navigate to **Media Player**
   - Play music on your phone
   - Audio will stream to your computer/car speakers
   - Control playback from NodeNav

### Controlling GPIO Pins

1. Navigate to **GPIO Control**
2. Select a pin to configure
3. Choose mode (INPUT, OUTPUT, PWM)
4. Toggle or set values as needed
5. View command history in the log panel

### Navigation

Use the bottom navigation bar to quickly switch between:
- **Home**: Quick access to all features
- **GPIO Control**: Hardware pin management
- **Navigation**: GPS routing (coming soon)
- **Media**: Bluetooth audio player
- **Settings**: System configuration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ MediaPlayer  │ BluetoothUI  │ GPIOControl  │        │
│  └──────┬───────┴──────┬───────┴──────┬───────┘        │
│         └──────────────┼──────────────┘                 │
│                        │ API Service                     │
└────────────────────────┼─────────────────────────────────┘
                         │ HTTP/REST API
┌────────────────────────┼─────────────────────────────────┐
│              Backend (Express + Node.js)                 │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ Bluetooth    │ GPIO         │ API          │        │
│  │ Audio        │ Service      │ Endpoints    │        │
│  │ Service      │              │              │        │
│  └──────┬───────┴──────┬───────┴──────┬───────┘        │
└─────────┼──────────────┼──────────────┼─────────────────┘
          │              │              │
┌─────────┼──────────────┼──────────────┼─────────────────┐
│         │              │              │                  │
│    Bluetooth      GPIO Pins    System APIs              │
│    Hardware                                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Key Technologies

**Frontend:**
- React 19
- Vite (build tool)
- Tailwind CSS 4 + @tailwindcss/vite
- HeroUI React components
- Lucide React icons

**Backend:**
- Node.js
- Express (REST API)
- CORS middleware

**Platform Integration:**
- **Linux**: BlueZ (D-Bus API) + PulseAudio/PipeWire
- **GPIO**: Native GPIO libraries (Raspberry Pi)

## 📂 Project Structure

```
NodeNav/
├── Headunit/                       # React UI, Express backend, and Electron shell
│   ├── index.html
│   ├── index.js                    # Electron main process
│   ├── preload.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       ├── pages/
│       └── services/               # API client and backend services
├── Accessories/
│   └── Lights/                     # ESP-01 light controller firmware and guide
├── App/                            # Reserved for future app modules
├── docs/
├── package.json
├── vite.config.js
└── README.md
```

## Development

### Running in Development Mode

```bash
# Terminal 1: Backend server with hot reload
cd Headunit/src
node server.js

# Terminal 2: Frontend with hot reload
npm run dev
```

### Building for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview

# Start production server
npm run start
```

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run electron` - Run Electron app
- `npm run electron-dev` - Run Electron in dev mode
- `npm start` - Build and run Electron app

## Troubleshooting

### Bluetooth Issues

**Audio doesn't stream to computer:**
- Ensure device is connected (not just paired)
- Check system audio output settings
- Verify Bluetooth audio profile is set to A2DP sink

**Controls don't work:**
- Some apps have limited AVRCP support
- Try Spotify or Apple Music (excellent support)
- YouTube has limited Bluetooth control support

**No metadata showing:**
- Ensure music is actively playing
- Try a different music app
- Some streaming apps don't broadcast metadata

### GPIO Issues

**Pins not responding:**
- Check if running on compatible hardware
- Verify GPIO permissions (user in `gpio` group on Linux)
- Ensure no other process is using the pins

### Platform-Specific Guides

- **Linux Bluetooth**: See [LINUX_BLUETOOTH_GUIDE.md](docs/LINUX_BLUETOOTH_GUIDE.md) - **NEW!** Complete device management
- **Linux Audio**: See [BLUETOOTH_AUDIO_SETUP.md](docs/BLUETOOTH_AUDIO_SETUP.md)
- **Implementation Details**: 
  - [LINUX_BLUETOOTH_IMPLEMENTATION.md](docs/LINUX_BLUETOOTH_IMPLEMENTATION.md) - **NEW!**
  - [BLUETOOTH_AUDIO_IMPLEMENTATION.md](docs/BLUETOOTH_AUDIO_IMPLEMENTATION.md)

## Features Roadmap

### Current Version (1.0.0)
- Bluetooth device management
- Bluetooth audio streaming (A2DP)
- Media playback control (AVRCP)
- Live track metadata
- GPIO pin control
- Minimalist UI theme
- Cross-platform support (Linux-first)

### Upcoming Features

#### Media Player
- [ ] Album artwork display
- [ ] Playlist/queue management
- [ ] Audio equalizer
- [ ] Volume control integration
- [ ] Podcast-specific features

#### Navigation
- [ ] GPS integration
- [ ] Turn-by-turn navigation
- [ ] OpenStreetMap integration
- [ ] Route planning
- [ ] Traffic updates

#### System
- [ ] Multiple Bluetooth device support
- [ ] Automatic device reconnection
- [ ] Phone call integration
- [ ] SMS/notification display
- [ ] Voice assistant integration
- [ ] Backup camera integration
- [ ] OBD-II diagnostics
- [ ] Steering wheel control support

#### UI/UX
- [ ] Theme customization
- [ ] Screen brightness control
- [ ] Gesture controls
- [ ] Widget system
- [ ] Multi-language support

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/AmazingFeature`
3. **Commit your changes**: `git commit -m 'Add some AmazingFeature'`
4. **Push to the branch**: `git push origin feature/AmazingFeature`
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Add comments for complex logic
- Update documentation for new features
- Test on both Windows and Linux if possible
- Keep the UI minimalist and touch-friendly

## License

This project is licensed under the ISC License. See the LICENSE file for details.

## Author

**AJ Frio**

- GitHub: [@AJFrio](https://github.com/AJFrio)

## Acknowledgments

- **BlueZ Project** - Linux Bluetooth stack
- **PulseAudio/PipeWire** - Audio routing on Linux
- **React Team** - Amazing UI framework
- **Vite Team** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide** - Beautiful icon set
- **Electron** - Cross-platform desktop apps

## Documentation

- [Main README](README.md) - This file
- [Linux Bluetooth Guide](docs/LINUX_BLUETOOTH_GUIDE.md) - **NEW!** Device management on Linux
- [Linux Bluetooth Implementation](docs/LINUX_BLUETOOTH_IMPLEMENTATION.md) - **NEW!** Technical details
- [Bluetooth Audio Setup (Linux)](docs/BLUETOOTH_AUDIO_SETUP.md)
- [Bluetooth Audio Implementation Details](docs/BLUETOOTH_AUDIO_IMPLEMENTATION.md)

## Useful Links

- **Report a Bug**: [GitHub Issues](https://github.com/yourusername/NodeNav/issues)
- **Request a Feature**: [GitHub Issues](https://github.com/yourusername/NodeNav/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/NodeNav/discussions)

## Use Cases

- **DIY Car Headunit**: Replace factory headunit with Raspberry Pi
- **Classic Car Modernization**: Add modern features to older vehicles
- **Development/Testing**: Test automotive applications
- **Learning Platform**: Learn automotive software development
- **Home Automation Hub**: Repurpose as a control center

## Performance

- **Startup Time**: < 3 seconds
- **UI Response**: Instant (React optimizations)
- **Bluetooth Commands**: 20-50ms on Linux
- **Metadata Updates**: Every 2 seconds
- **Audio Latency**: 100-300ms (Bluetooth standard)

## Security

- No external API calls for media streaming
- Local-only Bluetooth connections
- No cloud services required
- All data stays on your device
- Open source - audit the code yourself

## Platform Support

| Feature | Linux | macOS | Raspberry Pi | Windows 10/11 |
|---------|-------|-------|--------------|---------------|
| Media Player | Full | GUI Only | Full | GUI Only |
| Bluetooth Device Mgmt | **Native (NEW!)** | GUI Only | Native | GUI Only |
| Bluetooth Audio | Full | GUI Only | Full | GUI Only |
| GPIO | Full | N/A | Full | N/A |
| UI | Full | Full | Full | Full |


## Support

Need help? Here's how to get support:

1. **Check the documentation** in the `docs/` folder
2. **Search existing issues** on GitHub
3. **Ask in discussions** for general questions
4. **Open an issue** for bugs or feature requests

---

<div align="center">

**Made with love for the automotive community**

Star this repo if you find it useful!

[Report Bug](https://github.com/yourusername/NodeNav/issues) · [Request Feature](https://github.com/yourusername/NodeNav/issues) · [Documentation](docs/)

</div>
