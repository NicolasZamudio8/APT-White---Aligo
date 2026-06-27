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
    // Sidebar with the exact Aligo blood-red crimson background from the corporate logo
    <aside className="w-16 flex flex-col items-center py-6" style={{ background: 'linear-gradient(180deg, #7a0d0d 0%, #5a0909 100%)' }}>
      {/* Aligo Logo — two diagonal bars forming the A */}
      <div className="mb-8 flex flex-col items-center">
        <svg width="38" height="38" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Left bar of the A (white) */}
          <path d="M 8 95 L 38 10 L 50 10 L 20 95 Z" fill="white" />
          {/* Right bar of the A (white, slightly offset) */}
          <path d="M 30 95 L 60 10 L 72 10 L 42 95 Z" fill="white" opacity="0.75" />
        </svg>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `p-3 rounded-lg transition-all duration-200 relative group ${
                isActive 
                  ? 'bg-white/20 text-white shadow-inner' 
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {/* Hover tooltip */}
            <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom brand label */}
      <div className="mt-auto pt-4">
        <span className="text-white/30 text-[9px] font-outfit tracking-widest uppercase rotate-90 block" style={{ writingMode: 'vertical-rl' }}>
          ALIGO
        </span>
      </div>
    </aside>
  );
}