
import os
import pytz
from passlib.context import CryptContext
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials

load_dotenv()

# ── Timezone ──
USER_TIMEZONE_STR = "America/Mexico_City"

try:
    USER_TIMEZONE = pytz.timezone(USER_TIMEZONE_STR)
except pytz.exceptions.UnknownTimeZoneError:
    USER_TIMEZONE = pytz.utc

# ── Variables de entorno ──
SUPER_ADMIN_PIN_HASH = os.getenv("SUPER_ADMIN_PIN_HASH")
Generic_pass = os.getenv("GENERIC_PASSWORD")
SECRET_KEY = os.getenv("SECRET_KEY")

# ── Hashing ──
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Meses (para gráficas) ──
MESES_ES = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
}

# ── Firebase ──
FIREBASE_STORAGE_BUCKET_NAME_GLOBAL = None


def initialize_firebase():
    global FIREBASE_STORAGE_BUCKET_NAME_GLOBAL
    try:
        firebase_project_id = os.getenv("FIREBASE_PROJECT_ID")
        firebase_private_key_id = os.getenv("FIREBASE_PRIVATE_KEY_ID")
        firebase_private_key_env = os.getenv("FIREBASE_PRIVATE_KEY")
        firebase_client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        firebase_client_id_env = os.getenv("FIREBASE_CLIENT_ID")
        firebase_auth_uri_env = os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth")
        firebase_token_uri_env = os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token")
        firebase_auth_provider_x509_cert_url_env = os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs")
        firebase_client_x509_cert_url_env = os.getenv("FIREBASE_CLIENT_X509_CERT_URL")

        FIREBASE_STORAGE_BUCKET_NAME_GLOBAL = os.getenv("FIREBASE_STORAGE_BUCKET")

        if not all([
            firebase_project_id, firebase_private_key_id, firebase_private_key_env,
            firebase_client_email, FIREBASE_STORAGE_BUCKET_NAME_GLOBAL,
            firebase_client_id_env, firebase_client_x509_cert_url_env
        ]):
            print("ADVERTENCIA: Variables de Firebase incompletas. Algunas funciones no estarán disponibles.")
            return

        formatted_private_key = firebase_private_key_env.replace('\\n', '\n')

        service_account_info = {
            "type": "service_account",
            "project_id": firebase_project_id,
            "private_key_id": firebase_private_key_id,
            "private_key": formatted_private_key,
            "client_email": firebase_client_email,
            "client_id": firebase_client_id_env,
            "auth_uri": firebase_auth_uri_env,
            "token_uri": firebase_token_uri_env,
            "auth_provider_x509_cert_url": firebase_auth_provider_x509_cert_url_env,
            "client_x509_cert_url": firebase_client_x509_cert_url_env
        }

        cred = credentials.Certificate(service_account_info)

        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'storageBucket': FIREBASE_STORAGE_BUCKET_NAME_GLOBAL
            })
            print("Firebase inicializado correctamente.")

    except Exception as e:
        print(f"Error al inicializar Firebase: {e}")
