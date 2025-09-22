"""Drop and recreate RGBITeach table

Revision ID: 0d2c15868a8b
Revises: 
Create Date: 2025-09-22 16:28:30.773193
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0d2c15868a8b'
down_revision = None  # önceki migration varsa buraya yaz
branch_labels = None
depends_on = None


def upgrade() -> None:
    # RGBITeach tablosunu tamamen sil
    op.execute("DROP TABLE IF EXISTS RGBITeach")
    # Models.py’de tanımlı olduğundan autogenerate ile tekrar oluşturulacak


def downgrade() -> None:
    # Gerekirse downgrade’de tabloyu eski haliyle tekrar oluştur
    op.create_table(
        'RGBITeach',
        sa.Column('ID', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('TypeNo', sa.Integer),
        sa.Column('ProgNo', sa.Integer),
        sa.Column('Tool_ID', sa.Integer),
        sa.Column('R_Min', sa.Integer),
        sa.Column('R_Max', sa.Integer),
        sa.Column('G_Min', sa.Integer),
        sa.Column('G_Max', sa.Integer),
        sa.Column('B_Min', sa.Integer),
        sa.Column('B_Max', sa.Integer),
        sa.Column('I_Min', sa.Integer),
        sa.Column('I_Max', sa.Integer),
        sa.Column('R_Tole', sa.Float, nullable=False, server_default="0"),
        sa.Column('G_Tole', sa.Float, nullable=False, server_default="0"),
        sa.Column('B_Tole', sa.Float, nullable=False, server_default="0"),
        sa.Column('I_Tole', sa.Float, nullable=False, server_default="0"),
    )
