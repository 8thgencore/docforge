"""add document tags table

Revision ID: 0002_tags
Revises: 0001_initial
Create Date: 2026-02-14 20:30:00.000000
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = '0002_tags'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'document_tags',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_document_tags_name'), 'document_tags', ['name'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_document_tags_name'), table_name='document_tags')
    op.drop_table('document_tags')
