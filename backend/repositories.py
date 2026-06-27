"""Data Access Objects (DAOs) for database operations."""

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from models import (
    Agent, AgentStatus, Playbook, PlaybookExecution, PlaybookExecutionStatus,
    CommandResult, CryptoKey, Redirector, RedirectorStatus, SystemLog, SystemConfig
)
import uuid

class AgentRepository:
    """Repository for Agent operations."""

    @staticmethod
    def create(db: Session, agent_id: str, os: str, ip_address: str, **kwargs) -> Agent:
        agent = Agent(
            agent_id=agent_id,
            os=os,
            ip_address=ip_address,
            **kwargs
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent

    @staticmethod
    def get_by_agent_id(db: Session, agent_id: str) -> Optional[Agent]:
        return db.query(Agent).filter(Agent.agent_id == agent_id).first()

    @staticmethod
    def get_all(db: Session) -> List[Agent]:
        return db.query(Agent).all()

    @staticmethod
    def get_online(db: Session) -> List[Agent]:
        return db.query(Agent).filter(Agent.status == AgentStatus.ONLINE).all()

    @staticmethod
    def update_status(db: Session, agent_id: str, status: AgentStatus) -> Optional[Agent]:
        agent = AgentRepository.get_by_agent_id(db, agent_id)
        if agent:
            agent.status = status
            agent.last_seen = datetime.utcnow()
            db.commit()
            db.refresh(agent)
        return agent

    @staticmethod
    def update_last_seen(db: Session, agent_id: str) -> Optional[Agent]:
        agent = AgentRepository.get_by_agent_id(db, agent_id)
        if agent:
            agent.last_seen = datetime.utcnow()
            db.commit()
        return agent

    @staticmethod
    def delete(db: Session, agent_id: str) -> bool:
        agent = AgentRepository.get_by_agent_id(db, agent_id)
        if agent:
            db.delete(agent)
            db.commit()
            return True
        return False

class PlaybookRepository:
    """Repository for Playbook operations."""

    @staticmethod
    def create(db: Session, name: str, steps: List[Dict[str, Any]], **kwargs) -> Playbook:
        playbook = Playbook(
            playbook_id=f"pb-{uuid.uuid4().hex[:6]}",
            name=name,
            steps=steps,
            **kwargs
        )
        db.add(playbook)
        db.commit()
        db.refresh(playbook)
        return playbook

    @staticmethod
    def get_by_id(db: Session, playbook_id: str) -> Optional[Playbook]:
        return db.query(Playbook).filter(Playbook.playbook_id == playbook_id).first()

    @staticmethod
    def get_all(db: Session, active_only: bool = True) -> List[Playbook]:
        query = db.query(Playbook)
        if active_only:
            query = query.filter(Playbook.is_active == True)
        return query.all()

    @staticmethod
    def update(db: Session, playbook_id: str, **kwargs) -> Optional[Playbook]:
        playbook = PlaybookRepository.get_by_id(db, playbook_id)
        if playbook:
            for key, value in kwargs.items():
                setattr(playbook, key, value)
            playbook.version += 1
            db.commit()
            db.refresh(playbook)
        return playbook

    @staticmethod
    def delete(db: Session, playbook_id: str) -> bool:
        playbook = PlaybookRepository.get_by_id(db, playbook_id)
        if playbook:
            db.delete(playbook)
            db.commit()
            return True
        return False

class PlaybookExecutionRepository:
    """Repository for Playbook Execution operations."""

    @staticmethod
    def create(db: Session, playbook_id: str, agent_ids: List[str], total_steps: int) -> PlaybookExecution:
        execution = PlaybookExecution(
            execution_id=f"exec-{uuid.uuid4().hex[:6]}",
            playbook_id=playbook_id,
            total_steps=total_steps
        )
        db.add(execution)
        db.flush()

        # Associate agents
        from models import ExecutionAgent
        for agent_id in agent_ids:
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if agent:
                assoc = ExecutionAgent(execution_id=execution.execution_id, agent_id=agent.id)
                db.add(assoc)

        db.commit()
        db.refresh(execution)
        return execution

    @staticmethod
    def get_by_id(db: Session, execution_id: str) -> Optional[PlaybookExecution]:
        return db.query(PlaybookExecution).filter(PlaybookExecution.execution_id == execution_id).first()

    @staticmethod
    def get_all(db: Session, limit: int = 50) -> List[PlaybookExecution]:
        return db.query(PlaybookExecution).order_by(desc(PlaybookExecution.started_at)).limit(limit).all()

    @staticmethod
    def update_status(db: Session, execution_id: str, status: PlaybookExecutionStatus) -> Optional[PlaybookExecution]:
        execution = PlaybookExecutionRepository.get_by_id(db, execution_id)
        if execution:
            execution.status = status
            if status == PlaybookExecutionStatus.COMPLETED:
                execution.completed_at = datetime.utcnow()
            db.commit()
            db.refresh(execution)
        return execution

    @staticmethod
    def add_log(db: Session, execution_id: str, message: str) -> Optional[PlaybookExecution]:
        execution = PlaybookExecutionRepository.get_by_id(db, execution_id)
        if execution:
            execution.execution_logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "message": message
            })
            db.commit()
        return execution

