import sqlite3
from typing import List, Tuple, Any
from contextlib import contextmanager
from pathlib import Path

class DatabaseConnection:
    def __init__(self, db_path: str = "database.db"):
        self.db_path = db_path
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
        schema_path = Path(__file__).parent.parent / "db" / "schema.sql"
        
        if not schema_path.exists():
            raise FileNotFoundError(f"Schema file not found at {schema_path}")
        
        with open(schema_path, 'r') as f:
            schema = f.read()
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executescript(schema)
    
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

# Usage example
if __name__ == "__main__":
    db = DatabaseConnection()
    results = db.execute_query("SELECT * FROM users")
    print(results)