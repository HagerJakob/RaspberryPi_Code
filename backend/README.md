# RaspberryPi Dashboard Backend (FastAPI)

FastAPI-basiertes Backend für das RaspberryPi Dashboard, das UART-Daten von der Serielle Schnittstelle liest und verarbeitet.

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
- `GET /health` - Health-Check mit UART-Status
- `GET /api/data` - Platzhalter für Daten-Endpoint

## Funktionalität

- **UART-Verbindung**: Liest Daten vom Serial Port `/dev/serial0` mit 115200 Baud
- **Datenverarbeitung**: Parst UART-Daten im Format `key:value,key:value,...`
- **CORS**: Aktiviert Cross-Origin-Requests für Frontend-Integration
- **Hintergrund-Task**: Kontinuierliche Überwachung der seriellen Schnittstelle

## Konfiguration

- `SERIAL_PORT = '/dev/serial0'` - Serielle Schnittstelle (anpassen je nach System)
- `BAUDRATE = 115200` - Baudrate (muss mit der Hardware übereinstimmen)

## WebSocket-Integration (optional)

Für Real-Time-Updates können WebSocket-Verbindungen hinzugefügt werden, ähnlich wie in der ursprünglichen Flask-SocketIO-Version.
