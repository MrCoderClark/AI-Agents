from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from agents_api.auth import (
    AccessToken,
    InvalidAccessToken,
    SigningKeyVerifier,
    decode_access_token,
    get_verifier,
)
from agents_api.main import app

ISSUER = "http://localhost:3000"
AUDIENCE = "agents-api"


def _keys() -> tuple[bytes, bytes]:
    private = Ed25519PrivateKey.generate()
    private_pem = private.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


def _token(
    private_pem: bytes,
    *,
    audience: str = AUDIENCE,
    expired: bool = False,
) -> str:
    now = datetime.now(UTC)
    exp = now - timedelta(minutes=5) if expired else now + timedelta(minutes=5)
    encoded = jwt.encode(
        {
            "sub": "user_1",
            "email": "ada@example.com",
            "iss": ISSUER,
            "aud": audience,
            "exp": exp,
        },
        private_pem,
        algorithm="EdDSA",
    )
    assert isinstance(encoded, str)
    return encoded


def test_decode_access_token() -> None:
    private_pem, public_pem = _keys()
    token = _token(private_pem)
    access = decode_access_token(
        token,
        key=public_pem,
        issuer=ISSUER,
        audience=AUDIENCE,
    )
    assert access == AccessToken(subject="user_1", email="ada@example.com")


def test_rejects_wrong_audience() -> None:
    private_pem, public_pem = _keys()
    token = _token(private_pem, audience="other")
    with pytest.raises(InvalidAccessToken):
        decode_access_token(token, key=public_pem, issuer=ISSUER, audience=AUDIENCE)


def test_rejects_expired_token() -> None:
    private_pem, public_pem = _keys()
    token = _token(private_pem, expired=True)
    with pytest.raises(InvalidAccessToken):
        decode_access_token(token, key=public_pem, issuer=ISSUER, audience=AUDIENCE)


def test_session_requires_a_bearer_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTH_JWKS_URL", "http://localhost:3000/api/auth/jwks")
    monkeypatch.setenv("AUTH_ISSUER", ISSUER)
    monkeypatch.setenv("AUTH_AUDIENCE", AUDIENCE)
    with TestClient(app) as client:
        response = client.get("/session")
    assert response.status_code == 401


def test_session_returns_the_subject() -> None:
    private_pem, public_pem = _keys()
    token = _token(private_pem)
    app.dependency_overrides[get_verifier] = lambda: SigningKeyVerifier(
        public_pem,
        issuer=ISSUER,
        audience=AUDIENCE,
    )
    try:
        with TestClient(app) as client:
            response = client.get(
                "/session",
                headers={"Authorization": f"Bearer {token}"},
            )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == {"subject": "user_1", "email": "ada@example.com"}
