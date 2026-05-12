import React from 'react';
import { 
  Calculator, 
  AlertTriangle, 
  Receipt, 
  Wallet, 
  CheckCircle2,
  Info
} from 'lucide-react';

export const FinancieraCard = ({ data }) => {
  // 1. GESTIÓN DE ERRORES: Si no hay data, no rompemos el renderizado
  if (!data) return null;

  // 2. NORMALIZACIÓN DE DATOS: Aseguramos que todo sea tratable (números y arreglos)
  const petitorio = Number(data.petitorio || 0);
  const sumaGastos = Number(data.suma_gastos_sustentados || 0);
  const brecha = Number(data.brecha_valor || 0);
  const porcentaje = Number(data.porcentaje_brecha || 0);
  const detalles = Array.isArray(data.detalles_gastos) ? data.detalles_gastos : [];
  const ingresos = Array.isArray(data.ingresos) ? data.ingresos : [];
  const alerta = data.alerta ?? (porcentaje > 10);

  return (
    <div className="mb-8">
      {/* Título de la sección */}
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Calculator size={14} className="text-slate-400" />
        Auditoría de Coherencia Procesal (HU18)
      </h4>

      {/* Contenedor Principal */}
      <div className={`rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${
        alerta ? 'border-amber-200 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/40'
      }`}>
        
        {/* Header: Visualización de la Brecha (B) */}
        <div className="p-5 border-b border-white/60 bg-white/20">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 tracking-tight">
                Brecha de Sustento (B = Pa - Σ Gn)
              </span>
              <h5 className={`text-2xl font-mono font-bold ${alerta ? 'text-amber-600' : 'text-emerald-600'}`}>
                S/. {brecha.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h5>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm ${
                alerta ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {porcentaje.toFixed(1)}% SIN SUSTENTO
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Fila 1: Comparativa Pa vs Σ Gn */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Petitorio (Pa)</span>
              <p className="text-sm font-bold text-slate-700">S/. {petitorio.toFixed(2)}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Gastos Probados (Σ Gn)</span>
              <p className="text-sm font-bold text-emerald-600">S/. {sumaGastos.toFixed(2)}</p>
            </div>
          </div>

          {/* Sección: Desglose Semántico de Gastos */}
          <div>
            <h6 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5 px-1">
              <Receipt size={12} className="text-slate-400" /> 
              Desglose de Gastos Acreditados
            </h6>
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-50 overflow-hidden shadow-sm">
              {detalles.length > 0 ? (
                detalles.map((g, i) => (
                  <div key={i} className="px-3 py-2.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-[10px] text-slate-600 font-semibold capitalize">{g.concepto || "Gasto identificado"}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      S/. {Number(g.monto || 0).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 italic">No se hallaron menciones explícitas de gastos individuales en el texto.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sección: Capacidad Económica (Ingresos) */}
          {ingresos.length > 0 && (
            <div className="pt-1">
              <h6 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5 px-1">
                <Wallet size={12} className="text-slate-400" /> 
                Información de Capacidad (Ingresos)
              </h6>
              <div className="flex flex-wrap gap-2">
                {ingresos.map((ing, i) => (
                  <div key={i} className="bg-blue-50/50 px-3 py-1.5 rounded-lg text-[9px] font-bold text-blue-700 border border-blue-100 flex items-center gap-2">
                    <span className="opacity-70 uppercase">{ing.fuente || 'Ingreso'}:</span>
                    <span className="font-mono">S/. {Number(ing.monto || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerta de Conclusión Técnica */}
          <div className={`p-3 rounded-lg flex gap-3 items-start border ${
            alerta ? 'bg-amber-100/50 border-amber-200' : 'bg-emerald-100/50 border-emerald-200'
          }`}>
            {alerta ? (
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            )}
            <div className="space-y-1">
              <p className="text-[10px] leading-tight font-bold text-slate-800">
                Observación de Auditoría:
              </p>
              <p className="text-[10px] leading-tight text-slate-600 font-medium italic">
                {alerta 
                  ? "La pretensión excede los medios probatorios. Se sugiere requerir mayor sustento documental para validar el petitorio."
                  : "Existe una correlación técnica aceptable entre los gastos probados y el monto solicitado."}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};