"""Add sender type and google_account_id to sender_accounts

Revision ID: 006
Revises: 005
Create Date: 2025-01-21 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Add type column to sender_accounts
    op.add_column('sender_accounts', sa.Column('type', sa.String(), nullable=True, server_default='smtp'))
    
    # Add google_account_id column
    op.add_column('sender_accounts', sa.Column('google_account_id', sa.Integer(), nullable=True))
    
    # Create foreign key
    op.create_foreign_key(
        'fk_sender_accounts_google_account',
        'sender_accounts',
        'google_accounts',
        ['google_account_id'],
        ['id']
    )
    
    # Make SMTP columns nullable (since gmail_oauth doesn't need them)
    op.alter_column('sender_accounts', 'smtp_host', nullable=True)
    op.alter_column('sender_accounts', 'smtp_port', nullable=True)
    op.alter_column('sender_accounts', 'smtp_username', nullable=True)
    op.alter_column('sender_accounts', 'smtp_password_encrypted', nullable=True)


def downgrade():
    op.drop_constraint('fk_sender_accounts_google_account', 'sender_accounts', type_='foreignkey')
    op.drop_column('sender_accounts', 'google_account_id')
    op.drop_column('sender_accounts', 'type')
    
    # Restore non-nullable (will fail if there are nulls, but that's expected)
    op.alter_column('sender_accounts', 'smtp_host', nullable=False)
    op.alter_column('sender_accounts', 'smtp_port', nullable=False)
    op.alter_column('sender_accounts', 'smtp_username', nullable=False)
    op.alter_column('sender_accounts', 'smtp_password_encrypted', nullable=False)
