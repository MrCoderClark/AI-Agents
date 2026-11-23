from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from agents_api.auth import SigningKeyVerifier, get_verifier
from agents_api.db import normalize_database_url
from agents_api.main import app
from agents_api.workspaces import InMemoryWorkspaceStore, get_workspace_store

ISSUER = "http://localhost:3000"
AUDIENCE = "agents-api"


def test_normalize_database_url_uses_asyncpg() -> None:
    assert (
        normalize_database_url("postgresql://localhost/ai_agents")
        == "postgresql+asyncpg://localhost/ai_agents"
    )
    assert (
        normalize_database_url("postgres://localhost/ai_agents")
        == "postgresql+asyncpg://localhost/ai_agents"
    )
    unchanged = "postgresql+asyncpg://localhost/ai_agents"
    assert normalize_database_url(unchanged) == unchanged


def test_workspaces_require_a_bearer_token() -> None:
    store = InMemoryWorkspaceStore()
    with _api(store) as (client, _private):
        response = client.get("/workspaces")
    assert response.status_code == 401


def test_create_workspace_records_an_audit_row() -> None:
    store = InMemoryWorkspaceStore()
    with _api(store) as (client, private_pem):
        response = client.post(
            "/workspaces",
            headers=_auth(private_pem, "user_1"),
            json={"name": "  Platform  "},
        )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Platform"
    assert body["plan"] == "free"
    assert body["role"] == "owner"
    assert store.audits[0].actor == "user_1"
    assert store.audits[0].action == "workspace.created"
    assert store.audits[0].target == body["id"]


def test_list_returns_only_the_callers_workspaces_newest_first() -> None:
    store = InMemoryWorkspaceStore()
    with _api(store) as (client, private_pem):
        first = client.post(
            "/workspaces",
            headers=_auth(private_pem, "user_1"),
            json={"name": "Ada"},
        )
        client.post(
            "/workspaces",
            headers=_auth(private_pem, "user_2"),
            json={"name": "Grace"},
        )
        second = client.post(
            "/workspaces",
            headers=_auth(private_pem, "user_1"),
            json={"name": "Charles"},
        )
        listed = client.get("/workspaces", headers=_auth(private_pem, "user_1"))
    assert first.status_code == 201
    assert second.status_code == 201
    assert [item["name"] for item in listed.json()] == ["Charles", "Ada"]


def test_get_hides_another_users_workspace() -> None:
    store = InMemoryWorkspaceStore()
    with _api(store) as (client, private_pem):
        created = client.post(
            "/workspaces",
            headers=_auth(private_pem, "user_1"),
            json={"name": "Ada"},
        )
        hidden = client.get(
            f"/workspaces/{created.json()['id']}",
            headers=_auth(private_pem, "user_2"),
        )
        visible = client.get(
            f"/workspaces/{created.json()['id']}",
            headers=_auth(private_pem, "user_1"),
        )
    assert hidden.status_code == 404
    assert visible.status_code == 200
    assert visible.json()["name"] == "Ada"


def test_blank_name_is_rejected() -> None:
    store = InMemoryWorkspaceStore()
    with _api(store) as (client, private_pem):
        response = client.post(
            "/workspaces",
            headers=_auth(private_pem, "user_1"),
            json={"name": "   "},
        )
    assert response.status_code == 422


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


def _token(private_pem: bytes, subject: str) -> str:
    now = datetime.now(UTC)
    encoded = jwt.encode(
        {
            "sub": subject,
            "email": f"{subject}@example.com",
            "iss": ISSUER,
            "aud": AUDIENCE,
            "exp": now + timedelta(minutes=5),
        },
        private_pem,
        algorithm="EdDSA",
    )
    assert isinstance(encoded, str)
    return encoded


def _auth(private_pem: bytes, subject: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(private_pem, subject)}"}


@contextmanager
def _api(
    store: InMemoryWorkspaceStore,
) -> Iterator[tuple[TestClient, bytes]]:
    private_pem, public_pem = _keys()
    app.dependency_overrides[get_verifier] = lambda: SigningKeyVerifier(
        public_pem,
        issuer=ISSUER,
        audience=AUDIENCE,
    )
    app.dependency_overrides[get_workspace_store] = lambda: store
    try:
        with TestClient(app) as client:
            yield client, private_pem
    finally:
        app.dependency_overrides.clear()
