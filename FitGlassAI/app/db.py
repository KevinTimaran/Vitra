"""Capa de base de datos SQLite (stdlib, sin dependencias nuevas).

Reemplaza al antiguo users_db.json:
- Escrituras transaccionales y atómicas (WAL), protegidas por un lock de proceso.
- Una base corrupta o ilegible detiene el arranque con un error claro, en lugar de seguir con
  una base vacía que luego sobrescribiría a todos los usuarios.
- Guarda usuarios, prendas, looks y categorías de looks por usuario.

Es válida para un único proceso (prototipo). Con varios workers habría que pasar a Postgres.
"""
import json
import logging
import os
import sqlite3
import threading
import time
from typing import Any, Dict, Iterable, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "vitra.db")

_lock = threading.RLock()
_conn: Optional[sqlite3.Connection] = None
_db_path: Optional[str] = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    email           TEXT PRIMARY KEY,
    name            TEXT,
    gender          TEXT,
    age             INTEGER,
    hashed_password TEXT,
    avatar_url      TEXT,
    avatar_type     TEXT,
    created_at      TEXT,
    data            TEXT NOT NULL,
    updated_at      INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS garments (
    user_email TEXT NOT NULL,
    id         TEXT NOT NULL,
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_email, id),
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_garments_user ON garments(user_email);
CREATE TABLE IF NOT EXISTS looks (
    user_email TEXT NOT NULL,
    id         TEXT NOT NULL,
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_email, id),
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_looks_user ON looks(user_email);
CREATE TABLE IF NOT EXISTS look_categories (
    user_email TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);
"""


class DatabaseError(RuntimeError):
    """La base de datos no se pudo abrir o está dañada."""


def now_ms() -> int:
    return int(time.time() * 1000)


def _resolve_path(path: Optional[str]) -> str:
    return path or os.environ.get("VITRA_DB_PATH") or DEFAULT_DB_PATH


def use_database(path: Optional[str] = None) -> sqlite3.Connection:
    """Abre (o reabre) la base indicada y crea el esquema. Lanza DatabaseError si está dañada."""
    global _conn, _db_path
    with _lock:
        if _conn is not None:
            try:
                _conn.close()
            except Exception:
                pass
            _conn = None
        target = _resolve_path(path)
        os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
        try:
            conn = sqlite3.connect(target, check_same_thread=False, timeout=30)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
            conn.execute("PRAGMA synchronous=NORMAL")
            check = conn.execute("PRAGMA quick_check").fetchone()
            if not check or check[0] != "ok":
                raise DatabaseError(f"La base de datos {target} está dañada: {check[0] if check else 'sin respuesta'}")
            conn.executescript(SCHEMA)
            conn.commit()
        except sqlite3.DatabaseError as e:
            raise DatabaseError(
                f"No se pudo abrir la base de datos {target}: {e}. "
                "Restaura una copia de seguridad o mueve el archivo; NO se continuará con una base vacía."
            ) from e
        _conn, _db_path = conn, target
        return conn


def get_conn() -> sqlite3.Connection:
    with _lock:
        if _conn is None:
            use_database()
        return _conn  # type: ignore[return-value]


def db_path() -> Optional[str]:
    return _db_path


# ---------------------------------------------------------------- usuarios
def load_users() -> Dict[str, Dict[str, Any]]:
    conn = get_conn()
    with _lock:
        rows = conn.execute("SELECT email, data FROM users").fetchall()
    users: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        try:
            users[row["email"]] = json.loads(row["data"])
        except json.JSONDecodeError as e:
            raise DatabaseError(f"Registro de usuario ilegible ({row['email']}): {e}") from e
    return users


def _user_columns(email: str, user: Dict[str, Any]) -> tuple:
    age = user.get("age")
    try:
        age = int(age) if age is not None else None
    except (TypeError, ValueError):
        age = None
    return (
        email,
        user.get("name"),
        user.get("gender"),
        age,
        user.get("hashed_password"),
        user.get("avatar_url"),
        user.get("avatar_type"),
        user.get("created_at"),
    )


def save_users(users: Dict[str, Dict[str, Any]]) -> None:
    """Sincroniza el dict en memoria con la tabla users en UNA transacción (upsert + borrado de ausentes)."""
    conn = get_conn()
    ts = now_ms()
    with _lock:
        # La instantánea se toma DENTRO del lock: si se tomara fuera, un guardado con una instantánea antigua podría
        # ejecutarse después de otro más nuevo y borrar (por "ausente") a un usuario recién creado.
        for attempt in range(3):
            try:
                snapshot = [(email, json.dumps(dict(user), ensure_ascii=False)) for email, user in list(users.items())]
                break
            except RuntimeError:  # el dict cambió mientras se serializaba; reintentar
                if attempt == 2:
                    raise
        try:
            with conn:
                for email, blob in snapshot:
                    cols = _user_columns(email, json.loads(blob))
                    conn.execute(
                        """INSERT INTO users (email, name, gender, age, hashed_password, avatar_url, avatar_type,
                                              created_at, data, updated_at)
                           VALUES (?,?,?,?,?,?,?,?,?,?)
                           ON CONFLICT(email) DO UPDATE SET
                             name=excluded.name, gender=excluded.gender, age=excluded.age,
                             hashed_password=excluded.hashed_password, avatar_url=excluded.avatar_url,
                             avatar_type=excluded.avatar_type, created_at=excluded.created_at,
                             data=excluded.data, updated_at=excluded.updated_at""",
                        cols + (blob, ts),
                    )
                keep = [e for e, _ in snapshot]
                if keep:
                    marks = ",".join("?" * len(keep))
                    conn.execute(f"DELETE FROM users WHERE email NOT IN ({marks})", keep)
                else:
                    conn.execute("DELETE FROM users")
        except sqlite3.Error as e:
            logger.error("[DB] Error al guardar usuarios: %s", e)
            raise


def migrate_legacy_json(paths: Iterable[str]) -> int:
    """Importa usuarios de los antiguos users_db.json (idempotente) y los renombra a *.migrated."""
    conn = get_conn()
    imported = 0
    for path in paths:
        if not path or not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                raise ValueError("el JSON no es un objeto")
        except Exception as e:
            logger.error("[DB] No se migró %s (se deja intacto): %s", path, e)
            continue
        ts = now_ms()
        with _lock, conn:
            for email, user in data.items():
                if not isinstance(user, dict):
                    continue
                key = str(email).lower()
                if conn.execute("SELECT 1 FROM users WHERE email=?", (key,)).fetchone():
                    continue
                conn.execute(
                    """INSERT INTO users (email, name, gender, age, hashed_password, avatar_url, avatar_type,
                                          created_at, data, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    _user_columns(key, user) + (json.dumps(user, ensure_ascii=False), ts),
                )
                imported += 1
        backup = path + ".migrated"
        try:
            os.replace(path, backup)
        except OSError as e:
            logger.warning("[DB] No se pudo renombrar %s: %s", path, e)
        logger.info("[DB] Migrados %d usuarios desde %s", imported, path)
    return imported


