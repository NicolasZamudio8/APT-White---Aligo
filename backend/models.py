import datetime
from sqlalchemy import Column, String, Integer, Double, Boolean, DateTime, ForeignKey, JSON
from database import Base

class SystemConfigModel(Base):
    __tablename__ = "system_configs"
    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AgentModel(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True)
    os = Column(String, nullable=False)
    ip = Column(String, nullable=False)
    city = Column(String, nullable=False)
    lat = Column(Double, nullable=False)
    lng = Column(Double, nullable=False)
    status = Column(String, nullable=False, default="offline")
    crypto_key_id = Column(String, ForeignKey("crypto_keys.id", ondelete="SET NULL"), nullable=True)
    redirector_id = Column(String, ForeignKey("redirectors.id", ondelete="SET NULL"), nullable=True)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

class PlaybookModel(Base):
    __tablename__ = "playbooks"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PlaybookStepModel(Base):
    __tablename__ = "playbook_steps"
    id = Column(Integer, primary_key=True, autoincrement=True)
    playbook_id = Column(String, ForeignKey("playbooks.id", ondelete="CASCADE"), nullable=False)
    command = Column(String, nullable=False)
    delay = Column(Integer, nullable=False, default=2)
    step_order = Column(Integer, nullable=False)
    mitre_tactics = Column(JSON, nullable=True) # Array of strings

class PlaybookExecutionModel(Base):
    __tablename__ = "playbook_executions"
    id = Column(String, primary_key=True)
    playbook_id = Column(String, ForeignKey("playbooks.id", ondelete="SET NULL"), nullable=True)
    playbook_name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending") # pending, running, completed, failed
    current_step = Column(Integer, nullable=False, default=0)
    total_steps = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    agent_ids = Column(JSON, nullable=False) # Array of strings
    logs = Column(JSON, nullable=False, default=list) # Array of logs objects

class ExecutionModel(Base):
    __tablename__ = "executions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    command = Column(String, nullable=False)
    result = Column(String, nullable=True)
    status = Column(String, nullable=False, default="sent") # sent, offline, completed, failed
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class CryptoKeyModel(Base):
    __tablename__ = "crypto_keys"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    value = Column(String, nullable=False)
    algorithm = Column(String, nullable=False, default="XOR-256")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    rotated_at = Column(DateTime, default=datetime.datetime.utcnow)
    active = Column(Boolean, default=False)

class RedirectorModel(Base):
    __tablename__ = "redirectors"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="online") # online, offline, degraded
    uplink_id = Column(String, ForeignKey("redirectors.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    latency_ms = Column(Integer, nullable=False, default=0)
    agents_count = Column(Integer, nullable=False, default=0)
    throughput_mbps = Column(Double, nullable=False, default=0.0)

class SystemLogModel(Base):
    __tablename__ = "system_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    level = Column(String, nullable=False) # INFO, WARNING, ERROR
    message = Column(String, nullable=False)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    playbook_execution_id = Column(String, ForeignKey("playbook_executions.id", ondelete="SET NULL"), nullable=True)

class NetworkPacketModel(Base):
    __tablename__ = "network_packets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    line = Column(String, nullable=False)
    interface = Column(String, nullable=False, default="any")
