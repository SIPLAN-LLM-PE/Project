import React, { useEffect, useState } from 'react';

const EVENTOS = {
  no_determinado: 'Evento no determinado', presentacion: 'Presentación de la demanda', demanda: 'Demanda', admision: 'Auto admisorio',
  notificacion: 'Notificación', contestacion: 'Contestación', sentencia: 'Sentencia',
  oficio: 'Oficio', audiencia: 'Audiencia programada', vencimiento_plazo: 'Vencimiento de plazo',
  consentimiento: 'Consentimiento', resolucion: 'Resolución'
};

export const FechasProcesales = ({ numeroExpediente, analysisData, onSaved }) => {
  const [fechas, setFechas] = useState(() => {
    if (Array.isArray(analysisData?.fechas_procesales)) return analysisData.fechas_procesales;
    return [];
  });
  const [resultado, setResultado] = useState(analysisData?.validacion_fechas_procesales || null);
  const [busy, setBusy] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [extraidas, setExtraidas] = useState(analysisData?.fechas_procesales_extraidas || []);
  const [cargandoExtraccion, setCargandoExtraccion] = useState(true);
  const [errorExtraccion, setErrorExtraccion] = useState('');
  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      setCargandoExtraccion(true); setErrorExtraccion('');
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('/api/v1/expedientes/' + encodeURIComponent(numeroExpediente) + '/fechas-procesales', {
          headers: token ? { Authorization: 'Bearer ' + token } : {}
        });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'No se pudieron cargar las fechas.');
        if (vigente) setExtraidas(data.fechas_extraidas || []);
      } catch (error) { if (vigente) setErrorExtraccion(error.message); }
      finally { if (vigente) setCargandoExtraccion(false); }
    };
    cargar();
    return () => { vigente = false; };
  }, [numeroExpediente]);
  const cambiar = (index, campo, valor) => {
    setFechas(prev => prev.map((f, i) => i === index ? { tipo: f.tipo, fecha: f.fecha, [campo]: valor } : f));
    setResultado(null); setMensaje('');
  };
  const validar = async (guardar) => {
    setBusy(true); setMensaje('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/expedientes/' + encodeURIComponent(numeroExpediente) + '/fechas-procesales', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ fechas: fechas.map(({tipo, fecha}) => ({tipo, fecha})), guardar })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Revisa que todas las filas tengan una fecha.');
      setResultado(data.validacion);
      setFechas(data.fechas);
      if (data.guardado) { onSaved(data); setMensaje('Fechas y hallazgos guardados.'); }
    } catch (error) { setMensaje(error.message); }
    finally { setBusy(false); }
  };
  return <section className="mb-6 p-4 bg-white border border-blue-200 rounded-xl" aria-label="Fechas procesales del expediente">
    <h3 className="font-bold text-sm text-slate-800">Fechas procesales · {numeroExpediente}</h3>
    <h4 className="font-bold text-xs text-slate-700 mt-4">Fechas extraídas del expediente ({extraidas.length})</h4>
    <p className="text-xs text-slate-500 my-2">Cada fecha se asocia al evento más cercano que la preceda en la misma oración. Si no existe uno reconocible, se indica “Evento no determinado”.</p>
    {cargandoExtraccion && <p role="status" className="text-xs">Cargando fechas extraídas…</p>}
    {errorExtraccion && <p role="alert" className="text-xs text-red-700">{errorExtraccion}</p>}
    {!cargandoExtraccion && !errorExtraccion && !extraidas.length && <p className="text-xs text-slate-500">No se encontraron fechas en el texto disponible.</p>}
    {!!extraidas.length && <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded my-3">
      <table className="w-full text-xs text-left">
        <thead><tr className="bg-slate-50"><th className="p-2">Fecha original</th><th className="p-2">ISO</th><th className="p-2">Evento</th><th className="p-2">Fuente</th><th className="p-2">Revisión</th></tr></thead>
        <tbody>{extraidas.map((fila,i) => <tr key={i} className="border-t align-top">
          <td className="p-2">{fila.fecha_original || fila.fecha}</td>
          <td className="p-2 whitespace-nowrap">{fila.fecha_iso || 'No normalizada'}</td>
          <td className="p-2">{EVENTOS[fila.tipo] || 'Evento no determinado'}</td>
          <td className="p-2"><span>{fila.archivo || 'Texto del expediente'}</span><details><summary className="cursor-pointer text-indigo-700">Ver oración</summary><p className="min-w-48 whitespace-normal">{fila.contexto}</p></details></td>
          <td className="p-2"><button type="button" disabled={busy || fechas.length >= 100} className="text-indigo-700 disabled:opacity-50" onClick={() => { setFechas(prev => [...prev, {tipo: fila.tipo || 'no_determinado', fecha: fila.fecha_original || fila.fecha}]); setResultado(null); setMensaje(''); }}>Añadir a revisión</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <h4 className="font-bold text-xs text-slate-700 mt-4">Revisión de fechas</h4>
    <p className="text-xs text-slate-500 my-3">Admite DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA, DD/MM/AA, D de mes de AAAA y fechas ISO. La salida normalizada es AAAA-MM-DD. Las audiencias y los vencimientos programados pueden ser futuros. Las fechas anteriores a 1990 se señalan para revisión.</p>
    <p className="text-xs text-slate-500 mb-3">Años de dos dígitos: 00–49 corresponden a 2000–2049; 50–99, a 1950–1999. Las fechas numéricas se interpretan como día/mes/año.</p>
    <p className="text-xs text-slate-500 mb-3">Esta revisión conserva las fechas extraídas y no recalcula automáticamente los plazos legales.</p>
    <div className="space-y-3">{fechas.map((fila, index) => <div key={index} className="flex flex-wrap gap-2 items-center">
      <select aria-label={'Evento procesal ' + (index + 1)} value={fila.tipo} disabled={busy} onChange={e => cambiar(index, 'tipo', e.target.value)} className="border rounded p-2 text-xs">
        {Object.entries(EVENTOS).map(([tipo,label]) => <option key={tipo} value={tipo}>{label}</option>)}
      </select>
      <input aria-label={'Fecha procesal ' + (index + 1)} placeholder="Ej.: 6 de noviembre de 2026" value={fila.fecha} disabled={busy} maxLength={80} onChange={e => cambiar(index, 'fecha', e.target.value)} className="border rounded p-2 text-xs w-56 max-w-full" />
      {fila.estado_normalizacion && <span className={fila.fecha_iso ? 'text-xs text-emerald-700' : 'text-xs text-amber-800'}>
        {fila.fecha_iso ? 'ISO: ' + fila.fecha_iso : 'No normalizada'}
      </span>}
      <button type="button" disabled={busy} aria-label={'Quitar fecha ' + (index + 1)} onClick={() => { setFechas(prev => prev.filter((_,i) => i !== index)); setResultado(null); setMensaje(''); }} className="text-xs text-red-700">Quitar</button>
    </div>)}</div>
    <div className="flex flex-wrap gap-3 mt-4">
      <button type="button" disabled={busy || fechas.length >= 100} onClick={() => { setFechas(prev => [...prev,{tipo:'notificacion',fecha:''}]); setResultado(null); setMensaje(''); }} className="text-xs text-indigo-700 border rounded px-3 py-2">Añadir fecha</button>
      <button type="button" disabled={busy || !fechas.length} onClick={() => validar(false)} className="text-xs text-indigo-700 border rounded px-3 py-2">Normalizar y validar fechas</button>
      <button type="button" disabled={busy} onClick={() => validar(true)} className="text-xs text-white bg-indigo-600 rounded px-3 py-2">Guardar revisión de fechas</button>
    </div>
    {busy && <p role="status" className="text-xs mt-3">Procesando fechas…</p>}
    {mensaje && <p role="status" className="text-xs mt-3 text-slate-700">{mensaje}</p>}
    {resultado && <div className="mt-4" aria-live="polite">
      <p className="font-bold text-xs">{resultado.total_hallazgos ? resultado.total_hallazgos + ' hallazgo(s) para revisión' : 'Sin hallazgos de congruencia temporal'}</p>
      {resultado.hallazgos.map((h,i) => <div key={i} className="mt-2 p-3 border border-amber-200 bg-amber-50 rounded text-xs">
        <strong>{EVENTOS[h.evento] || h.evento} · {h.fecha} · {h.tipo}</strong><p>{h.detalle}</p>
      </div>)}
    </div>}
  </section>;
};
