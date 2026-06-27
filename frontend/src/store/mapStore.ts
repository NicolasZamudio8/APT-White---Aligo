import { create } from 'zustand';
import { getAgentLocations } from '../api/map';
import type { AgentLocation } from '../api/map';


interface MapState {
  locations: AgentLocation[];
  loading: boolean;
  error: string | null;
  fetchLocations: () => Promise<void>;
}

export const useMapStore = create<MapState>((set) => ({
  locations: [],
  loading: false,
  error: null,

  fetchLocations: async () => {
    set({ loading: true, error: null });
    try {
      const locations = await getAgentLocations();
      set({ locations, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error fetching agent locations', loading: false });
    }
  }
}));
