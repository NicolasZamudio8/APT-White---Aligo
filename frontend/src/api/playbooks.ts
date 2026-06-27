const API_BASE_URL = 'http://localhost:8000/api';

export interface PlaybookStep {
  command: string;
  delay: number;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  steps: PlaybookStep[];
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  playbookName: string;
  agentIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  startedAt: string;
  completedAt: string | null;
  logs: { timestamp: string; message: string }[];
}

export async function getPlaybooks(): Promise<Playbook[]> {
  const res = await fetch(`${API_BASE_URL}/playbooks`);
  if (!res.ok) throw new Error('Failed to fetch playbooks');
  return res.json();
}

export async function createPlaybook(playbook: Omit<Playbook, 'id'>): Promise<Playbook> {
  const res = await fetch(`${API_BASE_URL}/playbooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(playbook),
  });
  if (!res.ok) throw new Error('Failed to create playbook');
  return res.json();
}

export async function updatePlaybook(id: string, playbook: Omit<Playbook, 'id'>): Promise<Playbook> {
  const res = await fetch(`${API_BASE_URL}/playbooks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(playbook),
  });
  if (!res.ok) throw new Error('Failed to update playbook');
  return res.json();
}

export async function deletePlaybook(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/playbooks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete playbook');
}

export async function executePlaybook(playbookId: string, agentIds: string[]): Promise<{ executionId: string }> {
  const res = await fetch(`${API_BASE_URL}/playbooks/${playbookId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_ids: agentIds }),
  });
  if (!res.ok) throw new Error('Failed to execute playbook');
  return res.json();
}

export async function getPlaybookExecutions(): Promise<PlaybookExecution[]> {
  const res = await fetch(`${API_BASE_URL}/playbooks/executions`);
  if (!res.ok) throw new Error('Failed to fetch playbook executions');
  return res.json();
}
