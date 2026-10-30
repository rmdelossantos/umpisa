"""create collection_entries

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "collection_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_type", sa.String(length=10), nullable=False),
        sa.Column("mal_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("image_url", sa.String(length=1000), nullable=True),
        sa.Column("kind", sa.String(length=50), nullable=True),
        sa.Column("units", sa.Integer(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "media_type", "mal_id", name="uq_entry_user_title"),
    )
    op.create_index("ix_collection_entries_user_id", "collection_entries", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_collection_entries_user_id", table_name="collection_entries")
    op.drop_table("collection_entries")
