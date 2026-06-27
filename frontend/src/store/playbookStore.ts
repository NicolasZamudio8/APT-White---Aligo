import { create } from 'zustand';
import { 
  getPlaybooks, 
  createPlaybook as apiCreatePlaybook, 
  updatePlaybook as apiUpdatePlaybook, 
  deletePlaybook as apiDeletePlaybook, 
  executePlaybook as apiExecutePlaybook,
  getPlaybookExecutions,
  exportPlaybookYaml,
  importPlaybookYaml
} from '../api/playbooks';
import type { Playbook, PlaybookExecution } from '../api/playbooks';


interface PlaybookState {
  playbooks: Playbook[];
  executions: PlaybookExecution[];
  loading: boolean;
  error: string | null;
  fetchPlaybooks: () => Promise<void>;
  fetchExecutions: () => Promise<void>;
  createPlaybook: (playbook: Omit<Playbook, 'id'>) => Promise<void>;
  updatePlaybook: (id: string, playbook: Omit<Playbook, 'id'>) => Promise<void>;
  deletePlaybook: (id: string) => Promise<void>;
  executePlaybook: (playbookId: string, agentIds: string[]) => Promise<string>;
  exportYaml: (playbookId: string) => Promise<string>;
  importYaml: (yamlContent: string) => Promise<void>;
}

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  playbooks: [],
  executions: [],
  loading: false,
  error: null,

  fetchPlaybooks: async () => {
    set({ loading: true, error: null });
    try {
      const playbooks = await getPlaybooks();
      set({ playbooks, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error fetching playbooks', loading: false });
    }
  },

  fetchExecutions: async () => {
    try {
      const executions = await getPlaybookExecutions();
      set({ executions });
    } catch (err: any) {
      console.error('Error fetching playbook executions:', err);
    }
  },

  createPlaybook: async (playbook) => {
    set({ loading: true, error: null });
    try {
      await apiCreatePlaybook(playbook);
      await get().fetchPlaybooks();
    } catch (err: any) {
      set({ error: err.message || 'Error creating playbook', loading: false });
      throw err;
    }
  },

  updatePlaybook: async (id, playbook) => {
    set({ loading: true, error: null });
    try {
      await apiUpdatePlaybook(id, playbook);
      await get().fetchPlaybooks();
    } catch (err: any) {
      set({ error: err.message || 'Error updating playbook', loading: false });
      throw err;
    }
  },

  deletePlaybook: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiDeletePlaybook(id);
      await get().fetchPlaybooks();
    } catch (err: any) {
      set({ error: err.message || 'Error deleting playbook', loading: false });
      throw err;
    }
  },

  executePlaybook: async (playbookId, agentIds) => {
    set({ error: null });
    try {
      const result = await apiExecutePlaybook(playbookId, agentIds);
      await get().fetchExecutions();
      return result.executionId;
    } catch (err: any) {
      set({ error: err.message || 'Error executing playbook' });
      throw err;
    }
  },

  exportYaml: async (playbookId: string) => {
    try {
      return await exportPlaybookYaml(playbookId);
    } catch (err: any) {
      set({ error: err.message || 'Error exporting playbook YAML' });
      throw err;
    }
  },

  importYaml: async (yamlContent: string) => {
    set({ loading: true, error: null });
    try {
      await importPlaybookYaml(yamlContent);
      await get().fetchPlaybooks();
    } catch (err: any) {
      set({ error: err.message || 'Error importing playbook YAML', loading: false });
      throw err;
    }
  }
}));
