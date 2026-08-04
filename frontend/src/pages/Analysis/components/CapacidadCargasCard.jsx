import React from 'react';
import { Briefcase, BrainCircuit, ExternalLink, HeartPulse, Users } from 'lucide-react';

export const CapacidadCargasCard = ({ data, onOpenDetalle, onJumpToSource }) => {
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
  const contextoSocial = data.contexto_social || {};
  const empleador = contextoSocial.empleador || {};
  const condicionesFamiliares = Array.isArray(contextoSocial.condiciones_familiares) ? contextoSocial.condiciones_familiares : [];
  const vulnerabilidades = Array.isArray(contextoSocial.vulnerabilidades) ? contextoSocial.vulnerabilidades : [];
  const tieneEmpleador = empleador.nombre && empleador.nombre !== "No detectado";
  const tieneContextoSocial = tieneEmpleador || condicionesFamiliares.length > 0 || vulnerabilidades.length > 0;
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
                    <p className="text-xs font-bold text-slate-600 font-mono flex items-center gap-1">
                      {/* FIX 1: Uso de safeFormat */}
                      S/. {safeFormat(ingreso.monto)}
                      <SourceButton value={ingreso.detalle || ingreso.fuente || `S/. ${safeFormat(ingreso.monto)}`} label={`Ingreso: ${ingreso.tipo || "detectado"}`} />
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
            <h5 className="text-[10px] font-bold text-[#1a3059] uppercase tracking-widest mb-1 border-b border-slate-100 pb-2">
              Dependientes Legales Identificados
            </h5>
            <p className="text-[9px] text-slate-400 italic mb-4">
              Otras cargas del demandado distintas al alimentista de este expediente (su pensión ya se calcula en Petitorio / Pensión Ordenada).
            </p>

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
                        <p className="text-xs font-bold text-slate-600 font-mono flex items-center gap-1">
                          {/* FIX 3: Uso de safeFormat */}
                          S/. {safeFormat(dep.monto_carga)}
                          <SourceButton value={dep.detalle || `S/. ${safeFormat(dep.monto_carga)}`} label={`Carga: ${dep.tipo || "dependiente"}`} />
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

        {tieneContextoSocial && (
          <div className="border-t border-slate-100 p-4 bg-white">
            <h5 className="text-[10px] font-bold text-[#1a3059] uppercase tracking-widest mb-3 flex items-center gap-2">
              <HeartPulse size={13} className="text-rose-400" />
              Contexto social y familiar
            </h5>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Empleador</p>
                <div className="flex items-start gap-1">
                  <p className="font-bold text-slate-700 break-words flex-1">{tieneEmpleador ? empleador.nombre : "No detectado"}</p>
                  {tieneEmpleador && <SourceButton value={empleador.evidencia || empleador.nombre} label="Empleador" />}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                  <Users size={11} /> Condiciones familiares
                </p>
                {condicionesFamiliares.length > 0 ? (
                  <div className="space-y-2">
                    {condicionesFamiliares.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-start gap-1">
                        <p className="text-slate-600 leading-relaxed flex-1">
                          <span className="font-bold">{item.tipo}:</span> {item.detalle}
                        </p>
                        <SourceButton value={item.evidencia || item.detalle} label={`Condicion familiar: ${item.tipo}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No detectadas</p>
                )}
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Vulnerabilidad</p>
                {vulnerabilidades.length > 0 ? (
                  <div className="space-y-2">
                    {vulnerabilidades.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-start gap-1">
                        <p className="text-slate-600 leading-relaxed flex-1">
                          <span className="font-bold">{item.tipo}:</span> {item.detalle}
                        </p>
                        <SourceButton value={item.evidencia || item.detalle} label={`Vulnerabilidad: ${item.tipo}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No detectada</p>
                )}
              </div>
            </div>
          </div>
        )}

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
