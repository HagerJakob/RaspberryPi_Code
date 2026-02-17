# WiFi Hotspot Setup für Raspberry Pi Dashboard

Dieses Skript richtet einen **eigenständigen WiFi Hotspot** auf dem Raspberry Pi ein, damit du dich mit deinem Handy direkt verbinden kannst - ohne WLAN!

## 🎯 Was wird damit erreicht?

- ✅ RPi erstellt sein eigenes WiFi-Netzwerk
- ✅ Handy verbindet sich direkt mit dem RPi (keine externe WLAN nötig)
- ✅ Dashboard öffnen und Daten im Auto abrufen
- ✅ Datenbank vom Handy herunterladen

---

## 📋 Voraussetzungen

- Raspberry Pi 4 mit Raspbian OS
- SSH-Zugang zum RPi (oder direkte Terminal)
- Internettverbindung beim Setup (zum Installieren von Paketen)

---

## 🚀 Installation

### Schritt 1: Skript auf RPi kopieren
Die Datei `setup_hotspot.sh` muss auf dem Raspberry Pi sein.

### Schritt 2: Skript ausführbar machen
```bash
chmod +x setup_hotspot.sh
```

### Schritt 3: Skript ausführen (mit sudo!)
```bash
sudo ./setup_hotspot.sh
```

**Oder mit benutzerdefinierten Werten:**
```bash
sudo ./setup_hotspot.sh "MeinNetzwerk" "sicheresPasswort123"
```

### Schritt 4: Hotspot ist sofort verfügbar! ✅
Direkt nach dem Setup sollte der Hotspot im WiFi-Menü sichtbar sein.

**Optional: Reboot für vollständigen Neustart**
```bash
sudo reboot
```

Nach dem Reboot startet der Hotspot **automatisch beim Boot**!

---

## 📱 Handy verbinden

### Android
1. Einstellungen → WLAN
2. Nach Netzwerk suchen → "RaspberryPi-Dashboard"
3. Passwort eingeben: `raspberry123`
4. Verbunden ✅

### iPhone
1. Einstellungen → WLAN
2. Nach Netzwerk suchen → "RaspberryPi-Dashboard"
3. Passwort eingeben: `raspberry123`
4. Verbunden ✅

---

## 🌐 Dashboard öffnen

Nach der Verbindung, öffne im Handy-Browser:

```
http://192.168.4.1:5173
```

Alternativ:
```
http://raspberrypi.local:5173
```

### API direkt (falls Dashboard nicht lädt)
```
http://192.168.4.1:5000/api/database/download
```

---

## 💾 Datenbank herunterladen

1. **Dashboard öffnen** (wie oben)
2. Klick auf den **"💾 DB"** Button oben in der Mitte
3. Die `.db` Datei wird heruntergeladen
4. Speicherort: `/Downloads/database_YYYY-MM-DD.db`

---

## ⚙️ Was macht das Skript?

| Komponente | Beschreibung |
|-----------|------------|
| **hostapd** | Erstellt WiFi Access Point |
| **dnsmasq** | DHCP-Server für Handy-IPs |
| **iptables** | Netzwerk-Routing (NAT) |
| **dhcpcd** | Statische IP 192.168.4.1 |

---

## 🔧 Manuell anpassen

Wenn du später Passwort oder SSID ändern möchtest:

### Datei bearbeiten
```bash
sudo nano /etc/hostapd/hostapd.conf
```

Ändere:
```
ssid=RaspberryPi-Dashboard
wpa_passphrase=raspberry123
```

### Neustart
```bash
sudo systemctl restart hostapd dnsmasq dhcpcd
```

---

## 🐛 Troubleshooting

### "Hotspot wird nicht angezeigt"
```bash
sudo systemctl status hostapd
sudo systemctl restart hostapd
```

### "Kann nicht auf 192.168.4.1 zugreifen"
```bash
sudo systemctl restart dnsmasq
sudo systemctl restart dhcpcd
```

### "Skript sagt 'sudo' wird benötigt"
- Das Skript **muss** mit `sudo` ausgeführt werden!
- Richtig: `sudo ./setup_hotspot.sh`
- Falsch: `./setup_hotspot.sh`

### "Internet funktioniert nicht über RPi"
Das ist normal! Der Hotspot ist nur für Dashboard/Datenbank da.
Für normales Internet brauchst du externe WLAN/Ethernet.

---

## 📊 Netzwerk-Info

| Setting | Wert |
|---------|------|
| SSID | RaspberryPi-Dashboard |
| Passwort | raspberry123 |
| IP-Bereich | 192.168.4.x |
| RPi-IP | 192.168.4.1 |
| Handy-IP | 192.168.4.2 - 254 |
| DHCP-Zeit | 24h |

---

## 🚫 Hotspot deaktivieren

Falls du zurück zu normalem Netzwerk möchtest:

```bash
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq
```

Oder komplett deinstallieren:
```bash
sudo apt-get remove -y hostapd dnsmasq
```

---

## 💡 Tipps

✅ **Im Auto:** Zünde den RPi an, warte 30 Sekunden, Handy verbindet sich automatisch
✅ **Dashboard lädt nicht?** Prüfe mit `ping 192.168.4.1`
✅ **Langsam?** Normal für WiFi im Auto, aber 5173 Port ist optimiert
✅ **Datenbank oft herunterladen?** Macht keinen Schaden, alte Daten bleiben in der DB

---

## 📚 Weitere Ressourcen

- Raspberry Pi Docs: https://www.raspberrypi.org/
- hostapd Anleitung: https://w1.fi/hostapd/
- dnsmasq Docs: http://www.thekelleys.org.uk/dnsmasq/doc.html
