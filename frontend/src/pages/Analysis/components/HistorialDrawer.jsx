import React from 'react';
import { X, History, User, CheckCircle2, RotateCcw } from 'lucide-react';

export const HistorialDrawer = ({ isOpen, onClose, historial }) => {
  // Ahora solo usamos lo que viene por props. Si no hay nada, es un array vacío.
  const datosARenderizar = historial || [];

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
        {/* Header */}
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 text-[#1a3059]">
            <History size={18} className="text-[#2546b0]" />
            <h3 className="font-bold text-sm tracking-wide">Historial de Cambios</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Contenido Dinámico */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-8 mt-2">
            
            {datosARenderizar.length === 0 ? (
              <div className="pl-6 text-slate-400 text-xs italic">
                No se han registrado cambios en este expediente aún.
              </div>
            ) : (
              datosARenderizar.map((item) => (
                <div key={item.id} className="relative pl-6">
                  {/* Punto de la línea de tiempo */}
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${
                    item.isActual ? 'bg-blue-500 shadow-sm' : 'bg-slate-300'
                  }`}></div>
                  
                  {/* Tarjeta */}
                  <div className={`${
                    item.isActual ? 'bg-[#f8fafc] border border-blue-200' : 'bg-white border border-slate-200'
                  } rounded-xl p-4 shadow-sm`}>
                    
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-800">{item.fecha}</h5>
                        <p className="text-xs font-bold text-slate-700 mt-1">{item.titulo}</p>
                      </div>
                      <span className={`${
                        item.isActual ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-400'
                      } px-2 py-0.5 rounded text-[9px] font-bold`}>
                        {item.version}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3 font-medium">
                      <User size={12} /> {item.usuario}
                    </div>

                    <div className={`${
                      item.isActual ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'
                    } border p-2.5 rounded-lg text-xs text-slate-600 mb-3`}>
                      {item.comentario}
                    </div>

                    {item.isActual ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600">
                        <CheckCircle2 size={14} /> Versión Actual
                      </div>
                    ) : (
                      <button className="w-full flex justify-center items-center gap-2 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50 transition-colors">
                        <RotateCcw size={12} /> Restaurar esta versión
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};