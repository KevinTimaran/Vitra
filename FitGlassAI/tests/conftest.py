import os
import tempfile

# Aislamiento: los tests NUNCA tocan la base de datos ni las fotos reales.
_TMP = tempfile.mkdtemp(prefix="vitra_tests_")
os.environ["VITRA_DB_PATH"] = os.path.join(_TMP, "vitra_test.db")
os.environ["USERS_DB_PATH"] = os.path.join(_TMP, "no_existe_users_db.json")
os.environ["USER_PHOTOS_DIR"] = os.path.join(_TMP, "photos")

# Cuenta demo habilitada solo para la suite de pruebas.
os.environ.setdefault("ENABLE_DEMO_USER", "1")
