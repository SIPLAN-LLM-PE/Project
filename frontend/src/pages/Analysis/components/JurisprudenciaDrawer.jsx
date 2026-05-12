import React from 'react';
import { X, Library, Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';

export const JurisprudenciaDrawer = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Overlay oscuro de fondo (opcional, para enfocar el panel) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel Deslizable */}
      <div 
        className={`fixed top-0 right-0 h-screen w-full max-w-[450px] bg-[#f8fafc] shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header del Panel */}
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 text-[#1a3059]">
            <Library size={18} className="text-[#2546b0]" />
            <h3 className="font-bold text-sm tracking-wide">Búsqueda Semántica de Jurisprudencia</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          
          {/* Alerta de Contexto */}
          <div className="bg-[#eff6ff] border border-blue-100 p-4 rounded-xl flex gap-3 mb-6 shadow-sm">
            <Sparkles size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 font-medium leading-relaxed">
              Se han encontrado 3 resoluciones similares en la Corte del Callao basándose en los hechos y la materia de este expediente.
            </p>
          </div>

          {/* Tarjeta Principal (Expandida) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            
            {/* Header Oscuro */}
            <div className="bg-[#1e293b] px-4 py-3 flex justify-between items-center">
              <span className="text-white font-bold text-xs tracking-wide">EXP. 00089-2025-0-0701-JP-FC-02</span>
              <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                Similitud: 88%
              </span>
            </div>

            <div className="p-5">
              {/* Sub-header */}
              <div className="flex justify-between items-center text-[11px] text-slate-500 mb-5 font-medium">
                <span>2° Juzgado de Paz Letrado - Callao</span>
                <span>15/11/2025</span>
              </div>

              {/* Hechos */}
              <div className="mb-4">
                <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hechos Comparados</h6>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-700 leading-relaxed font-medium">
                  Demanda de alimentos para un menor. Demandado con ingresos variables por comisiones (S/. 1,800 a S/. 2,200).
                </div>
              </div>

              {/* Decisión */}
              <div className="mb-4">
                <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Decisión Adoptada</h6>
                <div className="bg-[#ecfdf5] border border-green-200 p-3 rounded-lg text-xs text-green-800 leading-relaxed font-bold shadow-sm">
                  Se fijó una pensión equivalente al 25% de los ingresos brutos del demandado.
                </div>
              </div>

              {/* Fundamento */}
              <div className="mb-5">
                <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fundamento Jurídico Principal</h6>
                <div className="border-l-2 border-indigo-400 pl-3 py-1">
                  <p className="text-xs text-slate-600 italic leading-relaxed font-medium">
                    Principio de Proporcionalidad. Ante ingresos variables, se prefiere un porcentaje sobre un monto fijo para asegurar la pensión.
                  </p>
                </div>
              </div>

              <div className="w-full border-t border-slate-100 mb-4"></div>

              {/* Footer de Tarjeta */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <AlertTriangle size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-wide">Carácter Referencial</span>
                </div>
                <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                  Ver Resolución Completa <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Tarjeta Secundaria (Colapsada) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex justify-between items-center group">
            <div>
              <h5 className="text-xs font-bold text-slate-800 mb-1">EXP. 00412-2024-0-0701-JP-FC-01</h5>
              <p className="text-[10px] font-medium text-slate-500">Materia: Alimentos | Similitud: 75%</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </div>

        </div>
      </div>
    </>
  );
};