import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Cpu, Globe, Activity } from 'lucide-react';
import Terminal from '../components/Terminal';

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [allAgents, setAllAgents] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/agents')
      .then(res => res.json())
      .then((data: any[]) => {
        setAllAgents(data);
        const found = data.find(a => a.id === id);
        if (found) setAgent(found);
      })
      .catch(err => console.error("Error fetching agent detail", err));
  }, [id]);

  if (!agent) {
    return (
      <div className="text-center p-12">
        <p className="text-red-400">Agente no encontrado o cargando...</p>
        <Link to="/agents" className="inline-flex items-center gap-2 mt-4 text-blue-500 hover:text-blue-400">
          <ArrowLeft className="w-4 h-4" /> Volver a Agentes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/agents" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Agentes
        </Link>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${agent.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
          <span className="text-sm font-mono text-gray-300">{agent.status.toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-[#111827] rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" /> Detalle del Agente
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">ID del Agente:</span>
              <span className="font-mono text-white select-all">{agent.id}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Sistema Operativo:</span>
              <span className="text-white">{agent.os}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Dirección IP:</span>
              <span className="font-mono text-white flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-gray-500" /> {agent.ip}
              </span>
            </div>
          </div>
        </div>

        {/* Terminal and Interactive Control */}
        <div className="lg:col-span-2 bg-[#111827] rounded-xl border border-gray-800 p-6 flex flex-col min-h-[500px]">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" /> Control Interactivo
          </h2>
          <div className="flex-1 flex flex-col">
            <Terminal agents={allAgents} />
          </div>
        </div>
      </div>
    </div>
  );
}