import { useEffect, useState, type DragEvent } from 'react';
import { useMapStore } from '../store/mapStore';
import { sendAgentCommand } from '../api/map';
import { 
  Map as MapIcon, 
  Activity, 
  Terminal, 
  Cpu, 
  Globe, 
  RefreshCw,
  Search,
  ExternalLink,
  Wifi,
  WifiOff,
  Antenna
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { geoMercator, geoPath, geoContains } from 'd3-geo';
import TSharkModal from '../components/TSharkModal';
import VulnerabilityAlertModal, { type VulnerabilityAlertData } from '../components/VulnerabilityAlertModal';

// El mapa ahora utiliza D3 GeoJSON cargado dinámicamente

const commandLibrary = [
  { id: 'recon',  label: 'Recon',  description: 'Enumerar procesos y servicios' },
  { id: 'dump',   label: 'Dump',   description: 'Capturar credenciales locales' },
  { id: 'beacon', label: 'Beacon', description: 'Establecer señal de persistencia' },
  { id: 'exfil',  label: 'Exfil',  description: 'Extraer artefactos sensibles' },
];

// Color palette per attack type — harmonized with Aligo brand
const COMMAND_COLORS: Record<string, { ring: string; glow: string; dot: string; label: string }> = {
  recon:  { ring: '#f59e0b', glow: 'rgba(245,158,11,0.35)',  dot: '#fbbf24', label: 'RECON'  },
  dump:   { ring: '#8b5cf6', glow: 'rgba(139,92,246,0.35)',  dot: '#a78bfa', label: 'DUMP'   },
  beacon: { ring: '#06b6d4', glow: 'rgba(6,182,212,0.35)',   dot: '#22d3ee', label: 'BEACON' },
  exfil:  { ring: '#e02424', glow: 'rgba(224,36,36,0.40)',   dot: '#f87171', label: 'EXFIL'  },
};

export default function Map() {
  const { locations, loading, error, fetchLocations } = useMapStore();
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [droneMode, setDroneMode] = useState(true);
  const [draggedCommand, setDraggedCommand] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Array<{ id: number; agentId: string; command: string; timestamp: string; status: string }>>([]);
  // Tracks the last attack color applied to each agent node
  const [agentCommandColors, setAgentCommandColors] = useState<Record<string, string>>({});
  const [showTShark, setShowTShark] = useState(false);
  // Vulnerability alert modal state
  const [alertData, setAlertData] = useState<VulnerabilityAlertData | null>(null);
  const navigate = useNavigate();

  const [geoData, setGeoData] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('TODOS');

  // Width and height of the SVG map container
  const mapWidth = 600;
  const mapHeight = 700;

  useEffect(() => {
    // Cargar GeoJSON de Colombia
    fetch('/assets/colombia.geo.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Error loading geojson:', err));
  }, []);

  useEffect(() => {
    fetchLocations();
    // Poll agent locations every 5 seconds
    const interval = setInterval(() => {
      fetchLocations();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  // Proyección D3
  const projection = geoData ? geoMercator().fitSize([mapWidth, mapHeight], geoData) : null;
  const pathGenerator = projection ? geoPath().projection(projection) : null;

  // Project Lat/Lng coordinates into SVG (x, y) pixels
  const projectCoords = (lat: number, lng: number) => {
    if (!projection) return { x: 0, y: 0 };
    const coords = projection([lng, lat]);
    if (!coords) return { x: 0, y: 0 };
    return { x: coords[0], y: coords[1] };
  };

  // Filtered locations based on search query and department filter
  const filteredLocations = locations.filter(loc => {
    const textMatch = loc.agentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      loc.ip.includes(searchQuery);

    let deptMatch = true;
    if (selectedDepartment !== 'TODOS' && geoData) {
      const deptFeature = geoData.features.find((f: any) => f.properties.NOMBRE_DPT === selectedDepartment);
      if (deptFeature) {
        deptMatch = geoContains(deptFeature, [loc.lng, loc.lat]);
      }
    }
    return textMatch && deptMatch;
  });

  const handleDragStart = (event: DragEvent<HTMLDivElement>, commandId: string) => {
    event.dataTransfer.setData('text/plain', commandId);
    setDraggedCommand(commandId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>, agentId: string) => {
    event.preventDefault();
    const commandId = event.dataTransfer.getData('text/plain');
    const selectedCommand = commandLibrary.find((cmd) => cmd.id === commandId);

    if (!selectedCommand) return;

    const commandPayloads: Record<string, string> = {
      recon: 'whoami',
      dump: 'reg query HKLM\\SAM',
      beacon: 'schtasks /query',
      exfil: 'copy /b C:\\Users\\Public\\*.txt',
    };

    try {
      const result = await sendAgentCommand({
        agentId,
        command: commandPayloads[commandId] || selectedCommand.label,
      });

      // Apply the attack color to the node that received the payload
      setAgentCommandColors(prev => ({ ...prev, [agentId]: commandId }));

      // Fire the vulnerability alert modal with AI recommendation
      const cmdColor = COMMAND_COLORS[commandId];
      const loc = locations.find(l => l.agentId === agentId);
      const attackPayload = {
        agentId,
        ip: loc?.ip ?? 'N/A',
        city: loc?.city ?? 'N/A',
        commandId,
        commandLabel: selectedCommand.label,
        ringColor: cmdColor?.ring ?? '#e02424',
        glowColor: cmdColor?.glow ?? 'rgba(224,36,36,0.35)',
        timestamp: new Date().toLocaleTimeString(),
      };

      setAlertData(attackPayload);

      // Dispatch real-time custom event to feed TShark network captures and AI Chat assistant
      window.dispatchEvent(new CustomEvent('c2_attack_event', { detail: attackPayload }));

      setExecutions((prev) => [
        {
          id: Date.now(),
          agentId,
          command: selectedCommand.label,
          timestamp: new Date().toLocaleTimeString(),
          status: result.status === 'sent' ? 'Enviado' : result.status,
        },
        ...prev,
      ].slice(0, 5));
    } catch (error) {
      // Apply the attack color to the node that received the payload (also on error)
      setAgentCommandColors(prev => ({ ...prev, [agentId]: commandId }));

      // Still show the alert — the attack was attempted regardless
      const cmdColor = COMMAND_COLORS[commandId];
      const loc = locations.find(l => l.agentId === agentId);
      const attackPayload = {
        agentId,
        ip: loc?.ip ?? 'N/A',
        city: loc?.city ?? 'N/A',
        commandId,
        commandLabel: selectedCommand.label,
        ringColor: cmdColor?.ring ?? '#e02424',
        glowColor: cmdColor?.glow ?? 'rgba(224,36,36,0.35)',
        timestamp: new Date().toLocaleTimeString(),
      };

      setAlertData(attackPayload);

      // Dispatch event even on error so C2 operators capture the network signature
      window.dispatchEvent(new CustomEvent('c2_attack_event', { detail: attackPayload }));

      setExecutions((prev) => [
        {
          id: Date.now(),
          agentId,
          command: selectedCommand.label,
          timestamp: new Date().toLocaleTimeString(),
          status: error instanceof Error ? error.message : 'Error',
        },
        ...prev,
      ].slice(0, 5));
    } finally {
      setDraggedCommand(null);
    }
  };
  const handleMassiveDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (selectedDepartment === 'TODOS' || filteredLocations.length === 0) return;
    
    const commandId = event.dataTransfer.getData('text/plain');
    const selectedCommand = commandLibrary.find((cmd) => cmd.id === commandId);
    if (!selectedCommand) return;

    const commandPayloads: Record<string, string> = {
      recon: 'whoami',
      dump: 'reg query HKLM\\SAM',
      beacon: 'schtasks /query',
      exfil: 'copy /b C:\\Users\\Public\\*.txt',
    };

    try {
      const promises = filteredLocations.map(loc => 
        sendAgentCommand({
          agentId: loc.agentId,
          command: commandPayloads[commandId] || selectedCommand.label,
        }).then(result => ({ loc, result })).catch(error => ({ loc, error }))
      );
      
      const results = await Promise.all(promises);

      // Paint all targeted nodes with the attack color
      const colorUpdates: Record<string, string> = {};
      results.forEach(res => { colorUpdates[res.loc.agentId] = commandId; });
      setAgentCommandColors(prev => ({ ...prev, ...colorUpdates }));

      // Dispatch attack events for all agents targeted in the massive action
      results.forEach(res => {
        const cmdColor = COMMAND_COLORS[commandId];
        const payload = {
          agentId: res.loc.agentId,
          ip: res.loc.ip,
          city: res.loc.city,
          commandId,
          commandLabel: selectedCommand.label,
          ringColor: cmdColor?.ring ?? '#e02424',
          glowColor: cmdColor?.glow ?? 'rgba(224,36,36,0.35)',
          timestamp: new Date().toLocaleTimeString(),
        };
        window.dispatchEvent(new CustomEvent('c2_attack_event', { detail: payload }));
      });
      
      const newExecutions = results.map((res, idx) => ({
        id: Date.now() + idx,
        agentId: res.loc.agentId,
        command: selectedCommand.label,
        timestamp: new Date().toLocaleTimeString(),
        status: 'result' in res && res.result ? (res.result.status === 'sent' ? 'Enviado' : res.result.status) : 'Error',
      }));

      setExecutions((prev) => [...newExecutions, ...prev].slice(0, 15));
    } finally {
      setDraggedCommand(null);
    }
  };

  const calculateRegionalHealth = () => {
    if (selectedDepartment === 'TODOS' || filteredLocations.length === 0) return 'normal';
    const offlineCount = filteredLocations.filter(loc => loc.status === 'offline').length;
    return (offlineCount / filteredLocations.length) >= 0.5 ? 'critical' : 'normal';
  };
  const regionalHealth = calculateRegionalHealth();

  return (
    <div className="space-y-6 text-slate-100 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <MapIcon className="w-8 h-8 text-aligo-600" />
            Mapa Táctico de Agentes
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Visualización geográfica en tiempo real de agentes activos y telemetría de red.
          </p>
        </div>
        <button
          onClick={() => fetchLocations()}
          disabled={loading}
          className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-300 p-2.5 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar Mapa
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 flex items-center gap-3 text-sm">
          <WifiOff className="w-5 h-5 shrink-0" />
          <span>Error de conexión: {error}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4">
        {/* Controles del Filtro Táctico Global */}
        <div className="flex-1 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 min-w-max text-zinc-300 font-semibold text-sm">
            <Globe className="w-4 h-4 text-aligo-500" /> Filtro Global:
          </div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full sm:w-64 bg-black border border-zinc-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-aligo-600 text-zinc-200 cursor-pointer"
          >
            <option value="TODOS">Todos los Departamentos</option>
            {geoData?.features.map((f: any) => (
              <option key={f.properties.DPTO || f.properties.NOMBRE_DPT} value={f.properties.NOMBRE_DPT}>
                {f.properties.NOMBRE_DPT}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-zinc-900 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-aligo-600 text-zinc-200"
            />
          </div>
        </div>

        {/* Botones de Modo */}
        <div className="inline-flex rounded-full border border-zinc-900 bg-black p-1 shrink-0">
          <button
            onClick={() => setDroneMode(true)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              droneMode ? 'bg-emerald-600 text-white' : 'bg-transparent text-zinc-300 hover:text-white'
            }`}
          >
            Modo Dron
          </button>
          <button
            onClick={() => setDroneMode(false)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              !droneMode ? 'bg-zinc-800 text-white' : 'bg-transparent text-zinc-300 hover:text-white'
            }`}
          >
            Modo Mapa
          </button>
        </div>
      </div>

      {droneMode && (
        <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-6">
          {/* Premium Payload Cards Toolbar */}
          <div className="hud-panel p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: 'var(--aligo-red)' }} />
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Payloads</h3>
              <span className="ml-auto text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{commandLibrary.length} cmds</span>
            </div>
            <div className="space-y-2">
              {commandLibrary.map((command) => (
                <div
                  key={command.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, command.id)}
                  onDragEnd={() => setDraggedCommand(null)}
                  className="payload-card p-3 select-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-aligo-600 shrink-0" />
                    <div className="text-xs font-bold text-white uppercase tracking-wide">{command.label}</div>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1.5 ml-3.5 leading-relaxed">{command.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-zinc-800 p-3">
              <p className="text-[10px] text-zinc-600 text-center">
                {draggedCommand
                  ? <span className="text-aligo-500 font-semibold">{commandLibrary.find(c => c.id === draggedCommand)?.label} — Suelta sobre un nodo</span>
                  : 'Arrastra un payload sobre un agente o sobre el grid para ejecutar en masa'}
              </p>
            </div>
          </div>

          {/* Right: Main Drone Grid Panel */}
          <div className="hud-panel p-4 space-y-4 scanline-overlay">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ background: 'var(--aligo-red)' }} />
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Plano Táctico de Agentes</h3>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 ml-3.5">Arrastra un payload sobre un nodo para ejecutar</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-semibold"
                style={{
                  borderColor: 'rgba(16,185,129,0.3)',
                  background: 'rgba(16,185,129,0.07)',
                  color: 'rgba(52,211,153,0.9)'
                }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'status-blink 1.4s ease-in-out infinite' }} />
                Live Sync
              </span>
            </div>

            <div 
              onDragOver={handleDragOver}
              onDrop={handleMassiveDrop}
              className={`grid h-[400px] grid-cols-2 gap-5 overflow-y-auto rounded-xl p-5 sm:grid-cols-3 xl:grid-cols-4 transition-all duration-700 relative scanline-overlay ${
                regionalHealth === 'critical' 
                  ? 'bg-gradient-to-br from-red-950/30 via-black to-black border border-red-800/40 shadow-[inset_0_0_60px_rgba(239,68,68,0.07)]' 
                  : 'bg-gradient-to-br from-zinc-950 via-black to-[#050505] border border-white/[0.04] shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]'
              }`}
            >
              {/* Background subtle dot grid */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '28px 28px'
              }} />

              {filteredLocations.length === 0 ? (
                <div className="col-span-full flex h-full items-center justify-center text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-600 text-xl">∅</span>
                    </div>
                    <p className="text-sm text-zinc-600">Sin agentes activos en esta región.</p>
                  </div>
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isOnline = loc.status === 'online';
                  // Determine node color: attack color if targeted, else green for online, gray for offline
                  const attackCommandId = agentCommandColors[loc.agentId];
                  const attackColor = attackCommandId ? COMMAND_COLORS[attackCommandId] : null;
                  const nodeRing  = attackColor ? attackColor.ring  : (isOnline ? '#34d399' : '#52525b');
                  const nodeGlow  = attackColor ? attackColor.glow  : (isOnline ? 'rgba(52,211,153,0.25)' : 'transparent');
                  const nodeDot   = attackColor ? attackColor.dot   : (isOnline ? '#34d399' : '#71717a');

                  return (
                    <div
                      key={loc.agentId}
                      onDragOver={handleDragOver}
                      onDrop={(event) => {
                        event.stopPropagation();
                        handleDrop(event, loc.agentId);
                      }}
                      className="drone-node"
                    >
                      {/* Outer glow aura — uses dynamic attack color */}
                      <div className="absolute w-16 h-16 rounded-full opacity-25 pointer-events-none transition-all duration-700"
                        style={{ background: `radial-gradient(circle, ${nodeGlow} 0%, transparent 70%)` }}
                      />

                      {/* Main node ring — dynamic color border */}
                      <div
                        className="drone-node-ring"
                        style={{
                          border: `2px solid ${nodeRing}`,
                          background: `${nodeRing}18`,
                          boxShadow: `0 0 20px ${nodeGlow}, inset 0 0 12px ${nodeRing}18`,
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {/* Ping ring for online nodes */}
                        {isOnline && (
                          <span className="absolute inset-[-4px] rounded-full pointer-events-none"
                            style={{
                              border: `1.5px solid ${nodeRing}80`,
                              animation: 'ping-ring 2s ease-out infinite',
                            }}
                          />
                        )}

                        {/* Inner dot */}
                        <span
                          className="w-3.5 h-3.5 rounded-full transition-all duration-700"
                          style={{
                            background: nodeDot,
                            boxShadow: `0 0 10px ${nodeDot}cc`,
                            animation: isOnline ? 'status-blink 2.5s ease-in-out infinite' : 'none',
                          }}
                        />

                        {/* HUD corner marks — match attack color */}
                        <span className="absolute top-1 left-1 w-2 h-2 border-t border-l transition-colors duration-700" style={{ borderColor: `${nodeRing}80` }} />
                        <span className="absolute top-1 right-1 w-2 h-2 border-t border-r transition-colors duration-700" style={{ borderColor: `${nodeRing}80` }} />
                        <span className="absolute bottom-1 left-1 w-2 h-2 border-b border-l transition-colors duration-700" style={{ borderColor: `${nodeRing}80` }} />
                        <span className="absolute bottom-1 right-1 w-2 h-2 border-b border-r transition-colors duration-700" style={{ borderColor: `${nodeRing}80` }} />
                      </div>

                      {/* Agent ID */}
                      <span className="mt-2 max-w-[90px] truncate text-center text-[10px] font-bold font-mono text-white/80 tracking-tight">
                        {loc.agentId}
                      </span>

                      {/* Attack label badge (shows attack type when targeted) */}
                      {attackColor ? (
                        <span className="text-[7px] font-bold uppercase tracking-widest mt-0.5 px-1.5 py-0.5 rounded-sm"
                          style={{ background: `${nodeRing}22`, color: nodeRing, border: `1px solid ${nodeRing}40` }}>
                          {attackColor.label}
                        </span>
                      ) : (
                        <span className="max-w-[90px] truncate text-center text-[8.5px] font-mono leading-tight mt-0.5"
                          style={{ color: isOnline ? 'rgba(52,211,153,0.6)' : 'rgba(113,113,122,0.5)' }}>
                          {loc.ip}
                        </span>
                      )}
                      <span className="text-[7.5px] uppercase tracking-widest text-zinc-600 mt-0.5">{loc.city}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Executions log */}
            <div className="rounded-xl border border-white/[0.04] bg-black/60 p-3">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-2">
                <div className="w-1 h-3 rounded-full" style={{ background: 'var(--aligo-red)', opacity: 0.7 }} />
                Últimas ejecuciones
              </h4>
              <div className="mt-3 space-y-1.5">
                {executions.length === 0 ? (
                  <p className="text-[11px] text-zinc-700 italic text-center py-3">Aún no hay ejecuciones registradas.</p>
                ) : (
                  executions.map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between rounded-lg border border-white/[0.03] bg-white/[0.02] hover:bg-white/[0.04] px-3 py-2 text-sm transition-colors">
                      <div>
                        <p className="font-semibold text-xs text-zinc-200 font-mono">{execution.command} <span className="text-zinc-600">→</span> {execution.agentId}</p>
                        <p className="text-[10px] text-zinc-600">{execution.timestamp}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        execution.status === 'Enviado'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {execution.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      {!droneMode && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Panel: Search & Agent List (1 col) */}
        <div className="lg:col-span-1 space-y-4 flex flex-col max-h-[700px]">
          {/* List Box */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 flex-1 overflow-y-auto space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold px-2">
              Agentes en Mapa ({filteredLocations.length})
            </span>
            
            {filteredLocations.length === 0 ? (
              <div className="text-center text-zinc-500 py-8 text-xs">
                No se encontraron agentes.
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isSelected = selectedAgent?.agentId === loc.agentId;
                const isOnline = loc.status === 'online';
                
                return (
                  <div
                    key={loc.agentId}
                    onClick={() => setSelectedAgent(loc)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-aligo-700/10 border-aligo-600 text-white' 
                        : 'bg-black/40 border-zinc-950 hover:border-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs truncate text-zinc-200">{loc.agentId}</span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-600'}`} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1.5 font-mono">
                      <span>{loc.city}</span>
                      <span>{loc.ip}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Panel: SVG Cyberpunk Interactive Map (2 cols) */}
        <div className="lg:col-span-2 bg-black border border-zinc-950 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
          
          {/* Radar Sweep Animation (Visual Effect) */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute w-[600px] h-[600px] border border-aligo-600/20 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute w-[400px] h-[400px] border border-aligo-600/10 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute w-[200px] h-[200px] border border-aligo-600/5 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            {/* Rotating grid sweep lines */}
            <div className="absolute top-1/2 left-1/2 w-[350px] h-[2px] bg-gradient-to-r from-aligo-600/40 to-transparent origin-left animate-[spin_8s_linear_infinite]" />
          </div>

          <span className="absolute top-4 left-4 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            Radar Sector: COLOMBIA-C2
          </span>
          <span className="absolute top-4 right-4 text-[10px] text-zinc-500 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>

          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="max-w-[500px] max-h-[600px] select-none"
          >
            {/* Grid Pattern Background */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />

            {/* Latitude/Longitude lines */}
            <line x1="0" y1={mapHeight/2} x2={mapWidth} y2={mapHeight/2} stroke="#334155" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1={mapWidth/2} y1="0" x2={mapWidth/2} y2={mapHeight} stroke="#334155" strokeWidth="0.5" strokeDasharray="5,5" />
            
            {/* GeoJSON Departments rendering with D3 */}
            {geoData && pathGenerator && geoData.features.map((feature: any, i: number) => {
              const isSelected = selectedDepartment === feature.properties.NOMBRE_DPT;
              const isFaded = selectedDepartment !== 'TODOS' && !isSelected;
              
              return (
                <path
                  key={feature.properties.DPTO || i}
                  d={pathGenerator(feature) || ''}
                  fill={isSelected ? 'rgba(59, 130, 246, 0.25)' : '#1e293b'}
                  fillOpacity={isFaded ? 0.1 : (isSelected ? 0.3 : 0.4)}
                  stroke={isSelected ? '#60a5fa' : '#3b82f6'}
                  strokeWidth={isSelected ? 1.5 : 0.5}
                  strokeOpacity={isFaded ? 0.2 : (isSelected ? 1 : 0.4)}
                  className={`transition-all duration-700 hover:fill-blue-900/40 hover:stroke-aligo-500 ${isSelected ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : ''}`}
                  onClick={() => setSelectedDepartment(isSelected ? 'TODOS' : feature.properties.NOMBRE_DPT)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{feature.properties.NOMBRE_DPT}</title>
                </path>
              );
            })}

            {/* Render Agent radar nodes */}
            {filteredLocations.map((loc) => {
              const { x, y } = projectCoords(loc.lat, loc.lng);
              const isSelected = selectedAgent?.agentId === loc.agentId;
              const isOnline = loc.status === 'online';
              const dotColor = isOnline ? '#10b981' : '#64748b';
              const pulseColor = isOnline ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.2)';
              
              return (
                <g 
                  key={loc.agentId}
                  className="cursor-pointer"
                  onClick={() => setSelectedAgent(loc)}
                >
                  {/* Outer Pulsing Radar Rings */}
                  {isOnline && (
                    <>
                      <circle cx={x} cy={y} r="18" fill="none" stroke={pulseColor} strokeWidth="1" className="animate-ping origin-center" />
                      <circle cx={x} cy={y} r="30" fill="none" stroke={pulseColor} strokeWidth="0.5" opacity="0.5" className="animate-[ping_3s_infinite] origin-center" />
                    </>
                  )}
                  
                  {/* Selected Highlight Halo */}
                  {isSelected && (
                    <circle cx={x} cy={y} r="12" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="3,3" className="animate-[spin_4s_linear_infinite]" />
                  )}

                  {/* Core Node Circle */}
                  <circle cx={x} cy={y} r={isSelected ? 6 : 4.5} fill={dotColor} stroke="#0f172a" strokeWidth="1.5" />
                  
                  {/* City Label */}
                  <text 
                    x={x + 8} 
                    y={y + 3} 
                    fill={isSelected ? '#3b82f6' : '#94a3b8'} 
                    fontSize="9" 
                    fontWeight={isSelected ? 'bold' : 'normal'} 
                    fontFamily="monospace"
                  >
                    {loc.city}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Panel: Selected Agent Meta & Command Box (1 col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 space-y-4 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Activity className="w-4 h-4 text-aligo-500" />
                Detalles del Nodo
              </h2>

              {!selectedAgent ? (
                <div className="text-center text-zinc-500 py-16 text-xs flex flex-col items-center justify-center gap-2">
                  <MapIcon className="w-8 h-8 text-zinc-800" />
                  <span>Selecciona un nodo en el radar o en el listado para inspeccionar su telemetría.</span>
                </div>
              ) : (
                <div className="space-y-4 mt-3">
                  {/* Agent Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">ID del Agente:</span>
                      <span className="font-semibold text-zinc-200 truncate max-w-[120px]" title={selectedAgent.agentId}>
                        {selectedAgent.agentId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Estado de Conexión:</span>
                      {selectedAgent.status === 'online' ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5" /> En Línea
                        </span>
                      ) : (
                        <span className="text-zinc-500 flex items-center gap-1">
                          <WifiOff className="w-3.5 h-3.5" /> Desconectado
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Dirección IP:</span>
                      <span className="font-mono text-zinc-300">{selectedAgent.ip}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Sistema Operativo:</span>
                      <span className="text-zinc-300">{selectedAgent.os}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Ubicación Geo:</span>
                      <span className="text-zinc-300">{selectedAgent.city}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Coordenadas:</span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {selectedAgent.lat.toFixed(4)}°, {selectedAgent.lng.toFixed(4)}°
                      </span>
                    </div>
                  </div>

                  {/* Latency Simulator Panel */}
                  {selectedAgent.status === 'online' && (
                    <div className="bg-black border border-zinc-950 rounded-lg p-3 space-y-2">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">Consola de Diagnóstico</span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 text-aligo-500" />
                          Latencia C2:
                        </span>
                        <span className="font-mono font-semibold text-aligo-500">
                          {Math.floor(25 + (Math.random() * 30))} ms
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedAgent && selectedAgent.status === 'online' && (
              <button
                onClick={() => navigate(`/agents/${selectedAgent.agentId}`)}
                className="w-full bg-aligo-700 hover:bg-aligo-600 text-white font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-950/20 mt-4"
              >
                <Terminal className="w-3.5 h-3.5" />
                Interceder en Terminal
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ── Attack color legend ── */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest mr-1">Leyenda de ataques:</span>
        {Object.entries(COMMAND_COLORS).map(([id, c]) => (
          <span key={id} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ color: c.ring }}>
            <span className="w-2 h-2 rounded-full" style={{ background: c.ring }} />
            {c.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 ml-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          ONLINE
        </span>
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-zinc-600" />
          OFFLINE
        </span>
      </div>

      {/* ── TShark Floating Action Button ── */}
      <button
        onClick={() => setShowTShark(true)}
        title="Abrir TShark — Captura de red"
        className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-xs text-white transition-all duration-300 shadow-2xl group"
        style={{
          background: 'linear-gradient(135deg, #7a0d0d, #e02424)',
          boxShadow: '0 0 30px rgba(224,36,36,0.35), 0 4px 20px rgba(0,0,0,0.6)',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 45px rgba(224,36,36,0.55), 0 4px 24px rgba(0,0,0,0.7)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(224,36,36,0.35), 0 4px 20px rgba(0,0,0,0.6)')}
      >
        <Antenna className="w-4 h-4" style={{ animation: 'status-blink 2s ease-in-out infinite' }} />
        <span className="uppercase tracking-widest">TShark</span>
        {/* Pulse ring around FAB */}
        <span className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: '1.5px solid rgba(224,36,36,0.4)', animation: 'ping-ring 2.5s ease-out infinite' }} />
      </button>

      {/* ── TShark Modal ── */}
      {showTShark && (
        <TSharkModal
          onClose={() => setShowTShark(false)}
        />
      )}

      {/* ── Vulnerability Alert Modal (AI Recommendation) ── */}
      {alertData && (
        <VulnerabilityAlertModal
          data={alertData}
          onClose={() => setAlertData(null)}
        />
      )}
    </div>
  );
}

