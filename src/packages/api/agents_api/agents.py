from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Annotated, Literal, Protocol
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, BeforeValidator, Field
from sqlalchemy import delete, insert, select, text, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from agents_api.auth import AccessToken, require_access_token
from agents_api.db import get_sessionmaker
from agents_api.models import AgentRow, AuditLogRow, WorkspaceMemberRow

DRAFT = "draft"
_NAME_MAX = 80
_DESCRIPTION_MAX = 2000


def _strip_text(value: object) -> object:
    if isinstance(value, str):
        return value.strip()
    return value


class AgentCreate(BaseModel):
    name: Annotated[
        str,
        BeforeValidator(_strip_text),
        Field(min_length=1, max_length=_NAME_MAX),
    ]
    description: Annotated[
        str,
        BeforeValidator(_strip_text),
        Field(max_length=_DESCRIPTION_MAX),
    ] = ""


class AgentUpdate(BaseModel):
    name: Annotated[
        str,
        BeforeValidator(_strip_text),
        Field(min_length=1, max_length=_NAME_MAX),
    ] | None = None
    description: Annotated[
        str,
        BeforeValidator(_strip_text),
        Field(max_length=_DESCRIPTION_MAX),
    ] | None = None
    status: Literal["draft", "paused"] | None = None


class Agent(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: str
    status: str
    current_version_id: UUID | None
    created_at: datetime


class MissingWorkspace(Exception):
    pass


class AgentStore(Protocol):
    async def create(
        self, *, user_id: str, workspace_id: UUID, name: str, description: str
    ) -> Agent: ...

    async def list_for_workspace(
        self, *, user_id: str, workspace_id: UUID
    ) -> list[Agent]: ...

    async def get(
        self, *, user_id: str, workspace_id: UUID, agent_id: UUID
    ) -> Agent | None: ...

    async def update(
        self,
        *,
        user_id: str,
        workspace_id: UUID,
        agent_id: UUID,
        changes: dict[str, str],
    ) -> Agent | None: ...

    async def delete(
        self, *, user_id: str, workspace_id: UUID, agent_id: UUID
    ) -> bool: ...


class InMemoryAgentStore:
    def __init__(self) -> None:
        self._members: set[tuple[UUID, str]] = set()
        self._agents: dict[UUID, Agent] = {}
        self.audits: list[tuple[str, str, str]] = []
        self._lock = asyncio.Lock()

    def grant(self, *, user_id: str, workspace_id: UUID) -> None:
        self._members.add((workspace_id, user_id))

    async def create(
        self, *, user_id: str, workspace_id: UUID, name: str, description: str
    ) -> Agent:
        async with self._lock:
            _require_member(self._members, user_id, workspace_id)
            agent = Agent(
                id=uuid4(),
                workspace_id=workspace_id,
                name=name,
                description=description,
                status=DRAFT,
                current_version_id=None,
                created_at=datetime.now(UTC),
            )
            self._agents[agent.id] = agent
            self._audit(user_id, workspace_id, "agent.created", agent.id)
            return agent

    async def list_for_workspace(
        self, *, user_id: str, workspace_id: UUID
    ) -> list[Agent]:
        async with self._lock:
            _require_member(self._members, user_id, workspace_id)
            found = [
                agent
                for agent in self._agents.values()
                if agent.workspace_id == workspace_id
            ]
        found.sort(key=lambda item: item.created_at, reverse=True)
        return found

    async def get(
        self, *, user_id: str, workspace_id: UUID, agent_id: UUID
    ) -> Agent | None:
        async with self._lock:
            _require_member(self._members, user_id, workspace_id)
            agent = self._agents.get(agent_id)
            if agent is None or agent.workspace_id != workspace_id:
                return None
            return agent

    async def update(
        self,
        *,
        user_id: str,
        workspace_id: UUID,
        agent_id: UUID,
        changes: dict[str, str],
    ) -> Agent | None:
        async with self._lock:
            _require_member(self._members, user_id, workspace_id)
            current = self._agents.get(agent_id)
            if current is None or current.workspace_id != workspace_id:
                return None
            updated = current.model_copy(update=changes)
            self._agents[agent_id] = updated
            self._audit(user_id, workspace_id, "agent.updated", agent_id)
            return updated

    async def delete(
        self, *, user_id: str, workspace_id: UUID, agent_id: UUID
    ) -> bool:
        async with self._lock:
            _require_member(self._members, user_id, workspace_id)
            current = self._agents.get(agent_id)
            if current is None or current.workspace_id != workspace_id:
                return False
            del self._agents[agent_id]
            self._audit(user_id, workspace_id, "agent.deleted", agent_id)
            return True

    def _audit(
        self, user_id: str, workspace_id: UUID, action: str, agent_id: UUID
    ) -> None:
        self.audits.append((action, user_id, str(workspace_id), str(agent_id)))


class SqlAgentStore:
    def __init__(self, sessions: async_sessionmaker[AsyncSession]) -> None:
        self._sessions = sessions

    async def create(
        self, *, user_id: str, workspace_id: UUID, name: str, description: str
    ) -> Agent:
        now = datetime.now(UTC)
        agent_id = uuid4()
        async with self._sessions() as session, session.begin():
            await _bind_user(session, user_id)
            await _require_member_row(session, user_id, workspace_id)
            await session.execute(
                insert(AgentRow).values(
                    id=agent_id,
                    workspace_id=workspace_id,
                    name=name,
                    description=description,
                    status=DRAFT,
                    current_version_id=None,
                    created_at=now,
                )
            )
            await _audit(
                session,
                user_id=user_id,
                workspace_id=workspace_id,
                action="agent.created",
                agent_id=agent_id,
                ts=now,
            )
        return _agent(
            agent_id=agent_id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            status=DRAFT,
            current_version_id=None,
            created_at=now,
        )

    async def list_for_workspace(
        self, *, user_id: str, workspace_id: UUID
    ) -> list[Agent]:
        async with self._sessions() as session, session.begin():
            await _bind_user(session, user_id)
            await _require_member_row(session, user_id, workspace_id)
            rows = (
                await session.scalars(
                    select(AgentRow)
                    .where(AgentRow.workspace_id == workspace_id)
                    .order_by(AgentRow.created_at.desc())
                )
            ).all()
            return [_agent_from_row(row) for row in rows]

    async def get(
        self, *, user_id: str, workspace_id: UUID, agent_id: UUID
    ) -> Agent | None:
        async with self._sessions() as session, session.begin():
            await _bind_user(session, user_id)
            await _require_member_row(session, user_id, workspace_id)
            row = await _owned_row(session, workspace_id, agent_id)
            if row is None:
                return None
            return _agent_from_row(row)

    async def update(
        self,
        *,
        user_id: str,
        workspace_id: UUID,
        agent_id: UUID,
        changes: dict[str, str],
    ) -> Agent | None:
        now = datetime.now(UTC)
        async with self._sessions() as session, session.begin():
            await _bind_user(session, user_id)
            await _require_member_row(session, user_id, workspace_id)
            row = await _owned_row(session, workspace_id, agent_id)
            if row is None:
                return None
            await session.execute(
                sql_update(AgentRow)
                .where(AgentRow.id == agent_id)
                .values(**changes)
            )
            await _audit(
                session,
                user_id=user_id,
                workspace_id=workspace_id,
                action="agent.updated",
                agent_id=agent_id,
                ts=now,
            )
            await session.refresh(row)
            return _agent_from_row(row)

    async def delete(
        self, *, user_id: str, workspace_id: UUID, agent_id: UUID
    ) -> bool:
        now = datetime.now(UTC)
        async with self._sessions() as session, session.begin():
            await _bind_user(session, user_id)
            await _require_member_row(session, user_id, workspace_id)
            row = await _owned_row(session, workspace_id, agent_id)
            if row is None:
                return False
            await _audit(
                session,
                user_id=user_id,
                workspace_id=workspace_id,
                action="agent.deleted",
                agent_id=agent_id,
                ts=now,
            )
            await session.execute(delete(AgentRow).where(AgentRow.id == agent_id))
            return True


def get_agent_store() -> AgentStore:
    try:
        sessions = get_sessionmaker()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500, detail="Database is not configured"
        ) from exc
    return SqlAgentStore(sessions)


