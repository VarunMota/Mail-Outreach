"""Add campaign scheduling

Revision ID: 007
Revises: 006
Create Date: 2026-02-19 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Add scheduled_at column to campaigns table
    op.add_column('campaigns', sa.Column('scheduled_at', sa.DateTime(), nullable=True))
    
    # Create index for efficient querying of scheduled campaigns
    op.create_index('ix_campaigns_scheduled_at', 'campaigns', ['scheduled_at'])


def downgrade():
    # Drop index
    op.drop_index('ix_campaigns_scheduled_at', table_name='campaigns')
    
    # Drop column
    op.drop_column('campaigns', 'scheduled_at')
