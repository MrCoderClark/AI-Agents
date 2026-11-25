from __future__ import annotations

import asyncio

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from agents_api.db import Base, database_url
from agents_api.models import AgentRow, AuditLogRow, WorkspaceMemberRow, WorkspaceRow
from alembic import context

target_metadata = Base.metadata
_ = (AgentRow, AuditLogRow, WorkspaceMemberRow, WorkspaceRow)


def run_migrations_offline() -> None:
    context.configure(
        url=database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def _run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_async_engine(database_url(), poolclass=pool.NullPool)

    async def run() -> None:
        async with connectable.connect() as connection:
            await connection.run_sync(_run_migrations)
        await connectable.dispose()

    asyncio.run(run())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
