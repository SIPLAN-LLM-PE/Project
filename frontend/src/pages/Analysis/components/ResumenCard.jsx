import React from 'react';
import { FileText, Sparkles, Scale } from 'lucide-react';

export const ResumenCard = ({ data, isSimpleTone }) => {
  if (!data) {
    return (
      <div className="mb-8 bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-center text-slate-400 text-[11px]">
        Generando síntesis del expediente...
      </div>
    );
  }

  // EXTRACCIÓN INVERTIDA: Técnico por defecto, Estándar si el switch está activo
  let contenido = "";
  if (typeof data === 'object' && data !== null) {
    contenido = isSimpleTone ? data.estandar : data.tecnico;
  } else {
    contenido = data;
  }

  if (typeof contenido === 'object') {
    contenido = contenido?.tecnico || "Error de formato.";
  }

  return (
    <div className="mb-8 relative transition-all duration-300">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          {/* Técnico es el icono Scale azul, Ciudadano es FileText verde */}
          {!isSimpleTone ? <Scale size={14} className="text-indigo-600" /> : <FileText size={14} className="text-emerald-600" />}
          Síntesis del Expediente
        </h4>
        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide flex items-center gap-1 transition-all ${
          !isSimpleTone ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          <Sparkles size={10} /> {!isSimpleTone ? 'Análisis Técnico-Legal' : 'Lenguaje Ciudadano'}
        </span>
      </div>

      <div className={`bg-white rounded-xl border p-5 shadow-sm transition-all duration-500 ${
        !isSimpleTone ? 'border-indigo-200 ring-1 ring-indigo-50 bg-indigo-50/5' : 'border-emerald-200 ring-1 ring-emerald-50 bg-emerald-50/5'
      }`}>
        <p className={`text-xs leading-relaxed transition-colors duration-500 ${
          !isSimpleTone ? 'text-slate-800 font-medium' : 'text-slate-700'
        }`}>
          {String(contenido)}
        </p>
      </div>
    </div>
  );
};