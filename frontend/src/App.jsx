import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Analysis from './pages/Analysis/Analysis'; 
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
import Audit from './pages/Audit/Audit'; // <--- 1. Importamos la pantalla de Auditoría
import { Sidebar } from './components/layout/Sidebar';
import { useNavigate } from 'react-router-dom';

// Componente Wrapper para páginas que llevan Sidebar
const DashboardLayout = ({ children }) => (
  <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc]">
    <Sidebar />
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {children}
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas (Sin Sidebar) */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Rutas Privadas (Con Sidebar) */}
        <Route 
          path="/dashboard" 
          element={
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          } 
        />

        {/* Ruta para Análisis IA */}
        <Route 
          path="/analysis" 
          element={
            <DashboardLayout>
              <Analysis />
            </DashboardLayout>
          } 
        />

        {/* Ruta para Reportes */}
        <Route 
          path="/reports" 
          element={
            <DashboardLayout>
              <Reports />
            </DashboardLayout>
          } 
        />

        {/* Nueva Ruta para Calidad y Auditoría */}
        <Route 
          path="/audit" 
          element={
            <DashboardLayout>
              <Audit /> {/* <--- 2. Renderizamos el componente aquí */}
            </DashboardLayout>
          } 
        />
        <Route
          path="/profile"
          element={
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
