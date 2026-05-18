import React, { useState, useEffect } from 'react';
import { X, Library, Sparkles, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';

export const JurisprudenciaDrawer = ({ isOpen, onClose, textoExpediente }) => {
  const [casos, setCasos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0); // El índice 0 estará abierto por defecto

  // Disparar la búsqueda cuando se abre el Drawer
  useEffect(() => {
    if (isOpen && textoExpediente) {
      buscarJurisprudencia();
    }
  }, [isOpen, textoExpediente]);

  const buscarJurisprudencia = async () => {
    setIsLoading(true);
    setCasos([]);
    setExpandedIndex(0);
    try {
      const res = await fetch('http://localhost:8000/api/v1/jurisprudencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto_expediente: textoExpediente })
      });
      const data = await res.json();
      if (data.status === "success") {
        setCasos(data.resultados);
      }
    } catch (error) {
      console.error("Error buscando jurisprudencia:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Overlay oscuro de fondo */}
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
          
          {/* Alerta de Contexto Dinámica */}
          <div className="bg-[#eff6ff] border border-blue-100 p-4 rounded-xl flex gap-3 mb-6 shadow-sm">
            <Sparkles size={18} className="text-blue-500 shrink-0 mt-0.5 animate-pulse" />
            <p className="text-xs text-blue-800 font-medium leading-relaxed">
              {isLoading 
                ? "Buscando resoluciones similares en la base de datos basándose en los hechos..."
                : `Se han encontrado ${casos.length} resoluciones similares en la Corte del Callao basándose en los hechos y la materia de este expediente.`}
            </p>
          </div>

          {/* Estado de Carga */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 opacity-70">
              <Loader2 size={36} className="text-indigo-500 animate-spin mb-4" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Analizando Contexto</p>
            </div>
          )}

          {/* Lista de Casos Resultantes */}
          {!isLoading && casos.length > 0 && (
            <div className="flex flex-col gap-4">
              {casos.map((caso, index) => {
                const isExpanded = index === expandedIndex;

                if (isExpanded) {
                  // TARJETA EXPANDIDA (Tu diseño principal)
                  return (
                    <div key={index} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                      <div className="bg-[#1e293b] px-4 py-3 flex justify-between items-center cursor-pointer" onClick={() => setExpandedIndex(-1)}>
                        <span className="text-white font-bold text-xs tracking-wide">{caso.expediente}</span>
                        <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                          Similitud: {caso.similitud}
                        </span>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-center text-[11px] text-slate-500 mb-5 font-medium">
                          <span>{caso.juzgado}</span>
                          <span>{caso.fecha}</span>
                        </div>

                        <div className="mb-4">
                          <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hechos Comparados</h6>
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-700 leading-relaxed font-medium">
                            {caso.hechos}
                          </div>
                        </div>

                        <div className="mb-4">
                          <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Decisión Adoptada</h6>
                          <div className="bg-[#ecfdf5] border border-green-200 p-3 rounded-lg text-xs text-green-800 leading-relaxed font-bold shadow-sm">
                            {caso.decision}
                          </div>
                        </div>

                        <div className="mb-5">
                          <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fundamento Jurídico Principal</h6>
                          <div className="border-l-2 border-indigo-400 pl-3 py-1">
                            <p className="text-xs text-slate-600 italic leading-relaxed font-medium">
                              {caso.fundamento}
                            </p>
                          </div>
                        </div>

                        <div className="w-full border-t border-slate-100 mb-4"></div>

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
                  );
                } else {
                  // TARJETA COLAPSADA (Tu diseño secundario)
                  return (
                    <div 
                      key={index} 
                      onClick={() => setExpandedIndex(index)}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-between items-center group animate-in fade-in"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 mb-1">{caso.expediente}</h5>
                        <p className="text-[10px] font-medium text-slate-500">
                          Materia: Alimentos | Similitud: {caso.similitud}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  );
                }
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
};