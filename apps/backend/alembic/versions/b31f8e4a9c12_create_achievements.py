"""create achievements tables

Revision ID: b31f8e4a9c12_create_achievements
Revises: 73874ef7296d
Create Date: 2026-06-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "b31f8e4a9c12_create_achievements"
down_revision = "73874ef7296d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(length=4), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("icon", sa.String(length=255), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_achievements_code"), "achievements", ["code"], unique=True)

    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "achievement_id",
            sa.Integer(),
            sa.ForeignKey("achievements.id"),
            nullable=False,
        ),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column("unlocked_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )
    op.create_index(
        op.f("ix_user_achievements_user_id"),
        "user_achievements",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_achievements_achievement_id"),
        "user_achievements",
        ["achievement_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_achievements_achievement_id"), table_name="user_achievements")
    op.drop_index(op.f("ix_user_achievements_user_id"), table_name="user_achievements")
    op.drop_table("user_achievements")

    op.drop_index(op.f("ix_achievements_code"), table_name="achievements")
    op.drop_table("achievements")