import os
import sqlite3
import logging
from typing import List, Tuple, Any
from contextlib import contextmanager
from pathlib import Path

logger = logging.getLogger(__name__)


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
            
            # Split statements by semicolon and execute individually
            # This allows "IF NOT EXISTS" to work properly
            statements = schema.split(';')
            for statement in statements:
                statement = statement.strip()
                if statement:
                    try:
                        cursor.execute(statement)
                    except Exception as e:
                        # Ignore errors for idempotent operations
                        logger.debug(f"Schema statement ignored: {e}")

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

    def insert_log_1sec(
        self,
        auto_id: int,
        geschwindigkeit: float,
        rpm: float,
    ) -> None:
        """Insert 1-second average log row."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO logs_1sec (
                    auto_id, geschwindigkeit, rpm
                ) VALUES (?, ?, ?)
                """,
                (auto_id, geschwindigkeit, rpm),
            )

    def insert_log_10sec(
        self,
        auto_id: int,
        coolant_temp: float,
        oil_temp: float,
        fuel_level: float,
        voltage: float,
        boost: float,
        oil_pressure: float,
    ) -> None:
        """Insert 10-second average log row."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO logs_10sec (
                    auto_id, coolant_temp, oil_temp, fuel_level,
                    voltage, boost, oil_pressure
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (auto_id, coolant_temp, oil_temp, fuel_level, voltage, boost, oil_pressure),
            )

    def get_latest_logs_1sec(self, auto_id: int, limit: int = 60) -> List[dict]:
        """Get the latest 1-second logs."""
        return self.execute_query(
            """
            SELECT * FROM logs_1sec
            WHERE auto_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (auto_id, limit),
        )

    def get_latest_logs_10sec(self, auto_id: int, limit: int = 60) -> List[dict]:
        """Get the latest 10-second logs."""
        return self.execute_query(
            """
            SELECT * FROM logs_10sec
            WHERE auto_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (auto_id, limit),
        )

# Usage example
if __name__ == "__main__":
    db = DatabaseConnection(os.getenv("DATABASE_URL", "database.db"))
    results = db.execute_query("SELECT * FROM owners")
    print(results)