class CommandResultRepository:
    """Repository for Command Result operations."""

    @staticmethod
    def create(db: Session, agent_id: str, command: str, result: str, **kwargs) -> CommandResult:
        cmd_result = CommandResult(
            agent_id=agent_id,
            command=command,
            result=result,
            **kwargs
        )
        db.add(cmd_result)
        db.commit()
        db.refresh(cmd_result)
        return cmd_result

    @staticmethod
    def get_by_agent(db: Session, agent_id: str, limit: int = 50) -> List[CommandResult]:
        return db.query(CommandResult).filter(
            CommandResult.agent_id == agent_id
        ).order_by(desc(CommandResult.created_at)).limit(limit).all()

    @staticmethod
    def get_recent(db: Session, hours: int = 24, limit: int = 100) -> List[CommandResult]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        return db.query(CommandResult).filter(
            CommandResult.created_at >= cutoff
        ).order_by(desc(CommandResult.created_at)).limit(limit).all()

class CryptoKeyRepository:
    """Repository for Crypto Key operations."""

    @staticmethod
    def create(db: Session, name: str, key_value: str, algorithm: str = "XOR-256") -> CryptoKey:
        # Deactivate other keys
        db.query(CryptoKey).update({CryptoKey.is_active: False})
        
        key = CryptoKey(
            key_id=f"key-{uuid.uuid4().hex[:8]}",
            name=name,
            key_value=key_value,
            algorithm=algorithm,
            is_active=True
        )
        db.add(key)
        db.commit()
        db.refresh(key)
        return key

    @staticmethod
    def get_active(db: Session) -> Optional[CryptoKey]:
        return db.query(CryptoKey).filter(CryptoKey.is_active == True).first()

    @staticmethod
    def get_all(db: Session) -> List[CryptoKey]:
        return db.query(CryptoKey).order_by(desc(CryptoKey.created_at)).all()

    @staticmethod
    def activate(db: Session, key_id: str) -> Optional[CryptoKey]:
        # Deactivate all others
        db.query(CryptoKey).update({CryptoKey.is_active: False})
        
        key = db.query(CryptoKey).filter(CryptoKey.key_id == key_id).first()
        if key:
            key.is_active = True
            key.rotated_at = datetime.utcnow()
            db.commit()
            db.refresh(key)
        return key

class RedirectorRepository:
    """Repository for Redirector operations."""

    @staticmethod
    def create(db: Session, name: str, host: str, port: int, uplink_id: Optional[str] = None) -> Redirector:
        redirector = Redirector(
            redirector_id=f"redir-{uuid.uuid4().hex[:8]}",
            name=name,
            host=host,
            port=port,
            uplink_id=uplink_id
        )
        db.add(redirector)
        db.commit()
        db.refresh(redirector)
        return redirector

    @staticmethod
    def get_by_id(db: Session, redirector_id: str) -> Optional[Redirector]:
        return db.query(Redirector).filter(Redirector.redirector_id == redirector_id).first()

    @staticmethod
    def get_all(db: Session) -> List[Redirector]:
        return db.query(Redirector).all()

    @staticmethod
    def update_status(db: Session, redirector_id: str, status: RedirectorStatus) -> Optional[Redirector]:
        redirector = RedirectorRepository.get_by_id(db, redirector_id)
        if redirector:
            redirector.status = status
            redirector.last_heartbeat = datetime.utcnow()
            db.commit()
            db.refresh(redirector)
        return redirector

    @staticmethod
    def delete(db: Session, redirector_id: str) -> bool:
        redirector = RedirectorRepository.get_by_id(db, redirector_id)
        if redirector:
            db.delete(redirector)
            db.commit()
            return True
        return False

class SystemLogRepository:
    """Repository for System Log operations."""

    @staticmethod
    def create(db: Session, level: str, message: str, source: str = "system", **kwargs) -> SystemLog:
        log = SystemLog(
            level=level,
            message=message,
            source=source,
            **kwargs
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def get_recent(db: Session, hours: int = 24, limit: int = 100) -> List[SystemLog]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        return db.query(SystemLog).filter(
            SystemLog.created_at >= cutoff
        ).order_by(desc(SystemLog.created_at)).limit(limit).all()

    @staticmethod
    def get_by_level(db: Session, level: str, limit: int = 50) -> List[SystemLog]:
        return db.query(SystemLog).filter(
            SystemLog.level == level
        ).order_by(desc(SystemLog.created_at)).limit(limit).all()

class SystemConfigRepository:
    """Repository for System Config operations."""

    @staticmethod
    def get(db: Session, key: str) -> Optional[str]:
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        return config.value if config else None

    @staticmethod
    def set(db: Session, key: str, value: str, data_type: str = "string", description: str = "") -> SystemConfig:
        config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if config:
            config.value = value
            config.data_type = data_type
            config.description = description
            config.updated_at = datetime.utcnow()
        else:
            config = SystemConfig(
                key=key,
                value=value,
                data_type=data_type,
                description=description
            )
            db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def get_all(db: Session) -> List[SystemConfig]:
        return db.query(SystemConfig).all()
