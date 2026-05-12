import React from 'react';
import { Baby } from 'lucide-react';

export const NecesidadesCard = () => {
  return (
    <div className="mb-8">
      {/* Header de la Tarjeta */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Baby size={14} className="text-slate-400" />
          Necesidades del Alimentista (HU12)
        </h4>
        <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide">
          Análisis OCR Anexos
        </span>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            {/* Cabecera de la Tabla */}
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[11px] border-b border-slate-100">
                <th className="px-6 py-3 font-medium">Categoría</th>
                <th className="px-6 py-3 font-medium">Monto Acreditado</th>
                <th className="px-6 py-3 font-medium">Observaciones</th>
              </tr>
            </thead>
            
            {/* Cuerpo de la Tabla */}
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-3.5 font-bold text-slate-700">Alimentación</td>
                <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px] tracking-tight">S/. 450.00</td>
                <td className="px-6 py-3.5 text-slate-500 text-[11px]">Boletas de mercado</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-3.5 font-bold text-slate-700">Salud</td>
                <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px] tracking-tight">S/. 170.50</td>
                <td className="px-6 py-3.5 text-slate-500 text-[11px]">Recibos farmacia</td>
              </tr>
            </tbody>

            {/* Pie de la Tabla (Total) */}
            <tfoot className="bg-slate-50/30 border-t border-slate-100">
              <tr>
                <td className="px-6 py-3.5 font-bold text-slate-800 text-right text-xs">Total Acreditado:</td>
                <td className="px-6 py-3.5 font-bold text-slate-800 font-mono text-[11px] tracking-tight">S/. 620.50</td>
                <td className="px-6 py-3.5"></td> {/* Celda vacía para mantener la estructura */}
              </tr>
            </tfoot>

          </table>
        </div>
      </div>
    </div>
  );
};