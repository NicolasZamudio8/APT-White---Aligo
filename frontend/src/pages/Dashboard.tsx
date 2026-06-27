import { Activity, Users, Clock, AlertCircle } from 'lucide-react';

// Datos de ejemplo (luego los reemplazarás con datos reales)
const mockMetrics = {
  totalAgents: 12,
  onlineAgents: 10,
  offlineAgents: 2,
  commandsExecuted: 45,
  uptime: '2h 14m',
  alerts: 3,
};

const mockActivity = [
  { id: 1, agent: 'agente-01', command: 'whoami', status: 'success', time: '12:34:56' },
  { id: 2, agent: 'agente-03', command: 'ipconfig', status: 'error', time: '12:28:45' },
  { id: 3, agent: 'agente-02', command: 'ls -la', status: 'success', time: '12:15:22' },
  { id: 4, agent: 'agente-04', command: 'net users', status: 'running', time: '12:10:10' },
];

export default function Dashboard() {
  return (
    <div>
      {/* Título de la página */}
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard Operacional</h1>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard 
          title="Agentes Online" 
          value={`${mockMetrics.onlineAgents}/${mockMetrics.totalAgents}`}
          icon={<Users className="w-5 h-5" />}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <MetricCard 
          title="Alertas Activas" 
          value={mockMetrics.alerts}
          icon={<AlertCircle className="w-5 h-5" />}
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
        />
        <MetricCard 
          title="Comandos Ejecutados" 
          value={mockMetrics.commandsExecuted}
          icon={<Activity className="w-5 h-5" />}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <MetricCard 
          title="Uptime del C2" 
          value={mockMetrics.uptime}
          icon={<Clock className="w-5 h-5" />}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
      </div>

      {/* Distribución por SO (placeholder para gráfica) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-[#111827] rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h2>
          <div className="space-y-3">
            {mockActivity.map((item) => (
              <ActivityItem key={item.id} {...item} />
            ))}
          </div>
        </div>
        <div className="bg-[#111827] rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Distribución por SO</h2>
          <div className="space-y-3">
            <OSBar label="Windows" count={8} total={12} color="bg-blue-500" />
            <OSBar label="Linux" count={3} total={12} color="bg-green-500" />
            <OSBar label="macOS" count={1} total={12} color="bg-purple-500" />
          </div>
        </div>
      </div>

      {/* Footer o información adicional */}
      <div className="text-xs text-gray-500 text-center">
        Última actualización: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

// --- Componentes internos ---

function MetricCard({ title, value, icon, color, bgColor }: any) {
  return (
    <div className="bg-[#111827] rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <div className={`${color}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ agent, command, status, time }: any) {
  const statusConfig = {
    success: { color: 'text-green-500', label: '✅ Éxito' },
    error: { color: 'text-red-500', label: '❌ Error' },
    running: { color: 'text-yellow-500', label: '⏳ Ejecutando' },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.success;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-gray-300">{agent}</span>
        <span className="text-sm text-gray-500">|</span>
        <span className="text-sm font-mono text-gray-400">{command}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-sm ${config.color}`}>{config.label}</span>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
    </div>
  );
}

function OSBar({ label, count, total, color }: any) {
  const percentage = Math.round((count / total) * 100);
  const widthClass = {
    0: 'w-0',
    25: 'w-1/4',
    33: 'w-1/3',
    50: 'w-1/2',
    67: 'w-2/3',
    75: 'w-3/4',
    100: 'w-full',
  }[percentage] ?? 'w-full';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400">{count} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-500 ${widthClass}`} />
      </div>
    </div>
  );
}