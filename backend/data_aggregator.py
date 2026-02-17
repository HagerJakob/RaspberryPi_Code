import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import statistics

logger = logging.getLogger(__name__)


@dataclass
class RawDataPoint:
    """Ein einzelner Datenpunkt von den Sensoren"""
    timestamp: datetime
    rpm: Optional[float] = None
    speed: Optional[float] = None
    coolant_temp: Optional[float] = None
    oil_temp: Optional[float] = None
    fuel_level: Optional[float] = None
    voltage: Optional[float] = None
    boost: Optional[float] = None
    oil_pressure: Optional[float] = None


class DataAggregator:
    """Aggregiert Sensor-Daten in 1-Sekunden und 10-Sekunden Fenster"""
    
    def __init__(self):
        self.buffer: List[RawDataPoint] = []
        self.last_1sec_save = datetime.now()
        self.last_10sec_save = datetime.now()
        
    def add_data(self, data: RawDataPoint) -> None:
        """Fügt einen neuen Datenpunkt zum Puffer hinzu"""
        self.buffer.append(data)
        # Alte Daten entfernen (älter als 10 Sekunden)
        cutoff = datetime.now() - timedelta(seconds=10)
        self.buffer = [d for d in self.buffer if d.timestamp > cutoff]
    
    def should_save_1sec(self) -> bool:
        """Prüft ob 1 Sekunde vergangen ist"""
        now = datetime.now()
        return (now - self.last_1sec_save).total_seconds() >= 1.0
    
    def should_save_10sec(self) -> bool:
        """Prüft ob 10 Sekunden vergangen sind"""
        now = datetime.now()
        return (now - self.last_10sec_save).total_seconds() >= 10.0
    
    def get_1sec_average(self) -> Optional[Dict]:
        """Berechnet Durchschnitt für 1 Sekunde (RPM und SPEED)"""
        if not self.buffer:
            return None
        
        now = datetime.now()
        one_second_ago = now - timedelta(seconds=1)
        recent_data = [d for d in self.buffer if d.timestamp > one_second_ago]
        
        if not recent_data:
            return None
        
        rpm_values = [d.rpm for d in recent_data if d.rpm is not None]
        speed_values = [d.speed for d in recent_data if d.speed is not None]
        
        result = {}
        if rpm_values:
            result['rpm'] = statistics.mean(rpm_values)
        if speed_values:
            result['speed'] = statistics.mean(speed_values)
        
        return result if result else None
    
    def get_10sec_average(self) -> Optional[Dict]:
        """Berechnet Durchschnitt für 10 Sekunden"""
        if not self.buffer:
            return None
        
        now = datetime.now()
        ten_seconds_ago = now - timedelta(seconds=10)
        recent_data = [d for d in self.buffer if d.timestamp > ten_seconds_ago]
        
        if not recent_data:
            return None
        
        result = {}
        
        fields = [
            ('coolant_temp', 'coolant_temp'),
            ('oil_temp', 'oil_temp'),
            ('fuel_level', 'fuel_level'),
            ('voltage', 'voltage'),
            ('boost', 'boost'),
            ('oil_pressure', 'oil_pressure'),
        ]
        
        for field_name, attr in fields:
            values = [getattr(d, attr) for d in recent_data if getattr(d, attr) is not None]
            if values:
                result[field_name] = statistics.mean(values)
        
        return result if result else None
    
    def reset_1sec_timer(self) -> None:
        """Setzt den 1-Sekunden Timer zurück"""
        self.last_1sec_save = datetime.now()
    
    def reset_10sec_timer(self) -> None:
        """Setzt den 10-Sekunden Timer zurück"""
        self.last_10sec_save = datetime.now()
    
    def get_current_raw_data(self) -> Optional[RawDataPoint]:
        """Gibt den neuesten Rohwert zurück"""
        return self.buffer[-1] if self.buffer else None


# Globale Instanzen
aggregator = DataAggregator()
