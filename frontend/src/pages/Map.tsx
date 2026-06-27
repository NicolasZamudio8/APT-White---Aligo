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
  WifiOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Boundaries for Colombia map coordinate projection
const MAP_BOUNDS = {
  minLng: -79.5,
  maxLng: -66.5,
  minLat: -4.5,
  maxLat: 13.0
};

// Colombian border coordinates to draw a vector silhouette path
const COLOMBIA_BORDER_COORDS = [
  { lat: 12.4, lng: -71.7 }, // Punta Gallinas (Guajira)
  { lat: 11.8, lng: -72.3 }, // Golfo de Venezuela border
  { lat: 9.0, lng: -72.9 },  // Catatumbo border
  { lat: 7.9, lng: -72.5 },  // Cucuta
  { lat: 7.1, lng: -70.7 },  // Arauca river
  { lat: 6.2, lng: -67.5 },  // Puerto Carreno (Orinoco junction)
  { lat: 3.8, lng: -67.9 },  // Inirida border
  { lat: 1.2, lng: -66.9 },  // Guainia southernmost border
  { lat: -1.2, lng: -69.6 }, // Putumayo junction
  { lat: -4.2, lng: -69.9 }, // Leticia (Amazon river)
  { lat: -2.0, lng: -74.0 }, // Caqueta river border
  { lat: -0.1, lng: -75.2 }, // Gueppi (Ecuador border)
  { lat: 0.8, lng: -77.5 },  // Ipiales (Andean border)
  { lat: 1.8, lng: -78.8 },  // Tumaco (Pacific southernmost coast)
  { lat: 4.9, lng: -77.4 },  // Choco Pacific coast
  { lat: 7.1, lng: -77.8 },  // Panama border (Jurado)
  { lat: 8.1, lng: -76.9 },  // Golfo de Uraba
  { lat: 8.8, lng: -76.4 },  // Cordoba coast
  { lat: 9.8, lng: -75.7 },  // Sucre coast
  { lat: 10.4, lng: -75.5 }, // Cartagena
  { lat: 11.0, lng: -74.8 }, // Barranquilla
  { lat: 11.2, lng: -74.2 }, // Santa Marta
  { lat: 12.2, lng: -72.1 }, // Manaure / Cabo de la Vela
  { lat: 12.4, lng: -71.7 }  // Close path
];

const commandLibrary = [
  { id: 'recon', label: 'Recon', description: 'Enumerar procesos y servicios' },
  { id: 'dump', label: 'Dump', description: 'Capturar credenciales locales' },
  { id: 'beacon', label: 'Beacon', description: 'Establecer señal de persistencia' },
  { id: 'exfil', label: 'Exfil', description: 'Extraer artefactos sensibles' },
];

