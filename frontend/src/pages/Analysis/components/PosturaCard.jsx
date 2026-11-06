import React from 'react';
import { Gavel, Clock, MessageSquareText, Scale, Sparkles, AlertCircle } from 'lucide-react';

export const PosturaCard = ({ data, isSimpleTone }) => {
  // 1. Manejo de seguridad (Carga)
  if (!data) {
    return (
      <div className="mb-8 bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-center text-slate-400 text-[11px]">
        <Clock size={14} className="mr-2 animate-spin" /> Analizando postura procesal...
      </div>
    );
  }

  // 2. Extracción de contenido según el tono
  let contenido = "";
  if (typeof data === 'object' && data !== null) {
    contenido = isSimpleTone ? (data.estandar || "") : (data.tecnico || "");
  } else {
    contenido = String(data);
  }

  // CP045: una mención de pendiente no oculta una síntesis suficientemente desarrollada.
  const textoNormalizado = contenido.replace(/\s+/g, " ").trim();
  const sinAbsolucion = data?.contestacion_detectada === false || data?.estado === "sin_absolucion";
  const mostrarComoPendiente = sinAbsolucion || textoNormalizado.length < 150;

  return (
    <div className="mb-8 transition-all duration-500">
      
      {/* HEADER DINÁMICO */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          {!isSimpleTone ? <Scale size={14} className="text-indigo-600" /> : <Gavel size={14} className="text-emerald-600" />}
          Postura de la Contestación
        </h4>
        
        {!mostrarComoPendiente && (
          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide flex items-center gap-1 transition-all ${
            !isSimpleTone ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <Sparkles size={10} /> {!isSimpleTone ? 'Análisis Técnico-Legal' : 'Lenguaje Ciudadano'}
          </span>
        )}
      </div>
      
      {/* CONTENEDOR PRINCIPAL - Usamos un ternario estricto para evitar duplicidad */}
      <div className={`bg-white p-5 rounded-xl border transition-all duration-500 shadow-sm ${
        mostrarComoPendiente 
          ? 'border-slate-200 bg-white' 
          : (!isSimpleTone ? 'border-indigo-200 ring-1 ring-indigo-50 bg-indigo-50/5' : 'border-emerald-200 ring-1 ring-emerald-50 bg-emerald-50/5')
      }`}>
        
        {mostrarComoPendiente ? (
          /* ==========================================
             ESTADO A: SIN CONTESTACIÓN (Alerta Ámbar)
             ========================================== */
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-amber-800 mb-1">{sinAbsolucion ? "Estado: Sin absolución detectada" : "Estado: Análisis en espera"}</h5>
              <p className="text-[11px] text-amber-700/80 font-medium leading-relaxed">
                {sinAbsolucion ? "No se identificó el escrito de contestación en los documentos analizados. El sistema se mantiene a la espera de la pieza procesal de defensa." : "No hay una síntesis de postura suficientemente desarrollada para mostrar el análisis (mínimo 150 caracteres). Revise la disponibilidad del escrito de contestación o genere nuevamente el análisis."}
              </p>
            </div>
          </div>
        ) : (
          /* ==========================================
             ESTADO B: CON CONTESTACIÓN (Análisis RAG)
             ========================================== */
          <>
            <div className="flex gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 transition-colors ${
                !isSimpleTone ? 'bg-indigo-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
              }`}>
                <MessageSquareText size={12} />
                SÍNTESIS RAG
              </span>
            </div>
            
            <p className={`text-xs leading-relaxed font-medium text-justify transition-colors duration-500 ${
              !isSimpleTone ? 'text-slate-800' : 'text-slate-700'
            }`}>
              {/* Conservamos la síntesis completa sin eliminar menciones procesales. */}
              {contenido.trim()}
            </p>

            {!isSimpleTone && (
              <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center gap-2 text-[9px] text-indigo-400 font-bold uppercase tracking-tighter">
                <AlertCircle size={12} />
                Análisis generado por módulo SIPLAN-MISTRAL-7B
              </div>
            )}
          </>
        )}
      </div>
      
    </div>
  );
};