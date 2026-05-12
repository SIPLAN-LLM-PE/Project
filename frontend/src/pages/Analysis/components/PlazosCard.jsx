import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const PlazosCard = ({ data }) => {
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

  return (
    <div className="mb-8">
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Control de Plazos Legales</h4>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          
          {/* Columna Izquierda: Fechas */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#2a3f5f] font-bold">Notificación del Cargo</span>
              <span className="font-bold text-slate-800">{data.fecha_notificacion}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#2a3f5f] font-bold">Fecha de Presentación</span>
              <span className="font-bold text-slate-800">{data.fecha_presentacion}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50 mt-1">
              <span className="text-[#2a3f5f] font-bold">Días Hábiles Transcurridos</span>
              <span className={`font-bold ${isVencido ? 'text-red-600' : 'text-slate-800'}`}>
                {data.dias_transcurridos} días
              </span>
            </div>
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
              {data.observacion}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};