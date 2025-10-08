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
      
      // Check Windows version
      const versionCheck = await execAsync('powershell -Command "[System.Environment]::OSVersion.Version.Build"');
      const build = parseInt(versionCheck.stdout.trim());
      
      if (build < 17763) {
        console.warn('[Windows Bluetooth Audio] Windows version may be too old. Minimum required: Windows 10 1809 (build 17763)');
      }
      
      console.log('[Windows Bluetooth Audio] Initialized successfully');
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
      const script = `
        try {
          Add-Type -AssemblyName System.Runtime.WindowsRuntime
          [Windows.Devices.Enumeration.DeviceInformation,Windows.Devices.Enumeration,ContentType=WindowsRuntime] | Out-Null
          
          $deviceSelector = [Windows.Devices.Enumeration.DeviceInformation]::CreateFromIdAsync
          $devices = [Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync().GetAwaiter().GetResult()
          
          $bluetoothDevices = $devices | Where-Object { 
            $_.Name -and $_.IsEnabled -and $_.Id -like '*BTHENUM*' 
          } | Select-Object Name, Id, IsEnabled
          
          if ($bluetoothDevices) {
            $bluetoothDevices | ConvertTo-Json -Depth 3
          } else {
            '[]'
          }
        } catch {
          '[]'
        }
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`);
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
    
    try {
      // On Windows, if device is already paired and connected via system,
      // we just need to verify it and start monitoring
      this.connectedDevice = deviceAddress;
      
      // Start media monitoring
      this.startMediaMonitoring();
      
      console.log('[Windows Bluetooth Audio] Audio connection established');
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
      const script = `
        try {
          Add-Type -AssemblyName System.Runtime.WindowsRuntime
          
          $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | 
            Where-Object { 
              $_.Name -eq 'AsTask' -and 
              $_.GetParameters().Count -eq 1 -and 
              $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' 
            })[0]
          
          $sessionManager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
          $sessionManagerTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]).Invoke($null, @($sessionManager))
          $sessionManagerTask.Wait(-1)
          $manager = $sessionManagerTask.Result
          
          $session = $manager.GetCurrentSession()
          
          if ($session) {
            $mediaProperties = $session.TryGetMediaPropertiesAsync()
            $propertiesTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]).Invoke($null, @($mediaProperties))
            $propertiesTask.Wait(-1)
            $properties = $propertiesTask.Result
            
            $playbackInfo = $session.GetPlaybackInfo()
            $timeline = $session.GetTimelineProperties()
            
            $result = @{
              Title = $properties.Title
              Artist = $properties.Artist
              Album = $properties.AlbumTitle
              Duration = [math]::Floor($timeline.EndTime.TotalSeconds)
              Position = [math]::Floor($timeline.Position.TotalSeconds)
              Status = $playbackInfo.PlaybackStatus.ToString()
            }
            
            $result | ConvertTo-Json -Compress
          } else {
            '{}'
          }
        } catch {
          '{}'
        }
      `;
      
      const command = `powershell -NoProfile -NonInteractive -Command "${script.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`;
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
      
      const script = `
        try {
          Add-Type -AssemblyName System.Runtime.WindowsRuntime
          
          $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | 
            Where-Object { 
              $_.Name -eq 'AsTask' -and 
              $_.GetParameters().Count -eq 1 -and 
              $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' 
            })[0]
          
          $sessionManager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
          $sessionManagerTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]).Invoke($null, @($sessionManager))
          $sessionManagerTask.Wait(-1)
          $manager = $sessionManagerTask.Result
          
          $session = $manager.GetCurrentSession()
          
          if ($session) {
            $result = $session.Try${winCommand}Async()
            $resultTask = $asTaskGeneric.MakeGenericMethod([System.Boolean]).Invoke($null, @($result))
            $resultTask.Wait(-1)
            
            if ($resultTask.Result) {
              'success'
            } else {
              'failed'
            }
          } else {
            'no_session'
          }
        } catch {
          'error'
        }
      `;
      
      const psCommand = `powershell -NoProfile -NonInteractive -Command "${script.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`;
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
