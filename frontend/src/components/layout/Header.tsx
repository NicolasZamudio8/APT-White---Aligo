import { Bell, Search, User } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="h-16 bg-[#111827] border-b border-gray-800 flex items-center justify-between px-6">
      {/* Título de la página (lo manejará el router) */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white">
          Panel de Control
        </h1>
      </div>

      {/* Barra de búsqueda global */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar agentes, comandos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 text-gray-200 pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Acciones del header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificaciones"
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors relative"
        >
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-gray-700">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-gray-300 hidden md:block">Operador</span>
        </div>
      </div>
    </header>
  );
}