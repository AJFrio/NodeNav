# Testing Bluetooth Audio on Windows

## Quick Start

### 1. Run the Setup Check

Open PowerShell and run:

```powershell
.\setup-windows-bluetooth.ps1
```

This will verify:
- ✓ Windows version (need Windows 10 1809+ or Windows 11)
- ✓ Bluetooth service is running
- ✓ Bluetooth adapter is present
- ✓ Node.js is installed
- ✓ PowerShell execution policy
- ✓ Windows Runtime APIs are accessible

### 2. Pair Your Phone

Before using NodeNav, pair your phone with Windows:

1. Open **Settings** → **Bluetooth & devices**
2. Click **Add device**
3. Select **Bluetooth**
4. Select your phone from the list
5. Confirm pairing on both devices

**Important:** Make sure to pair the phone, not just connect it!

### 3. Start the Backend Server

Open a terminal in the NodeNav directory:

```bash
cd src
node server.js
```

You should see:
```
[Bluetooth Audio] Loading Windows implementation
[Windows Bluetooth Audio] Initializing...
[Windows Bluetooth Audio] Bluetooth service is running
[Windows Bluetooth Audio] Initialized successfully
GPIO API server running on port 3001
```

### 4. Start the Frontend

In another terminal:

```bash
npm run dev
```

### 5. Connect and Test

1. Open NodeNav in your browser (usually `http://localhost:5173`)
2. Go to **Settings** → **Bluetooth**
3. Your paired phone should appear in the list
4. Click **Connect** on your phone
5. Navigate to the **Media Player** tab
6. Play music on your phone (Spotify, Apple Music, etc.)
7. You should see:
   - Track information (title, artist, album)
   - Playback controls working
   - Audio streaming to your computer

## How It Works on Windows

### Architecture

```
NodeNav Frontend (React)
    ↓ HTTP API
NodeNav Backend (Node.js)
    ↓ require('bluetooth-audio-windows')
PowerShell Scripts
    ↓ Windows Runtime APIs
Windows.Media.Control API
    ↓ Bluetooth AVRCP
Your Phone
```

### No Native Modules Required!

This implementation uses **pure PowerShell** to access Windows APIs:
- ✅ No compilation needed
- ✅ No Visual Studio required
- ✅ No native dependencies
- ✅ Works out of the box

The service executes PowerShell commands to:
- Access `Windows.Media.Control` APIs
- Send media control commands (play, pause, next, previous)
- Retrieve track metadata
- Monitor playback state

## Testing Different Scenarios

### Test Media Controls

1. **Play/Pause**
   - Play music on your phone
   - Click pause in NodeNav
   - Music should pause on phone
   - Click play - music should resume

2. **Next Track**
   - Click the next button in NodeNav
   - Phone should skip to next track
   - Track info should update in NodeNav

3. **Previous Track**
   - Click the previous button
   - Phone should go to previous track

### Test with Different Apps

Try these apps to test compatibility:

- ✅ **Spotify** - Excellent support (recommended)
- ✅ **Apple Music** - Good support
- ✅ **Windows Media Player** - Good support
- ⚠️ **YouTube** - Limited support (may not show metadata)
- ⚠️ **Browser-based players** - Variable support

### Test Metadata Display

Play music and verify NodeNav shows:
- Track title
- Artist name
- Album name
- Current position
- Total duration
- Playing/paused state

## Troubleshooting

### Audio Plays on Phone but Not Computer

**Problem:** Music plays on phone speakers instead of streaming to computer.

**Solution:**
1. Open Windows **Settings** → **Sound**
2. Make sure Bluetooth audio device is selected as output
3. On your phone, check Bluetooth settings
4. Look for audio output options
5. Some phones have "Phone audio" and "Media audio" toggles - enable both

### No Track Information Showing

**Problem:** Audio plays but NodeNav shows "Unknown" for track info.

**Solutions:**
1. Try a different music app (Spotify works best)
2. Make sure music is playing (not paused)
3. Some apps don't support AVRCP metadata
4. Try playing a different track

### Controls Don't Work

**Problem:** Clicking play/pause does nothing.

**Solutions:**
1. Make sure phone is connected (not just paired)
2. Try playing music from phone first
3. Some apps don't support Bluetooth controls
4. Check Windows notifications - some apps require permission
5. Close and reopen the music app on your phone

### "Bluetooth service not running"

**Problem:** Setup script reports Bluetooth service isn't running.

**Solution:**
```powershell
# Run as Administrator
Start-Service bthserv

# Or manually:
# 1. Press Win+R
# 2. Type: services.msc
# 3. Find "Bluetooth Support Service"
# 4. Right-click → Start
```

