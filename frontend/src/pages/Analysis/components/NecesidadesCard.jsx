import React from 'react';
import { Baby } from 'lucide-react';

const format = value => value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value).toFixed(2) : 'No registrado';

export const NecesidadesCard = ({ data }) => {
  if (!data || !Array.isArray(data.detalles_gastos)) return null;
  const gastos = data.detalles_gastos;
  const mensuales = gastos.filter(g => g.monto_mensual_pen != null && Number.isFinite(Number(g.monto_mensual_pen)));
  const total = mensuales.reduce((sum, g) => sum + Number(g.monto_mensual_pen), 0);
  const excluidos = gastos.length - mensuales.length;
  return (
    <div className="mb-8">
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Baby size={14} />Necesidades del Alimentista (HU12)
      </h4>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-500"><tr>
              {['Categoría', 'Monto original', 'Moneda', 'Periodicidad', 'Equivalente mensual (PEN)', 'Sustento documental', 'Observaciones'].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {gastos.map((g, i) => <tr key={i}>
                <td className="px-4 py-3 font-bold text-slate-700">{g.concepto}</td>
                <td className="px-4 py-3 font-mono">{format(g.monto)}</td>
                <td className="px-4 py-3">{g.moneda || 'No determinada'}</td>
                <td className="px-4 py-3">{g.periodicidad || 'No determinada'}</td>
                <td className="px-4 py-3">
                  {g.monto_mensual_pen != null ? 'S/. ' + format(g.monto_mensual_pen) : 'No incluido'}
                  <p className="text-[10px] text-slate-500">{g.conversion_mensual || 'Sin normalización registrada'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={'inline-block rounded px-2 py-1 font-bold ' + (g.estado_sustento === 'Sustentado' ? 'bg-emerald-50 text-emerald-700' : g.estado_sustento === 'Sin sustento' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>{g.estado_sustento || 'No determinado'}</span>
                  <p className="mt-1 text-[10px] text-slate-500">{g.motivo_sustento || 'No se registró una evaluación del sustento documental.'}</p>
                  {g.fuente_sustento && <p className="mt-1 text-[10px] text-slate-600">Fuente: {g.fuente_sustento}</p>}
                </td>
                <td className="px-4 py-3 text-slate-500">{g.observacion || 'Sin evidencia registrada'}</td>
              </tr>)}
              {!gastos.length && <tr><td colSpan={7} className="p-6 text-slate-500 text-center">No se detectaron gastos específicos sustentados.</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 border-t"><tr>
              <td colSpan={4} className="px-4 py-3 font-bold">Total mensual normalizado (PEN)</td>
              <td colSpan={3} className="px-4 py-3 font-bold">{mensuales.length ? 'S/. ' + total.toFixed(2) : 'No disponible'}</td>
            </tr></tfoot>
          </table>
        </div>
        <p className="p-4 text-[10px] text-slate-500 border-t">
          Los gastos anuales en soles se dividen entre 12. Los pagos únicos y los montos con moneda o periodicidad no determinadas se listan aparte del total mensual. No se aplica conversión de divisas.
          {excluidos > 0 && ' Hay ' + excluidos + ' gasto(s) no incluido(s) en el total mensual; el total es parcial.'}
        </p>
      </div>
    </div>
  );
};
