import { useState, useEffect } from 'react';
import { Activity, Users, Clock, AlertCircle } from 'lucide-react';
import AiChat from '../components/AiChat';

export default function Dashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    // Fetch agents from backend simulator
    fetch('http://localhost:8000/api/agents')
      .then(res => res.json())
      .then(data => setAgents(data))
      .catch(err => console.error("Error fetching agents", err));

    // Fetch results from backend simulator
    fetch('http://localhost:8000/api/results')
      .then(res => res.json())
      .then(data => setResults(data))
      .catch(err => console.error("Error fetching results", err));

    const interval = setInterval(() => {
      fetch('http://localhost:8000/api/agents')
        .then(res => res.json())
        .then(data => setAgents(data))
        .catch(() => {});
        
      fetch('http://localhost:8000/api/results')
        .then(res => res.json())
        .then(data => setResults(data))
        .catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const total = agents.length;
  const online = agents.filter(a => a.status === 'online').length;
  const offline = total - online;

  const winCount = agents.filter(a => a.os.toLowerCase().includes('windows') || a.os.toLowerCase().includes('win')).length;
  const linCount = agents.filter(a => a.os.toLowerCase().includes('linux') || a.os.toLowerCase().includes('ubuntu')).length;
  const otherCount = total - winCount - linCount;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard Operacional</h1>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard 
          title="Agentes Online" 
          value={`${online}/${total}`}
          icon={<Users className="w-5 h-5" />}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <MetricCard 
          title="Agentes Offline" 
          value={offline}
          icon={<AlertCircle className="w-5 h-5" />}
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
        <MetricCard 
          title="Comandos Ejecutados" 
          value={results.length}
          icon={<Activity className="w-5 h-5" />}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <MetricCard 
          title="Uptime del C2" 
          value="Simulado"
          icon={<Clock className="w-5 h-5" />}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-[#111827] rounded-xl border border-gray-800 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h2>
            <div className="space-y-3">
              {results.slice(-5).reverse().map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-300">{item.agent_id ? item.agent_id.substring(0, 8) : 'agente'}</span>
                    <span className="text-sm text-gray-500">|</span>
                    <span className="text-sm font-mono text-gray-400 truncate max-w-xs">{item.result}</span>
                  </div>
                  <span className="text-xs text-gray-500">Just now</span>
                </div>
              ))}
              {results.length === 0 && (
                <p className="text-sm text-gray-500">No se ha registrado actividad reciente.</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#111827] rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Distribución por SO</h2>
          <div className="space-y-3">
            <OSBar label="Windows" count={winCount} total={total || 1} color="bg-blue-500" />
            <OSBar label="Linux" count={linCount} total={total || 1} color="bg-green-500" />
            <OSBar label="Otros" count={otherCount} total={total || 1} color="bg-purple-500" />
          </div>
        </div>
      </div>

      {/* Panel de IA */}
      <div className="mb-6">
        <AiChat />
      </div>

      <div className="text-xs text-gray-500 text-center">
        Última actualización: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, bgColor }: any) {
  return (
    <div className="bg-[#111827] rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <div className={`${color}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function OSBar({ label, count, total, color }: any) {
  const percentage = Math.round((count / total) * 100);
  const widthPercent = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400">{count} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div 
          style={{ width: `${widthPercent}%` }} 
          className={`${color} h-2 rounded-full transition-all duration-500`} 
        />
      </div>
    </div>
  );
}