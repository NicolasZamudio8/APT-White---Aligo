import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Radio, Download, Square, Circle } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

interface TSharkModalProps {
  onClose: () => void;
  agentIps?: string[];
  isOpen?: boolean;
}

const INTERFACES = ['eth0', 'lo', 'any', 'wlan0'];


// Color per protocol/content
function getLineColor(line: string): string {
  if (line.includes('← C2') || line.includes('beacon') || line.includes('1234') || line.includes('4444')) return '#e02424';
  if (line.includes('EXFIL') || line.includes('exfil') || line.includes('← Data chunk') || line.includes('exfil confirmed')) return '#f59e0b';
  if (line.includes('NTLM') || line.includes('LSASS') || line.includes('SAM') || line.includes('MSRPC')) return '#8b5cf6';
  if (line.includes('DNS') || line.includes('← DNS'))   return '#f59e0b';
  if (line.includes('TLS') || line.includes('domain fronting')) return '#8b5cf6';
  if (line.includes('SMB') || line.includes('ARP') || line.includes('sweep')) return '#06b6d4';
  if (line.includes('← WMI') || line.includes('← LSASS') || line.includes('← ARP')) return '#f97316';
  if (line.includes('[SYN]') || line.includes('[SYN ACK]')) return '#22d3ee';
  if (line.includes('[PSH ACK]') || line.includes('[ACK]')) return '#71717a';
  if (line.includes('ICMP')) return '#a3a3a3';
  return '#52525b';
}

export default function TSharkModal({ onClose, isOpen = true }: TSharkModalProps) {
  const [packets, setPackets] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(true);
  const [selectedInterface, setSelectedInterface] = useState('any');
  const logRef = useRef<HTMLDivElement>(null);

  const fetchPackets = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tshark/packets`);
      if (response.ok) {
        const data = await response.json();
        const lines = data.map((p: any) => p.line);
        setPackets([
          'Capturing on interface: any',
          '─────────────────────────────────────────────────────────────────────────────────────────',
          'TIMESTAMP         SOURCE              DESTINATION         PROTO   PORT  INFO',
          '─────────────────────────────────────────────────────────────────────────────────────────',
          ...lines
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch persisted TShark packets:', err);
    }
  }, []);

  // Initial banner and load
  useEffect(() => {
    fetchPackets();
  }, [fetchPackets]);

  // Listen for attack events to trigger quick refresh
  useEffect(() => {
    const handleAttack = () => {
      if (!isCapturing) return;
      setTimeout(fetchPackets, 150);
    };

    window.addEventListener('c2_attack_event', handleAttack);
    return () => window.removeEventListener('c2_attack_event', handleAttack);
  }, [isCapturing, fetchPackets]);

  // Poll packets periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isCapturing) {
        fetchPackets();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isCapturing, fetchPackets]);

  // Auto-scroll
  useEffect(() => {
    if (logRef.current && isCapturing) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [packets, isCapturing]);

  const handleExport = () => {
    const blob = new Blob([packets.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tshark_capture_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attackCount = packets.filter(l => l.startsWith('\n')).length;
  const packetCount = packets.filter(l => !l.startsWith('\n') && !l.startsWith('Capturing') && !l.startsWith('───')).length;

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none ${isOpen ? '' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

      <div className="relative pointer-events-auto flex flex-col rounded-2xl overflow-hidden"
        style={{ width: '720px', height: '88vh', background: '#06060a', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 0 60px rgba(0,0,0,0.9)' }}>

        {/* HUD corners */}
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-aligo-600 rounded-tl-lg opacity-70" />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-aligo-600 rounded-br-lg opacity-70" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05] shrink-0">
          <Radio className="w-4 h-4 text-aligo-500 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">TSHARK — Live Network Capture</span>

          <span className="ml-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={isCapturing
              ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
              : { background: 'rgba(113,113,122,0.1)', color: '#71717a', border: '1px solid rgba(113,113,122,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: isCapturing ? '#34d399' : '#71717a', animation: isCapturing ? 'status-blink 1s ease-in-out infinite' : 'none' }} />
            {isCapturing ? 'LIVE' : 'STOPPED'}
          </span>

          <span className="ml-auto text-[10px] font-mono text-zinc-600">{packetCount.toLocaleString()} pkts · {attackCount} attacks</span>

          <button onClick={onClose} className="ml-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Interface</span>
            <select value={selectedInterface} onChange={e => setSelectedInterface(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md focus:outline-none">
              {INTERFACES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>

          {/* Attack events legend */}
          <div className="flex items-center gap-3 ml-2">
            {[
              { id: 'recon',  color: '#f97316', label: 'RECON'  },
              { id: 'dump',   color: '#8b5cf6', label: 'DUMP'   },
              { id: 'beacon', color: '#e02424', label: 'BEACON' },
              { id: 'exfil',  color: '#f59e0b', label: 'EXFIL'  },
            ].map(a => (
              <span key={a.id} className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider" style={{ color: a.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
                {a.label}
              </span>
            ))}
          </div>

          <div className="flex-1" />

          <button onClick={() => setIsCapturing(c => !c)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={isCapturing
              ? { background: 'rgba(113,113,122,0.15)', color: '#a1a1aa', border: '1px solid rgba(113,113,122,0.2)' }
              : { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
            {isCapturing ? <><Square className="w-3 h-3" />Stop</> : <><Circle className="w-3 h-3" />Start</>}
          </button>

          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-zinc-400 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Download className="w-3 h-3" />Export
          </button>
        </div>

        {/* Packet stream */}
        <div ref={logRef} className="flex-1 overflow-y-auto px-5 py-4 font-mono text-[10.5px] leading-[1.7]" style={{ background: '#040408' }}>
          {packets.map((line, i) => (
            <div key={i} className="whitespace-pre" style={{ color: getLineColor(line) }}>
              {line}
            </div>
          ))}
          {isCapturing && (
            <span className="inline-block w-1.5 h-3 bg-aligo-600 ml-1" style={{ animation: 'status-blink 0.8s ease-in-out infinite' }} />
          )}
        </div>

        {/* Status bar */}
        <div className="shrink-0 flex items-center gap-4 px-5 py-2 border-t border-white/[0.04]"
          style={{ background: 'rgba(255,255,255,0.01)' }}>
          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">Interface: {selectedInterface}</span>
          <span className="text-[9px] font-mono text-zinc-700">Attacks: {attackCount} · Filter: C2 ports + NTLM + DNS-tunnel</span>
          <span className="ml-auto text-[9px] font-mono" style={{ color: isCapturing ? '#34d399' : '#71717a' }}>
            {isCapturing ? '● Capturing' : '■ Stopped'}
          </span>
        </div>
      </div>
    </div>
  );
}
