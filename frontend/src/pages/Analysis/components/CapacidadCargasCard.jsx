// Archivo: src/pages/Analysis/components/CapacidadCargasCard.jsx
import React from 'react';
import { Wallet, Users, ArrowRight, BrainCircuit } from 'lucide-react';

export const CapacidadCargasCard = () => {
  return (
    <div className="mb-8">
      {/* Header de la Tarjeta */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Wallet size={14} className="text-slate-400" />
          <Users size={14} className="text-slate-400" />
          Capacidad Económica y Cargas (HU14)
        </h4>
        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide flex items-center gap-1.5">
          <BrainCircuit size={12} className="text-amber-500" />
          Inferencia IA / RAG
        </span>
      </div>

      {/* Contenedor Principal (Grid de 2 Columnas) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* ==========================================
            COLUMNA IZQUIERDA: CAPACIDAD ECONÓMICA
        ========================================== */}
        <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col gap-5 bg-slate-50/20">
          <h5 className="text-[11px] font-bold text-[#1a3059] uppercase tracking-widest mb-1 border-b-2 border-blue-100 pb-1 w-fit">
            Fuentes de Ingresos Inferidas
          </h5>
          
          {/* Item 1 */}
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700">Remuneración Principal</p>
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[9px] font-medium">Validado boleta/RUC</span>
            </div>
            <p className="font-mono text-xs text-slate-800 tracking-tight whitespace-nowrap">S/. 3,850.00</p>
          </div>

          {/* Item 2 */}
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700">Ingresos Variables/Potenciales</p>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[9px] font-medium">Potencialidad RAG</span>
            </div>
            <p className="font-mono text-xs text-slate-600 tracking-tight whitespace-nowrap">S/. 720.00</p>
          </div>

          {/* Resumen Ingresos */}
          <div className="mt-auto pt-5 border-t border-slate-100 flex justify-between items-center bg-white/50 p-3 rounded-lg border border-slate-100/50">
            <span className="text-xs font-medium text-slate-500">Total Ingresos Mensuales:</span>
            <span className="text-lg font-extrabold text-[#1a3059] font-mono tracking-tighter">S/. 4,570.00</span>
          </div>
        </div>

        {/* ==========================================
            COLUMNA DERECHA: CARGAS FAMILIARES
        ========================================== */}
        <div className="p-6 flex flex-col gap-4">
          <h5 className="text-[11px] font-bold text-[#1a3059] uppercase tracking-widest mb-1 border-b-2 border-red-100 pb-1 w-fit">
            Dependientes Legales Identificados
          </h5>
          
          {/* Mini Tabla o Lista */}
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden text-xs">
            
            {/* Item 1 */}
            <div className="flex items-center justify-between p-3.5 hover:bg-slate-50/50">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-700">Hijo Alimentista</span>
                <span className="text-[10px] text-slate-400 font-mono">Exp. N° 00245-2026</span>
              </div>
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold">
                Dependiente Directo
              </span>
            </div>

            {/* Item 2 */}
            <div className="flex items-center justify-between p-3.5 hover:bg-slate-50/50">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-700">Cónyuge (DNI 10...)</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] font-bold">
                  Pensión Activa (HU19)
                </span>
                <span className="font-mono text-[10px] text-slate-500">S/. 500.00</span>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center justify-between p-3.5 hover:bg-slate-50/50">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-700">Madre (Edad 72)</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold">
                  Dependiente Indirecto
                </span>
                <span className="font-mono text-[10px] text-slate-500">S/. 200.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Insight RAG (Opcional, muy útil para el Juez) */}
      <div className="mt-4 bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 flex justify-between items-center shadow-inner">
        <div className="flex items-center gap-3">
          <BrainCircuit size={18} className="text-red-400" />
          <div className="text-[11px] leading-relaxed font-medium">
            <span className="font-bold">Ratio de Disponibilidad: 53.5%</span> 
            <ArrowRight size={12} className="inline mx-1.5" /> 
            Carga Alta. <br/>
            Ratio de disponibilidad del 46.5% de ingresos reales tras cargas legales.
          </div>
        </div>
        <button className="text-xs font-bold text-red-900 hover:underline whitespace-nowrap">
          Ver Detalle
        </button>
      </div>
    </div>
  );
};