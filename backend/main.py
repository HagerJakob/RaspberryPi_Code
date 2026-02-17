from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import serial
import asyncio
import logging
import random
import platform
import os
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from db import DatabaseConnection
from data_aggregator import DataAggregator, RawDataPoint

# UART Konfiguration für OBD-Daten
# Raspberry Pi Standard UART Ports
SERIAL_PORTS = ['/dev/ttyAMA0', '/dev/ttyS0', '/dev/serial0']
BAUDRATE = 115200
SERIAL_PORT = None

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Globale Variablen
ser = None
connected_clients = set()
db_url = os.getenv("DATABASE_URL", "database.db")
db = DatabaseConnection(db_url)
aggregator = DataAggregator()

# Konstanten
AUTO_ID = 1  # Standardauto für dieses Projekt
broadcast_interval = 0.016  # Broadcast alle ~16ms für 60 FPS

# UART initialisieren
def init_uart():
    global ser, SERIAL_PORT
    for port in SERIAL_PORTS:
        try:
            ser = serial.Serial(port, BAUDRATE, timeout=0.05)
            SERIAL_PORT = port
            logger.info(f"UART verbunden: {SERIAL_PORT}")
            return True
        except Exception as e:
            logger.debug(f"Port {port} nicht verfügbar: {e}")
            continue
    
    logger.error(f"Keine UART-Schnittstelle verfügbar. Versuchte Ports: {SERIAL_PORTS}")
    ser = None
    return False

obd_data = {
    "RPM": "0",
    "SPEED": "0",
    "COOLANT": "20",
    "OIL": "60",
    "FUEL": "73",
    "VOLTAGE": "12.1",
    "BOOST": "1.1",
    "OILPRESS": "0.3"
}
last_broadcast_time = 0

# Konvertiere OBD_KEY zu float, fallback auf 0.0
def safe_float(value: str, default: float = 0.0) -> float:
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

# Hintergrund-Task für UART-Datenverarbeitung
async def uart_task():
    global obd_data, last_broadcast_time
    buffer = ""
    first_message = True
    uart_connected = False
    
    while True:
        try:
            current_time = asyncio.get_event_loop().time()
            
            if ser and ser.in_waiting:
                buffer += ser.read(ser.in_waiting).decode(errors='ignore')
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    
                    # Parse einzelne Zeile: "RPM:5000" oder "SPEED:120"
                    if ':' in line:
                        parts = line.split(':', 1)
                        if len(parts) == 2:
                            k = parts[0].strip().upper()
                            v = parts[1].strip()
                            obd_data[k] = v
                            
                            if not uart_connected:
                                uart_connected = True
                                logger.info("UART-Datenempfang gestartet - OBD verbunden")
                            
                            if first_message and len(obd_data) >= 3:
                                logger.info(f"Feldnamen vom Arduino: {list(obd_data.keys())}")
                                logger.info(f"Erste Daten: {obd_data}")
                                first_message = False
                            
                            # Füge Rohwert zum Aggregator hinzu
                            raw_data = RawDataPoint(
                                timestamp=datetime.now(),
                                rpm=safe_float(obd_data.get("RPM")),
                                speed=safe_float(obd_data.get("SPEED")),
                                coolant_temp=safe_float(obd_data.get("COOLANT")),
                                oil_temp=safe_float(obd_data.get("OIL")),
                                fuel_level=safe_float(obd_data.get("FUEL")),
                                voltage=safe_float(obd_data.get("VOLTAGE")),
                                boost=safe_float(obd_data.get("BOOST")),
                                oil_pressure=safe_float(obd_data.get("OILPRESS")),
                            )
                            aggregator.add_data(raw_data)
            
            # Broadcast gesammelte Daten wenn genug Zeit vergangen ist
            if (current_time - last_broadcast_time) >= broadcast_interval:
                corrected_time = datetime.now() + timedelta(hours=1)
                broadcast_data = {
                    **obd_data,
                    "UART_CONNECTED": uart_connected,
                    "TIME": corrected_time.strftime("%H:%M:%S"),
                }
                for ws in list(connected_clients):
                    try:
                        await ws.send_json(broadcast_data)
                    except Exception:
                        connected_clients.discard(ws)
                logger.debug(f"OBD-Daten gesendet: {broadcast_data}")
                last_broadcast_time = current_time
            
            await asyncio.sleep(0.001)
        except Exception as e:
            logger.error(f"Fehler bei UART-Verarbeitung: {e}")
            await asyncio.sleep(0.1)


