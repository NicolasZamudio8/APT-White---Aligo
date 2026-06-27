const API_BASE_URL = 'http://localhost:8000/api';

export interface AgentLocation {
  agentId: string;
  os: string;
  ip: string;
  city: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline';
}

export interface AgentCommandPayload {
  agentId: string;
  command: string;
}

export interface AgentCommandResult {
  status: string;
  agent?: string;
  error?: string;
}

export async function getAgentLocations(): Promise<AgentLocation[]> {
  const res = await fetch(`${API_BASE_URL}/agents`);
  if (!res.ok) throw new Error('Failed to fetch agent locations');

  const data = await res.json();
  return data.map((item: any) => ({
    agentId: item.id || item.agentId,
    os: item.os,
    ip: item.ip,
    city: item.city,
    lat: item.lat,
    lng: item.lng,
    status: item.status || 'offline',
  }));
}

export async function sendAgentCommand({ agentId, command }: AgentCommandPayload): Promise<AgentCommandResult> {
  const res = await fetch(`${API_BASE_URL}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, command }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send command');
  }

  return data;
}
