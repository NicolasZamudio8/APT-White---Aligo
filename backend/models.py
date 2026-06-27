"""SQLAlchemy ORM models for Aligo C2 system."""

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from enum import Enum as PyEnum
from database import Base

class AgentStatus(PyEnum):
    """Agent status enumeration."""
    ONLINE = "online"
    OFFLINE = "offline"
    DISCONNECTED = "disconnected"
    ERROR = "error"

class PlaybookExecutionStatus(PyEnum):
    """Playbook execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class RedirectorStatus(PyEnum):
    """Redirector status."""
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"
    MAINTENANCE = "maintenance"

class Agent(Base):
    """Agent model - represents connected C2 agents."""
    __tablename__ = "agents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(255), unique=True, nullable=False, index=True)
    os = Column(String(100), nullable=False)
    hostname = Column(String(255))
    ip_address = Column(String(15), nullable=False)
    city = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(SQLEnum(AgentStatus), default=AgentStatus.ONLINE, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    encryption_enabled = Column(Boolean, default=True)
    beacon_interval = Column(Integer, default=10)  # seconds
    metadata_json = Column(JSON, default={})

    # Relationships
    command_results = relationship("CommandResult", back_populates="agent", cascade="all, delete-orphan")
    playbook_executions = relationship("PlaybookExecution", secondary="execution_agents", back_populates="agents")

    def to_dict(self):
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "os": self.os,
            "hostname": self.hostname,
            "ip": self.ip_address,
            "city": self.city,
            "lat": self.latitude,
            "lng": self.longitude,
            "status": self.status.value,
            "last_seen": self.last_seen.isoformat(),
            "encryption_enabled": self.encryption_enabled,
            "created_at": self.created_at.isoformat()
        }

class Playbook(Base):
    """Playbook model - automated command sequences."""
    __tablename__ = "playbooks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    playbook_id = Column(String(36), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    steps = Column(JSON, nullable=False)  # List of commands
    created_by = Column(String(255), default="admin")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    tags = Column(JSON, default=[])

    # Relationships
    executions = relationship("PlaybookExecution", back_populates="playbook", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.playbook_id,
            "name": self.name,
            "description": self.description,
            "steps": self.steps,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
            "version": self.version,
            "is_active": self.is_active
        }

class PlaybookExecution(Base):
    """Playbook execution model - tracks execution history."""
    __tablename__ = "playbook_executions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String(36), unique=True, nullable=False, index=True)
    playbook_id = Column(String(36), ForeignKey("playbooks.playbook_id"), nullable=False)
    status = Column(SQLEnum(PlaybookExecutionStatus), default=PlaybookExecutionStatus.PENDING)
    current_step = Column(Integer, default=0)
    total_steps = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    execution_logs = Column(JSON, default=[])
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    playbook = relationship("Playbook", back_populates="executions")
    agents = relationship("Agent", secondary="execution_agents", back_populates="playbook_executions")

    def to_dict(self):
        return {
            "id": self.execution_id,
            "playbook_id": self.playbook_id,
            "status": self.status.value,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "logs": self.execution_logs,
            "error": self.error_message
        }

class ExecutionAgent(Base):
    """Association table for playbook executions and agents."""
    __tablename__ = "execution_agents"

    execution_id = Column(String(36), ForeignKey("playbook_executions.execution_id"), primary_key=True)
    agent_id = Column(String(36), ForeignKey("agents.id"), primary_key=True)

class CommandResult(Base):
    """Command result model - tracks command execution results."""
    __tablename__ = "command_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False)
    command = Column(String(500), nullable=False)
    result = Column(Text, nullable=False)
    execution_time_ms = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    agent = relationship("Agent", back_populates="command_results")

    def to_dict(self):
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "command": self.command,
            "result": self.result,
            "execution_time_ms": self.execution_time_ms,
            "success": self.success,
            "created_at": self.created_at.isoformat()
        }

class CryptoKey(Base):
    """Cryptographic key model - manages PSK rotation."""
    __tablename__ = "crypto_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key_id = Column(String(36), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    key_value = Column(Text, nullable=False)  # Encrypted in production
    algorithm = Column(String(50), default="XOR-256")
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    rotated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    created_by = Column(String(255), default="admin")

    def to_dict(self):
        return {
            "id": self.key_id,
            "name": self.name,
            "algorithm": self.algorithm,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "rotated_at": self.rotated_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None
        }

class Redirector(Base):
    """Redirector model - proxy/relay in the infrastructure."""
    __tablename__ = "redirectors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    redirector_id = Column(String(36), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    uplink_id = Column(String(36), ForeignKey("redirectors.redirector_id"))
    status = Column(SQLEnum(RedirectorStatus), default=RedirectorStatus.ONLINE)
    latency_ms = Column(Integer, default=0)
    agents_count = Column(Integer, default=0)
    throughput_mbps = Column(Float, default=0.0)
    last_heartbeat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(JSON, default={})

    def to_dict(self):
        return {
            "id": self.redirector_id,
            "name": self.name,
            "host": self.host,
            "port": self.port,
            "uplinkId": self.uplink_id,
            "status": self.status.value,
            "latencyMs": self.latency_ms,
            "agentsCount": self.agents_count,
            "throughputMbps": self.throughput_mbps,
            "last_heartbeat": self.last_heartbeat.isoformat()
        }

class SystemLog(Base):
    """System log model - audit trail."""
    __tablename__ = "system_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    level = Column(String(20), nullable=False, index=True)  # INFO, WARNING, ERROR
    message = Column(Text, nullable=False)
    source = Column(String(100))
    user = Column(String(255), default="system")
    metadata_json = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "level": self.level,
            "message": self.message,
            "source": self.source,
            "user": self.user,
            "created_at": self.created_at.isoformat()
        }

class SystemConfig(Base):
    """System configuration model."""
    __tablename__ = "system_config"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    data_type = Column(String(50), default="string")  # string, int, bool, json
    description = Column(Text)
    updated_by = Column(String(255), default="admin")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "data_type": self.data_type,
            "updated_at": self.updated_at.isoformat()
        }
