// Archivo: src/pages/Analysis/components/ResumenCard.jsx
import React from 'react';
import { Link as LinkIcon } from 'lucide-react';

export const ResumenCard = ({ data }) => {
  return (
    <div className="mb-8">
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Resumen Generado</h4>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h5 className="text-sm font-bold text-slate-800 mb-2">Contexto y Vínculo:</h5>
        <p className="text-xs text-[#2a3f5f] leading-relaxed font-medium">
          {data || "Analizando contenido..."}
        </p>
      </div>
    </div>
  );
};