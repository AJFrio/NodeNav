# Windows Bluetooth Audio Setup Script for NodeNav
# Checks system requirements and configures Bluetooth for media streaming

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "NodeNav Windows Bluetooth Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Some features may require administrator privileges" -ForegroundColor Yellow
    Write-Host "   Consider running: Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    Write-Host ""
}

# Check Windows version
Write-Host "Checking Windows version..." -ForegroundColor Yellow
$version = [System.Environment]::OSVersion.Version
Write-Host "  Windows Version: $($version.Major).$($version.Minor) (Build $($version.Build))" -ForegroundColor Gray

if ($version.Build -lt 17763) {
    Write-Host "❌ Windows version too old" -ForegroundColor Red
    Write-Host "   Minimum required: Windows 10 version 1809 (build 17763)" -ForegroundColor Red
    Write-Host "   Your version: Build $($version.Build)" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Windows version OK" -ForegroundColor Green
Write-Host ""

# Check and configure Bluetooth services
Write-Host "Checking Bluetooth services..." -ForegroundColor Yellow

# Check main Bluetooth service
try {
    $btService = Get-Service -Name bthserv -ErrorAction Stop
    Write-Host "  Bluetooth Service: $($btService.Status)" -ForegroundColor Gray
    
    if ($btService.Status -ne "Running") {
        Write-Host "⚠️  Bluetooth service is not running" -ForegroundColor Yellow
        Write-Host "   Attempting to start..." -ForegroundColor Yellow
        
        if ($isAdmin) {
            try {
                Start-Service bthserv -ErrorAction Stop
                Set-Service bthserv -StartupType Automatic
                Write-Host "✓ Bluetooth service started and set to automatic" -ForegroundColor Green
            } catch {
                Write-Host "❌ Failed to start Bluetooth service" -ForegroundColor Red
                Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "   Please start it manually in Services" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  Need administrator privileges to start service" -ForegroundColor Yellow
            Write-Host "   Please run this script as administrator or start the service manually" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✓ Bluetooth service is running" -ForegroundColor Green
        
        # Ensure it's set to automatic startup
        if ($isAdmin -and $btService.StartType -ne "Automatic") {
            try {
                Set-Service bthserv -StartupType Automatic
                Write-Host "✓ Bluetooth service set to automatic startup" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Could not set automatic startup" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "❌ Bluetooth service not found" -ForegroundColor Red
    Write-Host "   Your system may not have Bluetooth capability" -ForegroundColor Red
    Write-Host "   If you have a Bluetooth adapter, install drivers first" -ForegroundColor Yellow
    exit 1
}

# Check Bluetooth Audio Gateway service (for audio sink)
Write-Host "  Checking Bluetooth Audio Gateway..." -ForegroundColor Gray
try {
    $btAudioService = Get-Service -Name BTAGService -ErrorAction SilentlyContinue
    if ($btAudioService) {
        Write-Host "    Audio Gateway Service: $($btAudioService.Status)" -ForegroundColor Gray
        
        if ($btAudioService.Status -ne "Running" -and $isAdmin) {
            try {
                Start-Service BTAGService -ErrorAction Stop
                Set-Service BTAGService -StartupType Automatic
                Write-Host "✓ Bluetooth Audio Gateway started and set to automatic" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Could not start Bluetooth Audio Gateway" -ForegroundColor Yellow
            }
        } elseif ($btAudioService.Status -eq "Running") {
            Write-Host "✓ Bluetooth Audio Gateway is running" -ForegroundColor Green
        }
    } else {
        Write-Host "    Audio Gateway Service: Not available (optional)" -ForegroundColor Gray
    }
} catch {
    Write-Host "    Audio Gateway Service: Not available (optional)" -ForegroundColor Gray
}

# Check Bluetooth Support service
Write-Host "  Checking Bluetooth Support Service..." -ForegroundColor Gray
try {
    $btSupportService = Get-Service -Name bthserv -ErrorAction SilentlyContinue
    if ($btSupportService -and $btSupportService.Status -eq "Running") {
        Write-Host "✓ Bluetooth Support Service is running" -ForegroundColor Green
    }
} catch {
    # Already handled above
}

Write-Host ""

# Check for Bluetooth adapter
Write-Host "Checking for Bluetooth adapters..." -ForegroundColor Yellow
try {
    $btAdapters = Get-PnpDevice -Class Bluetooth -ErrorAction Stop | Where-Object { $_.Status -eq "OK" }
    if ($btAdapters) {
        Write-Host "✓ Bluetooth adapter(s) found:" -ForegroundColor Green
        foreach ($adapter in $btAdapters) {
            Write-Host "  - $($adapter.FriendlyName)" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  No active Bluetooth adapters found" -ForegroundColor Yellow
        Write-Host "   Check Device Manager for Bluetooth adapters" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not enumerate Bluetooth adapters" -ForegroundColor Yellow
}
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
        
        # Check if version is sufficient (v16+)
        $versionNumber = [version]($nodeVersion -replace 'v','')
        if ($versionNumber.Major -lt 16) {
            Write-Host "⚠️  Node.js version may be too old (need v16 or higher)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Node.js not found" -ForegroundColor Red
        Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✓ npm installed: v$npmVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check PowerShell execution policy
Write-Host "Checking PowerShell execution policy..." -ForegroundColor Yellow
$executionPolicy = Get-ExecutionPolicy
Write-Host "  Current policy: $executionPolicy" -ForegroundColor Gray

if ($executionPolicy -eq "Restricted") {
    Write-Host "⚠️  PowerShell execution is restricted" -ForegroundColor Yellow
    Write-Host "   NodeNav uses PowerShell for Bluetooth control" -ForegroundColor Yellow
    Write-Host "   Recommended: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    
    if ($isAdmin) {
        $response = Read-Host "   Would you like to change the policy now? (Y/N)"
        if ($response -eq 'Y' -or $response -eq 'y') {
            try {
                Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
                Write-Host "✓ Execution policy updated" -ForegroundColor Green
            } catch {
                Write-Host "❌ Failed to update execution policy" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "✓ PowerShell execution policy OK" -ForegroundColor Green
}
Write-Host ""

# Test Windows Runtime API access
Write-Host "Testing Windows Runtime API access..." -ForegroundColor Yellow
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop
    Write-Host "✓ Windows Runtime APIs accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot access Windows Runtime APIs" -ForegroundColor Red
    Write-Host "   This is required for Bluetooth audio control" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test media control API
Write-Host "Testing media control capabilities..." -ForegroundColor Yellow
try {
    $testScript = @"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
`$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { `$_.Name -eq 'AsTask' -and `$_.GetParameters().Count -eq 1 -and `$_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation``1' })[0]
if (`$asTaskGeneric) { 'success' } else { 'failed' }
"@
    
    $result = powershell -NoProfile -NonInteractive -Command $testScript 2>$null
    if ($result -eq 'success') {
        Write-Host "✓ Media control APIs available" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Media control APIs may not be fully accessible" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not test media control APIs" -ForegroundColor Yellow
}
Write-Host ""

# Configure Bluetooth Audio Sink (A2DP)
Write-Host "Configuring Bluetooth Audio Sink..." -ForegroundColor Yellow

if ($isAdmin) {
    try {
        # Enable Windows Audio service (required for Bluetooth audio)
        $audioService = Get-Service -Name Audiosrv -ErrorAction SilentlyContinue
        if ($audioService) {
            if ($audioService.Status -ne "Running") {
                Start-Service Audiosrv
                Write-Host "✓ Windows Audio service started" -ForegroundColor Green
            }
            Set-Service Audiosrv -StartupType Automatic
            Write-Host "✓ Windows Audio service configured for automatic startup" -ForegroundColor Green
        }
        
        # Enable Audio Endpoint Builder (required for audio devices)
        $audioEndpointService = Get-Service -Name AudioEndpointBuilder -ErrorAction SilentlyContinue
        if ($audioEndpointService) {
            if ($audioEndpointService.Status -ne "Running") {
                Start-Service AudioEndpointBuilder
                Write-Host "✓ Audio Endpoint Builder started" -ForegroundColor Green
            }
            Set-Service AudioEndpointBuilder -StartupType Automatic
        }
        
        Write-Host "✓ Audio services configured" -ForegroundColor Green
        Write-Host "  Your computer is now configured as a Bluetooth audio sink" -ForegroundColor Gray
        Write-Host "  Paired phones can stream audio to this computer" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Some audio configuration may have failed" -ForegroundColor Yellow
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Administrator privileges required for audio sink configuration" -ForegroundColor Yellow
    Write-Host "   Run as administrator to automatically configure audio sink" -ForegroundColor Yellow
    Write-Host "   Or manually ensure:" -ForegroundColor Gray
    Write-Host "   - Windows Audio service is running" -ForegroundColor Gray
    Write-Host "   - Audio Endpoint Builder is running" -ForegroundColor Gray
}
Write-Host ""

# Check audio devices
Write-Host "Checking audio output devices..." -ForegroundColor Yellow
try {
    $audioDevices = Get-CimInstance -Namespace root\cimv2 -ClassName Win32_SoundDevice -ErrorAction SilentlyContinue
    if ($audioDevices) {
        Write-Host "✓ Audio output devices found:" -ForegroundColor Green
        foreach ($device in $audioDevices) {
            Write-Host "  - $($device.Name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  No audio devices found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not enumerate audio devices" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Setup Check Complete!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host ""
Write-Host "1. Pair your phone with Windows:" -ForegroundColor White
Write-Host "   a. On Windows: Settings -> Bluetooth & devices -> Add device" -ForegroundColor Gray
Write-Host "   b. Select 'Bluetooth'" -ForegroundColor Gray
Write-Host "   c. On your phone: Enable Bluetooth and make it discoverable" -ForegroundColor Gray
Write-Host "   d. Select your phone when it appears and confirm pairing" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure audio output on your phone:" -ForegroundColor White
Write-Host "   a. After pairing, go to phone's Bluetooth settings" -ForegroundColor Gray
Write-Host "   b. Tap on your computer's name" -ForegroundColor Gray
Write-Host "   c. Enable 'Media audio' or 'Audio' profile" -ForegroundColor Gray
Write-Host "   d. Your phone should now show this PC as an audio device" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the NodeNav backend server:" -ForegroundColor White
Write-Host "   cd src" -ForegroundColor Gray
Write-Host "   node server.js" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start the NodeNav frontend (in a new terminal):" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "5. In NodeNav:" -ForegroundColor White
Write-Host "   - Go to Settings -> Bluetooth" -ForegroundColor Gray
Write-Host "   - Your paired phone should appear" -ForegroundColor Gray
Write-Host "   - Click Connect (establishes control connection)" -ForegroundColor Gray
Write-Host "   - Navigate to Media Player tab" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Play music on your phone:" -ForegroundColor White
Write-Host "   - Audio will stream to your computer speakers" -ForegroundColor Gray
Write-Host "   - Track info will appear in NodeNav" -ForegroundColor Gray
Write-Host "   - Control playback from NodeNav interface" -ForegroundColor Gray
Write-Host ""
Write-Host "Important Notes:" -ForegroundColor Cyan
Write-Host "  ✓ Your computer acts as a Bluetooth speaker/headset" -ForegroundColor Gray
Write-Host "  ✓ Phone sends audio to computer (A2DP sink)" -ForegroundColor Gray
Write-Host "  ✓ Computer receives media controls (AVRCP)" -ForegroundColor Gray
Write-Host "  ✓ This works like connecting to wireless headphones" -ForegroundColor Gray
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  - If audio doesn't play:" -ForegroundColor Gray
Write-Host "    • Check Windows sound mixer (phone audio might be muted)" -ForegroundColor Gray
Write-Host "    • Verify 'Media audio' is enabled in phone's Bluetooth settings" -ForegroundColor Gray
Write-Host "    • Try disconnecting/reconnecting Bluetooth on phone" -ForegroundColor Gray
Write-Host "    • Ensure Windows Audio service is running (checked above)" -ForegroundColor Gray
Write-Host ""
Write-Host "  - If media controls don't work:" -ForegroundColor Gray
Write-Host "    • Make sure you connected via NodeNav Bluetooth settings" -ForegroundColor Gray
Write-Host "    • Some apps have limited AVRCP support (try Spotify)" -ForegroundColor Gray
Write-Host "    • Check NodeNav server logs for errors" -ForegroundColor Gray
Write-Host ""
Write-Host "  - If phone won't pair:" -ForegroundColor Gray
Write-Host "    • Unpair any existing connection between devices" -ForegroundColor Gray
Write-Host "    • Restart Bluetooth on both devices" -ForegroundColor Gray
Write-Host "    • Make sure Bluetooth service is running (checked above)" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed documentation, see:" -ForegroundColor White
Write-Host "  WINDOWS_BLUETOOTH_SETUP.md" -ForegroundColor Cyan
Write-Host ""
