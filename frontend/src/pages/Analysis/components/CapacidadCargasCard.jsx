import React from 'react';
import { Briefcase, BrainCircuit } from 'lucide-react';

export const CapacidadCargasCard = ({ data, onOpenDetalle }) => {
  // Seguro de renderizado: Esperamos a que la IA devuelva los datos
  if (!data || !data.ingresos) {
    return (
      <div className="mb-8 bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-center text-slate-400 text-[11px]">
        Analizando capacidad económica...
      </div>
    );
  }

  // FUNCIÓN AUXILIAR PARA EVITAR EL ERROR DE TOFIXED
  const safeFormat = (value) => {
    return Number(value || 0).toFixed(2);
  };
  const claseNivel = String(data.carga_nivel || "").toLowerCase();
  const esNivelCritico = claseNivel.includes("alta") || claseNivel.includes("crítica") || claseNivel.includes("critica");

  return (
    <div className="mb-8">
      {/* Header de la Tarjeta */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Briefcase size={14} className="text-slate-400" />
          Capacidad Económica y Cargas (HU14)
        </h4>
        <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide flex items-center gap-1">
          <BrainCircuit size={10} /> Inferencia IA / RAG
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* COLUMNA IZQUIERDA: FUENTES DE INGRESOS */}
          <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100">
            <h5 className="text-[10px] font-bold text-[#1a3059] uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Fuentes de Ingresos Inferidas
            </h5>
            
            <div className="space-y-4 mb-6">
              {data.ingresos.length > 0 ? (
                data.ingresos.map((ingreso, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{ingreso.tipo}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                        ingreso.aplicado_calculo ? 'bg-emerald-100 text-emerald-700' : ingreso.estado?.includes('Validado') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ingreso.estado || "Detectado"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 font-mono">
                      {/* FIX 1: Uso de safeFormat */}
                      S/. {safeFormat(ingreso.monto)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No se detectaron ingresos fijos o variables en el expediente.</p>
              )}
            </div>

            {/* Totalizador de Ingresos */}
            <div className="bg-slate-50 rounded-lg p-4 flex justify-between items-center border border-slate-100">
              <p className="text-xs font-medium text-slate-500 max-w-[100px]">Ingreso Base Mensual:</p>
              <p className="text-lg font-bold text-[#1a3059] font-mono">
                {/* FIX 2: Uso de safeFormat */}
                S/. {safeFormat(data.total_ingresos)}
              </p>
            </div>
          </div>

          {/* COLUMNA DERECHA: DEPENDIENTES LEGALES */}
          <div className="p-6">
            <h5 className="text-[10px] font-bold text-[#1a3059] uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Dependientes Legales Identificados
            </h5>
            
            <div className="space-y-3">
              {data.dependientes.length > 0 ? (
                data.dependientes.map((dep, index) => (
                  <div key={index} className="border border-slate-100 rounded-lg p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{dep.tipo}</p>
                      {dep.monto_carga > 0 ? (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded inline-block mt-1">
                          {dep.detalle}
                        </span>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-0.5">{dep.detalle}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {dep.monto_carga > 0 ? (
                        <p className="text-xs font-bold text-slate-600 font-mono">
                          {/* FIX 3: Uso de safeFormat */}
                          S/. {safeFormat(dep.monto_carga)}
                        </p>
                      ) : (
                        <span className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Dependiente Directo</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No se mencionan dependientes legales adicionales al alimentista principal.</p>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER: Ratio de Disponibilidad */}
        <div className={`p-4 border-t flex justify-between items-center ${
          esNivelCritico ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex gap-3">
            <BrainCircuit className={esNivelCritico ? 'text-red-400' : 'text-slate-400'} size={20} />
            <div>
              <p className={`text-xs font-bold ${esNivelCritico ? 'text-red-700' : 'text-slate-700'}`}>
                Ratio de Disponibilidad: {data.ratio_disponibilidad || 0}% <span className="opacity-70">→ {data.carga_nivel}.</span>
              </p>
              <p className={`text-[10px] ${esNivelCritico ? 'text-red-600' : 'text-slate-500'}`}>
                {data.mensaje}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onOpenDetalle}
            className={`text-xs font-bold transition-colors hover:underline ${
              esNivelCritico ? 'text-red-700 hover:text-red-800' : 'text-indigo-600 hover:text-indigo-800'
            }`}
          >
            Ver Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
