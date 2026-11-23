"""Create workspaces, membership, and audit log.

Revision ID: 0001_workspaces
Revises:
Create Date: 2026-11-23

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_workspaces"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("plan", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "workspace_members",
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.String(length=128), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("workspace_id", "user_id"),
    )
    op.create_index(
        "ix_workspace_members_user_id",
        "workspace_members",
        ["user_id"],
    )
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("actor", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target", sa.String(length=128), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
    )
    # Insert cannot require a member row: the workspace row has to exist first.
    _enable_rls("workspaces")
    op.execute(
        """
        CREATE POLICY workspace_select ON workspaces
        FOR SELECT
        USING (
          id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = current_setting('app.user_id', true)
          )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY workspace_insert ON workspaces
        FOR INSERT
        WITH CHECK (true)
        """
    )
    _enable_rls("workspace_members")
    op.execute(
        """
        CREATE POLICY workspace_member_select ON workspace_members
        FOR SELECT
        USING (user_id = current_setting('app.user_id', true))
        """
    )
    op.execute(
        """
        CREATE POLICY workspace_member_insert ON workspace_members
        FOR INSERT
        WITH CHECK (user_id = current_setting('app.user_id', true))
        """
    )
    _enable_rls("audit_log")
    op.execute(
        """
        CREATE POLICY audit_insert ON audit_log
        FOR INSERT
        WITH CHECK (
          actor = current_setting('app.user_id', true)
          AND workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = current_setting('app.user_id', true)
          )
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS audit_insert ON audit_log")
    op.execute("DROP POLICY IF EXISTS workspace_member_insert ON workspace_members")
    op.execute("DROP POLICY IF EXISTS workspace_member_select ON workspace_members")
    op.execute("DROP POLICY IF EXISTS workspace_insert ON workspaces")
    op.execute("DROP POLICY IF EXISTS workspace_select ON workspaces")
    op.drop_table("audit_log")
    op.drop_index("ix_workspace_members_user_id", table_name="workspace_members")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")


def _enable_rls(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
