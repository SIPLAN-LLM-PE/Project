import React from 'react';
import { X, History, User, CheckCircle2, RotateCcw } from 'lucide-react';

export const HistorialDrawer = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Overlay oscuro */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel Deslizable */}
      <div 
        className={`fixed top-0 right-0 h-screen w-full max-w-[400px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header del Panel */}
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 text-[#1a3059]">
            <History size={18} className="text-[#2546b0]" />
            <h3 className="font-bold text-sm tracking-wide">Historial de Cambios</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido Scrolleable (Línea de Tiempo) */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-8 mt-2">
            
            {/* ==========================================
                VERSIÓN 3 (ACTUAL - EDICIÓN MANUAL)
            ========================================== */}
            <div className="relative pl-6">
              {/* Punto de la línea de tiempo (Activo) */}
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
              
              {/* Tarjeta V3 */}
              <div className="bg-[#f8fafc] border border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800">06/05/2026 11:30 AM</h5>
                    <p className="text-xs font-bold text-slate-700 mt-1">Edición Manual</p>
                  </div>
                  <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold">v3</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3 font-medium">
                  <User size={12} /> m.gomez (Sec)
                </div>

                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-xs text-slate-600 mb-3">
                  Actualizó domicilio demandado
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600">
                  <CheckCircle2 size={14} /> Versión Actual
                </div>
              </div>
            </div>

            {/* ==========================================
                VERSIÓN 2 (SISTEMA IA - RAG)
            ========================================== */}
            <div className="relative pl-6">
              {/* Punto de la línea de tiempo (Inactivo) */}
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"></div>
              
              {/* Tarjeta V2 */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800">06/05/2026 10:15 AM</h5>
                    <p className="text-xs font-bold text-slate-700 mt-1">Generación Inicial RAG</p>
                  </div>
                  <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold">v2</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3 font-medium">
                  <User size={12} /> Sistema (IA)
                </div>

                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs text-slate-600 mb-3">
                  Extracción completada
                </div>

                <button className="w-full flex justify-center items-center gap-2 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50 transition-colors">
                  <RotateCcw size={12} /> Restaurar esta versión
                </button>
              </div>
            </div>

            {/* ==========================================
                VERSIÓN 1 (CARGA INICIAL)
            ========================================== */}
            <div className="relative pl-6">
              {/* Punto de la línea de tiempo (Inactivo) */}
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"></div>
              
              {/* Tarjeta V1 */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-800">06/05/2026 10:12 AM</h5>
                    <p className="text-xs font-bold text-slate-700 mt-1">Carga de Documento</p>
                  </div>
                  <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold">v1</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3 font-medium">
                  <User size={12} /> j.perez (Mesa Partes)
                </div>

                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs text-slate-600 mb-3">
                  Ingreso al sistema
                </div>

                <button className="w-full flex justify-center items-center gap-2 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50 transition-colors">
                  <RotateCcw size={12} /> Restaurar esta versión
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};