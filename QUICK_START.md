# Quick Start Guide

Get NodeNav up and running in 5 minutes! 🚀

## 📋 Prerequisites

Before starting, make sure you have:

- ✅ **Node.js v16+** installed ([Download](https://nodejs.org/))
- ✅ **npm v7+** (comes with Node.js)
- ✅ **Bluetooth adapter** (built-in or USB)
- ✅ **Git** (to clone the repository)

## 🚀 Installation (3 Steps)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/NodeNav.git
cd NodeNav

# Install dependencies
npm install
```

### 2. Start the Backend

```bash
# Open a terminal in the NodeNav directory
cd src
node server.js
```

You should see:
```
[Bluetooth Audio] Loading [Platform] implementation
GPIO API server running on port 3001
```

### 3. Start the Frontend

```bash
# Open a NEW terminal in the NodeNav directory
npm run dev
```

You should see:
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

**🎉 Done! Open [http://localhost:5173](http://localhost:5173) in your browser.**

## 📱 Connect Your Phone (First Time)

### Windows

1. **Pair in Windows Settings:**
   - Press `Win + I` → **Bluetooth & devices**
   - Click **Add device** → **Bluetooth**
   - Select your phone and confirm pairing

2. **Connect in NodeNav:**
   - Open NodeNav → **Settings** → **Bluetooth**
   - Your phone should appear in the list
   - Click **Connect**

3. **Done!** Go to **Media Player** tab

### Linux

1. **Run Setup Script:**
   ```bash
   chmod +x setup-bluetooth-audio.sh
   ./setup-bluetooth-audio.sh
   ```

2. **Log out and back in** (for group permissions)

3. **Pair in NodeNav:**
   - Open NodeNav → **Settings** → **Bluetooth**
   - Click **Start Scanning**
   - Select your phone → **Pair** → **Connect**

4. **Done!** Go to **Media Player** tab

## 🎵 Using the Media Player

1. **Connect your phone** (see above)
2. **Go to Media Player tab**
3. **Play music on your phone** (Spotify, Apple Music, etc.)
4. **Audio streams to your computer**
5. **Control playback from NodeNav:**
   - ⏸️ Pause/Play
   - ⏭️ Next track
   - ⏮️ Previous track
   - 📊 See track info

## ⚡ GPIO Control (Raspberry Pi)

1. **Go to GPIO Control tab**
2. **Select a pin** (e.g., GPIO17)
3. **Choose mode:**
   - OUTPUT: Control digital output (HIGH/LOW)
   - PWM: Control analog output (0-255)
   - INPUT: Read digital input
4. **Toggle or set values**
5. **View command history** at the bottom

## 🔧 Common Tasks

### Restart Backend
```bash
# Press Ctrl+C in the backend terminal
# Then restart:
node src/server.js
```

### Restart Frontend
```bash
# Press Ctrl+C in the frontend terminal
# Then restart:
npm run dev
```

### Check Backend Status
```bash
# In a new terminal:
curl http://localhost:3001/api/health
```

### View Backend Logs
Look at the terminal where you ran `node server.js`

### Change Port
```bash
# Set PORT environment variable before starting:
PORT=3002 node src/server.js
```

When running the Vite UI in a separate process, set `VITE_API_PORT` to the same value (for example, `VITE_API_PORT=3002 npm run dev`). Electron reads `PORT` directly for its API requests.

## ❓ Troubleshooting

### "Cannot connect to backend"
- ✅ Make sure backend is running (`node src/server.js`)
- ✅ Check backend terminal for errors
- ✅ Verify port 3001 is not in use

### "Bluetooth service not found"
**Windows:**
```powershell
# Start Bluetooth service
Start-Service bthserv
```

**Linux:**
```bash
# Install BlueZ
sudo apt-get install bluez

# Start service
sudo systemctl start bluetooth
```

### "No audio playing"
- ✅ Ensure device is **connected** (not just paired)
- ✅ Check system audio output settings
- ✅ Play music on phone first
- ✅ Try a different music app (Spotify works best)

### "Controls don't work"
- ✅ Some apps have limited Bluetooth support
- ✅ Try Spotify or Apple Music
- ✅ Make sure music is actually playing
- ✅ Restart the music app on your phone

### Port Already in Use
```bash
# Find process using port 3001:
# Windows:
netstat -ano | findstr :3001

# Linux/Mac:
lsof -i :3001

# Kill the process or use a different port
```

## 📚 Next Steps

### Learn More
- 📖 [Full README](README.md) - Complete documentation
- 🪟 [Windows Guide](WINDOWS_TESTING_GUIDE.md) - Windows-specific setup
- 🐧 [Linux Guide](BLUETOOTH_AUDIO_SETUP.md) - Linux-specific setup
- 🔧 [Implementation Details](BLUETOOTH_AUDIO_IMPLEMENTATION.md) - Technical deep dive

### Customize
- 🎨 Edit `src/styles.js` to change colors
- 📱 Modify `src/pages/` to customize pages
- ⚙️ Check `src/services/` for backend logic

### Contribute
- 🐛 [Report bugs](https://github.com/yourusername/NodeNav/issues)
- 💡 [Suggest features](https://github.com/yourusername/NodeNav/issues)
- 🤝 [Contributing guide](CONTRIBUTING.md)

## 🎯 Common Use Cases

### Testing on Windows, Deploying on Linux
```bash
# Develop on Windows:
npm run dev  # Frontend hot reload
node src/server.js  # Backend

# Deploy to Linux:
# Copy files, run setup script, same commands work!
./setup-bluetooth-audio.sh
npm run build
npm start
```

### Running as Desktop App
```bash
# Development:
npm run electron-dev

# Production:
npm run build
npm run electron
```

### Auto-Start on Boot (Raspberry Pi)
```bash
# Create systemd service
sudo nano /etc/systemd/system/nodenav.service

# Add:
[Unit]
Description=NodeNav Headunit
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/NodeNav
ExecStart=/usr/bin/node /home/pi/NodeNav/src/server.js
Restart=always

[Install]
WantedBy=multi-user.target

# Enable:
sudo systemctl enable nodenav
sudo systemctl start nodenav
```

## ⚡ Performance Tips

1. **Use Chrome/Edge** - Best performance and Bluetooth support
2. **Close unused tabs** - Free up system resources
3. **Wired connection** - Less latency than WiFi
4. **SSD recommended** - Faster app loading
5. **Dedicated hardware** - Raspberry Pi 4 or better

## 🔒 Security Notes

- ✅ All data stays on your device (no cloud services)
- ✅ Bluetooth connections are local only
- ✅ No external API calls for media
- ✅ Open source - audit the code yourself
- ✅ No telemetry or tracking

## 💡 Pro Tips

- 🎧 Use **Spotify** for best Bluetooth metadata support
- 📱 Keep phone **close** to Bluetooth adapter (<10m)
- 🔋 Phone battery can drain faster when streaming
- 🔊 Adjust **system volume**, not phone volume
- 🎵 Create a **dedicated playlist** for driving
- 🚗 Test in a **parked car** before driving

## 🆘 Need Help?

1. **Check this guide** for common issues
2. **Search [existing issues](https://github.com/yourusername/NodeNav/issues)**
3. **Ask in [discussions](https://github.com/yourusername/NodeNav/discussions)**
4. **Open a [new issue](https://github.com/yourusername/NodeNav/issues/new)**

---

**You're ready to go! Enjoy your open-source headunit! 🚗💨**

[← Back to README](README.md) | [Documentation →](docs/)
