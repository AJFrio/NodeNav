#!/bin/bash

###############################################################################
# NodeNav GPS Setup Script
# 
# This script installs the required dependencies for GPS Bluetooth streaming
# on Linux systems.
#
# Usage: chmod +x setup-gps.sh && ./setup-gps.sh
###############################################################################

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  NodeNav GPS Bluetooth Streaming - Setup Script"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script is designed for Linux systems only."
    echo "   You appear to be running on: $OSTYPE"
    echo ""
    echo "   For development on Windows/Mac, testing must be done on:"
    echo "   - Raspberry Pi"
    echo "   - Linux PC"
    echo "   - WSL2 (Windows Subsystem for Linux)"
    echo ""
    exit 1
fi

echo "✓ Running on Linux"
echo ""

# Check if running as root (not recommended)
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  Warning: Running as root"
   echo "   It's recommended to run this script as a regular user."
   echo "   The script will use 'sudo' when needed."
   echo ""
   read -p "Continue anyway? (y/n) " -n 1 -r
   echo ""
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
       exit 1
   fi
fi

# Update package lists
echo "📦 Updating package lists..."
sudo apt-get update -qq

# Install Python 3
echo ""
echo "🐍 Checking Python 3..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo "   ✓ Python 3 already installed (version $PYTHON_VERSION)"
else
    echo "   Installing Python 3..."
    sudo apt-get install -y python3
    echo "   ✓ Python 3 installed"
fi

# Install python3-bluez
echo ""
echo "📡 Checking Python Bluetooth library..."
if python3 -c "import bluetooth" &> /dev/null; then
    echo "   ✓ python3-bluez already installed"
else
    echo "   Installing python3-bluez..."
    sudo apt-get install -y python3-bluez
    echo "   ✓ python3-bluez installed"
fi

# Check if BlueZ is installed
echo ""
echo "📻 Checking BlueZ (Bluetooth stack)..."
if command -v bluetoothctl &> /dev/null; then
    BLUEZ_VERSION=$(bluetoothctl --version 2>&1 | head -n1)
    echo "   ✓ BlueZ already installed ($BLUEZ_VERSION)"
else
    echo "   Installing BlueZ..."
    sudo apt-get install -y bluez
    echo "   ✓ BlueZ installed"
fi

# Check Bluetooth permissions
echo ""
echo "🔐 Checking Bluetooth permissions..."
if groups | grep -q bluetooth; then
    echo "   ✓ User '$USER' is in the 'bluetooth' group"
else
    echo "   Adding user '$USER' to 'bluetooth' group..."
    sudo usermod -a -G bluetooth "$USER"
    echo "   ✓ User added to bluetooth group"
    echo ""
    echo "   ⚠️  IMPORTANT: You need to log out and back in for group changes to take effect!"
    NEED_LOGOUT=1
fi

# Verify Bluetooth service is running
echo ""
echo "🔧 Checking Bluetooth service..."
if systemctl is-active --quiet bluetooth; then
    echo "   ✓ Bluetooth service is running"
else
    echo "   Starting Bluetooth service..."
    sudo systemctl start bluetooth
    sudo systemctl enable bluetooth
    echo "   ✓ Bluetooth service started and enabled"
fi

# Test Python bluetooth module
echo ""
echo "🧪 Testing Python bluetooth module..."
if python3 -c "import bluetooth; print('Import successful')" &> /dev/null; then
    echo "   ✓ Python bluetooth module works correctly"
else
    echo "   ❌ Python bluetooth module test failed"
    echo "   This might resolve after logging out and back in."
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✓ Setup Complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Installed components:"
echo "  • Python 3"
echo "  • python3-bluez (Bluetooth library)"
echo "  • BlueZ (Bluetooth stack)"
echo ""

if [[ -n "$NEED_LOGOUT" ]]; then
    echo "⚠️  NEXT STEP: Log out and log back in for permissions to take effect"
    echo ""
fi

echo "To test GPS streaming:"
echo "  1. Pair your Android device via Bluetooth"
echo "  2. Start the NodeNav GPS app on Android"
echo "  3. Start NodeNav server: npm start"
echo "  4. Open Navigation page in browser"
echo ""
echo "For manual testing:"
echo "  • Check Bluetooth: bluetoothctl"
echo "  • Test Python: python3 -c 'import bluetooth; print(\"OK\")'"
echo ""
echo "See GPS_QUICK_START.md for more information."
echo ""

