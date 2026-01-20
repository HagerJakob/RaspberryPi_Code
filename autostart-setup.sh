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
sudo touch $LOG_FILE
sudo chown admin:admin $LOG_FILE
sudo chmod 664 $LOG_FILE
echo "$(date): Dashboard-Startup gestartet" >> $LOG_FILE

# Warte kurz, bis das System vollständig hochgefahren ist
sleep 5

# Warte auf laufenden X-Server / Display (max 30 Sekunden)
for i in {1..30}; do
  if [ -S /tmp/.X11-unix/X0 ]; then
    echo "$(date): X-Server ist bereit" >> $LOG_FILE
    break
  fi
  echo "$(date): Warte auf X-Server... ($i/30)" >> $LOG_FILE
  sleep 1
done

# Home-Verzeichnis des Admin-Benutzers
HOME_DIR="/home/admin"
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

# Starte Browser im Vollbildmodus (als admin, damit DISPLAY/XAUTHORITY passen)
echo "$(date): Starte Browser..." >> $LOG_FILE
# Versuche verschiedene Chromium-Befehle
if command -v chromium-browser &> /dev/null; then
  su - admin -c "DISPLAY=:0 XAUTHORITY=/home/admin/.Xauthority chromium-browser --kiosk --no-first-run --disable-infobars http://localhost:5173" >> $LOG_FILE 2>&1 &
elif command -v chromium &> /dev/null; then
  su - admin -c "DISPLAY=:0 XAUTHORITY=/home/admin/.Xauthority chromium --kiosk --no-first-run --disable-infobars http://localhost:5173" >> $LOG_FILE 2>&1 &
else
  echo "$(date): WARNUNG - Chromium nicht gefunden!" >> $LOG_FILE
fi

echo "$(date): Dashboard-Startup abgeschlossen" >> $LOG_FILE
EOF

# Script ausführbar machen
sudo chmod +x /usr/local/bin/rpi-dashboard-start.sh

echo "✓ Startup-Script erstellt: /usr/local/bin/rpi-dashboard-start.sh"

# Erstelle systemd Service für automatischen Start
sudo tee /etc/systemd/system/rpi-dashboard.service > /dev/null << 'EOF'
[Unit]
Description=RaspberryPi Dashboard Autostart
After=network-online.target docker.service graphical.target
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=admin
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/admin/.Xauthority
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
mkdir -p /home/admin/.config/autostart

sudo tee /home/admin/.config/autostart/dashboard.desktop > /dev/null << 'EOF'
[Desktop Entry]
Type=Application
Name=Dashboard
Comment=RaspberryPi Dashboard
Exec=/usr/local/bin/rpi-dashboard-start.sh
AutoStart=true
Terminal=false
EOF

sudo chown admin:admin /home/admin/.config/autostart/dashboard.desktop
sudo chmod 644 /home/admin/.config/autostart/dashboard.desktop

echo "✓ Desktop-Autostart erstellt: /home/admin/.config/autostart/dashboard.desktop"

# Systemd Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable rpi-dashboard.service
echo "✓ Service aktiviert"

# Berechtigungen setzen
sudo chown admin:admin /usr/local/bin/rpi-dashboard-start.sh
sudo chmod 755 /usr/local/bin/rpi-dashboard-start.sh

# Sudoers-Datei für docker-Befehle ohne Passwort (optional, aber empfohlen)
if ! sudo grep -q "admin ALL=(ALL) NOPASSWD.*docker" /etc/sudoers.d/docker-admin 2>/dev/null; then
  echo "admin ALL=(ALL) NOPASSWD: /usr/bin/docker" | sudo tee /etc/sudoers.d/docker-admin > /dev/null
  sudo chmod 440 /etc/sudoers.d/docker-admin
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
