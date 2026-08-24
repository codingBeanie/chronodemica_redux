import hashlib
import hmac
import secrets

_PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, _, digest_hex = stored.partition("$")
    if not salt or not digest_hex:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return hmac.compare_digest(candidate.hex(), digest_hex)


def generate_token() -> str:
    return secrets.token_urlsafe(32)
