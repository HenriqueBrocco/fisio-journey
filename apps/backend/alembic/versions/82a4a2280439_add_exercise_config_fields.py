"""add exercise config fields"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "82a4a2280439"
down_revision = "b31f8e4a9c12_create_achievements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns("exercise_configs")}

    def add_column_if_missing(name: str, column):
        if name not in existing_columns:
            op.add_column("exercise_configs", column)

    add_column_if_missing("num_series", sa.Column("num_series", sa.Integer(), nullable=True))
    add_column_if_missing("num_reps", sa.Column("num_reps", sa.Integer(), nullable=True))
    add_column_if_missing("descanso_rep", sa.Column("descanso_rep", sa.Integer(), nullable=True))
    add_column_if_missing("descanso_serie", sa.Column("descanso_serie", sa.Integer(), nullable=True))
    add_column_if_missing("lado_ativo", sa.Column("lado_ativo", sa.String(), nullable=True))
    add_column_if_missing("meta_extensao", sa.Column("meta_extensao", sa.Integer(), nullable=True))
    add_column_if_missing("repouso_max", sa.Column("repouso_max", sa.Integer(), nullable=True))
    add_column_if_missing("limite_tronco", sa.Column("limite_tronco", sa.Integer(), nullable=True))
    add_column_if_missing("tolerancia", sa.Column("tolerancia", sa.Integer(), nullable=True))

    # garante que colunas numéricas fiquem como INTEGER mesmo se tiverem sido criadas manualmente como texto
    op.execute("""
    ALTER TABLE exercise_configs
    ALTER COLUMN num_series
    TYPE INTEGER
    USING NULLIF(TRIM(num_series::text), '')::INTEGER
    """)

    op.execute("""
    ALTER TABLE exercise_configs
    ALTER COLUMN num_reps
    TYPE INTEGER
    USING NULLIF(TRIM(num_reps::text), '')::INTEGER
    """)

    op.execute("""
    ALTER TABLE exercise_configs
    ALTER COLUMN descanso_rep
    TYPE INTEGER
    USING NULLIF(TRIM(descanso_rep::text), '')::INTEGER
    """)

    op.execute("""
    ALTER TABLE exercise_configs
    ALTER COLUMN descanso_serie
    TYPE INTEGER
    USING NULLIF(TRIM(descanso_serie::text), '')::INTEGER
    """)

    op.execute("""
    ALTER TABLE exercise_configs
    ALTER COLUMN meta_extensao
    TYPE INTEGER
    USING NULLIF(TRIM(meta_extensao::text), '')::INTEGER
    """)

    op.execute("""
    ALTER TABLE exercise_configs
    ALTER COLUMN repouso_max
    TYPE INTEGER
    USING NULLIF(TRIM(repouso_max::text), '')::INTEGER
    """)

    op.execute("""
    ALTER TABLE exercise_configs
    ALTER COLUMN limite_tronco
    TYPE INTEGER
    USING NULLIF(TRIM(limite_tronco::text), '')::INTEGER
    """)

    op.execute("""
    ALTER TABLE exercise_configs
    ALTER COLUMN tolerancia
    TYPE INTEGER
    USING NULLIF(TRIM(tolerancia::text), '')::INTEGER
    """)

    op.execute("UPDATE exercise_configs SET num_series = COALESCE(num_series, 1)")
    op.execute("UPDATE exercise_configs SET num_reps = COALESCE(num_reps, 5)")
    op.execute("UPDATE exercise_configs SET descanso_rep = COALESCE(descanso_rep, 3)")
    op.execute("UPDATE exercise_configs SET descanso_serie = COALESCE(descanso_serie, 30)")
    op.execute("UPDATE exercise_configs SET lado_ativo = COALESCE(lado_ativo, 'Perna direita')")
    op.execute("UPDATE exercise_configs SET meta_extensao = COALESCE(meta_extensao, 145)")
    op.execute("UPDATE exercise_configs SET repouso_max = COALESCE(repouso_max, 110)")
    op.execute("UPDATE exercise_configs SET limite_tronco = COALESCE(limite_tronco, 15)")
    op.execute("UPDATE exercise_configs SET tolerancia = COALESCE(tolerancia, 5)")

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
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns("exercise_configs")}

    def drop_column_if_exists(name: str):
        if name in existing_columns:
            op.drop_column("exercise_configs", name)

    drop_column_if_exists("tolerancia")
    drop_column_if_exists("limite_tronco")
    drop_column_if_exists("repouso_max")
    drop_column_if_exists("meta_extensao")
    drop_column_if_exists("lado_ativo")
    drop_column_if_exists("descanso_serie")
    drop_column_if_exists("descanso_rep")
    drop_column_if_exists("num_reps")
    drop_column_if_exists("num_series")