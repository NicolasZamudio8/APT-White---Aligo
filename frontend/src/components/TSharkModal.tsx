import { useEffect, useRef, useState } from 'react';
import { X, Radio, Download, Square, Circle } from 'lucide-react';

interface TSharkModalProps {
  onClose: () => void;
  agentIps?: string[];
}

// Simulated packet protocols and types
const PROTOCOLS = ['TCP', 'UDP', 'DNS', 'TLS', 'HTTP', 'ICMP', 'ARP'];
const DNS_QUERIES = [
  'c2.aligo.local', 'update.microsoft.com', 'api.github.com',
  'beacon.aligo.internal', '8.8.8.8.in-addr.arpa', 'wpad.domain.local'
];
const TCP_FLAGS = ['SYN', 'ACK', 'SYN ACK', 'FIN ACK', 'PSH ACK', 'RST'];
const INTERFACES = ['eth0', 'lo', 'any', 'wlan0'];

function randomIP() {
  return `${192}.${168}.${Math.floor(Math.random() * 30 + 1)}.${Math.floor(Math.random() * 253 + 1)}`;
}

function generatePacket(agentIps: string[]): string {
  const proto = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)];
  const srcIp = agentIps.length > 0 && Math.random() > 0.3
    ? agentIps[Math.floor(Math.random() * agentIps.length)]
    : randomIP();
  const dstIp = Math.random() > 0.5 ? '10.0.0.1' : randomIP();
  const sport = Math.floor(Math.random() * 60000 + 1024);
  const dport = [80, 443, 1234, 53, 8080, 4444][Math.floor(Math.random() * 6)];
  const len = Math.floor(Math.random() * 1400 + 40);
  const seq = Math.floor(Math.random() * 999999);

  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(6,'0')}`;

  switch (proto) {
    case 'DNS':
      return `${ts}  ${srcIp.padEnd(18)} → ${dstIp.padEnd(18)} DNS    ${dport}   Standard query A ${DNS_QUERIES[Math.floor(Math.random() * DNS_QUERIES.length)]}`;
    case 'TCP':
      return `${ts}  ${srcIp.padEnd(18)} → ${dstIp.padEnd(18)} TCP    ${sport} → ${dport} [${TCP_FLAGS[Math.floor(Math.random() * TCP_FLAGS.length)]}] Seq=${seq} Win=64240 Len=${len}`;
    case 'TLS':
      return `${ts}  ${srcIp.padEnd(18)} → ${dstIp.padEnd(18)} TLSv1.3 ${len}   Application Data`;
    case 'ICMP':
      return `${ts}  ${srcIp.padEnd(18)} → ${dstIp.padEnd(18)} ICMP   ${len}   Echo (ping) request id=0x0001`;
    case 'ARP':
      return `${ts}  ff:ff:ff:ff:ff:ff  → Broadcast           ARP    42    Who has ${dstIp}? Tell ${srcIp}`;
    default:
      return `${ts}  ${srcIp.padEnd(18)} → ${dstIp.padEnd(18)} ${proto.padEnd(6)} ${dport}   DATA Len=${len}`;
  }
}

// Color coding for protocol type in the terminal output
function getProtoColor(line: string): string {
  if (line.includes('DNS'))   return '#f59e0b';
  if (line.includes('TLS'))   return '#8b5cf6';
  if (line.includes('TCP'))   return '#06b6d4';
  if (line.includes('ICMP'))  return '#f97316';
  if (line.includes('ARP'))   return '#a3a3a3';
  if (line.includes('1234'))  return '#e02424'; // C2 port — red alert
  if (line.includes('4444'))  return '#e02424';
  return '#71717a';
}

export default function TSharkModal({ onClose, agentIps = [] }: TSharkModalProps) {
  const [packets, setPackets] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(true);
  const [selectedInterface, setSelectedInterface] = useState('any');
  const [packetCount, setPacketCount] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Add initial banner
    setPackets([
      'Capturing on interface: any',
      '────────────────────────────────────────────────────────────────────────────',
      'TIME              SOURCE              DESTINATION         PROTO   PORT  INFO',
      '────────────────────────────────────────────────────────────────────────────',
    ]);
  }, []);

  useEffect(() => {
    if (isCapturing) {
      intervalRef.current = setInterval(() => {
        const newPacket = generatePacket(agentIps);
        setPackets(prev => [...prev.slice(-200), newPacket]); // Keep last 200 lines
        setPacketCount(c => c + 1);
      }, 180);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isCapturing, agentIps]);

  // Auto-scroll to bottom
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
    // Full-screen overlay
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Modal panel — right side, tall */}
      <div
        className="relative pointer-events-auto flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: '680px',
          height: '85vh',
          background: '#08080a',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* HUD corner accents */}
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-aligo-600 rounded-tl-lg opacity-70" />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-aligo-600 rounded-br-lg opacity-70" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05] shrink-0">
          <Radio className="w-4 h-4 text-aligo-500 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">
            TSHARK — Network Capture
          </span>

          {/* Live / Stopped badge */}
          <span
            className="ml-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={isCapturing
              ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
              : { background: 'rgba(113,113,122,0.1)', color: '#71717a', border: '1px solid rgba(113,113,122,0.2)' }
            }
          >
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: isCapturing ? '#34d399' : '#71717a', animation: isCapturing ? 'status-blink 1s ease-in-out infinite' : 'none' }}
            />
            {isCapturing ? 'LIVE' : 'STOPPED'}
          </span>

          {/* Packet counter */}
          <span className="ml-auto text-[10px] font-mono text-zinc-600">
            {packetCount.toLocaleString()} pkts
          </span>

          {/* Close */}
          <button onClick={onClose} className="ml-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] shrink-0">
          {/* Interface selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Interface</span>
            <select
              value={selectedInterface}
              onChange={e => setSelectedInterface(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md focus:outline-none focus:border-aligo-700"
            >
              {INTERFACES.map(iface => (
                <option key={iface} value={iface}>{iface}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          {/* Start/Stop */}
          <button
            onClick={() => setIsCapturing(c => !c)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={isCapturing
              ? { background: 'rgba(113,113,122,0.15)', color: '#a1a1aa', border: '1px solid rgba(113,113,122,0.2)' }
              : { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }
            }
          >
            {isCapturing
              ? <><Square className="w-3 h-3" />Stop</>
              : <><Circle className="w-3 h-3" />Start</>
            }
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-zinc-400 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>

        {/* Packet stream — terminal */}
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto px-5 py-4 font-mono text-[11px] leading-relaxed"
          style={{ background: '#050507' }}
        >
          {packets.map((line, i) => (
            <div key={i} className="whitespace-pre" style={{ color: getProtoColor(line) }}>
              {line}
            </div>
          ))}
          {/* Cursor blink */}
          {isCapturing && (
            <span className="inline-block w-1.5 h-3 bg-aligo-600 ml-1" style={{ animation: 'status-blink 0.8s ease-in-out infinite' }} />
          )}
        </div>

        {/* Status bar */}
        <div className="shrink-0 flex items-center gap-4 px-5 py-2.5 border-t border-white/[0.04]"
          style={{ background: 'rgba(255,255,255,0.015)' }}>
          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
            Interface: {selectedInterface}
          </span>
          <span className="text-[9px] font-mono text-zinc-700">
            Filter: port 1234 or port 4444
          </span>
          <span className="ml-auto text-[9px] font-mono" style={{ color: isCapturing ? '#34d399' : '#71717a' }}>
            {isCapturing ? '● Capturing' : '■ Stopped'}
          </span>
        </div>
      </div>
    </div>
  );
}
