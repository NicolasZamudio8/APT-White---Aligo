import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Radio, Download, Square, Circle } from 'lucide-react';

interface TSharkModalProps {
  onClose: () => void;
  agentIps?: string[];
}

// Attack-specific network datagrams — deterministic, not random
// Each attack type produces the realistic network patterns it would generate
const ATTACK_SIGNATURES: Record<string, (agentIp: string, ts: string) => string[]> = {
  recon: (ip, ts) => [
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           TCP    ${Math.floor(Math.random()*60000+1024)} → 135   [SYN] Seq=0 Win=64240 Len=0     ← WMI/RPC port probe`,
    `${ts}  10.0.0.1          → ${ip.padEnd(18)} TCP    135 → 49152 [SYN ACK] Seq=0 Ack=1 Win=8192`,
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           TCP    49152 → 445 [SYN] Seq=0 Win=64240      ← SMB enumeration`,
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           ICMP   74     Echo (ping) request id=0x0001 seq=1`,
    `${ts}  10.0.0.1          → ${ip.padEnd(18)} ICMP   74     Echo (ping) reply id=0x0001 seq=1`,
    `${ts}  ${ip.padEnd(18)} → 255.255.255.255    ARP    42     Who has 192.168.0.1? Tell ${ip}  ← ARP host sweep`,
  ],
  dump: (ip, ts) => [
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           TCP    49200 → 445 [SYN] Seq=0 Win=64240      ← SMB to access SAM`,
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           SMB    237    Session Setup AndX Request, NTLMSSP_NEGOTIATE`,
    `${ts}  10.0.0.1          → ${ip.padEnd(18)} SMB    195    Session Setup AndX Response, NTLMSSP_CHALLENGE`,
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           SMB    458    Session Setup AndX Request, NTLMSSP_AUTH, User: SYSTEM`,
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           TCP    49201 → 135  [SYN] Seq=0               ← LSASS via RPC`,
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           MSRPC  1048   Call bind: IObjectExporter UUID (LSARPC interface)`,
    `${ts}  ${ip.padEnd(18)} → 10.0.0.1           MSRPC  2048   LsarQueryInformationPolicy2: PolicyAccountDomainInformation`,
  ],
  beacon: (ip, ts) => [
    `${ts}  ${ip.padEnd(18)} → 104.21.85.12       DNS    73     Standard query A beacon.aligo.internal    ← C2 DNS lookup`,
    `${ts}  8.8.8.8           → ${ip.padEnd(18)} DNS    89     Standard query response A 104.21.85.12`,
    `${ts}  ${ip.padEnd(18)} → 104.21.85.12       TCP    49210 → 443 [SYN] Seq=0 Win=64240      ← HTTPS C2 channel`,
    `${ts}  ${ip.padEnd(18)} → 104.21.85.12       TLSv1.3 517  Client Hello (SNI: cdn.cloudflare.net)  ← Domain fronting`,
    `${ts}  104.21.85.12      → ${ip.padEnd(18)} TLSv1.3 1389 Application Data Len=1024          ← C2 task delivered`,
    `${ts}  ${ip.padEnd(18)} → 104.21.85.12       TLSv1.3 287  Application Data Len=256          ← Heartbeat ack`,
  ],
  exfil: (ip, ts) => [
    `${ts}  ${ip.padEnd(18)} → 104.21.85.12       DNS    98     Standard query TXT _dmarc.exfil.aligo.co  ← DNS tunnel`,
    `${ts}  ${ip.padEnd(18)} → 52.84.100.200      TCP    49215 → 443 [SYN] Seq=0 Win=64240      ← HTTPS exfil channel`,
    `${ts}  ${ip.padEnd(18)} → 52.84.100.200      TLSv1.3 1460 Application Data (PSH) Len=1460  ← Data chunk 1/N`,
    `${ts}  ${ip.padEnd(18)} → 52.84.100.200      TLSv1.3 1460 Application Data (PSH) Len=1460  ← Data chunk 2/N`,
    `${ts}  ${ip.padEnd(18)} → 52.84.100.200      TLSv1.3 1460 Application Data (PSH) Len=1460  ← Data chunk 3/N`,
    `${ts}  ${ip.padEnd(18)} → 52.84.100.200      HTTP   POST /api/upload Content-Type: application/octet-stream`,
    `${ts}  52.84.100.200     → ${ip.padEnd(18)} TLSv1.3 89   Application Data Len=24           ← Server ACK (exfil confirmed)`,
  ],
};

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

