import React, { useEffect, useState } from 'react';
import { usePlaybookStore } from '../store/playbookStore';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Play, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Terminal, 
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  Upload
} from 'lucide-react';

interface Agent {
  id: string;
  os: string;
  ip: string;
  status: string;
}

export default function Playbooks() {
  const { 
    playbooks, 
    executions, 
    loading, 
    error, 
    fetchPlaybooks, 
    fetchExecutions, 
    createPlaybook, 
    updatePlaybook, 
    deletePlaybook, 
    executePlaybook,
    exportYaml,
    importYaml
  } = usePlaybookStore();

  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);

  // Editor Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSteps, setFormSteps] = useState<{ command: string; delay: number; mitre_tactics: string[] }[]>([
    { command: '', delay: 2, mitre_tactics: [] }
  ]);

  // Fetch initial data
  useEffect(() => {
    fetchPlaybooks();
    fetchExecutions();
    
    // Fetch active agents for execution targeting
    fetch('http://localhost:8000/api/agents')
      .then(res => res.json())
      .then(data => setActiveAgents(data.filter((a: any) => a.status === 'online')))
      .catch(err => console.error('Error fetching agents:', err));
  }, [fetchPlaybooks, fetchExecutions]);

  // Polling for execution logs when tasks are running
  useEffect(() => {
    const hasRunning = executions.some(e => e.status === 'pending' || e.status === 'running');
    if (!hasRunning) return;

    const interval = setInterval(() => {
      fetchExecutions();
    }, 2000);

    return () => clearInterval(interval);
  }, [executions, fetchExecutions]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormSteps([{ command: '', delay: 2, mitre_tactics: [] }]);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (pb: any) => {
    setEditingId(pb.id);
    setFormName(pb.name);
    setFormDescription(pb.description);
    setFormSteps(pb.steps.map((s: any) => ({ command: s.command, delay: s.delay, mitre_tactics: s.mitre_tactics || [] })));
    setIsEditorOpen(true);
  };

  const handleSavePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formSteps.some(s => !s.command.trim())) return;

    const payload = {
      name: formName,
      description: formDescription,
      steps: formSteps.filter(s => s.command.trim() !== '')
    };

    try {
      if (editingId) {
        await updatePlaybook(editingId, payload);
      } else {
        await createPlaybook(payload);
      }
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Failed to save playbook:', err);
    }
  };

  const handleAddStep = () => {
    setFormSteps(prev => [...prev, { command: '', delay: 2, mitre_tactics: [] }]);
  };

  const handleRemoveStep = (index: number) => {
    if (formSteps.length === 1) return;
    setFormSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: string, value: any) => {
    const newSteps = [...formSteps];
    if (field === 'mitre_tactics') {
      newSteps[index] = { ...newSteps[index], [field]: value.split(',').map((t: string) => t.trim()).filter((t: string) => t) };
    } else {
      newSteps[index] = { ...newSteps[index], [field]: value };
    }
    setFormSteps(newSteps);
  };

  const calculateMitreCoverage = () => {
    const coverage: Record<string, number> = {};
    playbooks.forEach(pb => {
      pb.steps.forEach(step => {
        if (step.mitre_tactics) {
          step.mitre_tactics.forEach(tactic => {
            const t = tactic.toUpperCase();
            coverage[t] = (coverage[t] || 0) + 1;
          });
        }
      });
    });
    return Object.entries(coverage).map(([subject, fullMark]) => ({ subject, fullMark })).sort((a, b) => b.fullMark - a.fullMark).slice(0, 8);
  };

  const mitreData = calculateMitreCoverage();

  const handleTriggerExecute = (playbookId: string) => {
    setSelectedPlaybook(playbookId);
    setSelectedAgents([]);
    // Fetch agents refresh
    fetch('http://localhost:8000/api/agents')
      .then(res => res.json())
      .then(data => setActiveAgents(data.filter((a: any) => a.status === 'online')))
      .catch(err => console.error(err));
  };

  const handleConfirmExecution = async () => {
    if (!selectedPlaybook || selectedAgents.length === 0) return;
    try {
      await executePlaybook(selectedPlaybook, selectedAgents);
      setSelectedPlaybook(null);
      setSelectedAgents([]);
      fetchExecutions();
    } catch (err) {
      console.error('Failed to execute playbook:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este Playbook?')) {
      try {
        await deletePlaybook(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExportYaml = async (id: string, name: string) => {
    try {
      const yamlContent = await exportYaml(id);
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}.yaml`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error exporting YAML');
    }
  };

  const handleImportYaml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await importYaml(content);
        alert('Playbook importado exitosamente');
      } catch (err) {
        console.error(err);
        alert('Error importing YAML');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  return (
    <div className="space-y-6 text-slate-100 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-8 h-8 text-aligo-600" />
            Playbooks
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Automatización y ejecución orquestada de comandos en múltiples agentes simultáneamente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2 border border-zinc-800 shadow-lg">
            <Upload className="w-4 h-4" />
            Importar YAML
            <input type="file" accept=".yaml,.yml" className="hidden" onChange={handleImportYaml} />
          </label>
          <button
            onClick={handleOpenCreate}
            className="bg-aligo-700 hover:bg-aligo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" />
            Nuevo Playbook
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl text-red-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Playbooks List - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
            <FileText className="w-5 h-5 text-aligo-500" />
            Librería de Automatizaciones
          </h2>

          {loading && playbooks.length === 0 ? (
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-aligo-600" />
              <span>Cargando playbooks...</span>
            </div>
          ) : playbooks.length === 0 ? (
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-12 text-center text-zinc-400">
              No hay playbooks creados. Haz clic en "Nuevo Playbook" para comenzar.
            </div>
          ) : (
            <>
            <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-900 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Cobertura de Tácticas MITRE ATT&CK</h3>
              {mitreData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mitreData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#475569' }} />
                      <Radar name="Comandos" dataKey="fullMark" stroke="#dc2626" fill="#dc2626" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-zinc-500 text-sm py-8">No hay tácticas MITRE asignadas a los comandos.</div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playbooks.map((pb) => (
                <div 
                  key={pb.id} 
                  className="bg-zinc-950/60 backdrop-blur-md border border-zinc-900 rounded-xl p-5 hover:border-zinc-800 transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-white group-hover:text-aligo-500 transition-colors text-base">
                        {pb.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {pb.steps.length} {pb.steps.length === 1 ? 'paso' : 'pasos'}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs line-clamp-2 min-h-[2rem]">
                      {pb.description || 'Sin descripción.'}
                    </p>

                    {/* Step Preview */}
                    <div className="bg-black/60 rounded-lg p-3 border border-zinc-950 space-y-1.5 max-h-36 overflow-y-auto">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Comandos:</span>
                      {pb.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300 font-mono">
                          <span className="text-slate-600 shrink-0">{idx + 1}.</span>
                          <span className="truncate bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900 flex-1">{step.command}</span>
                          <span className="text-[10px] text-zinc-500 shrink-0">+{step.delay}s</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-900/60">
                    <button
                      onClick={() => handleExportYaml(pb.id, pb.name)}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-zinc-800"
                      title="Exportar a YAML"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTriggerExecute(pb.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Lanzar
                    </button>
                    <button
                      onClick={() => handleOpenEdit(pb)}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-zinc-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(pb.id)}
                      className="bg-red-950/40 hover:bg-red-900/60 text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-red-900/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>

        {/* Execution Logs / Progress - 1 column */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
            <Activity className="w-5 h-5 text-aligo-500" />
            Historial de Ejecuciones
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {executions.length === 0 ? (
              <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-8 text-center text-zinc-500 text-sm">
                No hay historial de ejecución disponible.
              </div>
            ) : (
              [...executions].reverse().map((exec) => {
                const isExpanded = expandedExecution === exec.id;
                const percent = Math.min(100, Math.round((exec.currentStep / exec.totalSteps) * 100));
                
                return (
                  <div 
                    key={exec.id}
                    className="bg-zinc-950/40 border border-zinc-900/80 rounded-xl overflow-hidden hover:border-zinc-800/80 transition-colors"
                  >
                    {/* Header */}
                    <div 
                      onClick={() => setExpandedExecution(isExpanded ? null : exec.id)}
                      className="p-4 cursor-pointer hover:bg-zinc-900/30 transition-colors flex items-center justify-between"
                    >
                      <div className="space-y-1 min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm truncate">{exec.playbookName}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({exec.id})</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {new Date(exec.startedAt).toLocaleTimeString()}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {exec.agentIds.length} {exec.agentIds.length === 1 ? 'agente' : 'agentes'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {exec.status === 'pending' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-950/40 text-yellow-400 border border-yellow-800/30 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Pendiente
                          </span>
                        )}
                        {exec.status === 'running' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-950/40 text-aligo-500 border border-blue-800/30 flex items-center gap-1 font-semibold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {percent}%
                          </span>
                        )}
                        {exec.status === 'completed' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Listo
                          </span>
                        )}
                        {exec.status === 'failed' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-800/30 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Falló
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                      </div>
                    </div>

                    {/* Progress Bar (Only visible if running or pending) */}
                    {exec.status === 'running' && (
                      <div className="h-1 bg-black w-full relative">
                        <div 
                          className="h-full bg-aligo-600 transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}

                    {/* Details Panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-zinc-900 bg-black/40 space-y-3">
                        <div className="flex justify-between text-xs text-zinc-400">
                          <span>Progreso de pasos:</span>
                          <span className="font-semibold text-zinc-300">
                            Paso {exec.currentStep} de {exec.totalSteps}
                          </span>
                        </div>

                        {/* Logs box */}
                        <div className="bg-black rounded-lg border border-zinc-950 p-3 max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                          {exec.logs.length === 0 ? (
                            <span className="text-slate-600">No hay registros aún...</span>
                          ) : (
                            exec.logs.map((log, lIdx) => (
                              <div key={lIdx} className="text-zinc-300 leading-normal flex items-start gap-2">
                                <span className="text-slate-600 shrink-0">
                                  [{new Date(log.timestamp).toLocaleTimeString()}]
                                </span>
                                <span className="flex-1 text-zinc-200">{log.message}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MODAL: Playbook Execution Target Picker */}
      {selectedPlaybook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-zinc-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-900">
              <h3 className="text-lg font-bold text-white">Lanzar Playbook</h3>
              <p className="text-zinc-400 text-xs mt-1">
                Selecciona los agentes activos sobre los que deseas ejecutar esta secuencia de comandos.
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
              {activeAgents.length === 0 ? (
                <div className="text-center text-zinc-400 text-sm py-4">
                  No hay agentes activos en línea actualmente para ejecutar este playbook.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeAgents.map((agent) => {
                    const isSelected = selectedAgents.includes(agent.id);
                    return (
                      <label 
                        key={agent.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-aligo-700/10 border-aligo-600 text-white' 
                            : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAgents(prev => [...prev, agent.id]);
                            } else {
                              setSelectedAgents(prev => prev.filter(id => id !== agent.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-aligo-700 focus:ring-aligo-600 border-zinc-800 bg-zinc-900"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs truncate">{agent.id}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {agent.ip} | {agent.os}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-900 bg-zinc-950/20 flex justify-end gap-3">
              <button
                onClick={() => setSelectedPlaybook(null)}
                className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmExecution}
                disabled={selectedAgents.length === 0}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-950/20"
              >
                Confirmar y Ejecutar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Playbook Creation/Edit Editor */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-zinc-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-900 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-white">
                {editingId ? 'Editar Playbook' : 'Nuevo Playbook'}
              </h3>
              <button 
                onClick={() => setIsEditorOpen(false)}
                className="text-zinc-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlaybook} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nombre del Playbook</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej. Reconocimiento de Red"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-aligo-600 focus:ring-1 focus:ring-aligo-600 text-white"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Descripción</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe el propósito y alcance de esta automatización."
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-aligo-600 focus:ring-1 focus:ring-aligo-600 text-white resize-none"
                  />
                </div>
              </div>

              {/* Steps Area */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pasos de Ejecución</label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs text-aligo-500 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Paso
                  </button>
                </div>

                <div className="space-y-3">
                  {formSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-black/60 rounded-xl border border-zinc-950 group">
                      <span className="text-sm font-semibold text-slate-600">{idx + 1}.</span>
                      
                      {/* Command Input */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          required
                          value={step.command}
                          onChange={(e) => handleStepChange(idx, 'command', e.target.value)}
                          placeholder="Comando (ej. systeminfo, networksetup)"
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-aligo-600 focus:ring-1 focus:ring-aligo-600"
                        />
                      </div>

                      {/* Delay (seconds) */}
                      <div className="w-24 shrink-0 flex items-center gap-2 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-900">
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">Espera:</span>
                        <input
                          type="number"
                          required
                          min={0}
                          value={step.delay}
                          onChange={(e) => handleStepChange(idx, 'delay', parseInt(e.target.value) || 0)}
                          className="w-8 bg-transparent text-xs text-center font-semibold focus:outline-none text-zinc-200"
                        />
                        <span className="text-[10px] text-zinc-500">s</span>
                      </div>

                      {/* MITRE Tags Input */}
                      <div className="w-32 shrink-0">
                        <input
                          type="text"
                          value={(step.mitre_tactics || []).join(', ')}
                          onChange={(e) => handleStepChange(idx, 'mitre_tactics', e.target.value)}
                          placeholder="MITRE (ej: T1033)"
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-aligo-600 focus:ring-1 focus:ring-aligo-600"
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        disabled={formSteps.length === 1}
                        onClick={() => handleRemoveStep(idx)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1 disabled:opacity-30 disabled:hover:text-zinc-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-aligo-700 hover:bg-aligo-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-950/20"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
