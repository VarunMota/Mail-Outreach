"""Add celery_task_id to campaigns

Revision ID: 002
Revises: 001_initial_outreach
Create Date: 2026-02-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add celery_task_id column to campaigns table
    op.add_column('campaigns', sa.Column('celery_task_id', sa.String(), nullable=True))
    
    # Create index for faster lookups
    op.create_index(op.f('ix_campaigns_celery_task_id'), 'campaigns', ['celery_task_id'], unique=False)


def downgrade() -> None:
    # Drop index first
    op.drop_index(op.f('ix_campaigns_celery_task_id'), table_name='campaigns')
    
    # Drop column
    op.drop_column('campaigns', 'celery_task_id')
