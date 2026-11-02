from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

ALGORITHM = "HS256"


class BcryptPasswordHasher:
    def hash(self, password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def verify(self, password: str, password_hash: str) -> bool:
        return bcrypt.checkpw(password.encode(), password_hash.encode())


class JwtTokenService:
    def __init__(self, secret: str, expire_minutes: int):
        self._secret = secret
        self._expire_minutes = expire_minutes

    def create(self, user_id: int) -> str:
        exp = datetime.now(timezone.utc) + timedelta(minutes=self._expire_minutes)
        return jwt.encode({"sub": str(user_id), "exp": exp}, self._secret, algorithm=ALGORITHM)

    def decode(self, token: str) -> int | None:
        try:
            payload = jwt.decode(token, self._secret, algorithms=[ALGORITHM])
            return int(payload["sub"])
        except (jwt.PyJWTError, KeyError, ValueError):
            return None
