import { Server, Globe } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export default function AgentTable({ agents }: { agents: any[] }) {
  const navigate = useNavigate();

  return (
    <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-6 border-b border-gray-800 bg-[#1f2937]/20">
        <h3 className="text-lg font-medium text-slate-200">Connected Agents</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-800/40 text-xs uppercase font-semibold text-slate-300">
            <tr>
              <th className="px-6 py-4">ID / Hostname</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">OS</th>
              <th className="px-6 py-4">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {agents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No agents connected to the simulator yet.
                </td>
              </tr>
            ) : (
              agents.map((agent: any) => (
                <tr 
                  key={agent.id} 
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono font-medium text-slate-300">
                    <div className="flex items-center gap-3">
                      <Server className="w-4 h-4 text-slate-500" />
                      {agent.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${agent.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'online' ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
                      {agent.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{agent.os}</td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-slate-500" />
                      {agent.ip}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
