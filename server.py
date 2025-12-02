from flask import Flask, render_template
from flask_socketio import SocketIO
import serial
import time

SERIAL_PORT = '/dev/serial0'
BAUDRATE = 115200

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

try:
    ser = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=0.05)
    print(f"UART verbunden: {SERIAL_PORT}")
except Exception as e:
    print("UART Fehler:", e)
    ser = None

@app.route("/")
def index():
    return render_template("dashboard.html")

# Eventlet-kompatible Hintergrundtask
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
                        socketio.emit('update', data_dict)  # push an Browser
        socketio.sleep(0.005)  # Eventlet-kompatibles Sleep

# Starte Hintergrundtask
socketio.start_background_task(uart_task)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
