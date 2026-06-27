import React, { useEffect, useState } from 'react';
import './RedirectorManager.css';

interface Redirector {
  id: string;
  name: string;
  host: string;
  port: number;
  uplinkId?: string;
  status: string;
  latencyMs: number;
  agentsCount: number;
}

export const RedirectorManager: React.FC = () => {
  const [redirectors, setRedirectors] = useState<Redirector[]>([]);
  const [showNewRedirector, setShowNewRedirector] = useState(false);
  const [newRedir, setNewRedir] = useState({
    name: '',
    host: '',
    port: 9001,
    uplink_id: ''
  });

  useEffect(() => {
    fetchRedirectors();
    const interval = setInterval(fetchRedirectors, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRedirectors = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/redirectors');
      const data = await response.json();
      setRedirectors(data);
    } catch (error) {
      console.error('Failed to fetch redirectors:', error);
    }
  };

  const handleCreateRedirector = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/redirectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRedir)
      });
      const created = await response.json();
      setRedirectors([...redirectors, created]);
      setShowNewRedirector(false);
      setNewRedir({ name: '', host: '', port: 9001, uplink_id: '' });
    } catch (error) {
      console.error('Failed to create redirector:', error);
    }
  };

  const handleUpdateStatus = async (redirectorId: string, newStatus: string) => {
    try {
      await fetch(`http://localhost:8000/api/redirectors/${redirectorId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchRedirectors();
    } catch (error) {
      console.error('Failed to update redirector status:', error);
    }
  };

  const handleDeleteRedirector = async (redirectorId: string) => {
    try {
      await fetch(`http://localhost:8000/api/redirectors/${redirectorId}`, {
        method: 'DELETE'
      });
      setRedirectors(redirectors.filter(r => r.id !== redirectorId));
    } catch (error) {
      console.error('Failed to delete redirector:', error);
    }
  };

  return (
    <div className="redirector-manager">
      <h2>Gestor de Redirectores de Red</h2>

      <button onClick={() => setShowNewRedirector(!showNewRedirector)} className="create-redir-btn">
        + Crear Nuevo Redirector
      </button>

      {showNewRedirector && (
        <div className="new-redir-form">
          <input
            type="text"
            placeholder="Nombre"
            value={newRedir.name}
            onChange={(e) => setNewRedir({ ...newRedir, name: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Host (ej: proxy.local)"
            value={newRedir.host}
            onChange={(e) => setNewRedir({ ...newRedir, host: e.target.value })}
            className="form-input"
          />
          <input
            type="number"
            placeholder="Puerto"
            value={newRedir.port}
            onChange={(e) => setNewRedir({ ...newRedir, port: parseInt(e.target.value) })}
            className="form-input"
          />
          <button onClick={handleCreateRedirector} className="btn-primary">
            Crear
          </button>
          <button onClick={() => setShowNewRedirector(false)} className="btn-cancel">
            Cancelar
          </button>
        </div>
      )}

      <div className="redirectors-grid">
        {redirectors.map((redir) => (
          <div key={redir.id} className={`redir-card status-${redir.status}`}>
            <div className="redir-header">
              <h3>{redir.name}</h3>
              <span className={`status-badge ${redir.status}`}>{redir.status}</span>
            </div>
            <div className="redir-details">
              <p><strong>Host:</strong> {redir.host}:{redir.port}</p>
              <p><strong>Latencia:</strong> {redir.latencyMs}ms</p>
              <p><strong>Agentes conectados:</strong> {redir.agentsCount}</p>
            </div>
            <div className="redir-actions">
              <select
                value={redir.status}
                onChange={(e) => handleUpdateStatus(redir.id, e.target.value)}
                className="status-select"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="degraded">Degradado</option>
              </select>
              <button
                onClick={() => handleDeleteRedirector(redir.id)}
                className="btn-delete"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
