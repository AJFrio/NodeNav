#!/bin/bash
#
# Teardown Linux WiFi Access Point for NodeNav Lights
# 
# This script stops the hostapd and dnsmasq services
# and cleans up the network configuration
#

set -e

INTERFACE="wlan0"  # Change this if your wireless interface is different

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "Tearing down NodeNav-Lights Access Point..."

# Stop services
echo "Stopping hostapd..."
killall hostapd 2>/dev/null || true

echo "Stopping dnsmasq..."
killall dnsmasq 2>/dev/null || true

# Flush IP configuration
echo "Flushing network interface..."
ip addr flush dev ${INTERFACE} 2>/dev/null || true

# Bring interface down
ip link set ${INTERFACE} down 2>/dev/null || true

# Clean up configuration files
rm -f /etc/hostapd/hostapd-nodenav.conf
rm -f /etc/dnsmasq-nodenav.conf

# Disable IP forwarding
echo 0 > /proc/sys/net/ipv4/ip_forward

# Clear iptables NAT rules (if they were set)
# iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE 2>/dev/null || true
# iptables -D FORWARD -i eth0 -o ${INTERFACE} -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true
# iptables -D FORWARD -i ${INTERFACE} -o eth0 -j ACCEPT 2>/dev/null || true

echo ""
echo "✓ NodeNav-Lights Access Point has been stopped."
echo ""

