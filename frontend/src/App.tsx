import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard.tsx';
import Agents from './pages/Agents.tsx';
import AgentDetail from './pages/AgentDetail.tsx';

import Playbooks from './pages/Playbooks.tsx';
import Map from './pages/Map.tsx';
import Settings from './pages/Settings.tsx';


function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/playbooks" element={<Playbooks />} />
          <Route path="/map" element={<Map />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;