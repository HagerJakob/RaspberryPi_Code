# Initiale Installation (einmalig im WLAN)

Diese Schritte müssen **nur einmal** durchgeführt werden, wenn der Raspberry Pi WLAN-Zugang hat.
Danach funktioniert der Auto-Start auch ohne Internet!

---

## Voraussetzungen

Der Raspberry Pi muss mit einem WLAN verbunden sein, das Internet-Zugang hat.

```bash
# WLAN verbinden (falls nicht automatisch)
sudo nmcli dev wifi connect "DEIN-WLAN-NAME" password "DEIN-PASSWORT"

# Internet-Verbindung testen
ping -c 3 google.com
```

---

## Schritt 1: Repository klonen

```bash
cd /home/admin
git clone https://github.com/HagerJakob/RaspberryPi_Code.git
cd RaspberryPi_Code
```

---

## Schritt 2: Docker Images bauen (dauert ~2-3 Minuten)

```bash
cd /home/admin/RaspberryPi_Code
docker compose build --no-cache
```

**Wichtig:** Dieser Schritt muss nur einmal durchgeführt werden!
Die gebauten Images bleiben auf dem RPi gespeichert.

---

## Schritt 3: Auto-Start Service installieren

```bash
# Skript ausführbar machen
chmod +x /home/admin/RaspberryPi_Code/start_dashboard.sh

# Service-Datei kopieren
sudo cp /home/admin/RaspberryPi_Code/dashboard-auto-start.service /etc/systemd/system/

# Sudoers konfigurieren (für Chromium Launch)
sudo visudo -f /etc/sudoers.d/dashboard-admin
```

Füge folgende Zeile hinzu:
```
root ALL=(admin) NOPASSWD: /bin/bash
```

Speichern mit `Ctrl+X`, dann `Y`, dann `Enter`.

```bash
# systemd neu laden
sudo systemctl daemon-reload

# Service aktivieren (startet beim Boot)
sudo systemctl enable dashboard-auto-start.service
```

---

## Schritt 4: Hotspot einrichten

```bash
cd /home/admin/RaspberryPi_Code
sudo bash setup_hotspot.sh
```

Optional mit eigenem SSID/Passwort:
```bash
sudo bash setup_hotspot.sh "MeinSSID" "MeinPasswort123"
```

---

## Schritt 5: Test ohne Reboot

```bash
# Service manuell starten
sudo systemctl start dashboard-auto-start.service

# Logs ansehen (live)
sudo journalctl -u dashboard-auto-start.service -f
```

**Erwartete Ausgabe:**
```
[INFO] Dashboard Auto-Start gestartet
[INFO] Aktiviere WLAN Interface wlan0...
[INFO] Starte Hotspot Services...
[INFO] Hotspot Services gestartet ✓
[INFO] Prüfe Repository Verzeichnis...
[INFO] Repository gefunden: /home/admin/RaspberryPi_Code ✓
[INFO] Starte Docker Compose (nutze gecachte Images)...
[INFO] Docker Compose gestartet ✓
[INFO] Frontend Container läuft ✓
[INFO] Chromium gestartet (PID: XXXX) ✓
[INFO] Auto-Start erfolgreich abgeschlossen! ✓
```

**Startzeit:** ~15-20 Sekunden (viel schneller als vorher!)

---

## Schritt 6: Reboot-Test

```bash
sudo reboot
```

Nach dem Neustart:
- Hotspot sollte automatisch starten: `RaspberryPi-Dashboard`
- Docker Container sollten automatisch laufen
- Chromium sollte automatisch im Fullscreen starten

---

## Updates installieren (später, mit WLAN)

Falls du später Updates vom GitHub installieren möchtest:

```bash
# Mit WLAN verbinden
sudo nmcli dev wifi connect "DEIN-WLAN-NAME" password "DEIN-PASSWORT"

# In Repository wechseln
cd /home/admin/RaspberryPi_Code

# Updates holen
git pull

# Docker Images neu bauen (nur wenn sich Backend/Frontend geändert hat)
docker compose build

# Container neu starten
docker compose up -d

# Hotspot wieder aktivieren
sudo systemctl restart hostapd dnsmasq
```

---

## Wichtige Hinweise

### ✅ Was funktioniert OHNE Internet:
- Auto-Start beim Boot
- Hotspot starten
- Docker Container starten
- Dashboard anzeigen
- Datenbank speichern & herunterladen

### ❌ Was OHNE Internet NICHT funktioniert:
- Git Pull (Updates holen)
- Docker Image Build (neue Pakete installieren)
- Chromium Installation (falls nicht vorhanden)

### 🚀 Performance nach Installation:
- **Boot bis Dashboard:** ~15-20 Sekunden
- **Statt vorher:** ~3 Minuten

### 🔧 Fullscreen Steuerung:
- **F11:** Fullscreen beenden/aktivieren
- **Alt+F4:** Browser schließen
- **Ctrl+Alt+F2:** Terminal wechseln (falls Browser hängt)

---

## Troubleshooting

### Docker Container laufen nicht
```bash
docker ps
docker compose logs -f
```

### Chromium startet nicht
```bash
# Manuell testen
DISPLAY=:0 /usr/bin/chromium --start-fullscreen http://localhost:5173
```

### Hotspot funktioniert nicht
```bash
sudo systemctl status hostapd
sudo systemctl status dnsmasq
sudo ip link show wlan0
```

### Service Status
```bash
sudo systemctl status dashboard-auto-start.service
sudo journalctl -u dashboard-auto-start.service -n 50
cat /var/log/dashboard-startup.log
```

---

## Dateistruktur nach Installation

```
/home/admin/RaspberryPi_Code/
├── start_dashboard.sh                 # Auto-Start Skript
├── dashboard-auto-start.service       # systemd Service
├── setup_hotspot.sh                   # Hotspot Setup
├── docker-compose.yml
├── backend/                           # Backend Code
├── frontend/                          # Frontend Code
└── ...

/etc/systemd/system/
└── dashboard-auto-start.service       # Kopie vom Service

/var/log/
└── dashboard-startup.log              # Startup Logs
```

---

## Zusammenfassung

**Einmalig (mit WLAN):**
1. Repository klonen
2. Docker Images bauen (~3 Min)
3. Service installieren
4. Hotspot einrichten

**Danach (auch ohne WLAN):**
- Auto-Start in ~15-20 Sekunden
- Keine Internet-Verbindung nötig
- Fullscreen mit F11 beenden
- Updates nur wenn gewünscht (mit WLAN)

**Installiert? → Tacho ins Auto → Fertig! 🚗💨**
