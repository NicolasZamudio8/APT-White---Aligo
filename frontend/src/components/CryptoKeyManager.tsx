import React, { useEffect, useState } from 'react';
import './CryptoKeyManager.css';
import { API_BASE_URL } from '../api/config';

interface CryptoKey {
  id: string;
  name: string;
  value?: string;
  algorithm: string;
  createdAt: string;
  rotatedAt: string;
  active: boolean;
}

export const CryptoKeyManager: React.FC = () => {
  const [keys, setKeys] = useState<CryptoKey[]>([]);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyAlgorithm, setNewKeyAlgorithm] = useState('XOR-256');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/crypto/keys`);
      const data = await response.json();
      setKeys(data);
    } catch (error) {
      console.error('Failed to fetch keys:', error);
    }
  };

  const handleCreateKey = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/crypto/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          algorithm: newKeyAlgorithm
        })
      });
      const newKey = await response.json();
      setKeys([...keys, newKey]);
      setShowNewKey(false);
      setNewKeyName('');
    } catch (error) {
      console.error('Failed to create key:', error);
    }
  };

  const handleActivateKey = async (keyId: string) => {
    try {
      await fetch(`${API_BASE_URL}/crypto/keys/${keyId}/activate`, {
        method: 'PUT'
      });
      fetchKeys();
    } catch (error) {
      console.error('Failed to activate key:', error);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await fetch(`${API_BASE_URL}/crypto/keys/${keyId}`, {
        method: 'DELETE'
      });
      setKeys(keys.filter(k => k.id !== keyId));
    } catch (error) {
      console.error('Failed to delete key:', error);
    }
  };

  return (
    <div className="crypto-manager">
      <h2>Gestión de Claves Criptográficas</h2>
      
      <button onClick={() => setShowNewKey(!showNewKey)} className="create-key-btn">
        + Crear Nueva Clave
      </button>

      {showNewKey && (
        <div className="new-key-form">
          <input
            type="text"
            placeholder="Nombre de la clave"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="form-input"
          />
          <select
            value={newKeyAlgorithm}
            onChange={(e) => setNewKeyAlgorithm(e.target.value)}
            className="form-select"
          >
            <option value="XOR-256">XOR-256</option>
            <option value="AES-256">AES-256</option>
            <option value="AES-128">AES-128</option>
          </select>
          <button onClick={handleCreateKey} className="btn-primary">
            Crear
          </button>
          <button onClick={() => setShowNewKey(false)} className="btn-cancel">
            Cancelar
          </button>
        </div>
      )}

      <div className="keys-list">
        {keys.map((key) => (
          <div key={key.id} className={`key-item ${key.active ? 'active' : 'inactive'}`}>
            <div className="key-header">
              <span className="key-name">{key.name}</span>
              <span className={`key-status ${key.active ? 'active' : 'inactive'}`}>
                {key.active ? '● ACTIVA' : '○ Inactiva'}
              </span>
            </div>
            <div className="key-details">
              <p><strong>ID:</strong> {key.id}</p>
              <p><strong>Algoritmo:</strong> {key.algorithm}</p>
              <p><strong>Creada:</strong> {new Date(key.createdAt).toLocaleString()}</p>
              <p><strong>Última rotación:</strong> {new Date(key.rotatedAt).toLocaleString()}</p>
            </div>
            <div className="key-actions">
              {!key.active && (
                <button
                  onClick={() => handleActivateKey(key.id)}
                  className="btn-activate"
                >
                  Activar
                </button>
              )}
              {!key.active && (
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="btn-delete"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
