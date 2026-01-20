#!/bin/bash

# Autostart Setup für Raspberry Pi - Dashboard
# Dieses Script sollte mit: sudo bash autostart-setup.sh ausgeführt werden

set -e

echo "=== Starte Autostart-Setup für RaspberryPi_Code Dashboard ==="

# Erstelle das Hauptstartscript
sudo tee /usr/local/bin/rpi-dashboard-start.sh > /dev/null << 'EOF'
#!/bin/bash

# Log-Datei für Debugging
LOG_FILE="/var/log/rpi-dashboard-start.log"
echo "$(date): Dashboard-Startup gestartet" >> $LOG_FILE

# Warte kurz, bis das System vollständig hochgefahren ist
sleep 5

# Home-Verzeichnis des Pi-Benutzers
HOME_DIR="/home/pi"
cd $HOME_DIR

# Alte Version löschen und neu clonen
echo "$(date): Lösche alte Version und clone neue..." >> $LOG_FILE
rm -rf RaspberryPi_Code 2>/dev/null || true
git clone https://github.com/HagerJakob/RaspberryPi_Code >> $LOG_FILE 2>&1
cd RaspberryPi_Code

# Docker Compose starten im Hintergrund
echo "$(date): Starte Docker Compose..." >> $LOG_FILE
docker compose up > $LOG_FILE 2>&1 &
DOCKER_PID=$!
echo "Docker PID: $DOCKER_PID" >> $LOG_FILE

# Warte bis der Docker-Container läuft (max 30 Sekunden)
echo "$(date): Warte auf Docker-Container..." >> $LOG_FILE
for i in {1..30}; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "$(date): Frontend ist erreichbar" >> $LOG_FILE
    break
  fi
  echo "$(date): Versuch $i - warte..." >> $LOG_FILE
  sleep 1
done

# Starte Browser im Vollbildmodus
echo "$(date): Starte Browser..." >> $LOG_FILE
DISPLAY=:0 XAUTHORITY=/home/pi/.Xauthority chromium-browser --kiosk --no-first-run http://localhost:5173 >> $LOG_FILE 2>&1 &

echo "$(date): Dashboard-Startup abgeschlossen" >> $LOG_FILE
EOF

# Script ausführbar machen
sudo chmod +x /usr/local/bin/rpi-dashboard-start.sh

echo "✓ Startup-Script erstellt: /usr/local/bin/rpi-dashboard-start.sh"

# Erstelle systemd Service für automatischen Start
sudo tee /etc/systemd/system/rpi-dashboard.service > /dev/null << 'EOF'
[Unit]
Description=RaspberryPi Dashboard Autostart
After=network-online.target graphical.target
Wants=network-online.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/rpi-dashboard-start.sh
StandardOutput=journal
StandardError=journal
Restart=on-failure
RestartSec=10

[Install]
WantedBy=graphical.target
EOF

echo "✓ Systemd Service erstellt: /etc/systemd/system/rpi-dashboard.service"

# Erstelle Desktop-Autostart als Alternative (für LXDE/XFCE)
mkdir -p /home/pi/.config/autostart

sudo tee /home/pi/.config/autostart/dashboard.desktop > /dev/null << 'EOF'
[Desktop Entry]
Type=Application
Name=Dashboard
Comment=RaspberryPi Dashboard
Exec=/usr/local/bin/rpi-dashboard-start.sh
AutoStart=true
Terminal=false
EOF

sudo chown pi:pi /home/pi/.config/autostart/dashboard.desktop
sudo chmod 644 /home/pi/.config/autostart/dashboard.desktop

echo "✓ Desktop-Autostart erstellt: /home/pi/.config/autostart/dashboard.desktop"

# Systemd Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable rpi-dashboard.service
echo "✓ Service aktiviert"

# Berechtigungen setzen
sudo chown pi:pi /usr/local/bin/rpi-dashboard-start.sh
sudo chmod 755 /usr/local/bin/rpi-dashboard-start.sh

# Sudoers-Datei für docker-Befehle ohne Passwort (optional, aber empfohlen)
if ! sudo grep -q "pi ALL=(ALL) NOPASSWD.*docker" /etc/sudoers.d/docker-pi 2>/dev/null; then
  echo "pi ALL=(ALL) NOPASSWD: /usr/bin/docker" | sudo tee /etc/sudoers.d/docker-pi > /dev/null
  sudo chmod 440 /etc/sudoers.d/docker-pi
  echo "✓ Sudo-Einträge für docker konfiguriert"
fi

echo ""
echo "=== Setup abgeschlossen! ==="
echo ""
echo "Service-Status prüfen mit:"
echo "  sudo systemctl status rpi-dashboard.service"
echo ""
echo "Service manuell starten:"
echo "  sudo systemctl start rpi-dashboard.service"
echo ""
echo "Logs anschauen:"
echo "  sudo journalctl -u rpi-dashboard.service -f"
echo "  oder: tail -f /var/log/rpi-dashboard-start.log"
echo ""
echo "Der RPi startet sich jetzt automatisch mit dem Dashboard beim Hochfahren!"
echo ""