# ---------------------------------------------------------------- armario / looks
_TABLES = {"garments", "looks"}


def _check_table(table: str) -> str:
    if table not in _TABLES:
        raise ValueError(f"tabla no permitida: {table}")
    return table


def list_items(table: str, email: str) -> List[Dict[str, Any]]:
    table = _check_table(table)
    conn = get_conn()
    with _lock:
        rows = conn.execute(
            f"SELECT data FROM {table} WHERE user_email=? AND deleted=0 ORDER BY updated_at DESC", (email,)
        ).fetchall()
    return [json.loads(r["data"]) for r in rows]


def list_deleted_ids(table: str, email: str) -> List[str]:
    table = _check_table(table)
    conn = get_conn()
    with _lock:
        rows = conn.execute(f"SELECT id FROM {table} WHERE user_email=? AND deleted=1", (email,)).fetchall()
    return [r["id"] for r in rows]


def upsert_item(table: str, email: str, item_id: str, data: Dict[str, Any], updated_at: int) -> bool:
    """Last-write-wins: solo escribe si updated_at >= el existente. Devuelve True si se aplicó."""
    table = _check_table(table)
    conn = get_conn()
    with _lock, conn:
        row = conn.execute(
            f"SELECT updated_at FROM {table} WHERE user_email=? AND id=?", (email, item_id)
        ).fetchone()
        if row and row["updated_at"] > updated_at:
            return False
        conn.execute(
            f"""INSERT INTO {table} (user_email, id, data, updated_at, deleted) VALUES (?,?,?,?,0)
                ON CONFLICT(user_email, id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at, deleted=0""",
            (email, item_id, json.dumps(data, ensure_ascii=False), updated_at),
        )
    return True


def delete_item(table: str, email: str, item_id: str, updated_at: int) -> bool:
    """Borrado lógico (tombstone) para que el borrado se propague a otros dispositivos."""
    table = _check_table(table)
    conn = get_conn()
    with _lock, conn:
        row = conn.execute(
            f"SELECT updated_at FROM {table} WHERE user_email=? AND id=?", (email, item_id)
        ).fetchone()
        if row and row["updated_at"] > updated_at:
            return False
        conn.execute(
            f"""INSERT INTO {table} (user_email, id, data, updated_at, deleted) VALUES (?,?,?,?,1)
                ON CONFLICT(user_email, id) DO UPDATE SET data='{{}}', updated_at=excluded.updated_at, deleted=1""",
            (email, item_id, "{}", updated_at),
        )
    return True


def get_categories(email: str) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    with _lock:
        row = conn.execute("SELECT data, updated_at FROM look_categories WHERE user_email=?", (email,)).fetchone()
    if not row:
        return None
    return {"items": json.loads(row["data"]), "updatedAt": row["updated_at"]}


def set_categories(email: str, items: List[str], updated_at: int) -> bool:
    conn = get_conn()
    with _lock, conn:
        row = conn.execute("SELECT updated_at FROM look_categories WHERE user_email=?", (email,)).fetchone()
        if row and row["updated_at"] > updated_at:
            return False
        conn.execute(
            """INSERT INTO look_categories (user_email, data, updated_at) VALUES (?,?,?)
               ON CONFLICT(user_email) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at""",
            (email, json.dumps(items, ensure_ascii=False), updated_at),
        )
    return True
