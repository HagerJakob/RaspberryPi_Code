#!/bin/bash

# Hotspot Auto-Start Helper
# Ensures WiFi is unblocked and AP services restart on boot.

set -e

INTERFACE="wlan0"

rfkill unblock wifi || true
ip link set "$INTERFACE" up || true

systemctl restart dnsmasq || true
systemctl restart hostapd || true
