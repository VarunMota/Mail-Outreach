"""Add sender_accounts table

Revision ID: 003
Revises: 002
Create Date: 2025-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'sender_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('smtp_host', sa.String(), nullable=False),
        sa.Column('smtp_port', sa.Integer(), nullable=False),
        sa.Column('smtp_username', sa.String(), nullable=False),
        sa.Column('smtp_password_encrypted', sa.String(), nullable=False),
        sa.Column('smtp_use_tls', sa.Boolean(), nullable=True),
        sa.Column('daily_limit', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_tested_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_test_status', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sender_accounts_email'), 'sender_accounts', ['email'], unique=False)
    op.create_index(op.f('ix_sender_accounts_id'), 'sender_accounts', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_sender_accounts_id'), table_name='sender_accounts')
    op.drop_index(op.f('ix_sender_accounts_email'), table_name='sender_accounts')
    op.drop_table('sender_accounts')
