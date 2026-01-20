#!/usr/bin/env python3
"""
Sync-Script für Windows Laptop
Synchronisiert Logs vom Raspberry Pi
"""

import requests
import json
import time
import os
from datetime import datetime
from pathlib import Path

SYNC_FILE = "sync_state.json"  # Speichert den letzten Sync-Timestamp
LOCAL_DB = "logs_sync.json"    # Lokale Log-Datei

def load_sync_state():
    """Lädt den letzten Sync-Timestamp"""
    if os.path.exists(SYNC_FILE):
        try:
            with open(SYNC_FILE, "r") as f:
                data = json.load(f)
                return data.get("last_timestamp", 0.0)
        except Exception as e:
            print(f"[-] Fehler beim Laden des Sync-Status: {e}")
            return 0.0
    return 0.0

def save_sync_state(timestamp):
    """Speichert den aktuellen Timestamp"""
    try:
        with open(SYNC_FILE, "w") as f:
            json.dump({"last_timestamp": timestamp, "last_sync": datetime.now().isoformat()}, f, indent=2)
    except Exception as e:
        print(f"[-] Fehler beim Speichern des Sync-Status: {e}")

def load_local_logs():
    """Lädt lokale Logs"""
    if os.path.exists(LOCAL_DB):
        try:
            with open(LOCAL_DB, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_local_logs(logs):
    """Speichert Logs lokal"""
    try:
        with open(LOCAL_DB, "w") as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        print(f"[-] Fehler beim Speichern der Logs: {e}")

def sync_logs(rpi_ip="localhost", rpi_port=5000):
    """Synchronisiert Logs vom Raspberry Pi"""
    print("=== Log-Sync vom Raspberry Pi ===\n")
    
    # Lade letzten Sync-Timestamp
    last_timestamp = load_sync_state()
    print(f"[*] Letzter Sync: {datetime.fromtimestamp(last_timestamp) if last_timestamp else 'Nie'}")
    
    # Frage neue Logs ab
    url = f"http://{rpi_ip}:{rpi_port}/api/logs/since"
    params = {"timestamp": last_timestamp}
    
    print(f"[*] Verbinde mit {rpi_ip}:{rpi_port}...")
    
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        logs = data.get("logs", [])
        new_timestamp = data.get("timestamp", time.time())
        count = data.get("count", 0)
        
        print(f"[+] {count} neue Logs erhalten")
        
        if count > 0:
            # Lade existierende Logs
            all_logs = load_local_logs()
            
            # Füge neue Logs hinzu
            all_logs.extend(logs)
            
            # Speichere lokal
            save_local_logs(all_logs)
            
            # Aktualisiere Sync-Timestamp
            save_sync_state(new_timestamp)
            
            print(f"[+] Logs gespeichert: {LOCAL_DB}")
            print(f"[+] Gesamtanzahl Logs: {len(all_logs)}")
            
            # Zeige letzte Logs
            print("\n[+] Letzte 5 Logs:")
            for log in all_logs[-5:]:
                ts = log.get("timestamp", "?")
                speed = log.get("geschwindigkeit", 0)
                rpm = log.get("rpm", 0)
                print(f"    {ts}: Speed={speed} km/h, RPM={rpm}")
        else:
            print("[*] Keine neuen Logs")
            save_sync_state(new_timestamp)
        
        print(f"\n[✓] Sync erfolgreich!")
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"[-] Verbindung fehlgeschlagen zu {rpi_ip}:{rpi_port}")
        print("[*] Prüfe ob:")
        print("    1. Der Raspberry Pi läuft")
        print("    2. docker compose up --build ausgeführt wurde")
        print("    3. Der Laptop und Pi im gleichen Netzwerk sind")
        return False
    except Exception as e:
        print(f"[-] Fehler: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    rpi_ip = sys.argv[1] if len(sys.argv) > 1 else input("Raspberry Pi IP (oder 'localhost'): ").strip() or "localhost"
    rpi_port = int(sys.argv[2]) if len(sys.argv) > 2 else 5000
    
    sync_logs(rpi_ip, rpi_port)
