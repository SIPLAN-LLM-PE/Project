import React, { useState, useEffect } from 'react';
import { X, Library, Sparkles, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';

const textoSeguro = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

const construirContextoJurisprudencia = (analysisData) => {
  if (!analysisData) return "";
  return [
    textoSeguro(analysisData.sintesis_rag?.tecnico || analysisData.resumen_tecnico),
    textoSeguro(analysisData.postura_defensa?.tecnico || analysisData.postura_contestacion?.tecnico || analysisData.postura_contestacion),
    textoSeguro(analysisData.revision_financiera || analysisData.financiera),
    textoSeguro(analysisData.capacidad_cargas || analysisData.capacidad_demandado),
    textoSeguro(analysisData.plazos),
    textoSeguro(analysisData.sujetos_procesales)
  ].filter(Boolean).join("\n\n");
};

export const JurisprudenciaDrawer = ({ isOpen, onClose, textoExpediente, numeroExpediente, analysisData }) => {
  const [casos, setCasos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostico, setDiagnostico] = useState("");
  const [perfilConsulta, setPerfilConsulta] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(0); // El índice 0 estará abierto por defecto

  // Disparar la búsqueda cuando se abre el Drawer
  const contextoBusqueda = (textoExpediente || "").trim() || construirContextoJurisprudencia(analysisData);

  useEffect(() => {
    if (isOpen && (contextoBusqueda || numeroExpediente)) {
      buscarJurisprudencia();
    }
  }, [isOpen, contextoBusqueda, numeroExpediente]);

  const buscarJurisprudencia = async () => {
    setIsLoading(true);
    setCasos([]);
    setDiagnostico("");
    setPerfilConsulta(null);
    setExpandedIndex(0);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/jurisprudencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          texto_expediente: contextoBusqueda,
          numero_expediente: numeroExpediente || ""
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setCasos(data.resultados);
        setPerfilConsulta(data.perfil_consulta || null);
      } else {
        setDiagnostico(data.diagnostico || "No se pudo ejecutar la busqueda semantica.");
      }
    } catch (error) {
      console.error("Error buscando jurisprudencia:", error);
      setDiagnostico("No se pudo conectar con el servicio de jurisprudencia.");
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

          {!isLoading && diagnostico && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 font-semibold mb-5">
              {diagnostico}
            </div>
          )}

          {!isLoading && perfilConsulta && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Perfil consultado</p>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <span className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 font-bold text-slate-700">{perfilConsulta.materia}</span>
                <span className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 font-bold text-slate-700">{perfilConsulta.petitorio}</span>
                <span className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 font-bold text-slate-700 truncate">{perfilConsulta.riesgo}</span>
              </div>
            </div>
          )}

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

                        <div className="mb-4 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-800">
                              {caso.nivel_relevancia || "Referencia"}
                            </span>
                            {caso.score_semantico && (
                              <span className="text-[10px] font-bold text-indigo-700">
                                score {caso.score_semantico}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                            {caso.explicacion_similitud || "Coincidencia semantica calculada con pgvector/RAG."}
                          </p>
                          {caso.factores_similitud?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {caso.factores_similitud.map((factor, factorIndex) => (
                                <span key={factorIndex} className="bg-white border border-indigo-100 text-indigo-700 rounded-md px-2 py-1 text-[10px] font-bold">
                                  {factor}
                                </span>
                              ))}
                            </div>
                          )}
                          {caso.caracter_jurisprudencial && (
                            <p className="text-[10px] text-indigo-700 mt-3 font-semibold">
                              {caso.caracter_jurisprudencial}
                            </p>
                          )}
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

                        {caso.puntos_comparables?.length > 0 && (
                          <div className="mb-5">
                            <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Puntos comparables</h6>
                            <div className="space-y-2">
                              {caso.puntos_comparables.map((punto, puntoIndex) => (
                                <p key={puntoIndex} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[11px] text-slate-600 font-medium leading-relaxed">
                                  {punto}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

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
                        <p className="text-[10px] font-bold text-indigo-600 mt-1">
                          {caso.nivel_relevancia || "Referencia"}
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
