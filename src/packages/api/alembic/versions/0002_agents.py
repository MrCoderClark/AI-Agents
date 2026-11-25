"""Create agents.

Revision ID: 0002_agents
Revises: 0001_workspaces
Create Date: 2026-11-23

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_agents"
down_revision: str | Sequence[str] | None = "0001_workspaces"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_MEMBER = """
workspace_id IN (
  SELECT workspace_id FROM workspace_members
  WHERE user_id = current_setting('app.user_id', true)
)
"""


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("current_version_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_agents_workspace_id", "agents", ["workspace_id"])
    op.execute("ALTER TABLE agents ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE agents FORCE ROW LEVEL SECURITY")
    for command in ("SELECT", "INSERT", "UPDATE", "DELETE"):
        check = "USING" if command in {"SELECT", "UPDATE", "DELETE"} else "WITH CHECK"
        extra = ""
        if command == "UPDATE":
            extra = f" WITH CHECK ({_MEMBER})"
        op.execute(
            f"""
            CREATE POLICY agent_{command.lower()} ON agents
            FOR {command}
            {check} ({_MEMBER})
            {extra}
            """
        )


def downgrade() -> None:
    for command in ("select", "insert", "update", "delete"):
        op.execute(f"DROP POLICY IF EXISTS agent_{command} ON agents")
    op.drop_index("ix_agents_workspace_id", table_name="agents")
    op.drop_table("agents")