### PowerShell Execution Policy Error

**Problem:** Scripts won't run due to execution policy.

**Solution:**
```powershell
# Allow scripts for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then re-run setup script
.\setup-windows-bluetooth.ps1
```

### "Windows version too old"

**Problem:** Setup reports Windows version is too old.

**Solution:**
- Update Windows to latest version
- Minimum required: Windows 10 version 1809 (October 2018 Update)
- Recommended: Windows 11 or Windows 10 version 21H2+

### Device Won't Pair

**Problem:** Phone won't pair with Windows.

**Solutions:**
1. Make sure Bluetooth is enabled on both devices
2. Make phone discoverable
3. Remove any existing pairing and try again
4. Restart Bluetooth on both devices
5. Update Bluetooth drivers on Windows

## Platform Differences

### Windows vs Linux

| Feature | Windows | Linux |
|---------|---------|-------|
| Setup | Automatic | Requires BlueZ setup |
| Dependencies | None (PowerShell) | bluetoothctl, pactl |
| Audio routing | Automatic | Manual configuration |
| Metadata | Windows.Media.Control | bluetoothctl info |
| Controls | AVRCP via WinRT | bluetoothctl player.* |

### Development vs Production

Since you're testing on Windows but deploying on Linux:

- ✅ Windows implementation uses PowerShell (no compilation)
- ✅ Linux implementation uses bluetoothctl (no compilation)
- ✅ Both are automatically selected based on platform
- ✅ Same API interface for both platforms
- ✅ No code changes needed when switching platforms

The `bluetooth-audio-service.js` automatically detects the platform:

```javascript
if (process.platform === 'win32') {
  // Load Windows implementation
  require('./bluetooth-audio-windows')
} else if (process.platform === 'linux') {
  // Load Linux implementation
  // (inline in bluetooth-audio-service.js)
}
```

## Performance

### Expected Performance on Windows

- **Command latency**: 50-100ms
- **Metadata updates**: Every 2 seconds
- **Audio latency**: 100-300ms (Bluetooth standard)
- **UI responsiveness**: Immediate (optimistic updates)

### Why PowerShell?

PowerShell execution adds some latency (~50-100ms per command), but:
- ✅ No compilation needed
- ✅ No native dependencies
- ✅ Works on all Windows 10/11 systems
- ✅ Latency is acceptable for media controls
- ✅ Much simpler than native C++ modules

For production systems where performance is critical, you could upgrade to native C++ addons (see `WINDOWS_BLUETOOTH_SETUP.md` for details).

## Advanced: Debugging

### View PowerShell Commands

To see what PowerShell commands are being executed, add debug logging:

```javascript
// In src/services/bluetooth-audio-windows.js
const { stdout } = await execAsync(command);
console.log('[DEBUG] PowerShell output:', stdout);
```

### Test PowerShell Directly

Test Windows Media Control APIs directly in PowerShell:

```powershell
# Get current media session
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 })[0]
$sessionManager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$sessionManagerTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]).Invoke($null, @($sessionManager))
$sessionManagerTask.Wait()
$manager = $sessionManagerTask.Result
$session = $manager.GetCurrentSession()

# Get track info
$mediaProperties = $session.TryGetMediaPropertiesAsync()
$propertiesTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]).Invoke($null, @($mediaProperties))
$propertiesTask.Wait()
$properties = $propertiesTask.Result

# Display
Write-Host "Title: $($properties.Title)"
Write-Host "Artist: $($properties.Artist)"

# Send command
$session.TryPauseAsync()
```

## Production Deployment

When deploying to Linux production:

1. The Windows code won't be loaded (automatic platform detection)
2. Linux implementation will be used instead
3. Follow the Linux setup guide: `BLUETOOTH_AUDIO_SETUP.md`
4. Run the Linux setup script: `./setup-bluetooth-audio.sh`

No code changes needed - it just works!

## Next Steps

1. ✅ Test basic functionality on Windows
2. ✅ Verify all controls work (play, pause, next, previous)
3. ✅ Test with different music apps
4. ✅ Deploy to Linux for production testing
5. ✅ Compare Windows vs Linux behavior

---

**Happy Testing! 🎵**

If you encounter issues, check:
1. This guide's troubleshooting section
2. `WINDOWS_BLUETOOTH_SETUP.md` for detailed Windows info
3. `BLUETOOTH_AUDIO_SETUP.md` for Linux deployment
4. Backend console logs for error messages
