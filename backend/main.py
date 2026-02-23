from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import csv
import io
import serial
import asyncio
import logging
import random
import platform
import os
import subprocess
import threading
import time
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from db import DatabaseConnection
from data_aggregator import DataAggregator, RawDataPoint

# UART Konfiguration für OBD-Daten
# Raspberry Pi Standard UART Ports
SERIAL_PORTS = ['/dev/ttyAMA0', '/dev/ttyS0', '/dev/serial0']
BAUDRATE = 115200
SERIAL_PORT = None

# IR Konfiguration
IR_GPIO_PIN = 17
IR_CODE_MAP = {
    0xBA45FF00: "POWER",
    0xF807FF00: "DOWN",
    0xF609FF00: "UP",
    0xF30CFF00: "IR_1",
    0xE718FF00: "IR_2",
    0xA15EFF00: "IR_3",
}
IR_PULSE_TOLERANCE = 0.3

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Globale Variablen
ser = None
connected_clients = set()
db_url = os.getenv("DATABASE_URL", "database.db")
db = DatabaseConnection(db_url)
aggregator = DataAggregator()
ir_device = None
ir_command_lock = threading.Lock()
pending_ir_command = None

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


def _is_close_to(value: float, target: float, tolerance: float = IR_PULSE_TOLERANCE) -> bool:
    return target * (1 - tolerance) <= value <= target * (1 + tolerance)


class NECDecoder:
    def __init__(self, on_code):
        self.on_code = on_code
        self.reset()

    def reset(self):
        self.collecting = False
        self.expecting_bit_low = False
        self.bits = []
        self.seen_leader_low = False

    def feed_pulse(self, level: int, duration_us: float):
        if not self.collecting:
            if level == 0 and _is_close_to(duration_us, 9000):
                self.seen_leader_low = True
                return
            if self.seen_leader_low and level == 1 and _is_close_to(duration_us, 4500):
                self.collecting = True
                self.expecting_bit_low = True
                self.bits = []
                self.seen_leader_low = False
                return
            self.seen_leader_low = False
            return

        if self.expecting_bit_low:
            if level == 0 and _is_close_to(duration_us, 560):
                self.expecting_bit_low = False
                return
            self.reset()
            return

        if level == 1:
            if _is_close_to(duration_us, 560):
                self.bits.append(0)
            elif _is_close_to(duration_us, 1690):
                self.bits.append(1)
            else:
                self.reset()
                return
            self.expecting_bit_low = True

            if len(self.bits) == 32:
                code = 0
                for i, bit in enumerate(self.bits):
                    code |= (bit << i)
                self.on_code(code)
                self.reset()
            return

        self.reset()


def _handle_ir_code(code: int):
    global pending_ir_command
    command = IR_CODE_MAP.get(code)
    if not command:
        logger.debug(f"Unbekannter IR-Code: {hex(code)}")
        return

    if command == "POWER":
        if platform.system().lower() == "linux":
            logger.info("IR POWER empfangen: System wird heruntergefahren")
            try:
                subprocess.Popen(["sudo", "shutdown", "-h", "now"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as exc:
                logger.error(f"Shutdown fehlgeschlagen: {exc}")
        else:
            logger.info("IR POWER empfangen: Shutdown nur unter Linux moeglich")

    with ir_command_lock:
        pending_ir_command = command


def init_ir_receiver():
    global ir_device
    try:
        from gpiozero import DigitalInputDevice
    except Exception as exc:
        logger.error(f"gpiozero nicht verfuegbar: {exc}")
        return False

    decoder = NECDecoder(_handle_ir_code)
    last_edge_time = {"time": None}
    last_level = {"value": None}

    ir_device = DigitalInputDevice(IR_GPIO_PIN, pull_up=True)
    last_level["value"] = 0 if ir_device.value == 0 else 1
    last_edge_time["time"] = time.monotonic()

    def on_edge():
        now = time.monotonic()
        prev_time = last_edge_time["time"]
        if prev_time is not None:
            duration_us = (now - prev_time) * 1_000_000
            decoder.feed_pulse(last_level["value"], duration_us)
        last_edge_time["time"] = now
        last_level["value"] = 0 if ir_device.value == 0 else 1

    ir_device.when_activated = on_edge
    ir_device.when_deactivated = on_edge
    logger.info(f"IR-Empfaenger aktiviert auf GPIO {IR_GPIO_PIN}")
    return True

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
    global obd_data, last_broadcast_time, pending_ir_command
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
                ir_command = None
                with ir_command_lock:
                    if pending_ir_command is not None:
                        ir_command = pending_ir_command
                        pending_ir_command = None
                broadcast_data = {
                    **obd_data,
                    "UART_CONNECTED": uart_connected,
                    "TIME": corrected_time.strftime("%H:%M:%S"),
                }
                if ir_command:
                    broadcast_data["IR_COMMAND"] = ir_command
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
    init_ir_receiver()
    uart_bg_task = asyncio.create_task(uart_task())
    db_bg_task = asyncio.create_task(database_writer_task())
    logger.info("Backend gestartet - UART und Datenbankschreiber aktiviert")
    yield
    # Shutdown
    if ser:
        ser.close()
    if ir_device:
        ir_device.close()
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


def _build_csv_text() -> str:
    tables = ["owners", "auto", "logs_1sec", "logs_10sec"]
    output = io.StringIO()

    with db.get_connection() as conn:
        cursor = conn.cursor()
        for table in tables:
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table,),
            )
            if not cursor.fetchone():
                continue

            output.write(f"# table: {table}\n")

            cursor.execute(f"PRAGMA table_info({table})")
            columns = [row[1] for row in cursor.fetchall()]
            if not columns:
                output.write("\n")
                continue

            writer = csv.writer(output)
            writer.writerow(columns)

            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            for row in rows:
                writer.writerow([row[col] for col in columns])

            output.write("\n")

    return output.getvalue()


@app.get("/api/database/download-text")
async def download_database_text():
    """Lädt die Datenbank als Text (CSV) herunter"""
    csv_text = _build_csv_text()
    filename = f"database_{datetime.now().strftime('%Y-%m-%d')}.txt"
    return Response(
        content=csv_text,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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
