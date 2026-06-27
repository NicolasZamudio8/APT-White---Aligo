import { Bell, Search, User } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    // Header: pure black with a subtle Aligo crimson bottom border
    <header className="h-16 bg-black border-b-2 flex items-center justify-between px-6" style={{ borderColor: '#7a0d0d' }}>
      {/* Título con tipografía Outfit de Aligo */}
      <div className="flex items-center gap-3">
        <span className="font-outfit font-black text-white text-xl tracking-tight">ALIGO</span>
        <span className="text-aligo-800 font-light mx-1">|</span>
        <h1 className="text-xs font-medium text-zinc-500 tracking-widest uppercase">Enterprise C2</h1>
      </div>

      {/* Barra de búsqueda global */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Buscar agentes, comandos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-300 pl-10 pr-4 py-2 rounded-lg border border-zinc-800 focus:border-aligo-700 focus:outline-none focus:ring-1 focus:ring-aligo-700 transition-colors"
          />
        </div>
      </div>

      {/* Acciones del header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificaciones"
          className="p-2 rounded-lg hover:bg-zinc-900 transition-colors relative"
        >
          <Bell className="w-5 h-5 text-zinc-500" />
          {/* Notificacion dot en rojo Aligo */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-aligo-600 rounded-full animate-pulse"></span>
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-zinc-800">
          <div className="w-8 h-8 bg-aligo-700 rounded-full flex items-center justify-center ring-1 ring-aligo-600/50">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-zinc-400 hidden md:block">Operador</span>
        </div>
      </div>
    </header>
  );
}