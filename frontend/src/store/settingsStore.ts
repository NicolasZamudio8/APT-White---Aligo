import { create } from 'zustand';
import { 
  getSystemConfig, 
  updateSystemConfig, 
  getSystemStatus, 
  triggerDiagnostics, 
  getSystemLogs 
} from '../api/settings';
import type { SystemConfig, SystemStatus, SystemLog } from '../api/settings';


interface SettingsState {
  config: SystemConfig | null;
  status: SystemStatus | null;
  logs: SystemLog[];
  loading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  updateConfig: (config: SystemConfig) => Promise<void>;
  fetchStatus: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  runDiagnostics: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: null,
  status: null,
  logs: [],
  loading: false,
  error: null,

  fetchConfig: async () => {
    try {
      const config = await getSystemConfig();
      set({ config });
    } catch (err: any) {
      console.error('Error fetching system config:', err);
    }
  },

  updateConfig: async (config) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateSystemConfig(config);
      set({ config: updated, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error updating configuration', loading: false });
      throw err;
    }
  },

  fetchStatus: async () => {
    try {
      const status = await getSystemStatus();
      set({ status });
    } catch (err: any) {
      console.error('Error fetching system status:', err);
    }
  },

  fetchLogs: async () => {
    try {
      const logs = await getSystemLogs();
      set({ logs });
    } catch (err: any) {
      console.error('Error fetching system logs:', err);
    }
  },

  runDiagnostics: async () => {
    set({ loading: true, error: null });
    try {
      await triggerDiagnostics();
      await get().fetchLogs();
      await get().fetchStatus();
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error running diagnostics', loading: false });
      throw err;
    }
  }
}));
