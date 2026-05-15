# Dashboard Auto-Start Installation für Raspberry Pi OS

## Übersicht
Dieses Setup startet beim Raspberry Pi Boot automatisch:
1. ✅ Docker Compose starten
2. ✅ Auf das Frontend warten
3. ✅ Browser auf `http://localhost:3000` öffnen

---

## Voraussetzungen

Auf dem Raspberry Pi müssen folgende Pakete installiert sein:

```bash
sudo apt-get update
sudo apt-get install -y \
  git \
  docker.io \
  docker-compose \
   chromium-browser
```

## Installation Schritt-für-Schritt

### Schritt 1: Repository klonen
```bash
cd /home/pi
git clone https://github.com/HagerJakob/RaspberryPi_Code.git
cd RaspberryPi_Code
```

### Schritt 2: Start-Script ausführbar machen
```bash
chmod +x /home/pi/RaspberryPi_Code/start_dashboard.sh
```

### Schritt 3: Systemd Service installieren

Kopiere die Service-Datei in das systemd Verzeichnis:
```bash
sudo cp /home/pi/RaspberryPi_Code/dashboard-auto-start.service /etc/systemd/system/
```

### Schritt 4: Service aktivieren und testen

Systemd neu laden:
```bash
sudo systemctl daemon-reload
```

Service aktivieren (startet beim Boot).
```bash
sudo systemctl enable dashboard-auto-start.service
```

Service manuell starten (um zu testen):
```bash
sudo systemctl start dashboard-auto-start.service
```

### Schritt 5: Überprüfe den Status

Status des Service:
```bash
sudo systemctl status dashboard-auto-start.service
```

### Schritt 6: Logs prüfen

Logs ansehen (live):
```bash
sudo journalctl -u dashboard-auto-start.service -f
```

Vollständige Startup-Logs:
```bash
cat /var/log/dashboard-startup.log
```

---

## Tipps & Troubleshooting

### Service startet nicht
```bash
# Überprüfe die Fehler
sudo journalctl -u dashboard-auto-start.service -n 50

# Überprüfe ob das Skript ausführbar ist
ls -la /home/admin/RaspberryPi_Code/start_dashboard.sh

# Starte den Service manuell
cd /home/admin/RaspberryPi_Code
cd /home/pi/RaspberryPi_Code
bash ./start_dashboard.sh
```

### Docker Container starten nicht
```bash
# Überprüfe ob Docker läuft
sudo systemctl status docker

# Falls nicht, starte Docker neu
sudo systemctl restart docker

# Überprüfe Container Status
docker ps -a

# Logs ansehen
docker-compose logs -f
```

### Hotspot funktioniert nicht
```bash
# WLAN Interface Status
ip link show wlan0

# Hostapd Status
sudo systemctl status hostapd

# DNSMASQ Status
sudo systemctl status dnsmasq

# Neustart Services
sudo systemctl restart hostapd dnsmasq

# WLAN Interface aufwecken
sudo ip link set wlan0 up
```

### Daemon Browser öffnet nicht
```bash
# DISPLAY Variable überprüfen
echo $DISPLAY

# Xclient Autostart Setup prüfen
cat ~/.Xinitrc  # oder .bashrc

# Manuell testen
DISPLAY=:0 /usr/bin/daemon-browser http://localhost:3000 &
```

---

## Datei-Struktur

```
/home/admin/RaspberryPi_Code/
├── start_dashboard.sh                 # Hauptstart-Skript (ausführbar)
├── dashboard-auto-start.service       # systemd Service (→ /etc/systemd/system/)
├── AUTOSTART_INSTALLATION.md          # Diese Datei
├── docker-compose.yml
├── backend/
│   ├── main.py
│   ├── db.py
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── Dockerfile
```

---

## Was passiert beim Boot

1. **Docker Service startet**
2. **dashboard-auto-start.service startet** (~10-20 Sekunden)
   - ExecStart: `/bin/bash /home/admin/RaspberryPi_Code/start_dashboard.sh`
3. **Start-Skript führt aus** (~10-30 Sekunden):
   - Wechselt in das Repository-Verzeichnis
   - Führt `docker compose up -d` aus
   - Wartet auf das Frontend
   - Öffnet den Browser auf `http://localhost:3000`
