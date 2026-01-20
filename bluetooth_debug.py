#!/usr/bin/env python3
"""
Debug-Script um zu sehen was auf dem COM-Port ankommt
"""

import serial
import time

com_port = input("COM-Port (z.B. COM5): ").strip()

print(f"[*] Öffne {com_port}...")
ser = serial.Serial(com_port, timeout=2)

print("[+] Port geöffnet, warte auf Daten (10 Sekunden)...")

start = time.time()
total = 0

while time.time() - start < 10:
    data = ser.read(1024)
    if data:
        total += len(data)
        print(f"[+] Empfangen: {len(data)} bytes (Total: {total})")
        print(f"    Hex: {data[:50].hex()}...")
    else:
        print(".", end="", flush=True)
    time.sleep(0.1)

print(f"\n[*] Total empfangen: {total} bytes")
ser.close()
