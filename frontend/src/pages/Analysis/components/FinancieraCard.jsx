import React from 'react';
import {
  Calculator,
  AlertTriangle,
  Receipt,
  Wallet,
  CheckCircle2,
  Info,
  FileCheck,
  ExternalLink
} from 'lucide-react';

export const FinancieraCard = ({ data, calculadora, onJumpToSource }) => {
  // 1. GESTIÓN DE ERRORES: Si no hay data, no rompemos el renderizado
  if (!data) return null;

  // 2. NORMALIZACIÓN DE DATOS: Aseguramos que todo sea tratable (números y arreglos)
  const petitorio = Number(data.petitorio || 0);
  const sumaGastos = Number(data.suma_gastos_sustentados || 0);
  const brecha = Number(data.brecha_valor || 0);
  const porcentaje = Number(data.porcentaje_brecha || 0);
  const detalles = Array.isArray(data.detalles_gastos) ? data.detalles_gastos : [];
  const ingresos = Array.isArray(data.ingresos) ? data.ingresos : [];
  const mediosProbatoriosSinMonto = Array.isArray(data.medios_probatorios_sin_monto) ? data.medios_probatorios_sin_monto : [];
  const alerta = data.alerta ?? (porcentaje > 10);
  const trazabilidad = data.trazabilidad_financiera || {};
  const petitorioTrace = trazabilidad.petitorio || {};
  const controles = Array.isArray(trazabilidad.controles) ? trazabilidad.controles : [];
  const montosDetectados = Array.isArray(trazabilidad.montos_detectados) ? trazabilidad.montos_detectados : [];
  const sinGastosMonetizadosPeroConPruebas = sumaGastos === 0 && mediosProbatoriosSinMonto.length > 0;
  const calc = calculadora || data.calculadora_economica || {};
  const SourceButton = ({ value, label = "Evidencia financiera" }) => {
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
                Brecha sin Sustento (B = max(0, PA - ΣGN))
              </span>
              <h5 className={`text-2xl font-mono font-bold ${alerta ? 'text-amber-600' : 'text-emerald-600'}`}>
                S/. {brecha.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h5>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm ${
                alerta ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {sinGastosMonetizadosPeroConPruebas ? "SIN GASTOS MONETIZADOS" : `${porcentaje.toFixed(1)}% SIN SUSTENTO`}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Fila 1: Comparativa Pa vs Σ Gn */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Petitorio (Pa)</span>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-700">S/. {petitorio.toFixed(2)}</p>
                <SourceButton value={petitorioTrace.evidencia || `S/. ${petitorio.toFixed(2)}`} label="Petitorio" />
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Gastos Probados (Σ Gn)</span>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-emerald-600">S/. {sumaGastos.toFixed(2)}</p>
                <SourceButton value={`S/. ${sumaGastos.toFixed(2)}`} label="Gastos probados" />
              </div>
            </div>
          </div>

          {Number(calc.monto_estimado_referencial || 0) > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[9px] font-bold text-blue-500 uppercase block mb-1">
                    Calculadora economica referencial
                  </span>
                  <p className="text-lg font-black text-blue-800 font-mono">
                    S/. {Number(calc.monto_estimado_referencial || 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-blue-700 font-semibold mt-1">
                    {calc.mensaje}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="bg-white border border-blue-100 rounded-md px-2 py-1 text-[10px] font-bold text-blue-700">
                    {Number(calc.porcentaje_sobre_ingreso || 0).toFixed(1)}% ingreso
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-blue-600 mt-2">
                {calc.formula}. {calc.advertencia}
              </p>
            </div>
          )}

          {/* Sección: Desglose Semántico de Gastos */}
          <div>
            <h6 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5 px-1">
              <Receipt size={12} className="text-slate-400" /> 
              Desglose de Gastos Acreditados
            </h6>
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-50 overflow-hidden shadow-sm">
              {detalles.length > 0 ? (
                detalles.map((g, i) => (
                  <div key={i} className="px-3 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[10px] text-slate-600 font-semibold capitalize">{g.concepto || "Gasto identificado"}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          S/. {Number(g.monto || 0).toFixed(2)}
                        </span>
                        <SourceButton value={g.observacion || g.fuente_validacion || g.concepto || `S/. ${Number(g.monto || 0).toFixed(2)}`} label={`Gasto: ${g.concepto || "identificado"}`} />
                      </div>
                    </div>
                    {(g.observacion || g.fuente_validacion || g.tipo_documento) && (
                      <details className="mt-1.5 group">
                        <summary className="cursor-pointer list-none text-[9px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600">
                          Ver evidencia
                        </summary>
                        <div className="mt-1.5 border-l-2 border-slate-200 pl-2 text-[10px] leading-snug text-slate-500">
                          {g.fuente_validacion && <p className="font-semibold text-slate-600">{g.fuente_validacion}</p>}
                          {g.tipo_documento && <p>Documento: {g.tipo_documento}</p>}
                          {g.observacion && <p className="italic">"{g.observacion}"</p>}
                        </div>
                      </details>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-[10px] text-slate-400 italic">
                    {mediosProbatoriosSinMonto.length > 0
                      ? "No se detectaron montos individualizados de gastos, pero sí existen medios probatorios admitidos (ver abajo)."
                      : "No se hallaron menciones explícitas de gastos individuales en el texto."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sección: Medios Probatorios Admitidos Sin Monto Cuantificado */}
          {mediosProbatoriosSinMonto.length > 0 && (
            <div>
              <h6 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5 px-1">
                <FileCheck size={12} className="text-slate-400" />
                Medios Probatorios Admitidos (Sin Monto Cuantificado)
              </h6>
              <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-50 overflow-hidden shadow-sm">
                {mediosProbatoriosSinMonto.map((mp, i) => (
                  <div key={i} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-700 font-semibold">{mp.documento || mp.descripcion}</span>
                      <SourceButton value={mp.descripcion || mp.documento} label="Medio probatorio" />
                    </div>
                    {mp.descripcion && mp.descripcion !== mp.documento && (
                      <details className="mt-1 group">
                        <summary className="cursor-pointer list-none text-[9px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600">
                          Ver evidencia
                        </summary>
                        <p className="mt-1 border-l-2 border-slate-200 pl-2 text-[10px] italic leading-snug text-slate-500">
                          "{mp.descripcion}"
                        </p>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 px-1">
                Evidencia cualitativa admitida en autos, sin monto exacto en soles, por lo que no entra a la suma de gastos sustentados (ΣGN).
              </p>
            </div>
          )}

          {(petitorioTrace.fuente || controles.length > 0 || montosDetectados.length > 0) && (
            <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
              <h6 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                <Info size={12} className="text-slate-400" />
                Trazabilidad del Cálculo
              </h6>
              <div className="grid grid-cols-1 gap-2 text-[10px] text-slate-600">
                <div>
                  <span className="font-bold text-slate-700">PA:</span> {petitorioTrace.fuente || "Sin fuente registrada"}
                  {petitorioTrace.validado_en_texto && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">validado</span>
                  )}
                </div>
                {petitorioTrace.evidencia && (
                  <p className="border-l-2 border-slate-200 pl-2 italic leading-snug text-slate-500 flex items-start gap-2">
                    <span>"{petitorioTrace.evidencia}"</span>
                    <SourceButton value={petitorioTrace.evidencia} label="Evidencia del petitorio" />
                  </p>
                )}
                {trazabilidad.formula && (
                  <p><span className="font-bold text-slate-700">Fórmula:</span> {trazabilidad.formula}</p>
                )}
                {controles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {controles.map((control, i) => (
                      <span key={i} className="rounded bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">
                        {control}
                      </span>
                    ))}
                  </div>
                )}
                {montosDetectados.length > 0 && (
                  <p className="text-slate-500">
                    <span className="font-bold text-slate-700">Montos S/ detectados:</span> {montosDetectados.map(m => Number(m).toFixed(2)).join(", ")}
                    <SourceButton value={`S/. ${Number(montosDetectados[0]).toFixed(2)}`} label="Monto detectado" />
                  </p>
                )}
              </div>
            </div>
          )}

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
                  ? (mediosProbatoriosSinMonto.length > 0
                      ? `La pretensión excede los gastos con monto exacto encontrados en el texto, pero existen ${mediosProbatoriosSinMonto.length} medio(s) probatorio(s) admitido(s) sin monto cuantificado (ver arriba). No debe leerse como ausencia total de sustento.`
                      : "La pretensión excede los medios probatorios. Se sugiere requerir mayor sustento documental para validar el petitorio.")
                  : "Existe una correlación técnica aceptable entre los gastos probados y el monto solicitado."}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
