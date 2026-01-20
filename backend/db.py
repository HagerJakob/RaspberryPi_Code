import os
import sqlite3
from typing import List, Tuple, Any
from contextlib import contextmanager
from pathlib import Path


def _resolve_db_path(url_or_path: str) -> str:
    """Convert sqlite URL (sqlite:////path) or plain path into a filesystem path."""
    if url_or_path.startswith("sqlite:///"):
        return url_or_path.replace("sqlite:///", "", 1)
    if url_or_path.startswith("sqlite://"):
        return url_or_path.replace("sqlite://", "", 1)
    return url_or_path

class DatabaseConnection:
    def __init__(self, db_path: str = "database.db"):
        self.db_path = _resolve_db_path(db_path)
        self.init_db()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def init_db(self):
        """Initialize database with tables from schema.sql"""
        schema_path = Path(__file__).parent / "db" / "schema.sql"
        
        if not schema_path.exists():
            raise FileNotFoundError(f"Schema file not found at {schema_path}")
        
        with open(schema_path, 'r') as f:
            schema = f.read()
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executescript(schema)

            # Ensure default owner/auto exist so logs have a target
            cursor.execute(
                """
                INSERT OR IGNORE INTO owners (id, name, email)
                VALUES (1, 'Default Owner', 'owner@example.com')
                """
            )
            cursor.execute(
                """
                INSERT OR IGNORE INTO auto (id, owner, make, model, km_stand, year, vin)
                VALUES (1, 1, 'Unknown', 'Unknown', 0, 2000, 'DEFAULTVIN0000000')
                """
            )
    
    def execute_query(self, query: str, params: Tuple = ()) -> List[dict]:
        """Execute SELECT query and return results"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def execute_update(self, query: str, params: Tuple = ()) -> int:
        """Execute INSERT, UPDATE, DELETE query"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.rowcount

    def insert_log_entry(
        self,
        auto_id: int,
        speed: int,
        rpm: int,
        coolant_temp: int,
        fuel_level: int,
        gps_latitude: float,
        gps_longitude: float,
    ) -> None:
        """Insert a new log row."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO logs (
                    auto_id, geschwindigkeit, rpm, coolant_temp,
                    fuel_level, gps_latitude, gps_longitude
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (auto_id, speed, rpm, coolant_temp, fuel_level, gps_latitude, gps_longitude),
            )

# Usage example
if __name__ == "__main__":
    db = DatabaseConnection(os.getenv("DATABASE_URL", "database.db"))
    results = db.execute_query("SELECT * FROM owners")
    print(results)