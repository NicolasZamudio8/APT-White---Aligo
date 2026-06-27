import { useState, useEffect } from 'react';
import AgentTable from '../components/AgentTable';

export default function Agents() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    // Fetch agents from local backend simulator
    fetch('http://localhost:8000/api/agents')
      .then(res => res.json())
      .then(data => setAgents(data))
      .catch(err => console.error("Error fetching agents", err));
      
    const interval = setInterval(() => {
      fetch('http://localhost:8000/api/agents')
        .then(res => res.json())
        .then(data => setAgents(data))
        .catch(() => {});
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 font-sans">Agentes Conectados</h1>
      <div className="bg-[#111827] rounded-xl border border-gray-800 p-6">
        <AgentTable agents={agents} />
      </div>
    </div>
  );
}