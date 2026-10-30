"""key collection entries by AniList id instead of MyAnimeList id

The catalog moved from Jikan (MyAnimeList ids) to AniList, whose ids are a different number space,
so existing rows can't be carried over. Jikan was unreachable while 0003 was live, so no titles
could have been saved; the table is recreated rather than altered (SQLite batch renames drop the
named unique constraint).

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-30
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def _create(id_column: str) -> None:
    op.create_table(
        "collection_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_type", sa.String(length=10), nullable=False),
        sa.Column(id_column, sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("image_url", sa.String(length=1000), nullable=True),
        sa.Column("kind", sa.String(length=50), nullable=True),
        sa.Column("units", sa.Integer(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "media_type", id_column, name="uq_entry_user_title"),
    )
    op.create_index("ix_collection_entries_user_id", "collection_entries", ["user_id"])


def _drop() -> None:
    op.drop_index("ix_collection_entries_user_id", table_name="collection_entries")
    op.drop_table("collection_entries")


def upgrade() -> None:
    _drop()
    _create("anilist_id")


def downgrade() -> None:
    _drop()
    _create("mal_id")
