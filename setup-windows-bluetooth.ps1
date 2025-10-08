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

# Check Bluetooth service
Write-Host "Checking Bluetooth service..." -ForegroundColor Yellow
try {
    $btService = Get-Service -Name bthserv -ErrorAction Stop
    Write-Host "  Bluetooth Service: $($btService.Status)" -ForegroundColor Gray
    
    if ($btService.Status -ne "Running") {
        Write-Host "⚠️  Bluetooth service is not running" -ForegroundColor Yellow
        Write-Host "   Attempting to start..." -ForegroundColor Yellow
        
        if ($isAdmin) {
            try {
                Start-Service bthserv -ErrorAction Stop
                Write-Host "✓ Bluetooth service started" -ForegroundColor Green
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
    }
} catch {
    Write-Host "❌ Bluetooth service not found" -ForegroundColor Red
    Write-Host "   Your system may not have Bluetooth capability" -ForegroundColor Red
    Write-Host "   If you have a Bluetooth adapter, install drivers first" -ForegroundColor Yellow
    exit 1
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

# Summary
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Setup Check Complete!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Pair your phone with Windows:" -ForegroundColor White
Write-Host "   Settings -> Bluetooth & devices -> Add device" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start the NodeNav backend server:" -ForegroundColor White
Write-Host "   cd src" -ForegroundColor Gray
Write-Host "   node server.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the NodeNav frontend:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. In NodeNav:" -ForegroundColor White
Write-Host "   - Go to Settings -> Bluetooth" -ForegroundColor Gray
Write-Host "   - Your paired phone should appear" -ForegroundColor Gray
Write-Host "   - Click Connect" -ForegroundColor Gray
Write-Host "   - Navigate to Media Player tab" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Play music on your phone" -ForegroundColor White
Write-Host "   - Audio will stream to your computer" -ForegroundColor Gray
Write-Host "   - Track info will appear in NodeNav" -ForegroundColor Gray
Write-Host "   - Control playback from NodeNav" -ForegroundColor Gray
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  - If audio doesn't play, check Windows sound settings" -ForegroundColor Gray
Write-Host "  - Make sure phone is set to stream audio over Bluetooth" -ForegroundColor Gray
Write-Host "  - Some apps (like YouTube) have limited Bluetooth support" -ForegroundColor Gray
Write-Host "  - Try dedicated music apps (Spotify, Apple Music, etc.)" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed documentation, see:" -ForegroundColor White
Write-Host "  WINDOWS_BLUETOOTH_SETUP.md" -ForegroundColor Cyan
Write-Host ""
