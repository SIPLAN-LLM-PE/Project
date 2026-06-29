import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'US';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
};

export const TopUserActions = ({ notificationText = 'Tu buzon de mensajes' }) => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario')) || {
    nombre: 'Usuario SIGEJA',
    cargo: 'Personal Judicial',
    rol: 'usuario'
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-slate-200 transition-all"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        <div className="text-[10px] leading-tight text-left hidden md:block">
          <span className="font-bold block text-slate-700">Notificaciones</span>
          <span className="text-slate-500">{notificationText}</span>
        </div>
        <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="flex items-center bg-[#2546b0] text-white rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-blue-800 transition-all shadow-sm"
        title="Ir a Mi Perfil"
      >
        <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">
          {getInitials(usuario.nombre)}
        </div>
        <div className="text-[10px] leading-tight text-left">
          <span className="font-bold block tracking-wide">{usuario.nombre}</span>
          <span className="opacity-80 font-medium">{usuario.cargo || usuario.rol}</span>
        </div>
        <ChevronDown className="w-4 h-4 ml-1 opacity-60" />
      </button>
    </div>
  );
};
