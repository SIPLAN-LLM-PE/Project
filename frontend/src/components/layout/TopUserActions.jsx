import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LiveNotifications from '../common/LiveNotifications';

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'US';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
};

export const TopUserActions = () => {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario')) || {
    nombre: 'Usuario SIGEJA',
    cargo: 'Personal Judicial',
    rol: 'usuario'
  };

  return (
    <div className="flex items-center gap-2 xl:gap-4">
      <LiveNotifications usuarioActivo={usuario} />

      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="flex items-center bg-[#2546b0] text-white rounded-lg px-3 xl:px-4 py-1.5 gap-2 xl:gap-3 cursor-pointer hover:bg-blue-800 transition-all shadow-sm max-w-[220px] xl:max-w-none"
        title="Ir a Mi Perfil"
      >
        <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">
          {getInitials(usuario.nombre)}
        </div>
        <div className="text-[10px] leading-tight text-left min-w-0">
          <span className="font-bold block tracking-wide truncate max-w-[130px] xl:max-w-none">{usuario.nombre}</span>
          <span className="opacity-80 font-medium">{usuario.cargo || usuario.rol}</span>
        </div>
        <ChevronDown className="w-4 h-4 ml-1 opacity-60" />
      </button>
    </div>
  );
};
