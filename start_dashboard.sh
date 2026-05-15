#!/bin/bash

set -u

LOG_FILE="/var/log/dashboard-startup.log"
REPO_DIR="/home/pi/RaspberryPi_Code"
FRONTEND_PORT="3000"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
DOCKER_CMD="/usr/bin/docker"
SLEEP_CMD="/bin/sleep"

log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

error_exit() {
  log "ERROR" "$1"
  exit 1
}

launch_browser() {
  local browser_cmd=""

  if command -v chromium-browser > /dev/null 2>&1; then
    browser_cmd="chromium-browser"
  elif command -v chromium > /dev/null 2>&1; then
    browser_cmd="chromium"
  elif command -v daemon-browser > /dev/null 2>&1; then
    browser_cmd="daemon-browser"
  elif command -v daemonbrowser > /dev/null 2>&1; then
    browser_cmd="daemonbrowser"
  fi

  if [ -z "$browser_cmd" ]; then
    log "ERROR" "Kein Browser gefunden"
    return 1
  fi

  log "INFO" "Starte Browser: $browser_cmd $FRONTEND_URL"
  nohup env DISPLAY=:0 "$browser_cmd" "$FRONTEND_URL" > /dev/null 2>&1 &
  return 0
}

log "INFO" "=========================================="
log "INFO" "Dashboard Auto-Start gestartet"
log "INFO" "=========================================="

if [ ! -d "$REPO_DIR" ]; then
  error_exit "Repository nicht gefunden: $REPO_DIR"
fi

cd "$REPO_DIR" || error_exit "Konnte nicht in $REPO_DIR wechseln"
log "INFO" "Arbeitsverzeichnis: $(pwd)"

log "INFO" "Starte Docker Compose..."
if ! "$DOCKER_CMD" compose up -d 2>&1 | tee -a "$LOG_FILE"; then
  error_exit "Docker Compose Up fehlgeschlagen"
fi

log "INFO" "Warte auf Frontend unter $FRONTEND_URL"
WAIT_TIME=0
MAX_WAIT=60
while [ "$WAIT_TIME" -lt "$MAX_WAIT" ]; do
  if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    log "INFO" "Frontend ist erreichbar ✓"
    break
  fi
  $SLEEP_CMD 1
  WAIT_TIME=$((WAIT_TIME + 1))
done

if [ "$WAIT_TIME" -ge "$MAX_WAIT" ]; then
  error_exit "Frontend antwortet nicht nach ${MAX_WAIT} Sekunden"
fi

if ! launch_browser; then
  error_exit "Browser konnte nicht gestartet werden"
fi

log "INFO" "Auto-Start abgeschlossen"
