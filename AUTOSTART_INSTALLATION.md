# Dashboard Auto-Start Installation für Raspberry Pi OS

## Übersicht
Dieses Setup startet beim Raspberry Pi Boot automatisch:
1. ✅ WLAN Interface aktivieren
2. ✅ WiFi Hotspot Services (hostapd, dnsmasq) neu starten
3. ✅ GitHub Repository klonen
4. ✅ Docker Compose aufbauen & starten
5. ✅ Chromium im Kiosk-Modus öffnen

---

## Voraussetzungen

Auf dem Raspberry Pi müssen folgende Pakete installiert sein:

```bash
sudo apt-get update
sudo apt-get install -y \
  git \
  docker.io \
  docker-compose \
  chromium-browser \
  hostapd \
  dnsmasq \
  dhcpcd5
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
ls -la /home/pi/RaspberryPi_Code/start_dashboard.sh

# Starte den Service manuell
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

### Chromium öffnet nicht
```bash
# DISPLAY Variable überprüfen
echo $DISPLAY

# Xclient Autostart Setup prüfen
cat ~/.Xinitrc  # oder .bashrc

# Manuell testen
DISPLAY=:0 /usr/bin/chromium-browser --kiosk http://localhost:5173 &
```

---

## Datei-Struktur

```
/home/pi/RaspberryPi_Code/
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

1. **Boot-Sequenz (~/boot)**
   - Linux Kernel lädt
   - systemd startet

2. **network.target erreichbar** (~5-10 Sekunden)
   - systemd erkennt Dashboard Service

3. **dashboard-auto-start.service startet** (~10-20 Sekunden)
   - ExecStart: `/bin/bash /home/pi/RaspberryPi_Code/start_dashboard.sh`

4. **Start-Skript führt aus** (~30-60 Sekunden):
   - WLAN Interface up
   - Hostapd + DNSMASQ recheckieren
   - Repo klonen (oder aktualisieren)
   - Docker-Compose build + up
   - 10 Sekunden warten
   - Chromium im Kiosk-Modus starten

5. **Dashboard online** (~60-90 Sekunden nach Boot)
   - Hotspot: `RaspberryPi-Dashboard` (192.168.4.1)
   - Chromium: `http://localhost:5173` (lokal)
   - Phone:    `http://192.168.4.1:5173` (über Hotspot)

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
[2026-02-20 08:35:42] [INFO] Aktiviere WLAN Interface wlan0...
[2026-02-20 08:35:44] [INFO] Starte Hotspot Services...
[2026-02-20 08:35:47] [INFO] Hotspot Services gestartet ✓
[2026-02-20 08:35:47] [INFO] Klone Repository: https://github.com/HagerJakob/RaspberryPi_Code.git
[2026-02-20 08:36:15] [INFO] Repository geklont ✓
[2026-02-20 08:36:17] [INFO] Starte Docker Compose Build...
[2026-02-20 08:37:45] [INFO] Docker Compose Build erfolgreich ✓
[2026-02-20 08:37:47] [INFO] Starte Docker Compose (im Hintergrund)...
[2026-02-20 08:37:50] [INFO] Docker Compose gestartet ✓
[2026-02-20 08:38:00] [INFO] Starte Chromium im Kiosk-Modus...
[2026-02-20 08:38:01] [INFO] Chromium gestartet (PID: 2845) ✓
[2026-02-20 08:38:01] [INFO] Auto-Start erfolgreich abgeschlossen! ✓
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
sudo nano /home/pi/RaspberryPi_Code/start_dashboard.sh
```

Key-Variablen oben:
```bash
REPO_URL="https://github.com/DEIN-USER/RaspberryPi_Code.git"
REPO_DIR="/home/pi/RaspberryPi_Code"
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
- **Chromium Start**: ~5-10 Sekunden

**Total: ~60-150 Sekunden (1-2.5 Minuten) vom Boot bis Dashboard sichtbar**

Beim nächsten Boot, wenn Git nichts zu pullen hat, können es ~40-60 Sekunden sein.

---

## Nächste Schritte

Nach erfolgreicher Installation:

1. ✅ Reboot testen:
   ```bash
   sudo reboot
   ```

2. ✅ Auf dem Handy WiFi "RaspberryPi-Dashboard" verbinden:
   - WiFi: `RaspberryPi-Dashboard`
   - Passwort: `raspberry123`
   - IP: `192.168.4.1`

3. ✅ Dashboard aufrufen:
   - `http://192.168.4.1:5173`

4. ✅ Datenbank herunterladen:
   - Button: "Datenbank herunterladen"

---

**Fragen oder Probleme?**
Siehe `/var/log/dashboard-startup.log` oder:
```bash
sudo journalctl -u dashboard-auto-start.service -f
```
