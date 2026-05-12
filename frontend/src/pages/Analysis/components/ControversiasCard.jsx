import React from 'react';
import { Hammer, Trash2, Pencil, CheckCircle2 } from 'lucide-react';

export const ControversiasCard = () => {
  return (
    <div className="mb-8">
      {/* Header de la Tarjeta */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Hammer size={14} className="text-slate-400" />
          Puntos Controvertidos
        </h4>
        <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide">
          IA Sugiere
        </span>
      </div>

      {/* Contenedor de Sugerencias */}
      <div className="flex flex-col gap-4">
        
        {/* Sugerencia 1 */}
        <div className="bg-white rounded-xl border border-purple-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h5 className="text-[10px] font-bold text-purple-700 mb-2 tracking-widest">SUGERENCIA 1</h5>
          <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
            Determinar la real capacidad económica del demandado, considerando que la demandante alega ingresos por S/. 3,500.00, mientras el demandado refiere percibir ingresos variables con un base de S/. 1,850.00.
          </p>
          <div className="flex justify-end items-center gap-4 border-t border-slate-50 pt-3 mt-1">
            <button className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-medium transition-colors">
              <Trash2 size={12} /> Descartar
            </button>
            <button className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-medium transition-colors">
              <Pencil size={12} /> Editar
            </button>
            <button className="flex items-center gap-1.5 text-[10px] bg-[#dcfce7] text-green-700 font-bold px-3 py-1.5 rounded hover:bg-green-300 transition-colors">
              <CheckCircle2 size={12} /> Aceptar
            </button>
          </div>
        </div>

        {/* Sugerencia 2 */}
        <div className="bg-white rounded-xl border border-purple-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h5 className="text-[10px] font-bold text-purple-700 mb-2 tracking-widest">SUGERENCIA 2</h5>
          <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
            Establecer las necesidades reales del menor alimentista, valorando la prueba documental sobre gastos médicos recurrentes presentados en el Anexo 1-C.
          </p>
          <div className="flex justify-end items-center gap-4 border-t border-slate-50 pt-3 mt-1">
            <button className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-medium transition-colors">
              <Trash2 size={12} /> Descartar
            </button>
            <button className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-medium transition-colors">
              <Pencil size={12} /> Editar
            </button>
            <button className="flex items-center gap-1.5 text-[10px] bg-[#dcfce7] text-green-700 font-bold px-3 py-1.5 rounded hover:bg-green-300 transition-colors">
              <CheckCircle2 size={12} /> Aceptar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};