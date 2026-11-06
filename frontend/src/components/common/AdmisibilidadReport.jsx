import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const AdmisibilidadReport = ({ numeroExpediente, onClose }) => {
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);
  const headers = () => { const token = localStorage.getItem('access_token'); return token ? { Authorization: 'Bearer ' + token } : {}; };
  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch('/api/v1/expedientes/' + encodeURIComponent(numeroExpediente) + '/admisibilidad', { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'No se pudo cargar el reporte.');
        if (activo) setReporte(data.reporte);
      } catch (err) { if (activo) setError(err.message); }
    };
    cargar(); return () => { activo = false; };
  }, [numeroExpediente]);
  const descargar = async () => {
    setExportando(true); setError('');
    try {
      const res = await fetch('/api/v1/export-admisibilidad-pdf', {
        method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({numero_expediente: numeroExpediente})
      });
      if (!res.ok) { const data = await res.json(); throw new Error(typeof data.detail === 'string' ? data.detail : 'No se pudo generar el PDF.'); }
      const blob = await res.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'Admisibilidad_' + numeroExpediente.replace(/[^a-zA-Z0-9._-]/g,'_') + '.pdf';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
    finally { setExportando(false); }
  };
  return <div className="fixed inset-0 z-[90] bg-slate-950/50 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-admisibilidad" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl p-5 shadow-xl">
      <div className="flex justify-between items-start gap-3"><h2 id="titulo-admisibilidad" className="font-bold text-slate-900">Reporte de anexos y admisibilidad</h2>
        <button type="button" onClick={onClose} className="text-sm text-indigo-700">Cerrar</button></div>
      <p className="text-xs text-slate-500 my-3">Expediente: {numeroExpediente}</p>
      {error && <p role="alert" className="text-sm text-red-700 my-3">{error}</p>}
      {!reporte && !error && <p role="status">Cargando reporte…</p>}
      {reporte && <>
        <p className="text-xs text-slate-600">Generado: {reporte.fecha_generacion} · Usuario: {reporte.usuario}</p>
        <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">{reporte.advertencia}</div>
        <p className="text-xs text-slate-500 mb-3">{reporte.alcance}</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-800">{reporte.conformes} conforme(s)</div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm font-bold text-amber-800">{reporte.faltantes} falta(n)</div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">{reporte.pendientes || 0} por verificar</div>
        </div>
        <div className="border rounded-lg p-3 mb-4"><p className="text-xs text-slate-500">Sugerencia automática referencial</p><p className="font-bold text-sm text-slate-900 mt-1">{reporte.sugerencia}</p></div>
        {reporte.admisibilidad.length ? <table className="w-full text-xs text-left"><thead className="bg-slate-50"><tr><th className="p-3">Anexo</th><th className="p-3">Estado referencial</th></tr></thead>
          <tbody>{reporte.admisibilidad.map((item,i) => {
            const conforme = ['encontrado','conforme'].includes(String(item.estado).trim().toLowerCase());
            const estado = String(item.estado).trim().toLowerCase();
            const etiqueta = conforme ? 'Conforme' : estado === 'por verificar' ? 'Por verificar' : estado === 'no aplica' ? 'No aplica' : 'Falta';
            const Icon = conforme ? CheckCircle2 : AlertCircle;
            return <tr key={i} className="border-t"><td className="p-3"><strong>{item.anexo || item.requisito}</strong>
              <p className="text-xs text-slate-500 mt-1">{item.observacion}</p>
              {(item.fuentes || []).map((fuente,j) => <p key={j} className="text-xs text-indigo-700 mt-1">Fuente: {fuente.archivo} · {fuente.pagina ? 'Página ' + fuente.pagina : 'Página por verificar'}</p>)}
            </td><td className="p-3">
              <span className={'inline-flex items-center gap-2 px-3 py-1 rounded-full border font-bold ' + (conforme ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200')}>
                <Icon size={14} aria-hidden="true" />{etiqueta}
              </span>
            </td></tr>;
          })}</tbody></table>
          : <p className="text-sm text-slate-600">No hay una evaluación disponible. Carga y analiza los documentos del expediente.</p>}
        <button type="button" disabled={exportando || !reporte.admisibilidad.length} onClick={descargar} className="mt-5 bg-indigo-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50">{exportando ? 'Generando PDF…' : 'Descargar PDF'}</button>
      </>}
    </section>
  </div>;
};
