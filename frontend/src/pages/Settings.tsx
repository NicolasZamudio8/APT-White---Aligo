import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Wifi, 
  Cpu, 
  FileText, 
  Activity, 
  Check, 
  Loader2, 
  AlertCircle,
  Play
} from 'lucide-react';

export default function Settings() {
  const { 
    config, 
    status, 
    logs, 
    loading, 
    error, 
    fetchConfig, 
    updateConfig, 
    fetchStatus, 
    fetchLogs, 
    runDiagnostics 
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'diagnostics' | 'logs'>('general');

  // Local Form state
  const [beaconInterval, setBeaconInterval] = useState(10);
  const [logLevel, setLogLevel] = useState('INFO');
  const [securityLevel, setSecurityLevel] = useState('High');
  const [enableAi, setEnableAi] = useState(true);
  const [enableEncryption, setEnableEncryption] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchStatus();
    fetchLogs();
  }, [fetchConfig, fetchStatus, fetchLogs]);

  // Sync local form state when backend config is fetched
  useEffect(() => {
    if (config) {
      setBeaconInterval(config.beacon_interval);
      setLogLevel(config.log_level);
      setSecurityLevel(config.security_level);
      setEnableAi(config.enable_ai);
      setEnableEncryption(config.enable_encryption !== false);
    }
  }, [config]);

  // Polling for live status metrics
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        security_level: securityLevel,
        beacon_interval: beaconInterval,
        log_level: logLevel,
        enable_ai: enableAi,
        enable_encryption: enableEncryption
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerDiagnostics = async () => {
    try {
      await runDiagnostics();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to format uptime into HH:MM:SS
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 text-slate-100 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-aligo-600" />
            Configuración del Sistema
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestión global del C2, directivas de comunicación, diagnósticos integrales y auditoría.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-850 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'general' 
              ? 'border-aligo-600 text-aligo-500 bg-zinc-950/20' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/10'
          }`}
        >
          <Wifi className="w-4 h-4" />
          Comunicación & General
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'security' 
              ? 'border-aligo-600 text-aligo-500 bg-zinc-950/20' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/10'
          }`}
        >
          <Shield className="w-4 h-4" />
          Seguridad & IA
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'diagnostics' 
              ? 'border-aligo-600 text-aligo-500 bg-zinc-950/20' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/10'
          }`}
        >
          <Activity className="w-4 h-4" />
          Diagnósticos en Vivo
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'logs' 
              ? 'border-aligo-600 text-aligo-500 bg-zinc-950/20' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/10'
          }`}
        >
          <FileText className="w-4 h-4" />
          Logs de Auditoría
        </button>
      </div>

      {/* Grid Layout - Form on left (if tab calls it), telemetry on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Dynamic Forms depending on active tab */}
        <div className="lg:col-span-2">
          
          {/* TAB 1: General Settings */}
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Wifi className="w-5 h-5 text-aligo-500" />
                Parámetros de Red y Balizas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Intervalo de Balizas (Segundos)</label>
                  <input
                    type="number"
                    min={1}
                    max={3600}
                    value={beaconInterval}
                    onChange={(e) => setBeaconInterval(parseInt(e.target.value) || 10)}
                    className="w-full bg-black border border-zinc-900 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-aligo-600 text-zinc-200"
                  />
                  <span className="text-[10px] text-zinc-500 block">Determina cada cuánto tiempo los agentes envían un latido (Heartbeat) de estado al servidor C2.</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nivel de Log del Servidor</label>
                  <select
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value)}
                    className="w-full bg-black border border-zinc-900 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-aligo-600 text-zinc-200"
                  >
                    <option value="DEBUG">DEBUG (Detallado)</option>
                    <option value="INFO">INFO (Normal)</option>
                    <option value="WARNING">WARNING (Advertencias)</option>
                    <option value="ERROR">ERROR (Solo errores)</option>
                  </select>
                  <span className="text-[10px] text-zinc-500 block">Nivel de granularidad en el registro de actividades internas del C2.</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-between items-center">
                {isSaved ? (
                  <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> ¡Configuración guardada exitosamente!
                  </span>
                ) : <span />}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-aligo-700 hover:bg-aligo-600 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-950/30 flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar Ajustes
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Security & IA Settings */}
          {activeTab === 'security' && (
            <form onSubmit={handleSave} className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Shield className="w-5 h-5 text-aligo-500" />
                Seguridad Criptográfica e IA
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Perfil de Seguridad</label>
                  <select
                    value={securityLevel}
                    onChange={(e) => setSecurityLevel(e.target.value)}
                    className="w-full bg-black border border-zinc-900 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-aligo-600 text-zinc-200"
                  >
                    <option value="Low">Low (Firma básica)</option>
                    <option value="Medium">Medium (AES-256-GCM)</option>
                    <option value="High">High (AES-256-GCM + Rotación de llaves cada 10m)</option>
                  </select>
                  <span className="text-[10px] text-zinc-500 block">Especifica el canal criptográfico de cifrado para toda instrucción enviada a los agentes.</span>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Servicio de IA & Seguridad</label>
                  
                  <label className="flex items-center gap-3 p-3 bg-black border border-zinc-900 rounded-lg cursor-pointer hover:border-zinc-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableAi}
                      onChange={(e) => setEnableAi(e.target.checked)}
                      className="w-4 h-4 rounded text-aligo-700 focus:ring-aligo-600 border-zinc-800 bg-zinc-900"
                    />
                    <div>
                      <p className="font-semibold text-xs text-zinc-200">Habilitar Asistente de IA Copilot</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Permite a la IA traducir intenciones en comandos e interpretar telemetría del host.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-black border border-zinc-900 rounded-lg cursor-pointer hover:border-zinc-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableEncryption}
                      onChange={(e) => setEnableEncryption(e.target.checked)}
                      className="w-4 h-4 rounded text-aligo-700 focus:ring-aligo-600 border-zinc-800 bg-zinc-900"
                    />
                    <div>
                      <p className="font-semibold text-xs text-zinc-200">Habilitar Cifrado Simétrico del Canal</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Activa el cifrado dinámico de instrucciones y payloads entre el servidor C2 y los agentes.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-between items-center">
                {isSaved ? (
                  <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> ¡Configuración guardada exitosamente!
                  </span>
                ) : <span />}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-aligo-700 hover:bg-aligo-600 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-950/30 flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar Ajustes
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Diagnostics Panel */}
          {activeTab === 'diagnostics' && (
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-aligo-500" />
                  Consola de Diagnóstico de Sistema
                </h2>
                <button
                  onClick={handleTriggerDiagnostics}
                  disabled={loading}
                  className="bg-aligo-700 hover:bg-aligo-600 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  Iniciar Diagnóstico E2E
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Realiza una auditoría completa del C2. Esto verificará la latencia del flexible server de Neon DB, la validez del certificado TLS local y el estado de la cola de tareas asíncronas.
                </p>

                {/* Simulated Diagnostics Console Box */}
                <div className="bg-black rounded-xl border border-zinc-950 p-4 h-64 overflow-y-auto font-mono text-xs space-y-2">
                  <span className="text-zinc-500 uppercase tracking-widest text-[9px] block border-b border-zinc-950 pb-1.5 mb-2 font-semibold">CONSOLE OUT: C2_AUDITOR_SH</span>
                  
                  {loading ? (
                    <div className="flex items-center gap-2 text-aligo-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ejecutando suite de pruebas automatizadas en Neon y TLS...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-zinc-500">[SYSTEM] Esperando orden de diagnostico...</div>
                      {logs.filter(l => l.message.includes('[diag-') || l.message.includes('Diagnostics')).slice(0, 8).map((log, index) => (
                        <div key={index} className="text-zinc-300 leading-normal flex gap-2">
                          <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={`${log.message.includes('HEALTHY') || log.message.includes('OK') ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Audit Logs Panel */}
          {activeTab === 'logs' && (
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
                <FileText className="w-5 h-5 text-aligo-500" />
                Historial de Eventos del C2
              </h2>

              <div className="bg-black rounded-xl border border-zinc-950 overflow-hidden">
                <div className="p-3 border-b border-zinc-950 text-zinc-500 text-[10px] uppercase font-semibold grid grid-cols-4 gap-2 bg-zinc-950/20 font-mono">
                  <span>Timestamp</span>
                  <span className="text-center">Nivel</span>
                  <span className="col-span-2">Detalle de Mensaje</span>
                </div>

                <div className="divide-y divide-zinc-950 max-h-[400px] overflow-y-auto font-mono text-xs">
                  {logs.length === 0 ? (
                    <div className="text-center text-slate-600 py-8">
                      No hay registros en el log del C2.
                    </div>
                  ) : (
                    logs.map((log, idx) => {
                      const isWarning = log.level === 'WARNING';
                      const isError = log.level === 'ERROR';
                      const badgeColor = isError 
                        ? 'text-red-400 bg-red-950/20 border-red-900/30' 
                        : isWarning 
                          ? 'text-yellow-400 bg-yellow-950/20 border-yellow-900/30' 
                          : 'text-aligo-500 bg-blue-950/20 border-blue-900/30';

                      return (
                        <div key={idx} className="p-3 grid grid-cols-4 gap-2 items-center hover:bg-zinc-950/10 transition-colors">
                          <span className="text-zinc-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                              {log.level}
                            </span>
                          </span>
                          <span className="col-span-2 text-zinc-300 truncate" title={log.message}>
                            {log.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Uptime & Live Telemetry Panel (1 col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Cpu className="w-4 h-4 text-aligo-500" />
              Telemetría C2 en Vivo
            </h2>

            {status ? (
              <div className="space-y-5">
                {/* Uptime Stat */}
                <div className="bg-black border border-zinc-950 rounded-xl p-4 text-center">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">Uptime del Servidor</span>
                  <span className="text-2xl font-bold font-mono text-white mt-1 block">
                    {formatUptime(status.uptime)}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-4">
                  {/* CPU Metric */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 flex items-center gap-1">CPU del Servidor:</span>
                      <span className="font-semibold text-zinc-300">{status.cpu}%</span>
                    </div>
                    <div className="h-1.5 bg-black rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-aligo-600 rounded-full transition-all duration-700" 
                        style={{ width: `${status.cpu}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Metric */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 flex items-center gap-1">Memoria Reservada:</span>
                      <span className="font-semibold text-zinc-300">{status.ram} MB / 1024 MB</span>
                    </div>
                    <div className="h-1.5 bg-black rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-aligo-600 rounded-full transition-all duration-750" 
                        style={{ width: `${Math.min(100, (status.ram / 1024) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Database Connectivity Badge */}
                <div className="border-t border-zinc-900 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Conectores del Sistema:</span>
                  </div>
                  <div className="p-3 bg-black border border-zinc-950 rounded-lg flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-zinc-200 truncate">Base de Datos Activa</p>
                      <p className="text-[9px] text-zinc-500 truncate font-mono">Neon flexible PostgreSQL instance</p>
                    </div>
                  </div>
                </div>

                {/* Active Agents Stats */}
                <div className="flex justify-between text-xs text-zinc-500 pt-2 font-mono">
                  <span>Agentes Online: {status.activeAgents}</span>
                  <span>Playbooks: {status.totalPlaybooks}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-12 text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-aligo-600" />
                <span>Cargando telemetría...</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
