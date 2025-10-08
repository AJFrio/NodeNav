#!/bin/bash
# Bluetooth Audio Setup Script for NodeNav
# This script sets up the system for Bluetooth audio streaming on Linux

set -e

echo "==================================="
echo "NodeNav Bluetooth Audio Setup"
echo "==================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Please don't run this script as root"
   echo "Run: ./setup-bluetooth-audio.sh"
   exit 1
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    echo "✓ Detected OS: $PRETTY_NAME"
else
    echo "❌ Could not detect Linux distribution"
    exit 1
fi

# Check for required commands
echo ""
echo "Checking system requirements..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check bluetoothctl
if command_exists bluetoothctl; then
    echo "✓ bluetoothctl is installed"
else
    echo "❌ bluetoothctl not found"
    echo "Installing BlueZ..."
    
    case $OS in
        ubuntu|debian|linuxmint|pop)
            sudo apt-get update
            sudo apt-get install -y bluez bluez-tools
            ;;
        fedora|rhel|centos)
            sudo dnf install -y bluez bluez-tools
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm bluez bluez-utils
            ;;
        *)
            echo "Please install bluez manually for your distribution"
            exit 1
            ;;
    esac
fi

# Check for audio system
echo ""
echo "Checking audio system..."

if command_exists pactl; then
    echo "✓ PulseAudio detected"
    AUDIO_SYSTEM="pulseaudio"
    
    # Check for Bluetooth module
    if pactl list modules short | grep -q module-bluetooth; then
        echo "✓ PulseAudio Bluetooth module is loaded"
    else
        echo "Installing PulseAudio Bluetooth support..."
        case $OS in
            ubuntu|debian|linuxmint|pop)
                sudo apt-get install -y pulseaudio-module-bluetooth
                ;;
            fedora|rhel|centos)
                sudo dnf install -y pulseaudio-module-bluetooth
                ;;
            arch|manjaro)
                sudo pacman -S --noconfirm pulseaudio-bluetooth
                ;;
        esac
    fi
elif command_exists pipewire; then
    echo "✓ PipeWire detected"
    AUDIO_SYSTEM="pipewire"
else
    echo "❌ No audio system detected (need PulseAudio or PipeWire)"
    exit 1
fi

# Add user to bluetooth group
echo ""
echo "Configuring permissions..."

if groups | grep -q bluetooth; then
    echo "✓ User already in bluetooth group"
else
    echo "Adding user to bluetooth group..."
    sudo usermod -a -G bluetooth $USER
    echo "⚠️  You will need to log out and back in for group changes to take effect"
fi

# Enable Bluetooth service
echo ""
echo "Enabling Bluetooth service..."
sudo systemctl enable bluetooth
sudo systemctl start bluetooth
echo "✓ Bluetooth service enabled and started"

# Configure Bluetooth
echo ""
echo "Configuring Bluetooth..."

# Backup original config
if [ -f /etc/bluetooth/main.conf ]; then
    sudo cp /etc/bluetooth/main.conf /etc/bluetooth/main.conf.backup.$(date +%Y%m%d)
fi

# Add recommended settings
echo "Setting recommended Bluetooth options..."
sudo bash -c 'cat >> /etc/bluetooth/main.conf << EOF

# NodeNav Bluetooth Audio Settings
[General]
ControllerMode = dual
FastConnectable = true
Privacy = device
EOF'

echo "✓ Bluetooth configured"

# Restart Bluetooth
echo ""
echo "Restarting Bluetooth service..."
sudo systemctl restart bluetooth

# Configure audio
echo ""
echo "Configuring audio system..."

if [ "$AUDIO_SYSTEM" = "pulseaudio" ]; then
    # Create PulseAudio config directory if it doesn't exist
    mkdir -p ~/.config/pulse
    
    # Backup existing config
    if [ -f ~/.config/pulse/default.pa ]; then
        cp ~/.config/pulse/default.pa ~/.config/pulse/default.pa.backup.$(date +%Y%m%d)
    fi
    
    # Add Bluetooth configuration
    cat > ~/.config/pulse/default.pa << 'EOF'
# Include default PulseAudio configuration
.include /etc/pulse/default.pa

# Bluetooth modules
.ifexists module-bluetooth-discover.so
load-module module-bluetooth-discover
.endif

.ifexists module-bluetooth-policy.so
load-module module-bluetooth-policy auto_switch=2
.endif

# Auto-switch to Bluetooth when connected
.ifexists module-switch-on-connect.so
load-module module-switch-on-connect
.endif
EOF
    
    echo "✓ PulseAudio configured"
    
    # Restart PulseAudio
    echo "Restarting PulseAudio..."
    pulseaudio --kill 2>/dev/null || true
    sleep 1
    pulseaudio --start
fi

# Check Node.js
echo ""
echo "Checking Node.js installation..."

if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found"
    echo "Please install Node.js (v16 or higher) to run the server"
fi

# Summary
echo ""
echo "==================================="
echo "Setup Complete! 🎉"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. If you were added to bluetooth group, log out and back in"
echo "2. Start the NodeNav backend server:"
echo "   cd src && node server.js"
echo "3. Start the NodeNav frontend:"
echo "   npm run dev"
echo "4. Pair your phone:"
echo "   - Go to Settings → Bluetooth in NodeNav"
echo "   - Click 'Start Scanning'"
echo "   - Select your phone and click 'Pair' then 'Connect'"
echo "5. Open the Media Player tab"
echo "6. Play music on your phone - it should stream to your computer!"
echo ""
echo "For troubleshooting, see: BLUETOOTH_AUDIO_SETUP.md"
echo ""
