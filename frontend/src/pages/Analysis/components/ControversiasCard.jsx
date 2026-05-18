import React, { useState } from 'react';
import { Hammer, Trash2, Pencil, CheckCircle2, Save, XCircle, Edit3, RefreshCw } from 'lucide-react';

// Sub-componente: Maneja el estado individual de cada controversia (Tu código original intacto)
const PuntoControvertido = ({ punto, index, onNotifyChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(punto.sugerencia);
  const [status, setStatus] = useState('pending'); // Estados: 'pending', 'accepted', 'discarded'

  const manejarAceptar = () => {
    setStatus('accepted');
    if (onNotifyChange) onNotifyChange(`Aprobó punto controvertido: ${punto.tema || "Sin título"}`);
  };

  const manejarGuardar = () => {
    setIsEditing(false);
    if (onNotifyChange) onNotifyChange(`Modificó redacción de controversia: ${punto.tema || "Sin título"}`);
  };

  if (status === 'discarded') return null;

  return (
    <div className={`bg-white rounded-xl border ${
      status === 'accepted' ? 'border-green-400 bg-green-50/20' : 'border-purple-200'
    } p-5 shadow-sm transition-all duration-300 hover:shadow-md`}>
      
      {/* Título */}
      <h5 className={`text-[10px] font-bold mb-2 tracking-widest uppercase flex justify-between items-center ${
        status === 'accepted' ? 'text-green-700' : 'text-purple-700'
      }`}>
        <span>SUGERENCIA {index + 1}: {punto.tema || "PUNTO A RESOLVER"}</span>
        {status === 'accepted' && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[8px]">APROBADO</span>}
      </h5>

      {/* Área de visualización / edición */}
      {isEditing ? (
        <textarea
          className="w-full text-xs text-slate-700 leading-relaxed mb-4 font-medium border border-purple-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner resize-y min-h-[80px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      ) : (
        <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
          {text}
        </p>
      )}

      {/* Botones de Acción Dinámicos */}
      <div className="flex justify-end items-center gap-4 border-t border-slate-50 pt-3 mt-1">
        {isEditing ? (
          <>
            <button 
              onClick={() => {
                setText(punto.sugerencia);
                setIsEditing(false);
              }} 
              className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-red-500 font-medium transition-colors"
            >
              <XCircle size={12} /> Cancelar
            </button>
            <button 
              onClick={manejarGuardar} 
              className="flex items-center gap-1.5 text-[10px] bg-purple-100 text-purple-700 font-bold px-3 py-1.5 rounded hover:bg-purple-200 transition-colors"
            >
              <Save size={12} /> Guardar
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setStatus('discarded')} 
              className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-red-500 font-medium transition-colors"
            >
              <Trash2 size={12} /> Descartar
            </button>
            <button 
              onClick={() => setIsEditing(true)} 
              className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-blue-500 font-medium transition-colors"
            >
              <Pencil size={12} /> Editar
            </button>
            {status !== 'accepted' && (
              <button 
                onClick={manejarAceptar} 
                className="flex items-center gap-1.5 text-[10px] bg-[#dcfce7] text-green-700 font-bold px-3 py-1.5 rounded hover:bg-green-300 transition-colors"
              >
                <CheckCircle2 size={12} /> Aceptar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Componente Principal
export const ControversiasCard = ({ puntos, onNotifyChange, onRegenerate, isRegenerating }) => {
  // Estado para la caja de texto de regeneración global
  const [correccion, setCorreccion] = useState("");

  const handleEnviarCorreccion = () => {
    if (!correccion.trim()) return;
    if (onRegenerate) onRegenerate(correccion);
    setCorreccion(""); // Limpiar tras enviar
  };

  if (!puntos || puntos.length === 0) {
    return (
      <div className="mb-8 bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-center text-slate-400 text-[11px]">
        Analizando puntos controvertidos...
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Hammer size={14} className="text-slate-400" />
          Puntos Controvertidos
        </h4>
        <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide">
          IA Sugiere
        </span>
      </div>

      {/* Contenedor de Sugerencias */}
      <div className="flex flex-col gap-4 mb-6">
        {puntos.map((punto, index) => (
          <PuntoControvertido 
            key={index} 
            punto={punto} 
            index={index} 
            onNotifyChange={onNotifyChange} 
          />
        ))}
      </div>

      {/* ---> NUEVA ZONA: AUDITORÍA HUMANA (Human-in-the-Loop) <--- */}
      <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm mt-4">
        <h4 className="text-[11px] font-bold text-blue-800 flex items-center mb-2 uppercase tracking-widest">
          <Edit3 size={14} className="mr-2" />
          Corrección Manual Global (Auditoría IA)
        </h4>
        <p className="text-[10px] text-slate-500 mb-3">
          ¿La IA cometió un error o el documento escaneado está mal escrito? Escribe la corrección aquí y reestructuraremos todo el informe.
        </p>
        
        <textarea 
          value={correccion}
          onChange={(e) => setCorreccion(e.target.value)}
          disabled={isRegenerating}
          placeholder="Ej. El apellido correcto de la demandante es Espinoza y no Espenoza..."
          className="w-full text-xs text-slate-700 leading-relaxed font-medium border border-blue-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-y min-h-[80px] disabled:bg-slate-50 disabled:text-slate-400"
        />
        
        <div className="flex justify-end mt-3 border-t border-blue-50 pt-3">
          <button 
            onClick={handleEnviarCorreccion}
            disabled={isRegenerating || !correccion.trim()}
            className={`flex items-center gap-1.5 text-[10px] font-bold px-4 py-2 rounded transition-colors shadow-sm ${
              isRegenerating || !correccion.trim() 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRegenerating ? (
              <>
                <RefreshCw size={12} className="animate-spin" /> 
                Regenerando Análisis...
              </>
            ) : (
              <>
                <CheckCircle2 size={12} /> 
                Aplicar Corrección al Informe
              </>
            )}
          </button>
        </div>
      </div>
      
    </div>
  );
};