export default function Map() {
  const { locations, loading, error, fetchLocations } = useMapStore();
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [droneMode, setDroneMode] = useState(true);
  const [draggedCommand, setDraggedCommand] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Array<{ id: number; agentId: string; command: string; timestamp: string; status: string }>>([]);
  const navigate = useNavigate();

  // Width and height of the SVG map container
  const mapWidth = 600;
  const mapHeight = 700;

  useEffect(() => {
    fetchLocations();
    // Poll agent locations every 5 seconds
    const interval = setInterval(() => {
      fetchLocations();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  // Project Lat/Lng coordinates into SVG (x, y) pixels
  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * mapWidth;
    // Y-axis is inverted in SVG, so top is maxLat
    const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * mapHeight;
    return { x, y };
  };

  // Build the SVG path string for Colombia border
  const borderPoints = COLOMBIA_BORDER_COORDS.map(coord => {
    const { x, y } = projectCoords(coord.lat, coord.lng);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const borderPathD = `M ${borderPoints.join(' L ')} Z`;

  // Filtered locations based on search query
  const filteredLocations = locations.filter(loc => 
    loc.agentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.ip.includes(searchQuery)
  );

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

  return (
    <div className="space-y-6 text-slate-100 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <MapIcon className="w-8 h-8 text-blue-500" />
            Mapa Táctico de Agentes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Visualización geográfica en tiempo real de agentes activos y telemetría de red.
          </p>
        </div>
        <button
          onClick={() => fetchLocations()}
          disabled={loading}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 p-2.5 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Modo de visualización</h2>
          <p className="text-xs text-slate-400 mt-1">
            Cambia entre la vista de drones y el mapa tradicional.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-800 bg-slate-950 p-1">
          <button
            onClick={() => setDroneMode(true)}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              droneMode ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-300 hover:text-white'
            }`}
          >
            Modo Dron
          </button>
          <button
            onClick={() => setDroneMode(false)}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              !droneMode ? 'bg-slate-700 text-white' : 'bg-transparent text-slate-300 hover:text-white'
            }`}
          >
            Modo Mapa
          </button>
        </div>
      </div>

      {droneMode && (
        <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Barra de herramientas</h3>
            <div className="space-y-2">
              {commandLibrary.map((command) => (
                <div
                  key={command.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, command.id)}
                  onDragEnd={() => setDraggedCommand(null)}
                  className="cursor-grab rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-emerald-500 hover:bg-slate-900"
                >
                  <div className="text-sm font-semibold text-slate-100">{command.label}</div>
                  <p className="text-[11px] text-slate-500 mt-1">{command.description}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              {draggedCommand ? `Arrastrando: ${commandLibrary.find((cmd) => cmd.id === draggedCommand)?.label}` : 'Selecciona un comando y suéltalo sobre un agente.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Plano 2D de agentes</h3>
                <p className="text-xs text-slate-500">Cada nodo es un objetivo potencial para el comando seleccionado.</p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                Live
              </span>
            </div>

            <div className="grid h-[360px] grid-cols-2 gap-6 overflow-hidden rounded-xl border border-slate-800 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.12),_transparent_62%)] p-4 sm:grid-cols-3 xl:grid-cols-4">
              {filteredLocations.length === 0 ? (
                <div className="col-span-full flex h-full items-center justify-center text-center text-sm text-slate-500">
                  No hay agentes disponibles para el modo dron.
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isOnline = loc.status === 'online';

                  return (
                    <div
                      key={loc.agentId}
                      onDragOver={handleDragOver}
                      onDrop={(event) => handleDrop(event, loc.agentId)}
                      className="flex flex-col items-center"
                    >
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${isOnline ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_24px_rgba(16,185,129,0.25)]' : 'border-slate-500 bg-slate-700/30'}`}>
                        <span className={`h-4 w-4 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      </div>
                      <span className="mt-2 max-w-[90px] truncate text-center text-[11px] font-semibold text-slate-300">
                        {loc.agentId}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Últimas ejecuciones</h4>
              <div className="mt-3 space-y-2">
                {executions.length === 0 ? (
                  <p className="text-sm text-slate-500">Aún no hay ejecuciones registradas.</p>
                ) : (
                  executions.map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-slate-200">{execution.command} → {execution.agentId}</p>
                        <p className="text-[11px] text-slate-500">{execution.timestamp}</p>
                      </div>
                      <span className={`text-xs font-semibold ${execution.status === 'Enviado' ? 'text-emerald-400' : 'text-amber-400'}`}>
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
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Buscador de Agentes
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ID, Ciudad, Dirección IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-200"
              />
            </div>
          </div>

          {/* List Box */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex-1 overflow-y-auto space-y-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold px-2">
              Agentes en Mapa ({filteredLocations.length})
            </span>
            
            {filteredLocations.length === 0 ? (
              <div className="text-center text-slate-500 py-8 text-xs">
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
                        ? 'bg-blue-600/10 border-blue-500 text-white' 
                        : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs truncate text-slate-200">{loc.agentId}</span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-600'}`} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5 font-mono">
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
        <div className="lg:col-span-2 bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
          
          {/* Radar Sweep Animation (Visual Effect) */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute w-[600px] h-[600px] border border-blue-500/20 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute w-[400px] h-[400px] border border-blue-500/10 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute w-[200px] h-[200px] border border-blue-500/5 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            {/* Rotating grid sweep lines */}
            <div className="absolute top-1/2 left-1/2 w-[350px] h-[2px] bg-gradient-to-r from-blue-500/40 to-transparent origin-left animate-[spin_8s_linear_infinite]" />
          </div>

          <span className="absolute top-4 left-4 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Radar Sector: COLOMBIA-C2
          </span>
          <span className="absolute top-4 right-4 text-[10px] text-slate-500 font-mono flex items-center gap-1">
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
            
            {/* Colombia vector shape path */}
            <path
              d={borderPathD}
              fill="#1e293b"
              fillOpacity="0.4"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeOpacity="0.7"
              strokeDasharray="1000"
              className="transition-all duration-700"
            />
            
            {/* Colombia inner structural decoration lines */}
            <path
              d={borderPathD}
              fill="none"
              stroke="#2563eb"
              strokeWidth="0.5"
              strokeOpacity="0.3"
            />

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
                    <circle cx={x} cy={y} r="12" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,3" className="animate-[spin_4s_linear_infinite]" />
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
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Activity className="w-4 h-4 text-indigo-400" />
                Detalles del Nodo
              </h2>

              {!selectedAgent ? (
                <div className="text-center text-slate-500 py-16 text-xs flex flex-col items-center justify-center gap-2">
                  <MapIcon className="w-8 h-8 text-slate-700" />
                  <span>Selecciona un nodo en el radar o en el listado para inspeccionar su telemetría.</span>
                </div>
              ) : (
                <div className="space-y-4 mt-3">
                  {/* Agent Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">ID del Agente:</span>
                      <span className="font-semibold text-slate-200 truncate max-w-[120px]" title={selectedAgent.agentId}>
                        {selectedAgent.agentId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Estado de Conexión:</span>
                      {selectedAgent.status === 'online' ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5" /> En Línea
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <WifiOff className="w-3.5 h-3.5" /> Desconectado
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Dirección IP:</span>
                      <span className="font-mono text-slate-300">{selectedAgent.ip}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Sistema Operativo:</span>
                      <span className="text-slate-300">{selectedAgent.os}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Ubicación Geo:</span>
                      <span className="text-slate-300">{selectedAgent.city}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Coordenadas:</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {selectedAgent.lat.toFixed(4)}°, {selectedAgent.lng.toFixed(4)}°
                      </span>
                    </div>
                  </div>

                  {/* Latency Simulator Panel */}
                  {selectedAgent.status === 'online' && (
                    <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 space-y-2">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">Consola de Diagnóstico</span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          Latencia C2:
                        </span>
                        <span className="font-mono font-semibold text-indigo-400">
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-950/20 mt-4"
              >
                <Terminal className="w-3.5 h-3.5" />
                Interceder en Terminal
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
