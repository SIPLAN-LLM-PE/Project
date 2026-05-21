import React from 'react';
import { Users, User, MapPin, CreditCard, Baby, Briefcase, ExternalLink } from 'lucide-react';

// 🚀 NUEVO: Recibimos onJumpToSource como propiedad (prop)
export const SujetosProcesalesCard = ({ data, onJumpToSource }) => {
  if (!data) return null;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Users size={14} className="text-slate-400" />
          Sujetos Procesales
        </h4>
        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide">
          Extracción spaCy + Regex
        </span>
      </div>

      <div className="flex flex-col gap-4">
        
        {/* PARTE DEMANDANTE */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-emerald-400">
          <div className="flex justify-between items-start mb-3">
            <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Parte Demandante</h5>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-50 p-2 rounded-full text-emerald-600">
              <User size={16} />
            </div>
            
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-800">
                {data.demandante?.nombre || "No detectado"}
              </p>
              
              {/* 🚀 BOTÓN DE TRAZABILIDAD PARA EL NOMBRE */}
              {data.demandante?.nombre && data.demandante.nombre !== "No detectado" && (
                <button 
                  onClick={() => onJumpToSource(data.demandante.nombre)}
                  title="Buscar en el documento original"
                  className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-1 rounded transition-colors"
                >
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <CreditCard size={12} className="text-slate-400" />
              <span>DNI: <span className="font-mono text-slate-800">{data.demandante?.dni || "---"}</span></span>
              
              {/* 🚀 BOTÓN DE TRAZABILIDAD PARA EL DNI */}
              {data.demandante?.dni && data.demandante.dni !== "No detectado" && (
                <button 
                  onClick={() => onJumpToSource(data.demandante.dni)}
                  title="Verificar DNI original"
                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PARTE DEMANDADA */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-rose-400">
          <div className="flex justify-between items-start mb-3">
            <h5 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Parte Demandada</h5>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-rose-50 p-2 rounded-full text-rose-600">
              <User size={16} />
            </div>
            
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-800">
                {data.demandado?.nombre || "No detectado"}
              </p>
              
              {/* 🚀 BOTÓN DE TRAZABILIDAD PARA EL NOMBRE */}
              {data.demandado?.nombre && data.demandado.nombre !== "No detectado" && (
                <button 
                  onClick={() => onJumpToSource(data.demandado.nombre)}
                  title="Buscar en el documento original"
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors"
                >
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <CreditCard size={12} className="text-slate-400" />
              <span>DNI: <span className="font-mono text-slate-800">{data.demandado?.dni || "---"}</span></span>
              
              {/* 🚀 BOTÓN DE TRAZABILIDAD PARA EL DNI */}
              {data.demandado?.dni && data.demandado.dni !== "No detectado" && (
                <button 
                  onClick={() => onJumpToSource(data.demandado.dni)}
                  title="Verificar DNI original"
                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MONTO SOLICITADO */}
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-3 flex justify-between items-center">
           <span className="text-[10px] font-bold text-slate-500 uppercase">Pretensión Económica:</span>
           <span className="text-sm font-mono font-bold text-[#2546b0]">
             S/. {data.monto_solicitado?.toFixed(2) || "0.00"}
           </span>
        </div>

      </div>
    </div>
  );
};