router = APIRouter(tags=["agents"])


@router.get("/workspaces/{workspace_id}/agents")
async def list_agents(
    workspace_id: UUID,
    token: AccessToken = Depends(require_access_token),
    store: AgentStore = Depends(get_agent_store),
) -> list[Agent]:
    try:
        return await store.list_for_workspace(
            user_id=token.subject, workspace_id=workspace_id
        )
    except MissingWorkspace:
        raise HTTPException(status_code=404, detail="Workspace not found") from None


@router.post("/workspaces/{workspace_id}/agents", status_code=201)
async def create_agent(
    workspace_id: UUID,
    body: AgentCreate,
    token: AccessToken = Depends(require_access_token),
    store: AgentStore = Depends(get_agent_store),
) -> Agent:
    try:
        return await store.create(
            user_id=token.subject,
            workspace_id=workspace_id,
            name=body.name,
            description=body.description,
        )
    except MissingWorkspace:
        raise HTTPException(status_code=404, detail="Workspace not found") from None


@router.get("/workspaces/{workspace_id}/agents/{agent_id}")
async def get_agent(
    workspace_id: UUID,
    agent_id: UUID,
    token: AccessToken = Depends(require_access_token),
    store: AgentStore = Depends(get_agent_store),
) -> Agent:
    try:
        agent = await store.get(
            user_id=token.subject,
            workspace_id=workspace_id,
            agent_id=agent_id,
        )
    except MissingWorkspace:
        raise HTTPException(status_code=404, detail="Workspace not found") from None
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/workspaces/{workspace_id}/agents/{agent_id}")
async def update_agent(
    workspace_id: UUID,
    agent_id: UUID,
    body: AgentUpdate,
    token: AccessToken = Depends(require_access_token),
    store: AgentStore = Depends(get_agent_store),
) -> Agent:
    changes = {
        key: value
        for key, value in body.model_dump(exclude_unset=True).items()
        if isinstance(value, str)
    }
    if not changes:
        raise HTTPException(status_code=422, detail="No changes")
    try:
        agent = await store.update(
            user_id=token.subject,
            workspace_id=workspace_id,
            agent_id=agent_id,
            changes=changes,
        )
    except MissingWorkspace:
        raise HTTPException(status_code=404, detail="Workspace not found") from None
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/workspaces/{workspace_id}/agents/{agent_id}", status_code=204)
async def delete_agent(
    workspace_id: UUID,
    agent_id: UUID,
    token: AccessToken = Depends(require_access_token),
    store: AgentStore = Depends(get_agent_store),
) -> None:
    try:
        deleted = await store.delete(
            user_id=token.subject,
            workspace_id=workspace_id,
            agent_id=agent_id,
        )
    except MissingWorkspace:
        raise HTTPException(status_code=404, detail="Workspace not found") from None
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found")