# Speichere aggregierte Daten in die Datenbank
async def database_writer_task():
    """Speichert Aggregations-Daten in die Datenbank"""
    while True:
        try:
            # 1-Sekunden Durchschnitte speichern
            if aggregator.should_save_1sec():
                avg_data = aggregator.get_1sec_average()
                if avg_data and ('rpm' in avg_data or 'speed' in avg_data):
                    db.insert_log_1sec(
                        auto_id=AUTO_ID,
                        geschwindigkeit=avg_data.get('speed', 0.0),
                        rpm=avg_data.get('rpm', 0.0),
                    )
                    logger.info(f"1sec-Daten gespeichert: {avg_data}")
                    aggregator.reset_1sec_timer()
            
            # 10-Sekunden Durchschnitte speichern
            if aggregator.should_save_10sec():
                avg_data = aggregator.get_10sec_average()
                if avg_data:
                    db.insert_log_10sec(
                        auto_id=AUTO_ID,
                        coolant_temp=avg_data.get('coolant_temp', 0.0),
                        oil_temp=avg_data.get('oil_temp', 0.0),
                        fuel_level=avg_data.get('fuel_level', 0.0),
                        voltage=avg_data.get('voltage', 0.0),
                        boost=avg_data.get('boost', 0.0),
                        oil_pressure=avg_data.get('oil_pressure', 0.0),
                    )
                    logger.info(f"10sec-Daten gespeichert: {avg_data}")
                    aggregator.reset_10sec_timer()
            
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Fehler bei Datenbank-Speicherung: {e}")
            await asyncio.sleep(1)


# Lifespan-Context für Startup/Shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_uart()
    uart_bg_task = asyncio.create_task(uart_task())
    db_bg_task = asyncio.create_task(database_writer_task())
    logger.info("Backend gestartet - UART und Datenbankschreiber aktiviert")
    yield
    # Shutdown
    if ser:
        ser.close()
    uart_bg_task.cancel()
    db_bg_task.cancel()
    logger.info("Backend beendet")

# FastAPI App erstellen
app = FastAPI(title="RaspberryPi Dashboard API", lifespan=lifespan)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints
@app.get("/")
async def root():
    return {"message": "RaspberryPi Dashboard API"}

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "uart_connected": ser is not None,
        "obd_ready": ser is not None
    }

@app.get("/api/data")
async def get_data():
    return {"message": "Verwenden Sie WebSocket für Live-Daten"}

@app.get("/api/logs/1sec")
async def get_logs_1sec(limit: int = 60):
    """Holt die letzten 1-Sekunden Logs"""
    logs = db.get_latest_logs_1sec(AUTO_ID, limit)
    return {"logs": logs}

@app.get("/api/logs/10sec")
async def get_logs_10sec(limit: int = 60):
    """Holt die letzten 10-Sekunden Logs"""
    logs = db.get_latest_logs_10sec(AUTO_ID, limit)
    return {"logs": logs}

@app.get("/api/database/download")
async def download_database():
    """Lädt die Datenbank-Datei herunter"""
    db_path = db.db_path
    return FileResponse(
        path=db_path,
        filename="database.db",
        media_type="application/octet-stream"
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            # keep connection open; clients may send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.discard(websocket)
    except Exception:
        connected_clients.discard(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
