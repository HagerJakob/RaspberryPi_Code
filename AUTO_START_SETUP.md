# Auto-Start Anleitung für Raspberry Pi Dashboard

Dieses Setup sorgt dafür, dass beim Boot des Raspberry Pi:
1. ✅ Docker Compose gestartet wird
2. ✅ Das Frontend erreichbar ist
3. ✅ Der Browser automatisch auf `http://localhost:3000` öffnet

---

## 📋 Voraussetzungen auf dem RPi

- Raspberry Pi 4 mit Raspbian OS
- Docker & Docker Compose installiert
- Internet-Verbindung nur für die Erstinstallation

---

## 🚀 Setup auf dem Raspberry Pi

### Schritt 1: Repository einmalig klonen

```bash
cd /home/pi
git clone https://github.com/DEIN-GITHUB/RaspberryPi_Code.git
cd RaspberryPi_Code
```

### Schritt 2: Script ausführbar machen

```bash
chmod +x /home/pi/RaspberryPi_Code/start_dashboard.sh
```

### Schritt 3: systemd Service einrichten

```bash
# Service-Datei ins System kopieren
sudo cp /home/pi/RaspberryPi_Code/dashboard-auto-start.service /etc/systemd/system/

# systemd neulädt
sudo systemctl daemon-reload

# Service aktivieren (startet beim Boot)
sudo systemctl enable dashboard-auto-start

# Service sofort starten (zum Testen)
sudo systemctl start dashboard-auto-start
```

---

## ✅ Status prüfen

```bash
# Service Status ansehen
sudo systemctl status dashboard-auto-start

# Live Logs anschauen
sudo journalctl -u dashboard-auto-start -f

# Oder Log-Datei
tail -f /var/log/dashboard-startup.log
```

---

## 🔧 Manuell starten

Falls du das Script nicht als Service nutzen möchtest, kannst du es auch manuell starten:

```bash
chmod +x /home/pi/RaspberryPi_Code/start_dashboard.sh
/home/pi/RaspberryPi_Code/start_dashboard.sh
```

---

## 🎯 Was passiert beim Boot?

1. **Docker Service startet**
2. **auto-start.service startet** → `start_dashboard.sh` wird ausgeführt
3. **Docker Compose Up** → Container starten
4. **Browser öffnet automatisch** auf `http://localhost:3000`

Der Start dauert danach meist nur noch **ein paar Sekunden**.

---

## 📱 Zugriff auf Dashboard

Nach dem Boot:
- **Frontend lokal:** `http://localhost:3000`
- **Frontend im Netzwerk:** `http://<raspberry-pi-ip>:3000`
- **Backend:** `http://<raspberry-pi-ip>:5000`

---

## 🐛 Troubleshooting

### Service startet nicht
```bash
sudo systemctl status dashboard-auto-start
sudo journalctl -u dashboard-auto-start -n 50
```

### Git Clone schlägt fehl
```bash
# SSH-Key einrichten oder
# HTTPS mit Personal Access Token verwenden
git config --global credential.helper store
```

### Docker Compose fehlgeschlagen
```bash
# Manuell testen
cd /home/pi/RaspberryPi_Code
docker compose up -d
```

### Git URL falsch
```bash
# Öffne start_dashboard.sh und ändere REPO_URL
nano /home/pi/RaspberryPi_Code/start_dashboard.sh

# Neustarten testen
sudo systemctl restart dashboard-auto-start
```

---

## 🛑 Service deaktivieren

Wenn du den Auto-Start nicht mehr möchtest:

```bash
# Service deaktivieren
sudo systemctl disable dashboard-auto-start

# Service stoppen
sudo systemctl stop dashboard-auto-start
```

---

## 📝 Log-Dateien

- **systemd Logs:** `sudo journalctl -u dashboard-auto-start`
- **Startup Log:** `/var/log/dashboard-startup.log`
- **Docker Logs:** `docker compose logs backend`

---

## 🎬 Auto-Start Workflow

```
Boot RPi
  ↓
Network kommt online
  ↓
systemd startet dashboard-auto-start.service
  ↓
start_dashboard.sh wird ausgeführt
  ↓
Git Clone/Pull (neueste Code)
  ↓
Docker Build (Images compilieren)
  ↓
Docker Compose Up (Container starten)
  ↓
Dashboard Online! 🎉
```

---

## 💡 Tipps

✅ Beim ersten Boot dauert es länger (Build)
✅ Danach nur noch ~30 Sekunden beim Start
✅ Logs immer checken wenn was nicht lädt
✅ SSH ausführen vor Auto-Start für Keys
✅ Regelmäßiger `git pull` holt neueste Updates

---

## 📚 Weitere Infos

- systemd docs: `man systemd.service`
- Docker Compose: `docker-compose --help`
- Logs: `journalctl --help`
