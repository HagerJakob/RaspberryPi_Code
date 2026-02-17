#!/bin/bash

# Dashboard Auto-Start Script für Raspberry Pi
# Klont den Code, buildet und startet Docker Container

set -e

# Logging
LOG_FILE="/var/log/dashboard-startup.log"
REPO_URL="https://github.com/dein-user/RaspberryPi_Code.git"  # ANPASSEN!
REPO_DIR="/home/pi/RaspberryPi_Code"
WORK_DIR="/home/pi"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Dashboard Auto-Start gestartet"
log "=========================================="

# Prüfe ob Git installiert ist
if ! command -v git &> /dev/null; then
  error "Git ist nicht installiert! Installation..."
  sudo apt-get update
  sudo apt-get install -y git
fi

log "Git: OK"

# Prüfe ob Docker installiert ist
if ! command -v docker &> /dev/null; then
  error "Docker ist nicht installiert!"
  exit 1
fi

log "Docker: OK"

# Stelle sicher, dass Docker-Service aktiv ist
if systemctl list-unit-files 2>/dev/null | grep -q "^docker.service"; then
  sudo systemctl enable docker || true
  sudo systemctl start docker || true
fi

# Prüfe ob Docker Compose installiert ist
if ! command -v docker-compose &> /dev/null; then
  error "Docker Compose ist nicht installiert!"
  exit 1
fi

log "Docker Compose: OK"

# Arbeitsverzeichnis erstellen
if [ ! -d "$WORK_DIR" ]; then
  log "Erstelle Verzeichnis: $WORK_DIR"
  mkdir -p "$WORK_DIR"
fi

cd "$WORK_DIR"

# Repository klonen oder pullen
if [ -d "$REPO_DIR" ]; then
  log "Repository existiert bereits. Pullen von Updates..."
  cd "$REPO_DIR"
  git pull origin main || git pull origin master
  log "Repository aktualisiert ✓"
else
  log "Klone Repository: $REPO_URL"
  git clone "$REPO_URL" "$REPO_DIR"
  if [ -d "$REPO_DIR" ]; then
    log "Repository geklont ✓"
    cd "$REPO_DIR"
  else
    error "Clone fehlgeschlagen!"
    exit 1
  fi
fi

log "=========================================="
log "Baue Docker Images..."
log "=========================================="

cd "$REPO_DIR"
docker-compose build --no-cache

if [ $? -ne 0 ]; then
  error "Docker Build fehlgeschlagen!"
  exit 1
fi

log "Docker Build erfolgreich ✓"

log "=========================================="
log "Starte Docker Container..."
log "=========================================="

docker-compose up -d

if [ $? -ne 0 ]; then
  error "Docker Compose Up fehlgeschlagen!"
  exit 1
fi

log "Docker Container gestartet ✓"

log "=========================================="
log "Dashboard ist online!"
log "=========================================="
log "Frontend:  http://localhost:5173"
log "Backend:   http://localhost:5000"
log "WebSocket: ws://localhost:5000/ws"
log "=========================================="

# Zeige Container Status
log ""
log "Container Status:"
docker-compose ps

log "Startup erfolgreich abgeschlossen!"
