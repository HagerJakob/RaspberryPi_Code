from flask import Flask, render_template
from flask_socketio import SocketIO
import serial
import sqlite3
import time
from datetime import datetime

SERIAL_PORT = '/dev/serial0'
BAUDRATE = 115200

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# -----------------------------
# SQLite Datenbank Setup
# -----------------------------
DB_FILE = "obd_data.db"

conn = sqlite3.connect(DB_FILE)
c = conn.cursor()
c.execute("""
    CREATE TABLE IF NOT EXISTS obd (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        key TEXT,
        value TEXT
    )
""")
conn.commit()
conn.close()

# -----------------------------
# UART Verbindung
# -----------------------------
try:
    ser = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=0.05)
    print(f"UART verbunden: {SERIAL_PORT}")
except Exception as e:
    print("UART Fehler:", e)
    ser = None

@app.route("/")
def index():
    return render_template("dashboard.html")

# -----------------------------
# UART Hintergrundtask
# -----------------------------
def uart_task():
    buffer = ""
    while True:
        if ser and ser.in_waiting:
            buffer += ser.read(ser.in_waiting).decode(errors='ignore')
            while '\n' in buffer:
                line, buffer = buffer.split('\n', 1)
                line = line.strip()
                if line:
                    data_dict = {}
                    for part in line.split(','):
                        if ':' in part:
                            k,v = part.split(':',1)
                            data_dict[k.strip()] = v.strip()
                    if data_dict:
                        # Push an Browser
                        socketio.emit('update', data_dict)

                        # In Datenbank speichern
                        conn = sqlite3.connect(DB_FILE)
                        c = conn.cursor()
                        timestamp = datetime.now().isoformat()
                        for k,v in data_dict.items():
                            c.execute("INSERT INTO obd (timestamp, key, value) VALUES (?, ?, ?)",
                                      (timestamp, k, v))
                        conn.commit()
                        conn.close()

        socketio.sleep(0.01)  # Eventlet-kompatibles Sleep

# -----------------------------
# Hintergrundtask starten
# -----------------------------
socketio.start_background_task(uart_task)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
