#!/bin/bash

# ============================================
# RaspberryPi Dashboard Auto-Start Script
# ============================================
# Startet beim Boot automatisch:
# 1. WLAN Interface
# 2. Hotspot Services
# 3. GitHub Repository klonen
# 4. Docker Compose build & up
# 5. Chromium Kiosk-Browser
# ============================================

set -e

# Konfiguration
REPO_URL="https://github.com/HagerJakob/RaspberryPi_Code.git"
REPO_DIR="/home/admin/RaspberryPi_Code"
LOG_FILE="/var/log/dashboard-startup.log"
PI_USER="admin"
PI_HOME="/home/admin"

# Absolute Pfade zu Commands
IP_CMD="/usr/sbin/ip"
SYSTEMCTL_CMD="/usr/bin/systemctl"
GIT_CMD="/usr/bin/git"
DOCKER_CMD="/usr/bin/docker"
DOCKER_COMPOSE_CMD="/usr/bin/docker compose"  # Modernes Docker (Plugin)
CHROMIUM_CMD="/usr/bin/chromium"  # Ohne -browser Suffix
SLEEP_CMD="/bin/sleep"
MKDIR_CMD="/bin/mkdir"
RM_CMD="/bin/rm"
CD_CMD="builtin cd"

# Logging-Funktion
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Fehler-Handler
error_exit() {
  log "ERROR" "$1"
  exit 1
}

log "INFO" "=========================================="
log "INFO" "Dashboard Auto-Start gestartet"
log "INFO" "=========================================="

# ============================================
# 1. WLAN Interface aktivieren
# ============================================
log "INFO" "Aktiviere WLAN Interface wlan0..."
if ! $IP_CMD link set wlan0 up 2>&1 | tee -a "$LOG_FILE"; then
  log "WARN" "WLAN Interface konnte nicht aktiviert werden (möglicherweise bereits aktiv)"
fi
$SLEEP_CMD 2

# ============================================
# 2. Hotspot Services neu starten
# ============================================
log "INFO" "Starte Hotspot Services..."
if ! $SYSTEMCTL_CMD restart hostapd 2>&1 | tee -a "$LOG_FILE"; then
  log "WARN" "hostapd Restart fehlgeschlagen"
fi
$SLEEP_CMD 1

if ! $SYSTEMCTL_CMD restart dnsmasq 2>&1 | tee -a "$LOG_FILE"; then
  log "WARN" "dnsmasq Restart fehlgeschlagen"
fi
$SLEEP_CMD 2

log "INFO" "Hotspot Services gestartet ✓"

# ============================================
# 3. Repository Verzeichnis prüfen
# ============================================
log "INFO" "Prüfe Repository Verzeichnis..."
if [ ! -d "$REPO_DIR" ]; then
  log "ERROR" "Repository nicht gefunden: $REPO_DIR"
  log "ERROR" "Bitte initial installieren mit: git clone $REPO_URL $REPO_DIR"
  error_exit "Repository fehlt! Installation erforderlich."
fi

log "INFO" "Repository gefunden: $REPO_DIR ✓"
cd "$REPO_DIR" || error_exit "Konnte nicht in $REPO_DIR wechseln"
log "INFO" "Wechsel zu: $(pwd)"

# ============================================
# 4. Docker Compose Up (ohne Build!)
# ============================================
log "INFO" "Starte Docker Compose (nutze gecachte Images)..."
if ! $DOCKER_CMD compose up -d 2>&1 | tee -a "$LOG_FILE"; then
  error_exit "Docker Compose Up fehlgeschlagen"
fi
log "INFO" "Docker Compose gestartet ✓"
$SLEEP_CMD 5

# ============================================
# 5. Prüfe ob Docker Services laufen
# ============================================
log "INFO" "Prüfe Docker Container..."
if $DOCKER_CMD ps | grep -q "frontend"; then
  log "INFO" "Frontend Container läuft ✓"
else
  log "WARN" "Frontend Container läuft nicht"
  $DOCKER_CMD compose ps | tee -a "$LOG_FILE"
fi

# ============================================
# 6. Warte auf Frontend Ready
# ============================================
log "INFO" "Warte 5 Sekunden bis Frontend bereit ist..."
$SLEEP_CMD 5

# ============================================
# 7. Starte Chromium im Fullscreen-Modus
# ============================================
log "INFO" "Starte Chromium im Fullscreen-Modus (F11 zum Beenden)..."

# Prüfe ob Chromium installiert ist
if [ ! -f "$CHROMIUM_CMD" ]; then
  log "WARN" "Chromium nicht gefunden, versuche zu installieren..."
  if ! apt-get update 2>&1 | tee -a "$LOG_FILE"; then
    log "WARN" "apt-get update fehlgeschlagen"
  fi
  if ! apt-get install -y chromium 2>&1 | tee -a "$LOG_FILE"; then
    log "WARN" "Chromium Installation fehlgeschlagen"
  fi
fi

# Starte Chromium
log "INFO" "Starte: $CHROMIUM_CMD --start-fullscreen http://localhost:5173"
if [ -f "$CHROMIUM_CMD" ]; then
  # Starte Chromium mit korrektem Display
  # Falls pi User existiert, versuche als pi zu starten; sonst als root
  if id "$PI_USER" &>/dev/null; then
    log "INFO" "Starte Chromium als User: $PI_USER"
    nohup sudo -u "$PI_USER" bash -c "DISPLAY=:0 XAUTHORITY=$PI_HOME/.Xauthority $CHROMIUM_CMD \
      --start-fullscreen \
      --noerrdialogs \
      --no-sandbox \
      --disable-restore-session-state \
      http://localhost:5173" > /dev/null 2>&1 &
  else
    log "INFO" "Starte Chromium als root (User pi nicht found)"
    DISPLAY=:0 $CHROMIUM_CMD \
      --start-fullscreen \
      --noerrdialogs \
      --no-sandbox \
      --disable-restore-session-state \
      http://localhost:5173 > /dev/null 2>&1 &
  fi
  
  CHROMIUM_PID=$!
  log "INFO" "Chromium gestartet (PID: $CHROMIUM_PID) ✓"
  log "INFO" "Drücke F11 zum Beenden des Fullscreen-Modus"
else
  log "ERROR" "Chromium konnte nicht gestartet werden"
fi

# ============================================
# Startup abgeschlossen
# ============================================
log "INFO" "=========================================="
log "INFO" "Auto-Start erfolgreich abgeschlossen! ✓"
log "INFO" "=========================================="
log "INFO" "Hotspot: RaspberryPi-Dashboard (192.168.4.1)"
log "INFO" "Browser: http://localhost:5173 (Fullscreen)"
log "INFO" "Dashboard: http://192.168.4.1:5173"
log "INFO" "F11: Fullscreen beenden | Alt+F4: Browser schließen"
log "INFO" "=========================================="
log "INFO" "Service läuft weiter (Warten auf Beendigung)..."

# Halte Service am Leben, damit systemd ihn nicht neu startet
tail -f /dev/null
