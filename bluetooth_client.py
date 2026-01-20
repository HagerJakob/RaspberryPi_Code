#!/usr/bin/env python3
"""
Bluetooth Client für Windows Laptop
Verbindet sich mit dem Raspberry Pi und empfängt die Datenbank
"""

import sys
import os

try:
    import bluetooth
except ImportError:
    print("PyBluez nicht installiert. Installiere: pip install pybluez")
    sys.exit(1)


def find_raspberry_pi():
    """Sucht den Raspberry Pi in der Nähe"""
    print("[*] Suche nach Raspberry Pi Bluetooth-Geräten...")
    nearby_devices = bluetooth.discover_devices(lookup_names=True)

    if not nearby_devices:
        print("[-] Keine Bluetooth-Geräte gefunden!")
        return None

    print("\n[+] Gefundene Geräte:")
    for i, (addr, name) in enumerate(nearby_devices, 1):
        print(f"    {i}. {name} ({addr})")

    choice = input("\nWähle Geräte-Nummer (oder MAC-Adresse): ").strip()

    if choice.isdigit() and 1 <= int(choice) <= len(nearby_devices):
        return nearby_devices[int(choice) - 1][0]
    else:
        return choice  # Annahme: MAC-Adresse eingegeben


def connect_and_receive(device_addr, save_path="./app.db"):
    """Verbindet sich mit dem Pi und empfängt die Datenbank"""
    print(f"\n[*] Verbinde mit {device_addr}...")

    # Suche den Bluetooth-Service
    services = bluetooth.find_service(address=device_addr)
    if not services:
        print("[-] Keine Services auf diesem Gerät gefunden!")
        return False

    print(f"[+] Gefundene Services: {len(services)}")

    # Finde RFCOMM Service (Serial Port)
    rfcomm_service = None
    for service in services:
        print(f"    - {service['name']} (Port {service['port']})")
        if "Dashboard" in service.get("name", ""):
            rfcomm_service = service
            break

    if not rfcomm_service and services:
        rfcomm_service = services[0]  # Fallback auf ersten Service

    if not rfcomm_service:
        print("[-] Kein passender Service gefunden!")
        return False

    port = rfcomm_service["port"]
    print(f"[*] Nutze Service auf Port {port}")

    try:
        # Erstelle Bluetooth Socket
        client_socket = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
        client_socket.connect((device_addr, port))
        print("[+] Verbindung hergestellt!")

        # Empfange Dateigrößeinfo (4 bytes)
        print("[*] Empfange Dateigrößeinfo...")
        size_bytes = client_socket.recv(4)

        if len(size_bytes) == 0:
            print("[-] Keine Größeinfo erhalten!")
            client_socket.close()
            return False

        file_size = int.from_bytes(size_bytes, byteorder="little")

        # Prüfe ob es Fehler ist
        if file_size > 1000000000:  # > 1GB würde Fehler bedeuten
            print(f"[-] Fehler vom Pi: {file_size}")
            client_socket.close()
            return False

        print(f"[*] Empfange {file_size} bytes...")

        # Empfange Datei
        received = 0
        with open(save_path, "wb") as f:
            while received < file_size:
                remaining = file_size - received
                chunk_size = min(4096, remaining)
                chunk = client_socket.recv(chunk_size)

                if not chunk:
                    print("[-] Verbindung unterbrochen!")
                    break

                f.write(chunk)
                received += len(chunk)

                # Progress anzeigen
                progress = (received / file_size) * 100
                print(f"[*] Fortschritt: {progress:.1f}% ({received}/{file_size} bytes)", end="\r")

        print(f"\n[+] Datei erfolgreich gespeichert: {save_path}")
        client_socket.close()
        return True

    except Exception as e:
        print(f"[-] Fehler: {e}")
        return False


if __name__ == "__main__":
    # Beispielnutzung
    device = find_raspberry_pi()
    if device:
        connect_and_receive(device)
    else:
        print("[-] Kein Gerät ausgewählt")
