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
