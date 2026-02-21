"""Add sender_id to campaigns table

Revision ID: 004
Revises: 003
Create Date: 2025-01-20 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Add sender_id column
    op.add_column('campaigns', sa.Column('sender_id', sa.Integer(), nullable=True))
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_campaigns_sender_id',
        'campaigns',
        'sender_accounts',
        ['sender_id'],
        ['id']
    )
    
    # Create index for faster lookups
    op.create_index(op.f('ix_campaigns_sender_id'), 'campaigns', ['sender_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_campaigns_sender_id'), table_name='campaigns')
    op.drop_constraint('fk_campaigns_sender_id', 'campaigns', type_='foreignkey')
    op.drop_column('campaigns', 'sender_id')
