import React from 'react';
import { FileCheck, CheckCircle2, XCircle, ClipboardCheck, ExternalLink, Download } from 'lucide-react';

export const AdmisibilidadCard = ({ data, onJumpToSource, onExportPdf }) => {
  if (!data) return null;
  const SourceButton = ({ value, label }) => {
    if (!value || !onJumpToSource) return null;
    return (
      <button
        type="button"
        onClick={() => onJumpToSource(value, { label })}
        title="Ver fuente en PDF"
        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
      >
        <ExternalLink size={12} />
      </button>
    );
  };

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <ClipboardCheck size={14} className="text-slate-400" />
          Anexos y Admisibilidad
        </h4>
        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Download size={12} />
            PDF
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            La IA ha verificado la mención de los siguientes anexos obligatorios según el Art. 424 y 425 del CPC:
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {data.map((item, index) => (
            <div key={index} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileCheck size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-700">{item.anexo}</span>
                {item.estado === "encontrado" && (
                  <SourceButton value={item.anexo} label={`Anexo: ${item.anexo}`} />
                )}
              </div>
              
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold ${
                item.estado === "encontrado" 
                  ? 'text-emerald-700 bg-emerald-50' 
                  : 'text-amber-700 bg-amber-50'
              }`}>
                {item.estado === "encontrado" ? (
                  <>
                    <CheckCircle2 size={12} />
                    CONFORME
                  </>
                ) : (
                  <>
                    <XCircle size={12} />
                    FALTA
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer de decisión sugerida */}
        <div className="p-4 bg-emerald-50/30">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 size={14} />
            <span className="text-[11px] font-bold">Sugerencia IA: ADMISIBLE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
