from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from agents_api.agents import InMemoryAgentStore, get_agent_store
from agents_api.auth import SigningKeyVerifier, get_verifier
from agents_api.main import app

ISSUER = "http://localhost:3000"
AUDIENCE = "agents-api"


def test_agents_require_a_bearer_token() -> None:
    store = InMemoryAgentStore()
    workspace_id = uuid4()
    with _api(store) as (client, _private):
        response = client.get(f"/workspaces/{workspace_id}/agents")
    assert response.status_code == 401


def test_create_agent_lists_it_and_records_an_audit() -> None:
    store = InMemoryAgentStore()
    workspace_id = uuid4()
    store.grant(user_id="user_1", workspace_id=workspace_id)
    with _api(store) as (client, private_pem):
        created = client.post(
            f"/workspaces/{workspace_id}/agents",
            headers=_auth(private_pem, "user_1"),
            json={"name": "  Planner  ", "description": " Splits work "},
        )
        listed = client.get(
            f"/workspaces/{workspace_id}/agents",
            headers=_auth(private_pem, "user_1"),
        )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Planner"
    assert body["description"] == "Splits work"
    assert body["status"] == "draft"
    assert body["current_version_id"] is None
    assert [item["name"] for item in listed.json()] == ["Planner"]
    assert store.audits[0][0] == "agent.created"
    assert store.audits[0][1] == "user_1"


def test_list_hides_another_workspace_and_non_members() -> None:
    store = InMemoryAgentStore()
    own_workspace = uuid4()
    other_workspace = uuid4()
    store.grant(user_id="user_1", workspace_id=own_workspace)
    store.grant(user_id="user_2", workspace_id=other_workspace)
    with _api(store) as (client, private_pem):
        client.post(
            f"/workspaces/{own_workspace}/agents",
            headers=_auth(private_pem, "user_1"),
            json={"name": "Ada"},
        )
        hidden = client.get(
            f"/workspaces/{own_workspace}/agents",
            headers=_auth(private_pem, "user_2"),
        )
        own = client.get(
            f"/workspaces/{other_workspace}/agents",
            headers=_auth(private_pem, "user_2"),
        )
    assert hidden.status_code == 404
    assert own.json() == []


def test_blank_name_and_live_status_are_rejected() -> None:
    store = InMemoryAgentStore()
    workspace_id = uuid4()
    store.grant(user_id="user_1", workspace_id=workspace_id)
    with _api(store) as (client, private_pem):
        created = client.post(
            f"/workspaces/{workspace_id}/agents",
            headers=_auth(private_pem, "user_1"),
            json={"name": "Planner"},
        )
        blank = client.post(
            f"/workspaces/{workspace_id}/agents",
            headers=_auth(private_pem, "user_1"),
            json={"name": "   "},
        )
        live = client.patch(
            f"/workspaces/{workspace_id}/agents/{created.json()['id']}",
            headers=_auth(private_pem, "user_1"),
            json={"status": "live"},
        )
    assert blank.status_code == 422
    assert live.status_code == 422


def test_update_and_delete_agent() -> None:
    store = InMemoryAgentStore()
    workspace_id = uuid4()
    store.grant(user_id="user_1", workspace_id=workspace_id)
    with _api(store) as (client, private_pem):
        created = client.post(
            f"/workspaces/{workspace_id}/agents",
            headers=_auth(private_pem, "user_1"),
            json={"name": "Planner"},
        )
        agent_id = created.json()["id"]
        updated = client.patch(
            f"/workspaces/{workspace_id}/agents/{agent_id}",
            headers=_auth(private_pem, "user_1"),
            json={"name": "Reviewer", "status": "paused"},
        )
        deleted = client.delete(
            f"/workspaces/{workspace_id}/agents/{agent_id}",
            headers=_auth(private_pem, "user_1"),
        )
        listed = client.get(
            f"/workspaces/{workspace_id}/agents",
            headers=_auth(private_pem, "user_1"),
        )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Reviewer"
    assert updated.json()["status"] == "paused"
    assert deleted.status_code == 204
    assert listed.json() == []
    assert [item[0] for item in store.audits] == [
        "agent.created",
        "agent.updated",
        "agent.deleted",
    ]


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
def _api(store: InMemoryAgentStore) -> Iterator[tuple[TestClient, bytes]]:
    private_pem, public_pem = _keys()
    app.dependency_overrides[get_verifier] = lambda: SigningKeyVerifier(
        public_pem,
        issuer=ISSUER,
        audience=AUDIENCE,
    )
    app.dependency_overrides[get_agent_store] = lambda: store
    try:
        with TestClient(app) as client:
            yield client, private_pem
    finally:
        app.dependency_overrides.clear()
