import type { ReactNode } from 'react';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 flex">
      {/* Sidebar - siempre visible */}
      <Sidebar />
      
      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}