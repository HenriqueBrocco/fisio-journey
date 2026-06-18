from alembic import op
import sqlalchemy as sa

revision = "d917933731d7"
down_revision = "82a4a2280439"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("session_summaries", sa.Column("accuracy", sa.Integer(), nullable=True))


def downgrade():
    op.drop_column("session_summaries", "accuracy")