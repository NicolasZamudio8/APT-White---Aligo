import React, { useEffect, useState } from 'react';
import './TacticalMap.css';
import { API_BASE_URL } from '../api/config';

interface Agent {
  agentId: string;
  os: string;
  ip: string;
  city: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline';
}

interface Redirector {
  id: string;
  name: string;
  status: string;
  latencyMs: number;
  agentsCount: number;
}

export const TacticalMap: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [redirectors, setRedirectors] = useState<Redirector[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetchAgents();
    fetchRedirectors();
    const interval = setInterval(() => {
      fetchAgents();
      fetchRedirectors();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/locations`);
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const fetchRedirectors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/redirectors`);
      const data = await response.json();
      setRedirectors(data);
    } catch (error) {
      console.error('Failed to fetch redirectors:', error);
    }
  };

  // Simplified Colombia map SVG coordinates
  const mapWidth = 800;
  const mapHeight = 600;
  const latMin = 1, latMax = 13, lngMin = -77, lngMax = -66;

  const geoToSvg = (lat: number, lng: number) => {
    const x = ((lng - lngMin) / (lngMax - lngMin)) * mapWidth;
    const y = mapHeight - ((lat - latMin) / (latMax - latMin)) * mapHeight;
    return { x, y };
  };

  const mainC2 = { x: mapWidth / 2, y: 50 }; // Top center for main C2

  return (
    <div className="tactical-map">
      <h2>Mapa Tactico - Colombia</h2>
      <svg width={mapWidth} height={mapHeight} className="map-svg">
        {/* Colombia background */}
        <rect width={mapWidth} height={mapHeight} fill="#1a1a2e" />
        <text x={mapWidth / 2} y={30} textAnchor="middle" fill="#00ff00" fontSize="12">
          Colombia C2 Infrastructure
        </text>

        {/* Draw redirector connection lines from Main C2 */}
        <line x1={mainC2.x} y1={mainC2.y} x2={mainC2.x - 150} y2={150} stroke="#ffaa00" strokeWidth="2" />
        <line x1={mainC2.x} y1={mainC2.y} x2={mainC2.x + 150} y2={150} stroke="#ffaa00" strokeWidth="2" />

        {/* Agent nodes */}
        {agents.map((agent) => {
          const pos = geoToSvg(agent.lat, agent.lng);
          const isOnline = agent.status === 'online';
          return (
            <g key={agent.agentId} onClick={() => setSelectedAgent(agent)} style={{ cursor: 'pointer' }}>
              {/* Connection line to Main C2 */}
              <line
                x1={pos.x}
                y1={pos.y}
                x2={mainC2.x}
                y2={mainC2.y}
                stroke={isOnline ? '#00ff00' : '#ff0000'}
                strokeWidth="1"
                opacity="0.5"
              />
              {/* Agent node */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={8}
                fill={isOnline ? '#00ff00' : '#ff0000'}
                opacity="0.7"
              />
              {/* Label */}
              <text x={pos.x + 15} y={pos.y + 5} fill="#00ff00" fontSize="10">
                {agent.city}
              </text>
            </g>
          );
        })}

        {/* Main C2 Server */}
        <circle cx={mainC2.x} cy={mainC2.y} r={12} fill="#ff00ff" />
        <text x={mainC2.x} y={mainC2.y + 25} textAnchor="middle" fill="#ff00ff" fontSize="10">
          Main C2
        </text>
      </svg>

      {/* Agent Information Panel */}
      {selectedAgent && (
        <div className="agent-info-panel">
          <h3>{selectedAgent.city}</h3>
          <p><strong>Agent ID:</strong> {selectedAgent.agentId}</p>
          <p><strong>OS:</strong> {selectedAgent.os}</p>
          <p><strong>IP:</strong> {selectedAgent.ip}</p>
          <p><strong>Status:</strong> <span className={`status-${selectedAgent.status}`}>{selectedAgent.status}</span></p>
          <button className="playbook-btn">Execute Playbook</button>
          <button className="close-btn" onClick={() => setSelectedAgent(null)}>Close</button>
        </div>
      )}

      {/* Redirector Status */}
      <div className="redirector-status">
        <h3>Redirectores Activos</h3>
        <div className="redirector-list">
          {redirectors.map((redir) => (
            <div key={redir.id} className={`redirector-item status-${redir.status}`}>
              <span>{redir.name}</span>
              <span className="latency">{redir.latencyMs}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
