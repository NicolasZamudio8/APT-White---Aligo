const API_BASE_URL = 'http://localhost:8000/api';

export interface SystemConfig {
  security_level: string;
  beacon_interval: number;
  log_level: string;
  enable_ai: boolean;
}

export interface SystemStatus {
  status: string;
  uptime: number;
  cpu: number;
  ram: number;
  activeAgents: number;
  totalPlaybooks: number;
  dbConnection: string;
}

export interface SystemLog {
  timestamp: string;
  level: string;
  message: string;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const res = await fetch(`${API_BASE_URL}/config`);
  if (!res.ok) throw new Error('Failed to fetch system configuration');
  return res.json();
}

export async function updateSystemConfig(config: SystemConfig): Promise<SystemConfig> {
  const res = await fetch(`${API_BASE_URL}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update system configuration');
  return res.json();
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE_URL}/system/status`);
  if (!res.ok) throw new Error('Failed to fetch system status');
  return res.json();
}

export async function triggerDiagnostics(): Promise<{ status: string; diagnosticId: string }> {
  const res = await fetch(`${API_BASE_URL}/system/diagnose`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to trigger diagnostics');
  return res.json();
}

export async function getSystemLogs(): Promise<SystemLog[]> {
  const res = await fetch(`${API_BASE_URL}/system/logs`);
  if (!res.ok) throw new Error('Failed to fetch system logs');
  return res.json();
}

export async function chatWithAI(message: string): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Failed to communicate with C2 AI');
  return res.json();
}
