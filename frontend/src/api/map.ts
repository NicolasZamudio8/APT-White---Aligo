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

export async function getAgentLocations(): Promise<AgentLocation[]> {
  const res = await fetch(`${API_BASE_URL}/agents/locations`);
  if (!res.ok) throw new Error('Failed to fetch agent locations');
  return res.json();
}
