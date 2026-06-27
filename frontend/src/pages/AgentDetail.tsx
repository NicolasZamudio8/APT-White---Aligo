import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Cpu, Globe, Activity } from 'lucide-react';
import Terminal from '../components/Terminal';

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [redirectors, setRedirectors] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/agents')
      .then(res => res.json())
      .then((data: any[]) => {
        setAllAgents(data);
        const found = data.find(a => a.id === id);
        if (found) setAgent(found);
      })
      .catch(err => console.error("Error fetching agent detail", err));

    // Fetch crypto keys
    fetch('http://localhost:8000/api/crypto/keys')
      .then(res => res.json())
      .then(data => setKeys(data))
      .catch(err => console.error("Error fetching keys", err));

    // Fetch redirectors
    fetch('http://localhost:8000/api/redirectors')
      .then(res => res.json())
      .then(data => setRedirectors(data))
      .catch(err => console.error("Error fetching redirectors", err));
  }, [id]);

  const handleUpdateAgentConfig = (field: string, value: string) => {
    const payload = {
      crypto_key_id: field === 'crypto_key_id' ? value : agent.crypto_key_id,
      redirector_id: field === 'redirector_id' ? value : agent.redirector_id,
    };

    fetch(`http://localhost:8000/api/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (res.ok) {
          setAgent({ ...agent, [field]: value });
          alert("Configuración de agente actualizada en base de datos.");
        } else {
          alert("Error al actualizar la configuración del agente.");
        }
      })
      .catch(err => console.error("Error updating agent config", err));
  };

  if (!agent) {
    return (
      <div className="text-center p-12">
        <p className="text-red-400">Agente no encontrado o cargando...</p>
        <Link to="/agents" className="inline-flex items-center gap-2 mt-4 text-aligo-600 hover:text-aligo-500">
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
        <div className="bg-black rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-aligo-600" /> Detalle del Agente
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

          <div className="border-t border-gray-800 pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">Configuración del Agente</h3>
            
            <div className="space-y-1">
              <label className="block text-xs text-gray-400">Redireccionador (Proxy)</label>
              <select
                value={agent.redirector_id || ''}
                onChange={(e) => handleUpdateAgentConfig('redirector_id', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-aligo-600 focus:ring-1 focus:ring-aligo-600"
              >
                <option value="">Ninguno (Por defecto)</option>
                {redirectors.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.host})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-gray-400">Llave Criptográfica</label>
              <select
                value={agent.crypto_key_id || ''}
                onChange={(e) => handleUpdateAgentConfig('crypto_key_id', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-aligo-600 focus:ring-1 focus:ring-aligo-600"
              >
                <option value="">Ninguna (Por defecto)</option>
                {keys.map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.algorithm})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Terminal and Interactive Control */}
        <div className="lg:col-span-2 bg-black rounded-xl border border-gray-800 p-6 flex flex-col min-h-[500px]">
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