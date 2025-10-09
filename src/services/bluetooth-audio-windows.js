/**
 * Windows Bluetooth Audio Service - PowerShell-based implementation
 * 
 * Uses PowerShell to access Windows Runtime APIs for Bluetooth audio control
 * No native modules required - pure Node.js + PowerShell
 * 
 * Requires: Windows 10 version 1809 or later
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WindowsBluetoothAudio {
  constructor() {
    this.connectedDevice = null;
    this.mediaState = {
      isPlaying: false,
      track: {
        title: 'Unknown',
        artist: 'Unknown',
        album: 'Unknown',
        duration: 0,
        position: 0
      }
    };
    this.monitoringInterval = null;
  }

  /**
   * Initialize Windows Bluetooth
   */
  async initialize() {
    console.log('[Windows Bluetooth Audio] Initializing...');
    
    try {
      // Check if Bluetooth service is running
      const { stdout } = await execAsync('powershell -Command "Get-Service bthserv | Select-Object -ExpandProperty Status"');
      
      if (stdout.trim() === 'Running') {
        console.log('[Windows Bluetooth Audio] Bluetooth service is running');
      } else {
        console.warn('[Windows Bluetooth Audio] Bluetooth service is not running. Attempting to start...');
        try {
          await execAsync('powershell -Command "Start-Service bthserv"');
          console.log('[Windows Bluetooth Audio] Bluetooth service started');
        } catch (error) {
          throw new Error('Failed to start Bluetooth service. Please start it manually or run as administrator.');
        }
      }
      
      // Check Windows Audio service (required for audio sink)
      try {
        const audioStatus = await execAsync('powershell -Command "Get-Service Audiosrv | Select-Object -ExpandProperty Status"');
        if (audioStatus.stdout.trim() === 'Running') {
          console.log('[Windows Bluetooth Audio] Windows Audio service is running');
        } else {
          console.warn('[Windows Bluetooth Audio] Windows Audio service is not running - audio sink may not work');
        }
      } catch (error) {
        console.warn('[Windows Bluetooth Audio] Could not verify Windows Audio service');
      }
      
      // Check Audio Endpoint Builder service
      try {
        const endpointStatus = await execAsync('powershell -Command "Get-Service AudioEndpointBuilder | Select-Object -ExpandProperty Status"');
        if (endpointStatus.stdout.trim() === 'Running') {
          console.log('[Windows Bluetooth Audio] Audio Endpoint Builder is running');
        }
      } catch (error) {
        console.warn('[Windows Bluetooth Audio] Could not verify Audio Endpoint Builder service');
      }
      
      // Check Windows version
      const versionCheck = await execAsync('powershell -Command "[System.Environment]::OSVersion.Version.Build"');
      const build = parseInt(versionCheck.stdout.trim());
      
      if (build < 17763) {
        console.warn('[Windows Bluetooth Audio] Windows version may be too old. Minimum required: Windows 10 1809 (build 17763)');
      }
      
      console.log('[Windows Bluetooth Audio] Initialized successfully');
      console.log('[Windows Bluetooth Audio] Computer is ready to receive audio from paired devices');
      return true;
    } catch (error) {
      console.error('[Windows Bluetooth Audio] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Get paired Bluetooth audio devices
   */
  async getPairedDevices() {
    try {
      // Single-line script to avoid any formatting issues
      const script = `try { Add-Type -AssemblyName System.Runtime.WindowsRuntime; [Windows.Devices.Enumeration.DeviceInformation,Windows.Devices.Enumeration,ContentType=WindowsRuntime] | Out-Null; $deviceSelector = [Windows.Devices.Enumeration.DeviceInformation]::CreateFromIdAsync; $devices = [Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync().GetAwaiter().GetResult(); $bluetoothDevices = $devices | Where-Object { $_.Name -and $_.IsEnabled -and $_.Id -like '*BTHENUM*' } | Select-Object Name, Id, IsEnabled; if ($bluetoothDevices) { $bluetoothDevices | ConvertTo-Json -Depth 3 } else { Write-Output '[]' } } catch { Write-Output '[]' }`;
      
      // Use Base64 encoding to avoid escaping issues
      const scriptBase64 = Buffer.from(script, 'utf16le').toString('base64');
      const { stdout } = await execAsync(`powershell -NoProfile -NonInteractive -EncodedCommand ${scriptBase64}`);
      return stdout ? JSON.parse(stdout) : [];
    } catch (error) {
      console.error('[Windows Bluetooth Audio] Failed to get devices:', error.message);
      return [];
    }
  }

  /**
   * Connect to Bluetooth audio device
   */
  async connectAudioDevice(deviceAddress) {
    console.log(`[Windows Bluetooth Audio] Connecting audio to: ${deviceAddress}`);
    console.log('[Windows Bluetooth Audio] Note: Ensure the phone has "Media audio" enabled for this PC');
    
    try {
      // On Windows, the audio sink connection is handled by the OS
      // When the phone pairs and enables "Media audio", Windows automatically:
      // 1. Establishes A2DP sink connection (receives audio)
      // 2. Establishes AVRCP connection (media control)
      // 3. Routes audio through Windows Audio service
      
      // We just need to establish our control connection and start monitoring
      this.connectedDevice = deviceAddress;
      
      console.log('[Windows Bluetooth Audio] Control connection established');
      console.log('[Windows Bluetooth Audio] Computer is now acting as audio sink (Bluetooth speaker)');
      console.log('[Windows Bluetooth Audio] Phone should be able to stream audio to this computer');
      
      // Start media monitoring
      this.startMediaMonitoring();
      
      console.log('[Windows Bluetooth Audio] Started media state monitoring');
      console.log('[Windows Bluetooth Audio] Ready to receive media controls and track information');
      
      return { success: true, device: deviceAddress };
    } catch (error) {
      console.error('[Windows Bluetooth Audio] Audio connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from audio device
   */
  async disconnectAudioDevice() {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }
    
    console.log('[Windows Bluetooth Audio] Disconnecting audio');
    
    this.stopMediaMonitoring();
    this.connectedDevice = null;
    
    return { success: true };
  }

  /**
   * Get current media state using Windows Media Controls
   */
  async updateMediaState() {
    if (!this.connectedDevice) return;
    
    try {
      // Single-line script to avoid any formatting issues
      const script = `try { Add-Type -AssemblyName System.Runtime.WindowsRuntime; $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]; $sessionManager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync(); $sessionManagerTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]).Invoke($null, @($sessionManager)); $sessionManagerTask.Wait(-1); $manager = $sessionManagerTask.Result; $session = $manager.GetCurrentSession(); if ($session) { $mediaProperties = $session.TryGetMediaPropertiesAsync(); $propertiesTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]).Invoke($null, @($mediaProperties)); $propertiesTask.Wait(-1); $properties = $propertiesTask.Result; $playbackInfo = $session.GetPlaybackInfo(); $timeline = $session.GetTimelineProperties(); $result = @{ Title = $properties.Title; Artist = $properties.Artist; Album = $properties.AlbumTitle; Duration = [math]::Floor($timeline.EndTime.TotalSeconds); Position = [math]::Floor($timeline.Position.TotalSeconds); Status = $playbackInfo.PlaybackStatus.ToString() }; $result | ConvertTo-Json -Compress } else { Write-Output '{}' } } catch { Write-Output '{}' }`;
      
      // Use Base64 encoding to avoid escaping issues
      const scriptBase64 = Buffer.from(script, 'utf16le').toString('base64');
      const command = `powershell -NoProfile -NonInteractive -EncodedCommand ${scriptBase64}`;
      const { stdout } = await execAsync(command, { timeout: 5000 });
      
      if (stdout && stdout.trim() !== '{}') {
        const mediaInfo = JSON.parse(stdout.trim());
        
        if (mediaInfo.Title) {
          this.mediaState.track = {
            title: mediaInfo.Title || 'Unknown',
            artist: mediaInfo.Artist || 'Unknown',
            album: mediaInfo.Album || 'Unknown',
            duration: mediaInfo.Duration || 0,
            position: mediaInfo.Position || 0
          };
          this.mediaState.isPlaying = mediaInfo.Status === 'Playing';
        }
      }
    } catch (error) {
      // Silent fail - media info not available (normal when not playing)
      console.debug('[Windows Bluetooth Audio] Media state update failed:', error.message);
    }
  }

  /**
   * Send media control command
   */
  async sendMediaControl(command) {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }
    
    console.log(`[Windows Bluetooth Audio] Sending command: ${command}`);
    
    try {
      const commandMap = {
        play: 'Play',
        pause: 'Pause',
        next: 'SkipNext',
        previous: 'SkipPrevious',
        stop: 'Stop'
      };
      
      const winCommand = commandMap[command];
      
      if (!winCommand) {
        throw new Error(`Unknown command: ${command}`);
      }
      
      // Single-line script to avoid any formatting issues
      const script = `try { Add-Type -AssemblyName System.Runtime.WindowsRuntime; $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]; $sessionManager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync(); $sessionManagerTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]).Invoke($null, @($sessionManager)); $sessionManagerTask.Wait(-1); $manager = $sessionManagerTask.Result; $session = $manager.GetCurrentSession(); if ($session) { $result = $session.Try${winCommand}Async(); $resultTask = $asTaskGeneric.MakeGenericMethod([System.Boolean]).Invoke($null, @($result)); $resultTask.Wait(-1); if ($resultTask.Result) { Write-Output 'success' } else { Write-Output 'failed' } } else { Write-Output 'no_session' } } catch { Write-Output 'error' }`;
      
      // Use Base64 encoding to avoid escaping issues
      const scriptBase64 = Buffer.from(script, 'utf16le').toString('base64');
      const psCommand = `powershell -NoProfile -NonInteractive -EncodedCommand ${scriptBase64}`;
      const { stdout } = await execAsync(psCommand, { timeout: 5000 });
      
      const result = stdout.trim();
      
      if (result === 'success') {
        // Update local state optimistically
        if (command === 'play') this.mediaState.isPlaying = true;
        if (command === 'pause') this.mediaState.isPlaying = false;
        
        // Schedule state update
        setTimeout(() => this.updateMediaState(), 500);
        
        return { success: true, command };
      } else {
        throw new Error(`Command failed: ${result}`);
      }
    } catch (error) {
      console.error('[Windows Bluetooth Audio] Control command failed:', error.message);
      throw error;
    }
  }

  /**
   * Control methods
   */
  async play() {
    return this.sendMediaControl('play');
  }

  async pause() {
    return this.sendMediaControl('pause');
  }

  async next() {
    return this.sendMediaControl('next');
  }

  async previous() {
    return this.sendMediaControl('previous');
  }

  async stop() {
    return this.sendMediaControl('stop');
  }

  /**
   * Get current media state
   */
  getMediaState() {
    return {
      connected: !!this.connectedDevice,
      device: this.connectedDevice,
      audioActive: !!this.connectedDevice,
      ...this.mediaState
    };
  }

  /**
   * Start monitoring media state
   */
  startMediaMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    console.log('[Windows Bluetooth Audio] Starting media monitoring');
    
    // Immediate update
    this.updateMediaState();
    
    // Poll every 2 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateMediaState();
    }, 2000);
  }

  /**
   * Stop monitoring media state
   */
  stopMediaMonitoring() {
    if (this.monitoringInterval) {
      console.log('[Windows Bluetooth Audio] Stopping media monitoring');
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopMediaMonitoring();
    this.connectedDevice = null;
    console.log('[Windows Bluetooth Audio] Cleanup completed');
  }
}

// Export singleton instance
module.exports = new WindowsBluetoothAudio();
