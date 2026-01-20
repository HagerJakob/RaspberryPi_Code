#!/usr/bin/env python3
"""
Bluetooth Server für Raspberry Pi
Sendet die SQLite-Datenbank über Bluetooth auf Anfrage vom Laptop
"""

import os
import socket
import sys
from pathlib import Path

try:
    import bluetooth
except ImportError:
    print("PyBluez nicht installiert. Installiere: pip install pybluez")
    sys.exit(1)

# Konfiguration
DB_PATH = os.getenv("DATABASE_URL", "/db/app.db")
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH.replace("sqlite:///", "", 1)

SERVICE_NAME = "RaspberryPi Dashboard"
SERVICE_UUID = "94f39d29-7d6d-437d-973b-fba39e49d4ee"


def start_bluetooth_server():
    """Startet einen Bluetooth-Server auf RFCOMM Kanal 1"""
    print(f"[*] Starte Bluetooth-Server für: {SERVICE_NAME}")
    print(f"[*] Datenbank: {DB_PATH}")

    # Bluetooth Socket erstellen
    server_socket = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
    server_socket.bind(("", bluetooth.PORT_ANY))
    server_socket.listen(1)

    port = server_socket.getsockname()[1]

    # Service registrieren
    bluetooth.advertise_service(
        server_socket,
        SERVICE_NAME,
        service_id=SERVICE_UUID,
        service_classes=[bluetooth.SERIAL_PORT_CLASS],
        profiles=[bluetooth.SERIAL_PORT_PROFILE],
        protocols=[bluetooth.OBEX_UUID],
        description=f"Sendet die OBD-Datenbank",
        provider="RaspberryPi",
    )

    print(f"[+] Bluetooth-Server läuft auf Port {port}")
    print(f"[+] Warte auf Verbindungen von Windows Laptop...")

    try:
        while True:
            print("[*] Warte auf eingehende Verbindung...")
            client_socket, client_info = server_socket.accept()
            print(f"[+] Verbindung von {client_info} hergestellt!")

            try:
                # Prüfe ob DB-Datei existiert
                if not os.path.exists(DB_PATH):
                    error_msg = f"FEHLER: Datenbank nicht gefunden: {DB_PATH}\n"
                    client_socket.send(error_msg.encode())
                    print(f"[-] {error_msg.strip()}")
                    client_socket.close()
                    continue

                # Sende Datei
                file_size = os.path.getsize(DB_PATH)
                print(f"[*] Sende Datenbank ({file_size} bytes)...")

                # Sende Größe zuerst (4 bytes)
                client_socket.send(file_size.to_bytes(4, byteorder="little"))

                # Sende Dateiinhalt
                with open(DB_PATH, "rb") as f:
                    while True:
                        chunk = f.read(4096)
                        if not chunk:
                            break
                        client_socket.send(chunk)

                print(f"[+] Datenbank erfolgreich gesendet!")

            except Exception as e:
                print(f"[-] Fehler beim Senden: {e}")
            finally:
                client_socket.close()

    except KeyboardInterrupt:
        print("\n[*] Bluetooth-Server beendet")
    finally:
        server_socket.close()


if __name__ == "__main__":
    start_bluetooth_server()