def _require_member(
    members: set[tuple[UUID, str]], user_id: str, workspace_id: UUID
) -> None:
    if (workspace_id, user_id) not in members:
        raise MissingWorkspace


def _agent(
    *,
    agent_id: UUID,
    workspace_id: UUID,
    name: str,
    description: str,
    status: str,
    current_version_id: UUID | None,
    created_at: datetime,
) -> Agent:
    return Agent(
        id=agent_id,
        workspace_id=workspace_id,
        name=name,
        description=description,
        status=status,
        current_version_id=current_version_id,
        created_at=created_at,
    )


def _agent_from_row(row: AgentRow) -> Agent:
    return _agent(
        agent_id=row.id,
        workspace_id=row.workspace_id,
        name=row.name,
        description=row.description,
        status=row.status,
        current_version_id=row.current_version_id,
        created_at=row.created_at,
    )


async def _bind_user(session: AsyncSession, user_id: str) -> None:
    await session.execute(
        text("SELECT set_config('app.user_id', :user_id, true)"),
        {"user_id": user_id},
    )


async def _require_member_row(
    session: AsyncSession, user_id: str, workspace_id: UUID
) -> None:
    member = await session.get(WorkspaceMemberRow, (workspace_id, user_id))
    if member is None:
        raise MissingWorkspace


async def _owned_row(
    session: AsyncSession, workspace_id: UUID, agent_id: UUID
) -> AgentRow | None:
    row = await session.get(AgentRow, agent_id)
    if row is None or row.workspace_id != workspace_id:
        return None
    return row


async def _audit(
    session: AsyncSession,
    *,
    user_id: str,
    workspace_id: UUID,
    action: str,
    agent_id: UUID,
    ts: datetime,
) -> None:
    await session.execute(
        insert(AuditLogRow).values(
            id=uuid4(),
            workspace_id=workspace_id,
            actor=user_id,
            action=action,
            target=str(agent_id),
            ts=ts,
        )
    )
