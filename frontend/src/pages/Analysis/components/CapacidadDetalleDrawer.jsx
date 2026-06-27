import React from 'react';
import { X, Scale, Calculator, AlertTriangle, Landmark } from 'lucide-react';

export const CapacidadDetalleDrawer = ({ isOpen, onClose, data }) => {
  if (!data) return null;
  const totalIngresos = Number(data.total_ingresos || 0);
  const cargaEspecieReportada = Number(data.carga_especie_reportada ?? data.total_cargas ?? 0);
  const cargaEspecieAplicada = Number(data.carga_especie_aplicada ?? data.total_cargas ?? cargaEspecieReportada);
  const estadoCarga = String(data.carga_especie_estado || "no detectada").toLowerCase();
  const estadoCargaColor =
    estadoCarga === "probada"
      ? "text-green-700 bg-green-100"
      : estadoCarga === "alegada"
      ? "text-amber-700 bg-amber-100"
      : "text-slate-600 bg-slate-100";

  return (
    <div className={`fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <Scale size={20} className="text-blue-400" />
            <h3 className="font-bold text-sm tracking-tight">Análisis de Capacidad Resolutiva</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Sección 1: Base Legal */}
          <section className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <div className="flex gap-3 items-start">
              <Landmark className="text-blue-600 mt-1" size={18} />
              <div>
                <h4 className="text-blue-900 font-bold text-xs uppercase mb-1">Base Legal Aplicada</h4>
                <p className="text-blue-800 text-[11px] leading-relaxed font-medium">
                  Art. 648, inc. 6 del CPC: "Solo se puede embargar hasta el 60% de los ingresos por deudas de alimentos".
                </p>
              </div>
            </div>
          </section>

          {/* Sección 2: Desglose Matemático */}
          <div className="space-y-4">
             <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Calculator size={14} /> Cálculo del Margen de Sentencia
             </h4>
             
             <div className="space-y-3">
                <div className="flex justify-between text-sm">
                   <span className="text-slate-500">Ingresos Totales Brutos</span>
                   <span className="font-bold text-slate-800">S/. {totalIngresos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-slate-500">Límite Legal Máximo (60%)</span>
                   <span className="font-bold text-blue-600">S/. {data.tope_legal_60.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-100 pb-3">
                   <span className="text-slate-500">Carga en Especie (HU14)</span>
                   <div className="text-right">
                     <span className="font-bold text-red-500">- S/. {cargaEspecieAplicada.toFixed(2)}</span>
                     <p className={`mt-1 text-[9px] inline-block px-2 py-0.5 rounded font-bold ${estadoCargaColor}`}>{estadoCarga}</p>
                   </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                   <span className="text-slate-800 font-bold text-xs uppercase">Margen Libre para Sentencia</span>
                   <div className="text-right">
                      <span className="text-xl font-black text-green-600 font-mono">S/. {data.margen_libre.toFixed(2)}</span>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Capacidad Disponible Total</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Sección 3: Sugerencia de la IA */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
             <div className="flex gap-3 mb-3">
                <AlertTriangle className="text-orange-500" size={18} />
                <h4 className="font-bold text-slate-700 text-xs">Recomendación Judicial IA</h4>
             </div>
             <p className="text-slate-600 text-[11px] leading-relaxed italic">
                "Basado en el análisis, el juzgado cuenta con un margen máximo de <strong>S/. {data.margen_libre}</strong> para fijar la pensión sin vulnerar el Artículo 648 del CPC. Se sugiere considerar esta cifra como el tope máximo absoluto para evitar futuras nulidades o apelaciones por exceso de embargo."
             </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
           <button onClick={onClose} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl text-xs hover:bg-slate-700 transition-colors uppercase tracking-widest">
              Entendido
           </button>
        </div>
      </div>
    </div>
  );
};