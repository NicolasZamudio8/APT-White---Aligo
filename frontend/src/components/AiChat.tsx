import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Bot, Loader2, Trash2, Shield, AlertTriangle } from 'lucide-react';

// Backend URL from environment — never expose the Gemini key in the frontend
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// Stable session ID for this browser tab — uses native crypto, no extra dependency
const SESSION_ID = (() => {
  const existing = sessionStorage.getItem('aligo_chat_session');
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem('aligo_chat_session', id);
  return id;
})();

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
  attackContext?: AttackContext;
  error?: boolean;
}

interface AttackContext {
  commandId: string;
  commandLabel: string;
  agentId: string;
  ip: string;
  city: string;
  timestamp: string;
}

const WELCOME: Message = {
  role: 'ai',
  text: 'Soy el Asistente SecOps de Aligo C2 — impulsado por Gemini. Tengo contexto completo del proyecto: agentes en Colombia, payloads RECON/DUMP/BEACON/EXFIL y el framework MITRE ATT&CK.\n\n¿En qué puedo ayudarte? Puedes preguntarme sobre vulnerabilidades, remediación, técnicas de ataque o cómo mejorar la seguridad de cualquier agente comprometido.',
  timestamp: new Date().toLocaleTimeString(),
};

async function sendToGemini(message: string, attackContext?: AttackContext): Promise<string> {
  const res = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      session_id: SESSION_ID,
      attack_context: attackContext ?? null,
    }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.reply as string;
}

async function resetSession(): Promise<void> {
  await fetch(`${API_URL}/api/ai/chat/${SESSION_ID}`, { method: 'DELETE' }).catch(() => {});
  sessionStorage.removeItem('aligo_chat_session');
}

