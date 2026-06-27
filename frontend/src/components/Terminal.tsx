import React, { useState, useRef, useEffect } from 'react';
import { Send, TerminalSquare, Sparkles } from 'lucide-react';

export default function Terminal({ agents }: { agents: any[] }) {
  const [logs, setLogs] = useState<{type: 'system' | 'user' | 'agent', content: string, agent?: string}[]>([
    { type: 'system', content: 'C2 Simulator Terminal Initialized.' },
    { type: 'system', content: 'Warning: This is a simulated environment. No actual malicious commands will be executed.' }
  ]);
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Set default selected agent if there is one available
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0].id);
    }
  }, [agents, selectedAgent]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedAgent) return;

    const cmd = input.trim();
    setLogs(prev => [...prev, { type: 'user', content: cmd }]);
    setInput('');

    // Mock API Call
    try {
      const res = await fetch('http://localhost:8000/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: selectedAgent, command: cmd })
      });
      const data = await res.json();
      if (data.status === 'sent') {
        setLogs(prev => [...prev, { type: 'system', content: `Command enqueued for agent ${selectedAgent.substring(0,8)}` }]);
      } else {
        setLogs(prev => [...prev, { type: 'system', content: `Error: ${data.error}` }]);
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: 'system', content: 'Connection to Mock Backend failed.' }]);
    }
  };

  const handleAiAssist = () => {
    if (!input) return;
    setLogs(prev => [...prev, { type: 'system', content: `[Gemini AI Analysis]: Translating intent "${input}" to safe mock command.` }]);
    setInput(`mock-exec "${input}"`);
  };

  return (
    <div className="h-full flex flex-col gap-4 flex-1">
      <div className="flex gap-4">
        <select 
          className="bg-gray-800 border border-gray-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-64 p-2.5"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
        >
          <option value="">Select Target Agent...</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.id.substring(0,8)} ({a.os})</option>
          ))}
        </select>
        
        <button onClick={handleAiAssist} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-all text-sm font-medium">
          <Sparkles className="w-4 h-4" /> Translate with Gemini
        </button>
      </div>

      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden max-h-[50vh] min-h-[300px]">
        <div className="bg-[#1f2937]/40 p-3 border-b border-gray-800 flex items-center gap-2 text-slate-400 text-sm">
          <TerminalSquare className="w-4 h-4" />
          <span>Interactive Shell</span>
        </div>
        
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-2">
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-3 ${log.type === 'user' ? 'text-blue-400' : log.type === 'agent' ? 'text-slate-300' : 'text-slate-500'}`}>
              <span className="opacity-50 select-none">
                {log.type === 'user' ? '❯' : log.type === 'system' ? 'ℹ' : '←'}
              </span>
              <span className="whitespace-pre-wrap">{log.content}</span>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-900 border-t border-gray-800">
          <form onSubmit={handleSend} className="flex gap-4">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter command or natural language intent..." 
              className="flex-1 bg-[#111827] border border-gray-800 rounded-lg px-4 py-2.5 text-slate-200 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button 
              type="submit"
              disabled={!selectedAgent || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
