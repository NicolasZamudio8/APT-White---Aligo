import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Terminal, 
  Settings,
  Map
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents', icon: Users, label: 'Agentes' },
  { to: '/playbooks', icon: Terminal, label: 'Playbooks' },
  { to: '/map', icon: Map, label: 'Mapa' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export default function Sidebar() {
  return (
    <aside className="w-16 bg-black border-r border-zinc-900 flex flex-col items-center py-6">
      {/* Logo Aligo Estilizado */}
      <div className="mb-8 flex flex-col items-center">
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">
          {/* Recreación de las barras diagonales de la A de Aligo */}
          <path d="M 20 80 L 45 20 L 55 20 L 30 80 Z" fill="white" />
          <path d="M 45 80 L 70 20 L 80 20 L 55 80 Z" fill="#dc2626" />
        </svg>
      </div>

      {/* Navegación */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `p-3 rounded-lg transition-colors relative group ${
                isActive 
                  ? 'bg-aligo-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                  : 'text-zinc-400 hover:bg-aligo-900/30 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {/* Tooltip en hover */}
            <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}