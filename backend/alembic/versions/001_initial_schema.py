"""Initial database schema for Aligo C2.

Revision ID: 001
Revises: 
Create Date: 2024-01-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create agents table
    op.create_table(
        'agents',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('agent_id', sa.String(255), nullable=False, unique=True),
        sa.Column('os', sa.String(100), nullable=False),
        sa.Column('hostname', sa.String(255)),
        sa.Column('ip_address', sa.String(15), nullable=False),
        sa.Column('city', sa.String(100)),
        sa.Column('latitude', sa.Float),
        sa.Column('longitude', sa.Float),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('last_seen', sa.DateTime, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('encryption_enabled', sa.Boolean, default=True),
        sa.Column('beacon_interval', sa.Integer, default=10),
        sa.Column('metadata_json', postgresql.JSON),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('agent_id'),
        sa.Index('ix_agents_agent_id', 'agent_id'),
        sa.Index('ix_agents_status', 'status'),
    )

    # Create playbooks table
    op.create_table(
        'playbooks',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('playbook_id', sa.String(36), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('steps', postgresql.JSON, nullable=False),
        sa.Column('created_by', sa.String(255), default='admin'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('version', sa.Integer, default=1),
        sa.Column('tags', postgresql.JSON),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('playbook_id'),
        sa.Index('ix_playbooks_playbook_id', 'playbook_id'),
    )

    # Create playbook_executions table
    op.create_table(
        'playbook_executions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('execution_id', sa.String(36), nullable=False, unique=True),
        sa.Column('playbook_id', sa.String(36), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('current_step', sa.Integer, default=0),
        sa.Column('total_steps', sa.Integer, nullable=False),
        sa.Column('started_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime),
        sa.Column('execution_logs', postgresql.JSON),
        sa.Column('error_message', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('execution_id'),
        sa.ForeignKeyConstraint(['playbook_id'], ['playbooks.playbook_id']),
        sa.Index('ix_playbook_executions_execution_id', 'execution_id'),
    )

    # Create execution_agents table
    op.create_table(
        'execution_agents',
        sa.Column('execution_id', sa.String(36), nullable=False),
        sa.Column('agent_id', sa.String(36), nullable=False),
        sa.PrimaryKeyConstraint('execution_id', 'agent_id'),
        sa.ForeignKeyConstraint(['execution_id'], ['playbook_executions.execution_id']),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id']),
    )

    # Create command_results table
    op.create_table(
        'command_results',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('agent_id', sa.String(36), nullable=False),
        sa.Column('command', sa.String(500), nullable=False),
        sa.Column('result', sa.Text, nullable=False),
        sa.Column('execution_time_ms', sa.Integer),
        sa.Column('success', sa.Boolean, default=True),
        sa.Column('error_message', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), index=True),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id']),
    )

    # Create crypto_keys table
    op.create_table(
        'crypto_keys',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('key_id', sa.String(36), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('key_value', sa.Text, nullable=False),
        sa.Column('algorithm', sa.String(50), default='XOR-256'),
        sa.Column('is_active', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('rotated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime),
        sa.Column('created_by', sa.String(255), default='admin'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_id'),
        sa.Index('ix_crypto_keys_key_id', 'key_id'),
    )

    # Create redirectors table
    op.create_table(
        'redirectors',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('redirector_id', sa.String(36), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('host', sa.String(255), nullable=False),
        sa.Column('port', sa.Integer, nullable=False),
        sa.Column('uplink_id', sa.String(36)),
        sa.Column('status', sa.String(50), default='online'),
        sa.Column('latency_ms', sa.Integer, default=0),
        sa.Column('agents_count', sa.Integer, default=0),
        sa.Column('throughput_mbps', sa.Float, default=0.0),
        sa.Column('last_heartbeat', sa.DateTime, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('metadata_json', postgresql.JSON),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('redirector_id'),
        sa.ForeignKeyConstraint(['uplink_id'], ['redirectors.redirector_id']),
        sa.Index('ix_redirectors_redirector_id', 'redirector_id'),
    )

    # Create system_logs table
    op.create_table(
        'system_logs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('level', sa.String(20), nullable=False, index=True),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('source', sa.String(100)),
        sa.Column('user', sa.String(255), default='system'),
        sa.Column('metadata_json', postgresql.JSON),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), index=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # Create system_config table
    op.create_table(
        'system_config',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('key', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('value', sa.Text, nullable=False),
        sa.Column('data_type', sa.String(50), default='string'),
        sa.Column('description', sa.Text),
        sa.Column('updated_by', sa.String(255), default='admin'),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )

def downgrade() -> None:
    op.drop_table('system_config')
    op.drop_table('system_logs')
    op.drop_table('redirectors')
    op.drop_table('crypto_keys')
    op.drop_table('command_results')
    op.drop_table('execution_agents')
    op.drop_table('playbook_executions')
    op.drop_table('playbooks')
    op.drop_table('agents')
