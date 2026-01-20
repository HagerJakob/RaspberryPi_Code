#!/usr/bin/env python3
"""
Bluetooth COM-Port Client für Windows Laptop
Verbindet sich mit dem Raspberry Pi über COM-Port und empfängt die Datenbank
Braucht nur pyserial - kein pybluez!
"""

import sys
import os

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("pyserial nicht installiert. Installiere: pip install pyserial")
    sys.exit(1)


def list_com_ports():
    """Listet verfügbare COM-Ports auf"""
    ports = serial.tools.list_ports.comports()
    
    print("[+] Verfügbare COM-Ports:")
    com_list = []
    for port in ports:
        print(f"    {port.device}: {port.description}")
        com_list.append(port.device)
    
    return com_list


def connect_and_receive(com_port, save_path="./app.db"):
    """Verbindet sich über COM-Port mit dem Pi und empfängt die Datenbank"""
    print(f"\n[*] Verbinde mit {com_port}...")

    try:
        # Verbinde mit COM-Port mit langem Timeout
        ser = serial.Serial(com_port, timeout=5)
        print("[+] Verbindung hergestellt!")
        
        # Kurz warten, damit Server bereit ist
        import time
        time.sleep(1)

        # Empfange Dateigrößeinfo (4 bytes)
        print("[*] Empfange Dateigrößeinfo...")
        size_bytes = ser.read(4)

        if len(size_bytes) < 4:
            print(f"[-] Keine oder zu wenige Größeinfo erhalten! ({len(size_bytes)} bytes)")
            print("[-] Verbindung fehlgeschlagen.")
            print("[-] Prüfe ob der Raspberry Pi Server läuft!")
            print("[-] Prüfe auch ob COM-Port richtig ist!")
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
                    print(f"\n[-] Verbindung unterbrochen bei {received}/{file_size} bytes!")
                    break

                f.write(chunk)
                received += len(chunk)

                # Progress anzeigen
                progress = (received / file_size) * 100
                print(f"[*] Fortschritt: {progress:.1f}% ({received}/{file_size} bytes)", end="\r")

        if received == file_size:
            print(f"\n[+] Datei erfolgreich gespeichert: {save_path}")
            ser.close()
            return True
        else:
            print(f"\n[-] Unvollständiger Download: {received}/{file_size} bytes")
            ser.close()
            return False

    except Exception as e:
        print(f"[-] Fehler: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=== Bluetooth Database Download (COM-Port) ===\n")
    
    # Liste verfügbare COM-Ports
    com_list = list_com_ports()
    
    if not com_list:
        print("\n[-] Keine COM-Ports gefunden!")
        print("[*] Bitte verbinde den Raspberry Pi über Bluetooth:")
        print("    1. Windows Einstellungen → Bluetooth & Geräte")
        print("    2. Gerät hinzufügen → Wähle Raspberry Pi")
        sys.exit(1)
    
    # Wähle COM-Port
    choice = input("\nWähle COM-Port Nummer (z.B. 3 für COM3): ").strip()
    
    if choice.isdigit():
        com_port = f"COM{choice}"
    else:
        com_port = choice
    
    # Überprüfe ob Port existiert
    if com_port not in com_list:
        print(f"[-] {com_port} nicht gefunden!")
        sys.exit(1)
    
    # Verbinde und empfange
    print()
    if connect_and_receive(com_port):
        print("\n[✓] Download erfolgreich!")
    else:
        print("\n[✗] Download fehlgeschlagen!")