interface AttackEvent {
  commandId: string;
  commandLabel: string;
  agentId: string;
  agentIp: string;
  timestamp: string;
}

export default function TSharkModal({ onClose }: TSharkModalProps) {
  const [packets, setPackets] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(true);
  const [selectedInterface, setSelectedInterface] = useState('any');
  const [packetCount, setPacketCount] = useState(0);
  const [attackLog, setAttackLog] = useState<AttackEvent[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const appendPackets = useCallback((lines: string[]) => {
    setPackets(prev => [...prev.slice(-300), ...lines]);
    setPacketCount(c => c + lines.length);
  }, []);

  // Initial banner
  useEffect(() => {
    setPackets([
      'Capturing on interface: any',
      '─────────────────────────────────────────────────────────────────────────────────────────',
      'TIMESTAMP         SOURCE              DESTINATION         PROTO   PORT  INFO',
      '─────────────────────────────────────────────────────────────────────────────────────────',
    ]);
  }, []);


  // Listen for attack events from Map.tsx drag & drop
  useEffect(() => {
    const handleAttack = (e: CustomEvent<{ commandId: string; commandLabel: string; agentId: string; ip: string; city: string; timestamp: string }>) => {
      if (!isCapturing) return;

      const { commandId, commandLabel, agentId, ip, timestamp } = e.detail;
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.000000`;

      // Separator line
      const separator = `\n──── ATTACK EVENT: ${commandLabel.toUpperCase()} → ${agentId} (${ip}) at ${timestamp} ────`;

      const attackPackets = ATTACK_SIGNATURES[commandId]
        ? [separator, ...ATTACK_SIGNATURES[commandId](ip, ts)]
        : [separator, `${ts}  ${ip.padEnd(18)} → 10.0.0.1           TCP    Payload: ${commandLabel}`];

      appendPackets(attackPackets);
      setAttackLog(prev => [{ commandId, commandLabel, agentId, agentIp: ip, timestamp }, ...prev].slice(0, 20));
    };

    window.addEventListener('c2_attack_event', handleAttack as EventListener);
    return () => window.removeEventListener('c2_attack_event', handleAttack as EventListener);
  }, [isCapturing, appendPackets]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
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

          <span className="ml-auto text-[10px] font-mono text-zinc-600">{packetCount.toLocaleString()} pkts · {attackLog.length} attacks</span>

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

        {/* Attack history sidebar */}
        {attackLog.length > 0 && (
          <div className="shrink-0 border-t border-white/[0.04] px-5 py-3 max-h-28 overflow-y-auto"
            style={{ background: 'rgba(255,255,255,0.015)' }}>
            <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest block mb-2">Attack Events Captured</span>
            <div className="space-y-1">
              {attackLog.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px] font-mono">
                  <span className="text-zinc-700">{ev.timestamp}</span>
                  <span className="font-bold" style={{
                    color: ev.commandId === 'recon' ? '#f97316' : ev.commandId === 'dump' ? '#8b5cf6' : ev.commandId === 'beacon' ? '#e02424' : '#f59e0b'
                  }}>{ev.commandLabel}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-zinc-400">{ev.agentId}</span>
                  <span className="text-zinc-700">({ev.agentIp})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status bar */}
        <div className="shrink-0 flex items-center gap-4 px-5 py-2 border-t border-white/[0.04]"
          style={{ background: 'rgba(255,255,255,0.01)' }}>
          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">Interface: {selectedInterface}</span>
          <span className="text-[9px] font-mono text-zinc-700">Attacks: {attackLog.length} · Filter: C2 ports + NTLM + DNS-tunnel</span>
          <span className="ml-auto text-[9px] font-mono" style={{ color: isCapturing ? '#34d399' : '#71717a' }}>
            {isCapturing ? '● Capturing' : '■ Stopped'}
          </span>
        </div>
      </div>
    </div>
  );
}
