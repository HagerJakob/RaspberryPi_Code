from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import serial
import asyncio
import logging
import random
from contextlib import asynccontextmanager

SERIAL_PORT = '/dev/serial0'
BAUDRATE = 115200

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Globale Variablen
ser = None
connected_clients = set()

# UART initialisieren
def init_uart():
    global ser
    try:
        ser = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=0.05)
        logger.info(f"UART verbunden: {SERIAL_PORT}")
    except Exception as e:
        logger.error(f"UART Fehler: {e}")
        ser = None

# Hintergrund-Task für UART-Datenverarbeitung
async def uart_task():
    buffer = ""
    while True:
        try:
            # If UART not available, emit simulated telemetry for development/testing
            if ser is None:
                data_dict = {
                    "RPM": str(random.randint(500, 7000)),
                    "SPEED": str(random.randint(0, 255)),
                    "COOLANT": f"{random.randint(18,90)}°C"
                }
                for ws in list(connected_clients):
                    try:
                        await ws.send_json(data_dict)
                    except Exception:
                        connected_clients.discard(ws)
                logger.debug(f"Simulated data: {data_dict}")
                await asyncio.sleep(0.2)
                continue
            if ser and ser.in_waiting:
                buffer += ser.read(ser.in_waiting).decode(errors='ignore')
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    if line:
                        data_dict = {}
                        for part in line.split(','):
                            if ':' in part:
                                k, v = part.split(':', 1)
                                data_dict[k.strip()] = v.strip()
                        if data_dict:
                            # Broadcast data to any connected WebSocket clients
                            for ws in list(connected_clients):
                                try:
                                    await ws.send_json(data_dict)
                                except Exception:
                                    connected_clients.discard(ws)
                            logger.info(f"Daten empfangen: {data_dict}")
        except Exception as e:
            logger.error(f"Fehler bei UART-Verarbeitung: {e}")
        
        await asyncio.sleep(0.01)

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
        "uart_connected": ser is not None
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
