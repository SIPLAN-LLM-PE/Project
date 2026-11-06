import React, { useEffect, useState } from 'react';

export const SensitiveDataReview = ({ numeroExpediente, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/v1/expedientes/' + encodeURIComponent(numeroExpediente) + '/sensitive-validation', {
          headers: token ? { Authorization: 'Bearer ' + token } : {}
        });
        const resultado = await response.json();
        if (!response.ok) throw new Error(typeof resultado.detail === 'string' ? resultado.detail : 'No se pudo consultar la validación.');
        if (activo) setData(resultado);
      } catch (err) { if (activo) setError(err.message); }
    };
    cargar();
    return () => { activo = false; };
  }, [numeroExpediente]);
  return <div className="fixed inset-0 z-[90] bg-slate-950/50 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-datos-sensibles" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl p-5">
      <div className="flex justify-between items-start gap-3">
        <div><h2 id="titulo-datos-sensibles" className="font-bold text-slate-900">Validación de datos sensibles de menores</h2><p className="text-xs text-slate-500 mt-1">Expediente: {numeroExpediente}</p></div>
        <button type="button" onClick={onClose} aria-label="Cerrar validación de datos sensibles" className="text-sm text-indigo-700">Cerrar</button>
      </div>
      <p className="text-xs text-slate-600 my-4">Consulta de hallazgos del texto guardado. Los valores se muestran enmascarados. Esta vista no anonimiza el documento ni reinicia un análisis ya realizado.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!data && !error && <p role="status" className="text-sm">Cargando validación…</p>}
      {data && <>
        <p className="text-sm font-bold mb-3">{data.total} hallazgo(s)</p>
        {!data.ocr_disponible ? <p className="text-sm text-amber-800">Este expediente todavía no tiene texto OCR guardado. Carga sus documentos en Análisis IA para realizar la detección y revisión previa.</p>
          : !data.total ? <p className="text-sm text-slate-600">No se detectaron indicios con las reglas actuales. Esto no sustituye la revisión del documento.</p>
          : <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-amber-50"><tr><th className="p-3">Tipo de dato</th><th className="p-3">Vista previa enmascarada</th></tr></thead>
            <tbody>{data.hallazgos.map((h,i) => <tr key={i} className="border-t"><td className="p-3">{h.tipo}</td><td className="p-3 font-mono break-all">{h.valor}</td></tr>)}</tbody></table></div>}
      </>}
      <p className="text-xs text-slate-500 mt-5">Durante una carga con hallazgos, la confirmación o cancelación del análisis se solicita antes de enviar contenido al modelo.</p>
    </section>
  </div>;
};
