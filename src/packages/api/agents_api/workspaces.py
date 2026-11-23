from __future__ import annotations

import asyncio
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Annotated, Protocol
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, BeforeValidator, Field
from sqlalchemy import insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from agents_api.auth import AccessToken, require_access_token
from agents_api.db import get_sessionmaker
from agents_api.models import AuditLogRow, WorkspaceMemberRow, WorkspaceRow

DEFAULT_PLAN = "free"
OWNER_ROLE = "owner"
_NAME_MAX = 80


def _strip_name(value: object) -> object:
    if isinstance(value, str):
        return value.strip()
    return value


class WorkspaceCreate(BaseModel):
    name: Annotated[
        str,
        BeforeValidator(_strip_name),
        Field(min_length=1, max_length=_NAME_MAX),
    ]


class Workspace(BaseModel):
    id: UUID
    name: str
    plan: str
    role: str
    created_at: datetime


class AuditRecord(BaseModel):
    workspace_id: UUID
    actor: str
    action: str
    target: str
    ts: datetime


class WorkspaceStore(Protocol):
    async def create(self, *, user_id: str, name: str) -> Workspace: ...

    async def list_for_user(self, user_id: str) -> list[Workspace]: ...

    async def get(self, *, user_id: str, workspace_id: UUID) -> Workspace | None: ...


class InMemoryWorkspaceStore:
    def __init__(self) -> None:
        self._workspaces: dict[UUID, WorkspaceRow] = {}
        self._members: list[WorkspaceMemberRow] = []
        self.audits: list[AuditRecord] = []
        self._lock = asyncio.Lock()

    async def create(self, *, user_id: str, name: str) -> Workspace:
        async with self._lock:
            now = datetime.now(UTC)
            workspace_id = uuid4()
            row = WorkspaceRow(
                id=workspace_id,
                name=name,
                plan=DEFAULT_PLAN,
                created_at=now,
            )
            member = WorkspaceMemberRow(
                workspace_id=workspace_id,
                user_id=user_id,
                role=OWNER_ROLE,
                created_at=now,
            )
            self._workspaces[workspace_id] = row
            self._members.append(member)
            self.audits.append(
                AuditRecord(
                    workspace_id=workspace_id,
                    actor=user_id,
                    action="workspace.created",
                    target=str(workspace_id),
                    ts=now,
                )
            )
            return _to_workspace(row, member.role)

    async def list_for_user(self, user_id: str) -> list[Workspace]:
        async with self._lock:
            found = [
                _to_workspace(self._workspaces[member.workspace_id], member.role)
                for member in self._members
                if member.user_id == user_id
            ]
        found.sort(key=lambda item: item.created_at, reverse=True)
        return found

    async def get(self, *, user_id: str, workspace_id: UUID) -> Workspace | None:
        async with self._lock:
            for member in self._members:
                if member.user_id == user_id and member.workspace_id == workspace_id:
                    return _to_workspace(self._workspaces[workspace_id], member.role)
        return None


class SqlWorkspaceStore:
    def __init__(self, sessions: async_sessionmaker[AsyncSession]) -> None:
        self._sessions = sessions

    async def create(self, *, user_id: str, name: str) -> Workspace:
        now = datetime.now(UTC)
        workspace_id = uuid4()
        async with self._sessions() as session, session.begin():
            await _bind_user(session, user_id)
            # Insert parent before child. The ORM can emit workspace_members
            # first when the workspace id is already assigned.
            await session.execute(
                insert(WorkspaceRow).values(
                    id=workspace_id,
                    name=name,
                    plan=DEFAULT_PLAN,
                    created_at=now,
                )
            )
            await session.execute(
                insert(WorkspaceMemberRow).values(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    role=OWNER_ROLE,
                    created_at=now,
                )
            )
            await session.execute(
                insert(AuditLogRow).values(
                    id=uuid4(),
                    workspace_id=workspace_id,
                    actor=user_id,
                    action="workspace.created",
                    target=str(workspace_id),
                    ts=now,
                )
            )
        return Workspace(
            id=workspace_id,
            name=name,
            plan=DEFAULT_PLAN,
            role=OWNER_ROLE,
            created_at=now,
        )

    async def list_for_user(self, user_id: str) -> list[Workspace]:
        async with self._sessions() as session, session.begin():
            await _bind_user(session, user_id)
            members = (
                await session.scalars(
                    select(WorkspaceMemberRow).where(
                        WorkspaceMemberRow.user_id == user_id
                    )
                )
            ).all()
            found = await _workspaces_for_members(session, members)
        found.sort(key=lambda item: item.created_at, reverse=True)
        return found

    async def get(self, *, user_id: str, workspace_id: UUID) -> Workspace | None:
        async with self._sessions() as session, session.begin():
            await _bind_user(session, user_id)
            member = await session.get(WorkspaceMemberRow, (workspace_id, user_id))
            if member is None:
                return None
            row = await session.get(WorkspaceRow, workspace_id)
            if row is None:
                return None
            return _to_workspace(row, member.role)


def get_workspace_store() -> WorkspaceStore:
    try:
        sessions = get_sessionmaker()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500, detail="Database is not configured"
        ) from exc
    return SqlWorkspaceStore(sessions)


router = APIRouter(tags=["workspaces"])


@router.get("/workspaces")
async def list_workspaces(
    token: AccessToken = Depends(require_access_token),
    store: WorkspaceStore = Depends(get_workspace_store),
) -> list[Workspace]:
    return await store.list_for_user(token.subject)


@router.post("/workspaces", status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    token: AccessToken = Depends(require_access_token),
    store: WorkspaceStore = Depends(get_workspace_store),
) -> Workspace:
    return await store.create(user_id=token.subject, name=body.name)


@router.get("/workspaces/{workspace_id}")
async def get_workspace(
    workspace_id: UUID,
    token: AccessToken = Depends(require_access_token),
    store: WorkspaceStore = Depends(get_workspace_store),
) -> Workspace:
    workspace = await store.get(user_id=token.subject, workspace_id=workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


def _to_workspace(row: WorkspaceRow, role: str) -> Workspace:
    return Workspace(
        id=row.id,
        name=row.name,
        plan=row.plan,
        role=role,
        created_at=row.created_at,
    )


async def _bind_user(session: AsyncSession, user_id: str) -> None:
    await session.execute(
        text("SELECT set_config('app.user_id', :user_id, true)"),
        {"user_id": user_id},
    )


async def _workspaces_for_members(
    session: AsyncSession, members: Iterable[WorkspaceMemberRow]
) -> list[Workspace]:
    found: list[Workspace] = []
    for member in members:
        row = await session.get(WorkspaceRow, member.workspace_id)
        if row is not None:
            found.append(_to_workspace(row, member.role))
    return found
