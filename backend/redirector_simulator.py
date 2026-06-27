"""Network redirector simulator for distributed C2 infrastructure."""

import uuid
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum

class RedirectorStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"

class NetworkRedirector:
    """Represents a proxy/redirector in the C2 infrastructure."""
    
    def __init__(self, name: str, host: str, port: int, uplink_id: Optional[str] = None):
        self.id = f"redir-{uuid.uuid4().hex[:8]}"
        self.name = name
        self.host = host
        self.port = port
        self.uplink_id = uplink_id  # Parent redirector or main C2
        self.status = RedirectorStatus.ONLINE
        self.created_at = datetime.now().isoformat()
        self.latency_ms = 0
        self.agents_count = 0
        self.throughput_mbps = 0.0
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "host": self.host,
            "port": self.port,
            "uplinkId": self.uplink_id,
            "status": self.status.value,
            "createdAt": self.created_at,
            "latencyMs": self.latency_ms,
            "agentsCount": self.agents_count,
            "throughputMbps": self.throughput_mbps
        }

class RedirectorSimulator:
    """Manages network of redirectors."""
    
    def __init__(self):
        self.redirectors: Dict[str, NetworkRedirector] = {}
        self._init_default_redirectors()
    
    def _init_default_redirectors(self):
        """Initialize default redirector hierarchy."""
        # Main C2 server (root)
        main_c2 = NetworkRedirector(
            name="Main C2 Server",
            host="c2.aligo.local",
            port=8000
        )
        self.redirectors[main_c2.id] = main_c2
        
        # Tier 1 redirectors
        tier1_a = NetworkRedirector(
            name="Bogota Proxy",
            host="proxy-bog.aligo.local",
            port=9001,
            uplink_id=main_c2.id
        )
        self.redirectors[tier1_a.id] = tier1_a
        
        tier1_b = NetworkRedirector(
            name="Medellin Proxy",
            host="proxy-med.aligo.local",
            port=9002,
            uplink_id=main_c2.id
        )
        self.redirectors[tier1_b.id] = tier1_b
    
    def create_redirector(self, name: str, host: str, port: int, uplink_id: Optional[str] = None) -> Dict:
        """Create a new redirector."""
        redir = NetworkRedirector(name, host, port, uplink_id)
        self.redirectors[redir.id] = redir
        return redir.to_dict()
    
    def get_redirectors(self) -> List[Dict]:
        """Get all redirectors."""
        return [r.to_dict() for r in self.redirectors.values()]
    
    def get_redirector(self, redir_id: str) -> Optional[Dict]:
        """Get specific redirector."""
        if redir_id in self.redirectors:
            return self.redirectors[redir_id].to_dict()
        return None
    
    def update_redirector_status(self, redir_id: str, status: str) -> bool:
        """Update redirector status."""
        if redir_id in self.redirectors:
            try:
                self.redirectors[redir_id].status = RedirectorStatus(status)
                return True
            except ValueError:
                return False
        return False
    
    def get_redirector_chain(self, agent_id: str) -> List[Dict]:
        """Get the chain of redirectors for an agent (simulated path)."""
        chain = []
        # Simulate: Agent -> Tier1 Proxy -> Main C2
        redirector_list = list(self.redirectors.values())
        if len(redirector_list) >= 2:
            chain.append(redirector_list[1].to_dict())  # Tier 1
            chain.append(redirector_list[0].to_dict())  # Main C2
        return chain
    
    def delete_redirector(self, redir_id: str) -> bool:
        """Delete a redirector."""
        if redir_id in self.redirectors:
            del self.redirectors[redir_id]
            return True
        return False
