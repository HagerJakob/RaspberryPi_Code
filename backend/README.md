# RaspberryPi Dashboard Backend (FastAPI)

FastAPI-basiertes Backend für das RaspberryPi Dashboard, das OBD-Daten über UART von einem ESP32 empfängt, aggregiert und über WebSocket in Echtzeit streamt.

## Installation

```bash
pip install -r requirements.txt
```

## Starten des Servers

```bash
python main.py
```

oder mit uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

## API-Endpoints

- `GET /` - Root-Endpoint mit Willkommensmeldung
- `GET /health` - Health-Check mit UART- und OBD-Status
- `GET /api/data` - Platzhalter für Daten-Endpoint (verwende WebSocket für Live-Daten)
- `GET /api/logs/1sec?limit=60` - Holt die letzten 1-Sekunden aggregierten Logs (RPM, Geschwindigkeit)
- `GET /api/logs/10sec?limit=60` - Holt die letzten 10-Sekunden aggregierten Logs (Temperaturen, Spannung, etc.)
- `GET /api/database/download` - Lädt die komplette Logdatei als Textdatei herunter
- `GET /api/logfile/download` - Alias für `/api/database/download`
- `GET /api/database/download-text` - Lädt die Logdatei als reinen Text herunter
- `GET /api/logfile/download-text` - Alias für `/api/database/download-text`
- `WebSocket /ws` - Echtzeit-Datenstream mit ~60 FPS

## WebSocket Datenformat

Das Backend sendet kontinuierlich JSON-Daten über WebSocket:

```json
{
  "RPM": "2500",
  "SPEED": "45",
  "COOLANT": "85.0",
  "OIL": "60",
  "FUEL": "73",
  "VOLTAGE": "12.1",
  "BOOST": "1.1",
  "OILPRESS": "0.3",
  "UART_CONNECTED": true,
  "TIME": "14:30:25"
}
```

## Funktionalität

- **UART-Verbindung**: Liest OBD-Daten vom ESP32 über serielle Schnittstelle
- **Datenparsing**: Parst UART-Daten im Format `rpm:speed:temp/` (z.B. `2500:45:85.5/`)
- **Datenaggregation**: Berechnet 1-Sekunden-Durchschnitte (RPM, Geschwindigkeit) und 10-Sekunden-Durchschnitte (Sensorwerte)
- **Logging**: Speichert aggregierte Daten als JSON-Zeilen in Textdatei
- **WebSocket Broadcasting**: Sendet Live-Daten an alle verbundenen Clients (~60 FPS)
- **CORS**: Aktiviert Cross-Origin-Requests für Frontend-Integration
- **Health Monitoring**: Überwacht UART-Verbindung und Datenempfang

## Konfiguration

- **Serial Ports**: `/dev/ttyAMA0`, `/dev/ttyS0`, `/dev/serial0` (Raspberry Pi UART-Ports)
- **Baudrate**: 115200
- **Broadcast Interval**: ~16ms (60 FPS)
- **UART Timeout**: 2 Sekunden ohne Daten = Verbindung verloren
- **Log File**: `/data/obd_data_log.txt` (konfigurierbar via `LOG_FILE_PATH`)
- **Auto ID**: 1 (für Multi-Car Support)

## Datenfelder

- `RPM`: Motordrehzahl (U/min)
- `SPEED`: Geschwindigkeit (km/h)
- `COOLANT`: Kühlmitteltemperatur (°C)
- `OIL`: Öltemperatur (°C)
- `FUEL`: Kraftstofflevel (%)
- `VOLTAGE`: Bordspannung (V)
- `BOOST`: Ladedruck (bar)
- `OILPRESS`: Öldruck (bar)

## Docker

Das Backend ist containerisiert und kann mit Docker Compose gestartet werden:

```bash
docker compose up backend
```

Dockerfile basiert auf `python:3.11-slim` und exposed Port 5000.

## Go/Wails Migration (Bootstrap)

Zusätzlich zum Python-Backend wurde ein erster Go/Wails Einstieg angelegt:

- `main.go`: Wails App-Start und Binding
- `app.go`: Lifecycle, Event-Broadcasting (`obd:data`), Log-Methoden
- `serial.go`: UART-Reader mit Frame-Parsing (`rpm:speed:temp/`)
- `aggregator.go`: 1s/10s Aggregation analog zur Python-Logik
- `logging.go`: JSON-Line Logdatei kompatibel zum bestehenden Format
- `models.go`: gemeinsame Datenmodelle und Defaults

### Bereits umgesetzt

- Wails-Lifecycle mit Startup/Shutdown
- Live-Event-Streaming über Wails Runtime Events (`obd:data`) mit ~60 FPS
- Portierter Aggregator (1s/10s Mittelwerte)
- JSON-Line Logging kompatibel zur bisherigen Struktur
- UART-Service auf Basis von `periph.io/x/host/v3` + `uartreg`
- Exponierte Wails-Methoden: `GetHealth`, `GetLogs1Sec`, `GetLogs10Sec`, `GetLogfileText`
- Exponierte Runtime-Diagnosemethoden: `GetRuntimeConfig`, `GetCurrentData`
- Konfigurierbare Runtime-Settings via Umgebungsvariablen (`BROADCAST_INTERVAL_MS`, `UART_TIMEOUT_SECONDS`, `TIME_OFFSET_HOURS`, `LOG_FILE_PATH`, `LOG_MAX_BYTES`, `LOG_ROTATE_COUNT`)
- Deployment-Artefakte für Raspberry Pi (`build-rpi.ps1`, `deploy/rpi-obd-dashboard.service`)

### Nächste Schritte

- Frontend-Build in `backend/frontend/dist` in den Wails-Build integrieren
- Altes HTTP-API (optional) vollständig durch Wails-Bindings ersetzen
- Raspberry-Pi-Build/Service-Setup

### Lokaler Start (Go/Wails)

1. Go 1.21+ und Wails CLI installieren.
2. Im `backend` Verzeichnis:

```bash
go mod tidy
pwsh ./sync-frontend.ps1
wails dev
```

### Verifikation (Stand: 2026-04-13)

- `go mod tidy` wurde ausgeführt
- `go test ./...` ist erfolgreich
- `go build ./...` ist erfolgreich

Hinweis: Die vollständige `frontend/` Codebasis ist im aktuellen Worktree weiterhin gelöscht. Für echte UI-Integration muss sie wiederhergestellt und anschließend `pwsh ./sync-frontend.ps1` erneut ausgeführt werden.

## Raspberry Pi Deployment

### Cross-Build (Linux ARM64)

```bash
pwsh ./build-rpi.ps1
```

Erzeugt standardmäßig die Binärdatei `obd-dashboard-wails` für `linux/arm64`.

### Systemd Service

Beispiel-Service liegt unter `deploy/rpi-obd-dashboard.service`.

Typischer Ablauf auf Raspberry Pi:

1. Binary nach `/opt/rpi-obd-dashboard/` kopieren
2. Service nach `/etc/systemd/system/rpi-obd-dashboard.service` kopieren
3. `sudo systemctl daemon-reload`
4. `sudo systemctl enable --now rpi-obd-dashboard`
