"""add auth fields to users, move name into userdetails

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "userdetails",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("first_name", sa.String(length=255), nullable=False),
        sa.Column("last_name", sa.String(length=255), nullable=False),
        sa.Column("birthdate", sa.Date(), nullable=True),
        sa.UniqueConstraint("user_id", name="uq_userdetails_user_id"),
    )

    # Carry existing names over before users.name is dropped
    op.execute(
        "INSERT INTO userdetails (user_id, first_name, last_name) SELECT id, name, '' FROM users"
    )

    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("username", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("password", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("role", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("status", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True))
        batch.add_column(sa.Column("last_logged_in", sa.DateTime(), nullable=True))

    # Backfill existing rows; "!" is not a valid hash, so these accounts can't log in until a password is set
    op.execute(
        "UPDATE users SET username = email, password = '!', role = 'user', status = 'active', "
        "updated_at = created_at"
    )

    with op.batch_alter_table("users") as batch:
        batch.alter_column("username", existing_type=sa.String(length=255), nullable=False)
        batch.alter_column("password", existing_type=sa.String(length=255), nullable=False)
        batch.alter_column("role", existing_type=sa.String(length=255), nullable=False)
        batch.alter_column("status", existing_type=sa.String(length=255), nullable=False)
        batch.alter_column("updated_at", existing_type=sa.DateTime(), nullable=False)
        batch.create_index("ix_users_username", ["username"], unique=True)
        batch.drop_column("name")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("name", sa.String(length=255), nullable=True))

    op.execute(
        "UPDATE users SET name = COALESCE("
        "(SELECT TRIM(first_name || ' ' || last_name) FROM userdetails WHERE userdetails.user_id = users.id), "
        "username)"
    )

    with op.batch_alter_table("users") as batch:
        batch.alter_column("name", existing_type=sa.String(length=255), nullable=False)
        batch.drop_index("ix_users_username")
        batch.drop_column("last_logged_in")
        batch.drop_column("updated_at")
        batch.drop_column("status")
        batch.drop_column("role")
        batch.drop_column("password")
        batch.drop_column("username")

    op.drop_table("userdetails")
