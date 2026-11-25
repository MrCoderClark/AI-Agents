from __future__ import annotations

import os
from typing import Protocol
from urllib.parse import urlsplit, urlunsplit

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWKClientError
from pydantic import BaseModel

_bearer = HTTPBearer(auto_error=False)


class InvalidAccessToken(Exception):
    pass


class AccessToken(BaseModel):
    subject: str
    email: str | None = None


class TokenVerifier(Protocol):
    def verify(self, token: str) -> AccessToken: ...


def decode_access_token(
    token: str,
    *,
    key: object,
    issuer: str,
    audience: str,
    algorithms: tuple[str, ...] = ("EdDSA", "RS256"),
) -> AccessToken:
    try:
        payload = jwt.decode(
            token,
            key,  # type: ignore[arg-type]
            algorithms=list(algorithms),
            issuer=issuer,
            audience=audience,
        )
    except jwt.InvalidTokenError as exc:
        raise InvalidAccessToken from exc
    if not isinstance(payload, dict):
        raise InvalidAccessToken
    subject = payload.get("sub")
    if not isinstance(subject, str) or subject == "":
        subject = payload.get("id")
    if not isinstance(subject, str) or subject == "":
        raise InvalidAccessToken
    email = payload.get("email")
    if email is not None and not isinstance(email, str):
        raise InvalidAccessToken
    return AccessToken(subject=subject, email=email)


class SigningKeyVerifier:
    def __init__(self, key: object, *, issuer: str, audience: str) -> None:
        self._key = key
        self._issuer = issuer
        self._audience = audience

    def verify(self, token: str) -> AccessToken:
        return decode_access_token(
            token,
            key=self._key,
            issuer=self._issuer,
            audience=self._audience,
        )


def jwks_fetch_url(url: str) -> str:
    parts = urlsplit(url)
    if parts.hostname != "localhost":
        return url
    host = "127.0.0.1" if parts.port is None else f"127.0.0.1:{parts.port}"
    return urlunsplit((parts.scheme, host, parts.path, parts.query, parts.fragment))


class JwksTokenVerifier:
    def __init__(self, url: str, *, issuer: str, audience: str) -> None:
        self._jwks = PyJWKClient(jwks_fetch_url(url), cache_keys=True, timeout=5)
        self._issuer = issuer
        self._audience = audience

    def warm(self) -> None:
        try:
            self._jwks.fetch_data()
        except Exception:
            return

    def verify(self, token: str) -> AccessToken:
        try:
            signing_key = self._jwks.get_signing_key_from_jwt(token)
            return decode_access_token(
                token,
                key=signing_key.key,
                issuer=self._issuer,
                audience=self._audience,
            )
        except (InvalidAccessToken, PyJWKClientError, jwt.InvalidTokenError) as exc:
            raise InvalidAccessToken from exc


_verifier: TokenVerifier | None = None


def get_verifier() -> TokenVerifier:
    global _verifier
    if _verifier is not None:
        return _verifier
    try:
        url = os.environ["AUTH_JWKS_URL"]
        issuer = os.environ["AUTH_ISSUER"]
        audience = os.environ["AUTH_AUDIENCE"]
    except KeyError as exc:
        raise HTTPException(status_code=500, detail="Auth is not configured") from exc
    _verifier = JwksTokenVerifier(url, issuer=issuer, audience=audience)
    return _verifier


def require_access_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    verifier: TokenVerifier = Depends(get_verifier),
) -> AccessToken:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return verifier.verify(credentials.credentials)
    except InvalidAccessToken:
        raise HTTPException(status_code=401, detail="Unauthorized") from None
