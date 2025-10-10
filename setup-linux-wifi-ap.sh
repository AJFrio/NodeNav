#!/bin/bash
#
# Setup Linux WiFi Access Point for NodeNav Lights
# 
# This script creates a WiFi AP using hostapd and dnsmasq
# SSID: NodeNav-Lights
# Password: NodeNavPassword
# IP: 192.168.4.1
#
# Prerequisites:
#   sudo apt-get install hostapd dnsmasq iptables
#

set -e

# Configuration
SSID="NodeNav-Lights"
PASSWORD="NodeNavPassword"
INTERFACE="wlan0"  # Change this if your wireless interface is different
IP_ADDRESS="192.168.4.1"
DHCP_RANGE_START="192.168.4.2"
DHCP_RANGE_END="192.168.4.20"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "Setting up NodeNav-Lights Access Point..."

# Stop services if running
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# Configure network interface
echo "Configuring network interface ${INTERFACE}..."
ip addr flush dev ${INTERFACE}
ip addr add ${IP_ADDRESS}/24 dev ${INTERFACE}
ip link set ${INTERFACE} up

# Create hostapd configuration
echo "Creating hostapd configuration..."
cat > /etc/hostapd/hostapd-nodenav.conf << EOF
interface=${INTERFACE}
driver=nl80211
ssid=${SSID}
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=${PASSWORD}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
EOF

# Create dnsmasq configuration
echo "Creating dnsmasq configuration..."
cat > /etc/dnsmasq-nodenav.conf << EOF
interface=${INTERFACE}
dhcp-range=${DHCP_RANGE_START},${DHCP_RANGE_END},255.255.255.0,24h
dhcp-option=3,${IP_ADDRESS}
dhcp-option=6,${IP_ADDRESS}
server=8.8.8.8
log-queries
log-dhcp
listen-address=${IP_ADDRESS}
EOF

# Enable IP forwarding
echo "Enabling IP forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward

# Configure iptables for NAT (optional, if you want clients to access internet)
# echo "Configuring NAT..."
# iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
# iptables -A FORWARD -i eth0 -o ${INTERFACE} -m state --state RELATED,ESTABLISHED -j ACCEPT
# iptables -A FORWARD -i ${INTERFACE} -o eth0 -j ACCEPT

# Start hostapd
echo "Starting hostapd..."
hostapd -B /etc/hostapd/hostapd-nodenav.conf

# Start dnsmasq
echo "Starting dnsmasq..."
dnsmasq -C /etc/dnsmasq-nodenav.conf

echo ""
echo "✓ NodeNav-Lights Access Point is now active!"
echo "  SSID: ${SSID}"
echo "  IP Address: ${IP_ADDRESS}"
echo "  Interface: ${INTERFACE}"
echo ""
echo "To stop the AP, run: sudo ./teardown-linux-wifi-ap.sh"

