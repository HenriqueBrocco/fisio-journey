"""add exercise config fields

Revision ID: 82a4a2280439
Revises: b31f8e4a9c12_create_achievements
Create Date: 2026-06-13 00:02:56.875662

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82a4a2280439'
down_revision = "b31f8e4a9c12_create_achievements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exercise_configs", sa.Column("num_series", sa.Integer(), nullable=True))
    op.add_column("exercise_configs", sa.Column("num_reps", sa.Integer(), nullable=True))
    op.add_column("exercise_configs", sa.Column("descanso_rep", sa.Integer(), nullable=True))
    op.add_column("exercise_configs", sa.Column("descanso_serie", sa.Integer(), nullable=True))
    op.add_column("exercise_configs", sa.Column("lado_ativo", sa.String(), nullable=True))
    op.add_column("exercise_configs", sa.Column("meta_extensao", sa.Integer(), nullable=True))
    op.add_column("exercise_configs", sa.Column("repouso_max", sa.Integer(), nullable=True))
    op.add_column("exercise_configs", sa.Column("limite_tronco", sa.Integer(), nullable=True))
    op.add_column("exercise_configs", sa.Column("tolerancia", sa.Integer(), nullable=True))

    op.execute("UPDATE exercise_configs SET num_series = 1 WHERE num_series IS NULL")
    op.execute("UPDATE exercise_configs SET num_reps = 5 WHERE num_reps IS NULL")
    op.execute("UPDATE exercise_configs SET descanso_rep = 3 WHERE descanso_rep IS NULL")
    op.execute("UPDATE exercise_configs SET descanso_serie = 30 WHERE descanso_serie IS NULL")
    op.execute("UPDATE exercise_configs SET lado_ativo = 'Perna direita' WHERE lado_ativo IS NULL")
    op.execute("UPDATE exercise_configs SET meta_extensao = 145 WHERE meta_extensao IS NULL")
    op.execute("UPDATE exercise_configs SET repouso_max = 110 WHERE repouso_max IS NULL")
    op.execute("UPDATE exercise_configs SET limite_tronco = 15 WHERE limite_tronco IS NULL")
    op.execute("UPDATE exercise_configs SET tolerancia = 5 WHERE tolerancia IS NULL")

    op.alter_column("exercise_configs", "num_series", nullable=False)
    op.alter_column("exercise_configs", "num_reps", nullable=False)
    op.alter_column("exercise_configs", "descanso_rep", nullable=False)
    op.alter_column("exercise_configs", "descanso_serie", nullable=False)
    op.alter_column("exercise_configs", "lado_ativo", nullable=False)
    op.alter_column("exercise_configs", "meta_extensao", nullable=False)
    op.alter_column("exercise_configs", "repouso_max", nullable=False)
    op.alter_column("exercise_configs", "limite_tronco", nullable=False)
    op.alter_column("exercise_configs", "tolerancia", nullable=False)


def downgrade() -> None:
    op.drop_column("exercise_configs", "tolerancia")
    op.drop_column("exercise_configs", "limite_tronco")
    op.drop_column("exercise_configs", "repouso_max")
    op.drop_column("exercise_configs", "meta_extensao")
    op.drop_column("exercise_configs", "lado_ativo")
    op.drop_column("exercise_configs", "descanso_serie")
    op.drop_column("exercise_configs", "descanso_rep")
    op.drop_column("exercise_configs", "num_reps")
    op.drop_column("exercise_configs", "num_series")