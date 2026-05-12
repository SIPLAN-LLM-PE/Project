import React from 'react';
import { Gavel, Clock, MessageSquareText } from 'lucide-react';

export const PosturaCard = ({ data }) => {
  // Verificamos si la IA detectó que aún no hay contestación
  const isPendiente = data && data.toLowerCase().includes("pendiente de contestación");

  return (
    <div className="mb-8">
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Gavel size={14} className="text-slate-400" />
        Postura de la Contestación
      </h4>
      
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        {isPendiente ? (
          /* ==========================================
             ESTADO: SIN CONTESTACIÓN
          ========================================== */
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-amber-800 mb-1">Pendiente de Contestación</h5>
              <p className="text-[11px] text-amber-700/80 font-medium leading-relaxed">
                El motor RAG determinó que este expediente corresponde únicamente a la demanda inicial. El demandado aún no ha presentado su escrito de absolución.
              </p>
            </div>
          </div>
        ) : (
          /* ==========================================
             ESTADO: CON CONTESTACIÓN (Análisis Mistral)
          ========================================== */
          <>
            <div className="flex gap-2 mb-4">
              <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                <MessageSquareText size={12} />
                Síntesis RAG
              </span>
            </div>
            <p className="text-xs text-[#2a3f5f] leading-relaxed font-medium text-justify">
              {data || "Analizando argumentos de la contestación..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
};