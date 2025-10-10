# Changelog

All notable changes to NodeNav will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-08

### 🎉 Initial Release

#### Added

**Media Player & Bluetooth Audio**
- Full Bluetooth audio streaming (A2DP profile)
- Media playback control via AVRCP
- Live track metadata display (title, artist, album)
- Real-time progress bar with current position and duration
- Play, pause, next, and previous controls
- Automatic connected device detection
- Cross-platform support (Windows and Linux)

**Windows Implementation**
- PowerShell-based Bluetooth control (no native compilation required)
- Windows Runtime API integration
- Windows Media Control API for metadata
- Automatic platform detection
- Setup verification script (`setup-windows-bluetooth.ps1`)

**Linux Implementation**
- BlueZ integration via bluetoothctl
- PulseAudio/PipeWire audio routing
- AVRCP command support
- Metadata polling via bluetoothctl
- Automated setup script (`setup-bluetooth-audio.sh`)

**Bluetooth Device Management**
- Device discovery and scanning
- Device pairing functionality
- Connection management
- Device information display
- Connection history logging
- Real-time status indicators
- Paired devices list
- Connected devices filtering

**GPIO Control**
- Raspberry Pi GPIO pin control
- Multiple pin modes (INPUT, OUTPUT, PWM)
- Real-time pin status display
- PWM value control (0-255)
- Digital write (HIGH/LOW)
- Command history logging
- Grid-based pin layout
- Status indicators for active pins

**User Interface**
- Minimalist black theme optimized for automotive use
- Touch-friendly controls with large hit targets
- Responsive layout (no scrolling required)
- Bottom navigation bar for quick access
- Home screen with feature cards
- Smooth transitions and hover effects
- High-contrast design for visibility
- Loading states and error handling

**Architecture**
- React 19 frontend with Vite
- Express backend with RESTful API
- Platform-specific service layer
- Automatic platform detection
- Modular component structure
- Centralized styling system

**Documentation**
- Comprehensive README with quick start
- Windows setup guide with PowerShell examples
- Linux setup guide with automated scripts
- Bluetooth implementation documentation
- Windows testing guide
- Contributing guidelines
- Architecture overview

**Development Tools**
- Vite dev server with hot reload
- Electron integration for desktop app
- Setup verification scripts
- Cross-platform compatibility layer

#### Technical Details

**Frontend Technologies**
- React 19.2.0
- Vite 7.1.9
- Tailwind CSS 4.1.14
- HeroUI React 2.8.5
- Lucide React 0.545.0

**Backend Technologies**
- Node.js
- Express 5.1.0
- CORS 2.8.5

**Platform Support**
- Windows 10 version 1809+ (build 17763)
- Windows 11
- Linux (BlueZ 5.50+, PulseAudio 10.0+/PipeWire 0.3+)
- Raspberry Pi (GPIO support)

#### Known Limitations

- Seek functionality not available (AVRCP protocol limitation)
- Album artwork not yet implemented
- Single audio device connection at a time
- macOS support not yet implemented

## [Unreleased]

### Planned Features

#### Media Player
- Album artwork display via AVRCP
- Volume control integration
- Playlist/queue management
- Audio equalizer
- Podcast-specific features

#### Navigation
- GPS integration
- Turn-by-turn navigation
- OpenStreetMap support
- Route planning
- Traffic updates

#### System
- Multiple Bluetooth device support
- Automatic device reconnection
- Phone call integration
- SMS/notification display
- Voice assistant integration
- Backup camera integration
- OBD-II diagnostics
- Steering wheel control support

#### UI/UX
- Theme customization
- Screen brightness control
- Gesture controls
- Widget system
- Multi-language support

---

## Version History

- **[1.0.0]** - 2025-10-08 - Initial release with Bluetooth audio and GPIO control
- **[Unreleased]** - Future features and improvements

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute to this changelog and the project.

## Links

- [GitHub Repository](https://github.com/yourusername/NodeNav)
- [Issue Tracker](https://github.com/yourusername/NodeNav/issues)
- [Documentation](docs/)

[Unreleased]: https://github.com/yourusername/NodeNav/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/NodeNav/releases/tag/v1.0.0