4. **Dashboard online**
   - Browser: `http://localhost:3000` (lokal)
   - Von anderen Geräten: `http://<raspberry-pi-ip>:3000`

---

## Logs & Debugging

### Startup Log
```bash
tail -f /var/log/dashboard-startup.log
```

Beispiel-Output:
```
[2026-02-20 08:35:42] [INFO] ==========================================
[2026-02-20 08:35:42] [INFO] Dashboard Auto-Start gestartet
[2026-02-20 08:35:42] [INFO] Arbeitsverzeichnis: /home/admin/RaspberryPi_Code
[2026-02-20 08:35:42] [INFO] Starte Docker Compose...
[2026-02-20 08:35:50] [INFO] Warte auf Frontend unter http://localhost:3000
[2026-02-20 08:36:02] [INFO] Frontend ist erreichbar ✓
[2026-02-20 08:36:03] [INFO] Starte Browser: chromium-browser http://localhost:3000
[2026-02-20 08:36:04] [INFO] Auto-Start abgeschlossen
```

### systemd Logs
```bash
# Real-time
sudo journalctl -u dashboard-auto-start.service -f

# Letzte 50 Zeilen
sudo journalctl -u dashboard-auto-start.service -n 50

# Seit letztem Boot
sudo journalctl -u dashboard-auto-start.service -b
```

---

## Manuelle Kontrolle

### Service deaktivieren (nur für Tests)
```bash
sudo systemctl disable dashboard-auto-start.service
```

### Service deaktivieren & stoppen
```bash
sudo systemctl disable dashboard-auto-start.service
sudo systemctl stop dashboard-auto-start.service
```

### Service neu laden (nach Dateiänderungen)
```bash
sudo systemctl daemon-reload
sudo systemctl restart dashboard-auto-start.service
```

### Skript manuell testen
```bash
cd /home/pi/RaspberryPi_Code
bash ./start_dashboard.sh
```

---

## Konfiguration anpassen

Falls die GitHub URL oder andere Parameter angepasst werden sollen:

### 1. start_dashboard.sh bearbeiten
```bash
sudo nano /home/admin/RaspberryPi_Code/start_dashboard.sh
```

Key-Variablen oben:
```bash
REPO_URL="https://github.com/DEIN-USER/RaspberryPi_Code.git"
REPO_DIR="/home/admin/RaspberryPi_Code"
LOG_FILE="/var/log/dashboard-startup.log"
```

### 2. Service bestätigen
```bash
sudo systemctl daemon-reload
sudo systemctl restart dashboard-auto-start.service
```

---

## Performance Hinweise

Die Startup-Zeit hängt ab von:
- **WLAN + Hotspot**: ~5 Sekunden
- **Git Clone**: ~20-50 Sekunden (abhängig von Internetgeschwindigkeit)
- **Docker Build**: ~20-60 Sekunden (abhängig von Änderungen)
- **Docker Up + Startup**: ~10-20 Sekunden
- **Browser Start**: ~5-10 Sekunden

**Total: ~60-150 Sekunden (1-2.5 Minuten) vom Boot bis Dashboard sichtbar**

Beim nächsten Boot, wenn Git nichts zu pullen hat, können es ~40-60 Sekunden sein.

---

## Nächste Schritte

Nach erfolgreicher Installation:

1. ✅ Service starten (Reboot optional):
   ```bash
   sudo systemctl start dashboard-auto-start.service
   ```

2. ✅ Logs überprüfen (sollte erfolgreich sein):
   ```bash
   sudo journalctl -u dashboard-auto-start.service -f
   ```

3. ✅ Auf dem Handy WiFi "RaspberryPi-Dashboard" verbinden:
   - WiFi: `RaspberryPi-Dashboard`
   - Passwort: `raspberry123`
   - IP: `192.168.4.1`

4. ✅ Dashboard aufrufen:
   - `http://192.168.4.1:3000`

5. ✅ Datenbank herunterladen:
   - Button: "Datenbank herunterladen"

---

**Fragen oder Probleme?**
Siehe `/var/log/dashboard-startup.log` oder:
```bash
sudo journalctl -u dashboard-auto-start.service -f
```
