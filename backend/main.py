from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import serial
import asyncio
import logging
import random
import platform
from contextlib import asynccontextmanager

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

# Globale Variablen für OBD-Daten Akkumulation
obd_data = {}
last_broadcast_time = 0
broadcast_interval = 0.05  # Broadcast alle 50ms

# Hintergrund-Task für UART-Datenverarbeitung
async def uart_task():
    global obd_data, last_broadcast_time
    buffer = ""
    first_message = True
    
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
                            
                            if first_message and len(obd_data) >= 3:
                                logger.info(f"Feldnamen vom Arduino: {list(obd_data.keys())}")
                                logger.info(f"Erste Daten: {obd_data}")
                                first_message = False
            
            # Broadcast gesammelte Daten wenn genug Zeit vergangen ist
            if obd_data and (current_time - last_broadcast_time) >= broadcast_interval:
                for ws in list(connected_clients):
                    try:
                        await ws.send_json(obd_data)
                    except Exception:
                        connected_clients.discard(ws)
                logger.debug(f"OBD-Daten gesendet: {obd_data}")
                last_broadcast_time = current_time
            
            await asyncio.sleep(0.001)
        except Exception as e:
            logger.error(f"Fehler bei UART-Verarbeitung: {e}")
            await asyncio.sleep(0.1)

# Lifespan-Context für Startup/Shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_uart()
    uart_bg_task = asyncio.create_task(uart_task())
    logger.info("Backend gestartet")
    yield
    # Shutdown
    if ser:
        ser.close()
    uart_bg_task.cancel()
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
