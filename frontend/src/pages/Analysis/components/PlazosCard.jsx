import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';

export const PlazosCard = ({ data, onJumpToSource }) => {
  // Si los datos aún no llegan, mostramos un estado de espera
  if (!data) {
    return (
      <div className="mb-8">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Control de Plazos Legales</h4>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center h-24">
          <p className="text-xs text-slate-400 font-medium animate-pulse">Calculando plazos procesales...</p>
        </div>
      </div>
    );
  }

  const isVencido = data.estado === "Vencido";
  const auditoriaTemporal = data.auditoria_temporal || {};
  const hallazgosTemporales = Array.isArray(auditoriaTemporal.hallazgos) ? auditoriaTemporal.hallazgos : [];
  const tieneAlertasTemporales = hallazgosTemporales.length > 0;
  const calendarioJudicial = data.calendario_judicial || {};
  const diasNoHabiles = Array.isArray(calendarioJudicial.dias_no_habiles) ? calendarioJudicial.dias_no_habiles : [];
  const tieneDiasNoHabiles = diasNoHabiles.length > 0;
  const SourceButton = ({ value, label }) => {
    if (!value || !onJumpToSource || value === "No detectado") return null;
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
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Control de Plazos Legales</h4>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          
          {/* Columna Izquierda: Fechas */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#2a3f5f] font-bold">Notificación del Cargo</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                {data.fecha_notificacion}
                <SourceButton value={data.fecha_notificacion} label="Fecha de notificacion" />
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#2a3f5f] font-bold">Fecha de Presentación</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                {data.fecha_presentacion}
                <SourceButton value={data.fecha_presentacion} label="Fecha de presentacion" />
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50 mt-1">
              <span className="text-[#2a3f5f] font-bold">Días Hábiles Transcurridos</span>
              <span className={`font-bold ${isVencido ? 'text-red-600' : 'text-slate-800'}`}>
                {data.dias_transcurridos} días
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Calendario judicial: excluye sabados, domingos y feriados.
            </p>
          </div>

          {/* Columna Derecha: Estado */}
          <div className="border-l border-slate-200 pl-6 flex flex-col justify-center">
            <span className="text-xs text-[#2a3f5f] font-bold mb-2">Estado de Admisibilidad:</span>
            
            <div className={`inline-flex items-center px-3 py-1.5 rounded text-[11px] font-bold mb-3 w-fit ${
              isVencido ? 'bg-red-100 text-red-800' : 'bg-[#bbf7d0] text-green-800'
            }`}>
              {isVencido ? (
                <AlertCircle size={14} className="mr-1.5" /> 
              ) : (
                <CheckCircle2 size={14} className="mr-1.5" /> 
              )}
              {data.estado}
            </div>
            
            <p className="text-[10px] text-slate-400 leading-tight flex items-start">
              <Clock size={12} className="mr-1.5 shrink-0 mt-0.5" />
              <span>{data.observacion}</span>
              <SourceButton value={data.observacion} label="Observacion de plazo" />
            </p>
          </div>
        </div>

        {tieneDiasNoHabiles && (
          <div className="mt-4 border border-blue-100 bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-900">
                Dias no habiles descontados
              </h5>
              <span className="text-[10px] font-bold text-blue-700">
                {diasNoHabiles.length} dia(s)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {diasNoHabiles.slice(0, 8).map((dia, index) => (
                <span
                  key={`${dia.fecha}-${index}`}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-white px-2 py-1 text-[10px] font-semibold text-blue-900"
                >
                  {dia.fecha}
                  <span className="font-normal text-blue-600">{dia.motivo}</span>
                </span>
              ))}
              {diasNoHabiles.length > 8 && (
                <span className="inline-flex items-center rounded-md border border-blue-100 bg-white px-2 py-1 text-[10px] font-semibold text-blue-700">
                  +{diasNoHabiles.length - 8} mas
                </span>
              )}
            </div>
          </div>
        )}

        {tieneAlertasTemporales && (
          <div className="mt-4 border border-amber-200 bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-600" />
              <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                RevisiÃ³n de fechas inconsistentes
              </h5>
            </div>
            <div className="space-y-2">
              {hallazgosTemporales.slice(0, 5).map((hallazgo, index) => (
                <div key={`${hallazgo.tipo}-${index}`} className="bg-white/70 border border-amber-100 rounded-md px-3 py-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-amber-900">
                        {hallazgo.tipo} <span className="font-mono text-amber-700">{hallazgo.fecha}</span>
                      </p>
                      <p className="text-[10px] text-amber-800/80 leading-relaxed mt-0.5">
                        {hallazgo.detalle}
                      </p>
                    </div>
                    <SourceButton value={hallazgo.fecha || hallazgo.contexto} label={`Fecha inconsistente: ${hallazgo.tipo}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
