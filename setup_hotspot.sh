#!/bin/bash

# WiFi Access Point Setup für Raspberry Pi 4
# Erstellt einen eigenständigen WiFi Hotspot für die Verbindung vom Handy

set -e

SSID="${1:-RaspberryPi-Dashboard}"
PASSWORD="${2:-raspberry123}"
INTERFACE="wlan0"

echo "=========================================="
echo "WiFi Hotspot Setup für Raspberry Pi"
echo "=========================================="
echo ""
echo "SSID: $SSID"
echo "Passwort: $PASSWORD"
echo "Interface: $INTERFACE"
echo ""

# Prüfe ob wir als root laufen
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Dieses Skript muss als root ausgeführt werden (sudo)"
  exit 1
fi

echo "📦 Installiere benötigte Pakete..."
apt-get update
apt-get install -y hostapd dnsmasq netfilter-persistent iptables-persistent dhcpcd5

echo "⚙️  Konfiguriere hostapd..."

# Erstelle hostapd Konfiguration
cat > /etc/hostapd/hostapd.conf << EOF
interface=$INTERFACE
ssid=$SSID
wpa_passphrase=$PASSWORD
country_code=AT
hw_mode=g
channel=6
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_pairwise=CCMP
rsn_pairwise=CCMP
EOF

# Konfiguriere hostapd Daemon Konfiguration
if ! grep -q "DAEMON_CONF=" /etc/default/hostapd; then
  echo 'DAEMON_CONF="/etc/hostapd/hostapd.conf"' >> /etc/default/hostapd
else
  sed -i 's|^DAEMON_CONF=.*|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd
fi

echo "⚙️  Konfiguriere dnsmasq..."

# Backup originale dnsmasq.conf falls nicht vorhanden
if [ ! -f /etc/dnsmasq.conf.bak ]; then
  cp /etc/dnsmasq.conf /etc/dnsmasq.conf.bak
fi

# Erstelle dnsmasq Konfiguration für DHCP
cat > /etc/dnsmasq.conf << EOF
# DHCP Konfiguration für WiFi Hotspot
interface=$INTERFACE
dhcp-range=192.168.4.2,192.168.4.254,255.255.255.0,24h
dhcp-option=option:router,192.168.4.1
dhcp-option=option:dns-server,8.8.8.8,8.8.4.4
EOF

echo "⚙️  Konfiguriere Netzwerk..."

# Konfiguriere statische IP für wlan0 (nur wenn dhcpcd existiert)
if command -v dhcpcd &> /dev/null; then
  cat >> /etc/dhcpcd.conf << EOF

# Statische IP für WiFi Hotspot
interface $INTERFACE
static ip_address=192.168.4.1/24
nohook wpa_supplicant
EOF
else
  echo "⚠️  dhcpcd nicht gefunden, überspringe IP-Konfiguration"
fi

echo "⚙️  Aktiviere IP Forwarding..."

# Aktiviere IP Forwarding
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p

echo "⚙️  Konfiguriere iptables..."

# NAT (Network Address Translation) Regeln
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i eth0 -o $INTERFACE -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i $INTERFACE -o eth0 -j ACCEPT

# Speichere iptables Regeln
netfilter-persistent save

echo "⚙️  Aktiviere Services beim Boot..."

# Aktiviere hostapd Service beim Boot
systemctl unmask hostapd 2>/dev/null || true
systemctl enable hostapd 2>/dev/null || true

# Aktiviere dnsmasq Service beim Boot
systemctl enable dnsmasq 2>/dev/null || true

# Aktiviere dhcpcd Service beim Boot (falls installiert)
if systemctl list-unit-files 2>/dev/null | grep -q dhcpcd; then
  systemctl enable dhcpcd 2>/dev/null || true
fi

echo "🚀 Starte Services..."
if systemctl list-unit-files 2>/dev/null | grep -q dhcpcd; then
  systemctl restart dhcpcd 2>/dev/null || true
  sleep 1
fi
systemctl restart dnsmasq 2>/dev/null || true
sleep 1
systemctl restart hostapd 2>/dev/null || true

sleep 2
echo "✅ Setup abgeschlossen!"
echo ""
echo "=========================================="
echo "Nächste Schritte:"
echo "=========================================="
echo ""
echo "✅ Der Hotspot lädt JETZT bereits!"
echo ""
echo "Handy Verbindung testen:"
echo "   - WiFi: Menü → WiFi Netze → '$SSID'"
echo "   - Passwort: $PASSWORD"
echo ""
echo "Nach dem Reboot:"
echo "   - Hotspot startet automatisch beim Boot ✓"
echo "   - Dashboard ist unter http://192.168.4.1:5173 verfügbar"
echo ""
echo "Optional: Reboot für vollständigen Neustart"
echo "   sudo reboot"
echo ""
echo "=========================================="
