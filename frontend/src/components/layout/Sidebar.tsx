import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Terminal, 
  Settings,
  Shield,
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
    <aside className="w-16 bg-[#111827] border-r border-gray-800 flex flex-col items-center py-6">
      {/* Logo */}
      <div className="mb-8">
        <Shield className="w-8 h-8 text-blue-500" />
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
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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