// Render AI text with basic markdown-like formatting
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-white text-xs">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex items-start gap-1.5">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-aligo-500 flex-shrink-0" />
              <p className="text-[11px] text-zinc-300 leading-relaxed">{line.slice(2)}</p>
            </div>
          );
        }
        if (/^\d+\. /.test(line)) {
          const [num, ...rest] = line.split('. ');
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[9px] font-black text-aligo-500 mt-0.5 min-w-[14px]">{num}.</span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">{rest.join('. ')}</p>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-[11px] text-zinc-300 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingContext, setPendingContext] = useState<AttackContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for attack events dispatched from Map.tsx after drag & drop
  useEffect(() => {
    const handleAttackEvent = (e: CustomEvent<AttackContext>) => {
      const ctx = e.detail;
      setPendingContext(ctx);
      // Pre-fill input with a contextual question
      setInput(`¿Cómo elimino la vulnerabilidad ${ctx.commandLabel} en el agente ${ctx.agentId} (${ctx.ip}, ${ctx.city})?`);
      inputRef.current?.focus();

      // Add a system-style hint message
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `🔴 Ataque detectado: **${ctx.commandLabel}** ejecutado sobre ${ctx.agentId} (${ctx.ip} — ${ctx.city}).\n\nEl contexto del ataque fue capturado. Puedes preguntarme directamente sobre cómo remediar esta vulnerabilidad.`,
        timestamp: new Date().toLocaleTimeString(),
        attackContext: ctx,
      }]);
    };

    window.addEventListener('c2_attack_event', handleAttackEvent as EventListener);
    return () => window.removeEventListener('c2_attack_event', handleAttackEvent as EventListener);
  }, []);

  // Also listen to the old analyze_log event for backwards compatibility
  useEffect(() => {
    const handleAnalyzeLog = async (e: Event) => {
      const logData = (e as CustomEvent<string>).detail;
      await sendMessage(`Analiza este log:\n${logData}`);
    };
    window.addEventListener('analyze_log', handleAnalyzeLog);
    return () => window.removeEventListener('analyze_log', handleAnalyzeLog);
  }, []);

  const sendMessage = useCallback(async (text: string, attackContext?: AttackContext) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString(),
      attackContext,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingContext(null);
    setLoading(true);

    try {
      const reply = await sendToGemini(text, attackContext);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `Error al conectar con Gemini: ${errMsg}\n\nVerifica que el backend esté corriendo en ${API_URL}.`,
        timestamp: new Date().toLocaleTimeString(),
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input.trim(), pendingContext ?? undefined);
  };

  const handleReset = async () => {
    await resetSession();
    setMessages([WELCOME]);
    setInput('');
    setPendingContext(null);
  };

  return (
    <div className="h-[520px] flex flex-col rounded-2xl overflow-hidden border border-white/[0.05] mt-6"
      style={{ background: '#09090b', boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05] shrink-0"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        {/* HUD accent */}
        <div className="w-1 h-5 rounded-full" style={{ background: 'var(--aligo-red)' }} />
        <div className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">AI Assistant</h3>
          <p className="text-[9px] text-zinc-600 font-mono">Gemini Flash · Aligo SecOps Context</p>
        </div>

        {/* Status indicator */}
        <span className="flex items-center gap-1.5 text-[9px] font-semibold px-2 py-1 rounded-full"
          style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ animation: 'status-blink 2s ease-in-out infinite' }} />
          Online
        </span>

        {/* Reset conversation */}
        <button onClick={handleReset} title="Reiniciar conversación"
          className="p-1.5 rounded-lg transition-colors text-zinc-600 hover:text-white hover:bg-white/5">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Attack context banner */}
      {pendingContext && (
        <div className="flex items-center gap-2 px-5 py-2.5 shrink-0 border-b border-red-900/30"
          style={{ background: 'rgba(224,36,36,0.07)' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-aligo-500 flex-shrink-0" />
          <p className="text-[10px] text-zinc-400 flex-1">
            Contexto activo: <span className="font-bold text-aligo-400">{pendingContext.commandLabel}</span> sobre{' '}
            <span className="font-mono text-zinc-300">{pendingContext.agentId}</span>
          </p>
          <button onClick={() => setPendingContext(null)} className="text-zinc-700 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: msg.error ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                {msg.error ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <Bot className="w-3.5 h-3.5 text-violet-400" />}
              </div>
            )}

            <div className={`max-w-[85%] p-3.5 rounded-xl text-sm ${
              msg.role === 'user'
                ? 'rounded-tr-sm'
                : 'rounded-tl-sm'
            }`}
              style={msg.role === 'user'
                ? { background: 'linear-gradient(135deg, #7a0d0d, #e02424)', color: 'white' }
                : {
                  background: msg.error ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${msg.error ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }
              }>
              {/* Attack context tag */}
              {msg.attackContext && msg.role === 'user' && (
                <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/10">
                  <Shield className="w-3 h-3 opacity-60" />
                  <span className="text-[9px] opacity-70 font-mono uppercase tracking-wider">
                    {msg.attackContext.commandLabel} · {msg.attackContext.agentId}
                  </span>
                </div>
              )}
              {msg.role === 'ai'
                ? <FormattedText text={msg.text} />
                : <p className="text-[11px] leading-relaxed">{msg.text}</p>
              }
              <p className={`text-[8px] mt-2 opacity-40 font-mono ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp}
              </p>
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(224,36,36,0.15)', border: '1px solid rgba(224,36,36,0.2)' }}>
                <User className="w-3.5 h-3.5 text-aligo-500" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Bot className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl rounded-tl-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
              <span className="text-[10px] text-zinc-500 font-mono">Gemini analizando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3.5 border-t border-white/[0.05] shrink-0"
        style={{ background: 'rgba(255,255,255,0.015)' }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            disabled={loading}
            onChange={e => setInput(e.target.value)}
            placeholder={loading ? 'Gemini está analizando...' : 'Pregunta sobre vulnerabilidades, remediación o técnicas de ataque...'}
            className="flex-1 rounded-xl px-4 py-2.5 text-[11px] focus:outline-none text-zinc-200 disabled:opacity-50 placeholder-zinc-700"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(224,36,36,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #7a0d0d, #e02424)',
              boxShadow: !input.trim() || loading ? 'none' : '0 0 16px rgba(224,36,36,0.3)',
            }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </form>
      </div>
    </div>
  );
}
