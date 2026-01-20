#!/usr/bin/env python3
"""
Bluetooth RFCOMM Server für Raspberry Pi
Sendet die SQLite-Datenbank über Bluetooth auf Anfrage vom Laptop
Nutzt COM-Port für einfache Windows-Kommunikation
"""

import os
import socket
import sys

try:
    import bluetooth
except ImportError:
    print("PyBluez nicht installiert. Installiere: sudo apt install python3-bluez")
    sys.exit(1)

# Konfiguration
DB_PATH = os.getenv("DATABASE_URL", "/db/app.db")
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH.replace("sqlite:///", "", 1)

RFCOMM_CHANNEL = 1


def start_bluetooth_server():
    """Startet einen Bluetooth RFCOMM Server auf Kanal 1"""
    print(f"[*] Starte Bluetooth RFCOMM Server auf Kanal {RFCOMM_CHANNEL}")
    print(f"[*] Datenbank: {DB_PATH}")

    # Bluetooth Socket erstellen
    server_socket = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
    server_socket.bind(("", RFCOMM_CHANNEL))
    server_socket.listen(1)

    print(f"[+] Bluetooth-Server läuft auf RFCOMM Kanal {RFCOMM_CHANNEL}")
    print(f"[+] Warte auf Verbindungen von Windows Laptop...")
    print(f"[+] Windows erkennt dies als COM-Port")

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

                # Sende Größe zuerst (4 bytes, Little-Endian)
                client_socket.send(file_size.to_bytes(4, byteorder="little"))

                # Sende Dateiinhalt
                sent = 0
                with open(DB_PATH, "rb") as f:
                    while True:
                        chunk = f.read(4096)
                        if not chunk:
                            break
                        client_socket.send(chunk)
                        sent += len(chunk)
                        progress = (sent / file_size) * 100
                        print(f"[*] Fortschritt: {progress:.1f}%", end="\r")

                print(f"\n[+] Datenbank erfolgreich gesendet ({sent} bytes)!")

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

