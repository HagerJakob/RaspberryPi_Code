#!/usr/bin/env python3
"""
Bluetooth COM-Port Client für Windows Laptop
Verbindet sich mit dem Raspberry Pi über COM-Port und empfängt die Datenbank
"""

import sys
import os

try:
    import serial
except ImportError:
    print("pyserial nicht installiert. Installiere: pip install pyserial")
    sys.exit(1)

try:
    import bluetooth
except ImportError:
    print("PyBluez nicht installiert. Installiere: pip install pybluez")
    sys.exit(1)


def list_com_ports():
    """Listet verfügbare COM-Ports auf"""
    import serial.tools.list_ports
    
    ports = serial.tools.list_ports.comports()
    bluetooth_ports = []
    
    for port in ports:
        print(f"    {port.device}: {port.description}")
        if "Bluetooth" in port.description or "rfcomm" in port.description:
            bluetooth_ports.append(port.device)
    
    return bluetooth_ports


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


def create_rfcomm_binding(device_addr):
    """Erstellt RFCOMM Binding (nur auf Linux/Mac nötig)"""
    # Unter Windows wird dies automatisch gemacht
    print(f"[*] Verbinde mit {device_addr} über RFCOMM...")
    
    try:
        # Auf Windows wird der COM-Port automatisch erstellt
        # Hier nur für Linux/Mac relevant
        import platform
        if platform.system() != "Windows":
            os.system(f"sudo rfcomm bind /dev/rfcomm0 {device_addr} 1")
    except Exception as e:
        print(f"[!] RFCOMM Binding fehlgeschlagen: {e}")


def connect_and_receive_via_comport(com_port, save_path="./app.db"):
    """Verbindet sich über COM-Port mit dem Pi und empfängt die Datenbank"""
    print(f"\n[*] Verbinde mit {com_port}...")

    try:
        # Verbinde mit COM-Port
        ser = serial.Serial(com_port, timeout=10)
        print("[+] Verbindung hergestellt!")

        # Empfange Dateigrößeinfo (4 bytes)
        print("[*] Empfange Dateigrößeinfo...")
        size_bytes = ser.read(4)

        if len(size_bytes) < 4:
            print("[-] Keine Größeinfo erhalten!")
            ser.close()
            return False

        file_size = int.from_bytes(size_bytes, byteorder="little")

        # Prüfe ob es Fehler ist
        if file_size > 1000000000:  # > 1GB würde Fehler bedeuten
            print(f"[-] Fehler vom Pi: {file_size}")
            ser.close()
            return False

        print(f"[*] Empfange {file_size} bytes...")

        # Empfange Datei
        received = 0
        with open(save_path, "wb") as f:
            while received < file_size:
                remaining = file_size - received
                chunk_size = min(4096, remaining)
                chunk = ser.read(chunk_size)

                if not chunk:
                    print("[-] Verbindung unterbrochen!")
                    break

                f.write(chunk)
                received += len(chunk)

                # Progress anzeigen
                progress = (received / file_size) * 100
                print(f"[*] Fortschritt: {progress:.1f}% ({received}/{file_size} bytes)", end="\r")

        print(f"\n[+] Datei erfolgreich gespeichert: {save_path}")
        ser.close()
        return True

    except Exception as e:
        print(f"[-] Fehler: {e}")
        return False


if __name__ == "__main__":
    import platform
    
    print("=== Bluetooth Database Download ===\n")
    
    # Wähle COM-Port
    print("[*] Verfügbare COM-Ports:")
    bluetooth_ports = list_com_ports()
    
    if not bluetooth_ports:
        print("\n[!] Kein Bluetooth COM-Port gefunden!")
        print("[*] Suche Bluetooth-Geräte um Binding zu erstellen...")
        
        device = find_raspberry_pi()
        if device:
            create_rfcomm_binding(device)
            
            if platform.system() == "Windows":
                print("[*] Bitte unter Einstellungen → Bluetooth den Pi koppeln")
                print("[*] Dann prüfen Sie unter 'COM-Ports (COM & LPT)'")
            
            # Versuche erneut
            print("\n[*] Verfügbare COM-Ports:")
            bluetooth_ports = list_com_ports()
    
    if not bluetooth_ports:
        print("[-] Keine Bluetooth COM-Ports gefunden. Bitte Pi koppeln!")
        sys.exit(1)
    
    # Wähle COM-Port
    choice = input("\nWähle COM-Port Nummer (z.B. 1 für COM1): ").strip()
    
    if choice.isdigit():
        com_port = f"COM{choice}"
    else:
        com_port = choice
    
    # Verbinde und empfange
    connect_and_receive_via_comport(com_port)

