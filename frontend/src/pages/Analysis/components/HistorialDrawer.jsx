import React, { useEffect, useMemo, useState } from 'react';
import { X, History, GitCompareArrows, FileClock, User, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';

const FIELDS_LABELS = {
  sintesis: 'Síntesis',
  postura: 'Postura',
  demandante: 'Demandante',
  demandado: 'Demandado',
  monto_petitorio: 'Monto petitorio',
  plazo_principal: 'Plazo principal',
  alertas_financieras: 'Alertas financieras',
  tono: 'Tono',
  version_analisis: 'Versión del análisis'
};

const normalizeValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const buildComparableFields = (snapshot = {}, currentSnapshot = {}) => {
  const keys = Array.from(new Set([
    ...Object.keys(snapshot || {}),
    ...Object.keys(currentSnapshot || {})
  ]));

  return keys
    .filter((key) => key in FIELDS_LABELS && Object.hasOwn(snapshot, key) && Object.hasOwn(currentSnapshot, key))
    .map((key) => {
      const previous = normalizeValue(snapshot?.[key]);
      const actual = normalizeValue(currentSnapshot?.[key]);
      return {
        key,
        label: FIELDS_LABELS[key],
        previous,
        actual,
        hasChanges: previous !== actual
      };
    });
};

const getChangeSummary = (fields) => {
  const changed = fields.filter((field) => field.hasChanges).length;
  const total = fields.length;
  if (!total) return 'Sin campos comparables';
  if (!changed) return 'No hay diferencias entre la versión seleccionada y la actual';
  return `${changed} de ${total} campos cambiaron`;
};

export const HistorialDrawer = ({ isOpen, onClose, historial = [], snapshotActual = null, configuracion = null, onRegenerate, isRegenerating = false, tonoActual = null }) => {
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [compareEnabled, setCompareEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const currentItem = historial.find((entry) => entry.isActual) || historial[0] || null;
    setSelectedVersionId(currentItem?.id || null);
    setCompareEnabled(false);
  }, [isOpen, historial]);

  const selectedEntry = useMemo(
    () => historial.find((entry) => entry.id === selectedVersionId) || null,
    [historial, selectedVersionId]
  );

  const comparisonFields = useMemo(() => {
    if (!selectedEntry) return [];
    return buildComparableFields(selectedEntry.snapshot || {}, snapshotActual || {});
  }, [selectedEntry, snapshotActual]);

  const selectedIsCurrent = Boolean(selectedEntry?.isActual);
  const selectedConfig = selectedEntry
    ? (selectedIsCurrent ? (configuracion || selectedEntry.configuracion_ia) : selectedEntry.configuracion_ia)
    : configuracion;
  const isViewingCurrent = !selectedEntry || selectedIsCurrent;
  const displayedTone = isViewingCurrent ? (tonoActual || selectedConfig?.tono_visualizacion) : selectedConfig?.tono_visualizacion;
  const configRows = selectedConfig ? [
    ['Versión', selectedEntry?.version || selectedConfig.version_analisis],
    ['Modelo', selectedConfig.modelo_principal], ['Proveedor', selectedConfig.proveedor_modelo],
    ['Pipeline', selectedConfig.pipeline_version],
    [isViewingCurrent ? 'Tono visualizado' : 'Tono guardado', displayedTone],
    ['Fecha de generación', selectedConfig.fecha_configuracion],
    ['Estado de generación', selectedConfig.estado_generacion],
    ...Object.entries(selectedConfig.parametros || {})
  ] : [];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[520px] bg-[#f8fafc] shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 text-[#1a3059]">
            <History size={18} className="text-[#2546b0]" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">Historial y parámetros IA</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Versiones guardadas y snapshot actual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar historial y parámetros IA"
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="bg-[#eff6ff] border border-blue-100 p-4 rounded-xl flex gap-3 mb-5 shadow-sm">
            <Sparkles size={18} className="text-blue-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-blue-800 font-medium leading-relaxed space-y-1">
              <p>Selecciona una versión, consulta su snapshot y pulsa Comparar para ver sus valores frente a la versión actual.</p>
              <p>{configuracion?.version_analisis ? `Versión actual: ${configuracion.version_analisis}` : 'Versión actual disponible en el snapshot del análisis.'}</p>
            </div>
          </div>

          {onRegenerate && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
              <p className="text-xs text-slate-700 mb-3">Los parámetros antiguos que no se guardaron no pueden recuperarse. Puedes generar una nueva versión del resumen y la postura desde el OCR guardado, conservando el historial.</p>
              <button type="button" onClick={onRegenerate} disabled={isRegenerating}
                className="text-xs font-bold text-white bg-indigo-600 rounded-md px-3 py-2 disabled:opacity-50">
                {isRegenerating ? 'Regenerando resumen…' : 'Regenerar resumen con trazabilidad'}
              </button>
            </div>
          )}
          <section className="bg-white border border-slate-200 rounded-xl p-4 mb-5" aria-label="Parámetros IA por versión">
            <h4 className="text-sm font-bold mb-3">Parámetros IA · {selectedEntry?.version || 'versión actual'}</h4>
            <p className="text-xs text-slate-500 mb-3">Los textos técnico y ciudadano se generan en la misma ejecución y comparten los parámetros de IA. Cambiar el tono solo cambia el texto visualizado.</p>
            {selectedConfig ? <dl className="space-y-2 text-xs">{configRows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-2 gap-3"><dt className="text-slate-500 break-words">{label}</dt>
                <dd className="break-words">{value == null ? 'No registrado' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>
            ))}</dl> : <p className="text-xs text-slate-500">No se registraron parámetros de IA para esta versión.</p>}
          </section>
          {!historial.length && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <FileClock size={28} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-800 mb-1">No hay hitos registrados</p>
              <p className="text-xs text-slate-500">Cuando se guarden cambios o se genere un análisis, aparecerán aquí.</p>
            </div>
          )}

          {historial.length > 0 && (
            <div className="space-y-4 mb-5">
              {historial.map((entry) => {
                const isSelected = entry.id === selectedVersionId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedVersionId(entry.id);
                      setCompareEnabled(false);
                    }}
                    className={`w-full text-left bg-white rounded-xl border p-4 shadow-sm transition-all ${
                      isSelected
                        ? 'border-indigo-300 ring-1 ring-indigo-200 shadow-md'
                        : 'border-slate-200 hover:shadow-md hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-slate-900">{entry.version || 'v?'}</span>
                          {entry.isActual && (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Actual</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">{entry.titulo || 'Movimiento del historial'}</h4>
                      </div>
                      <ChevronRight size={16} className={isSelected ? 'text-indigo-500 rotate-90 transition-transform' : 'text-slate-300 transition-transform'} />
                    </div>

                    <div className="grid gap-2 text-[11px] text-slate-500 mb-3">
                      <div className="flex items-center gap-2">
                        <FileClock size={12} />
                        <span>{entry.fecha || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={12} />
                        <span>{entry.usuario || '-'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{entry.comentario || 'Sin comentario registrado.'}</p>

                    {entry.snapshot?.version_analisis && (
                      <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        <span>Snapshot</span>
                        <span className="text-slate-400">{entry.snapshot.version_analisis}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedEntry && Object.keys(selectedEntry.snapshot || {}).length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-4 mb-5" aria-label="Snapshot de la versión seleccionada">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Snapshot guardado · {selectedEntry.version}</h4>
              <p className="text-xs text-slate-500 mb-3">Valores registrados al crear esta versión. Los campos ausentes no se pueden reconstruir con certeza.</p>
              <dl className="space-y-2 text-xs">
                {Object.entries(selectedEntry.snapshot).filter(([key]) => key in FIELDS_LABELS).map(([key, value]) => (
                  <div key={key} className="border-t border-slate-100 pt-2">
                    <dt className="font-bold text-slate-600">{FIELDS_LABELS[key]}</dt>
                    <dd className="mt-1 text-slate-700 break-words whitespace-pre-wrap">{normalizeValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {selectedEntry && !Object.keys(selectedEntry.snapshot || {}).length && (
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3 mb-4">Esta versión no tiene un snapshot guardado. No se pueden determinar diferencias con la actual.</p>
          )}
          {selectedEntry && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Comparación</p>
                  <h4 className="text-sm font-bold text-slate-900">{selectedEntry.version || 'Versión seleccionada'}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setCompareEnabled((value) => !value)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    compareEnabled
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <GitCompareArrows size={14} />
                  Comparar
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
                <span className="text-[11px] font-bold text-slate-700">{getChangeSummary(comparisonFields)}</span>
              </div>

              {selectedIsCurrent && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-xs font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Esta es la versión actual; la comparación mostrará coincidencias salvo cambios recientes.
                </div>
              )}

              {compareEnabled && comparisonFields.length > 0 && (
                <div className="space-y-3">
                  {comparisonFields.map((field) => (
                    <div
                      key={field.key}
                      className={`rounded-xl border p-3 ${field.hasChanges ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{field.label}</p>
                          <p className={`text-[11px] font-bold ${field.hasChanges ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {field.hasChanges ? 'Cambio detectado' : 'Sin cambios'}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2 text-xs">
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Seleccionada</p>
                          <p className="text-slate-700 leading-relaxed break-words">{field.previous}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Actual</p>
                          <p className="text-slate-700 leading-relaxed break-words">{field.actual}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {compareEnabled && comparisonFields.length === 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-3 text-xs text-slate-600">
                  No hay campos comparables disponibles para esta versión.
                </div>
              )}

              {!compareEnabled && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <GitCompareArrows size={14} />
                  Activa <span className="font-bold text-slate-700">Comparar</span> para ver las diferencias con la versión actual.
                </div>
              )}
            </div>
          )}

          {!selectedEntry && historial.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-600 shadow-sm">
              Selecciona un hito para ver sus detalles.
            </div>
          )}
        </div>
      </div>
    </>
  );
};