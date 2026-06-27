const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const MOCK_AGENTS_FALLBACK: AgentLocation[] = [
  { agentId: 'ag-ant-1000', os: 'Windows 10', ip: '192.168.10.54', status: 'online', lat: 8.6193, lng: -76.3073, city: 'Antioquia' },
  { agentId: 'ag-atl-1001', os: 'Linux', ip: '192.168.11.127', status: 'online', lat: 10.3612, lng: -74.8706, city: 'Atlantico' },
  { agentId: 'ag-san-1002', os: 'Windows 10', ip: '192.168.12.2', status: 'online', lat: 4.7951, lng: -74.0229, city: 'Santafe de bogota d.c' },
  { agentId: 'ag-bol-1003', os: 'Linux', ip: '192.168.13.127', status: 'online', lat: 10.4236, lng: -75.1595, city: 'Bolivar' },
  { agentId: 'ag-boy-1004', os: 'Windows 10', ip: '192.168.14.115', status: 'online', lat: 7.0275, lng: -72.2130, city: 'Boyaca' },
  { agentId: 'ag-cal-1005', os: 'Linux', ip: '192.168.15.7', status: 'online', lat: 5.7527, lng: -74.6950, city: 'Caldas' },
  { agentId: 'ag-caq-1006', os: 'Windows 10', ip: '192.168.16.143', status: 'online', lat: 2.4978, lng: -74.6926, city: 'Caqueta' },
  { agentId: 'ag-cau-1007', os: 'Linux', ip: '192.168.17.52', status: 'online', lat: 2.9751, lng: -78.2116, city: 'Cauca' },
  { agentId: 'ag-ces-1008', os: 'Windows 10', ip: '192.168.18.10', status: 'online', lat: 10.8562, lng: -73.2823, city: 'Cesar' },
  { agentId: 'ag-cor-1009', os: 'Linux', ip: '192.168.19.30', status: 'online', lat: 9.4230, lng: -75.8195, city: 'Cordoba' },
  { agentId: 'ag-cun-1010', os: 'Windows 10', ip: '192.168.20.82', status: 'online', lat: 5.7489, lng: -74.3296, city: 'Cundinamarca' },
  { agentId: 'ag-cho-1011', os: 'Linux', ip: '192.168.21.152', status: 'online', lat: 8.2717, lng: -77.0213, city: 'Choco' },
  { agentId: 'ag-hui-1012', os: 'Windows 10', ip: '192.168.22.57', status: 'online', lat: 3.2739, lng: -74.6360, city: 'Huila' },
  { agentId: 'ag-la -1013', os: 'Linux', ip: '192.168.23.18', status: 'online', lat: 12.4235, lng: -71.6212, city: 'La guajira' },
  { agentId: 'ag-mag-1014', os: 'Windows 10', ip: '192.168.24.131', status: 'online', lat: 11.3277, lng: -74.0918, city: 'Magdalena' },
  { agentId: 'ag-met-1015', os: 'Linux', ip: '192.168.25.199', status: 'online', lat: 4.4449, lng: -71.0799, city: 'Meta' },
  { agentId: 'ag-nar-1016', os: 'Windows 10', ip: '192.168.26.36', status: 'online', lat: 2.5774, lng: -77.9836, city: 'Nariño' },
  { agentId: 'ag-nor-1017', os: 'Linux', ip: '192.168.27.85', status: 'online', lat: 9.1340, lng: -73.0178, city: 'Norte de santander' },
  { agentId: 'ag-qui-1018', os: 'Windows 10', ip: '192.168.28.69', status: 'online', lat: 4.6946, lng: -75.6721, city: 'Quindio' },
  { agentId: 'ag-ris-1019', os: 'Linux', ip: '192.168.29.40', status: 'online', lat: 5.4751, lng: -75.8865, city: 'Risaralda' },
  { agentId: 'ag-san-1020', os: 'Windows 10', ip: '192.168.30.153', status: 'online', lat: 8.1150, lng: -73.8001, city: 'Santander' },
  { agentId: 'ag-suc-1021', os: 'Linux', ip: '192.168.31.173', status: 'online', lat: 9.8849, lng: -75.4831, city: 'Sucre' },
  { agentId: 'ag-tol-1022', os: 'Windows 10', ip: '192.168.32.134', status: 'online', lat: 5.2814, lng: -74.8400, city: 'Tolima' },
  { agentId: 'ag-val-1023', os: 'Linux', ip: '192.168.33.179', status: 'online', lat: 4.9736, lng: -76.0838, city: 'Valle del cauca' },
  { agentId: 'ag-ara-1024', os: 'Windows 10', ip: '192.168.34.182', status: 'online', lat: 7.0593, lng: -70.6987, city: 'Arauca' },
  { agentId: 'ag-cas-1025', os: 'Linux', ip: '192.168.35.49', status: 'online', lat: 6.2479, lng: -70.1725, city: 'Casanare' },
  { agentId: 'ag-put-1026', os: 'Windows 10', ip: '192.168.36.131', status: 'online', lat: 1.3164, lng: -76.5781, city: 'Putumayo' },
  { agentId: 'ag-ama-1027', os: 'Linux', ip: '192.168.37.183', status: 'online', lat: 0.1186, lng: -71.3864, city: 'Amazonas' },
  { agentId: 'ag-gua-1028', os: 'Windows 10', ip: '192.168.38.123', status: 'online', lat: 3.8605, lng: -67.6878, city: 'Guainia' },
  { agentId: 'ag-gua-1029', os: 'Linux', ip: '192.168.39.177', status: 'online', lat: 2.8375, lng: -71.2646, city: 'Guaviare' },
  { agentId: 'ag-vau-1030', os: 'Windows 10', ip: '192.168.40.90', status: 'online', lat: 1.9853, lng: -70.1130, city: 'Vaupes' },
  { agentId: 'ag-vic-1031', os: 'Linux', ip: '192.168.41.25', status: 'online', lat: 6.2795, lng: -67.7969, city: 'Vichada' },
  { agentId: 'ag-arc-1032', os: 'Windows 10', ip: '192.168.42.100', status: 'online', lat: 12.5946, lng: -81.7130, city: 'San andres providencia y santa catalina' }
];

export interface AgentLocation {
  agentId: string;
  os: string;
  ip: string;
  city: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline';
  last_command_category?: string;
}

export interface MapSettings {
  drone_mode: boolean;
  selected_department: string;
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
  try {
    const res = await fetch(`${API_BASE_URL}/agents/locations`);
    if (!res.ok) throw new Error('Failed to fetch agent locations');

    const data = await res.json();
    const mapped = data.map((item: any) => ({
      agentId: item.id || item.agentId,
      os: item.os,
      ip: item.ip,
      city: item.city,
      lat: item.lat,
      lng: item.lng,
      status: item.status || 'offline',
      last_command_category: item.last_command_category,
    }));
    
    if (mapped.length < 5) return MOCK_AGENTS_FALLBACK;
    return mapped;
    
  } catch (error) {
    console.warn("Backend C2 indisponible. Iniciando fallback de Modo Demo (33 Agentes).");
    return MOCK_AGENTS_FALLBACK;
  }
}

export async function getMapSettings(): Promise<MapSettings> {
  const res = await fetch(`${API_BASE_URL}/map/settings`);
  if (!res.ok) throw new Error('Failed to fetch map settings');
  return res.json();
}

export async function updateMapSettings(settings: MapSettings): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/map/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update map settings');
  return res.json();
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
