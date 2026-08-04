import React from 'react';
import { Users, User, MapPin, CreditCard, Baby, Briefcase, ExternalLink } from 'lucide-react';

// 🚀 NUEVO: Recibimos onJumpToSource como propiedad (prop)
export const SujetosProcesalesCard = ({ data, onJumpToSource }) => {
  if (!data) return null;

  const mostrarValor = (valor) => valor && !["No detectado", "No encontrado", ""].includes(valor);
  const domicilios = data.domicilios || {};

  const DomicilioItem = ({ icon: Icon, label, value, color = "text-slate-400" }) => (
    <div className="flex items-start gap-2 min-w-0">
      <Icon size={12} className={`${color} mt-0.5 shrink-0`} />
      <div className="min-w-0 flex-1">
        <span className="font-bold text-slate-500">{label}: </span>
        <span className="text-slate-700 break-words">
          {mostrarValor(value) ? value : "No encontrado"}
        </span>
      </div>
      {mostrarValor(value) && (
        <button
          onClick={() => onJumpToSource(value, { label })}
          title="Ver fuente en PDF"
          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors shrink-0"
        >
          <ExternalLink size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Users size={14} className="text-slate-400" />
          Sujetos Procesales
        </h4>
        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide">
          Extracción spaCy + Regex
        </span>
      </div>

      <div className="flex flex-col gap-4">
        
        {/* PARTE DEMANDANTE */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-emerald-400">
          <div className="flex justify-between items-start mb-3">
            <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Parte Demandante</h5>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-50 p-2 rounded-full text-emerald-600">
              <User size={16} />
            </div>
            
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-800">
                {data.demandante?.nombre || "No detectado"}
              </p>
              
              {/* 🚀 BOTÓN DE TRAZABILIDAD PARA EL NOMBRE */}
              {data.demandante?.nombre && data.demandante.nombre !== "No detectado" && (
                <button 
                  onClick={() => onJumpToSource(data.demandante.nombre, { label: "Demandante" })}
                  title="Buscar en el documento original"
                  className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-1 rounded transition-colors"
                >
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <CreditCard size={12} className="text-slate-400" />
              <span>DNI: <span className="font-mono text-slate-800">
                {data.demandante?.dni && data.demandante.dni !== "No detectado" ? data.demandante.dni : "No encontrado"}
              </span></span>

              {/* 🚀 BOTÓN DE TRAZABILIDAD PARA EL DNI */}
              {data.demandante?.dni && data.demandante.dni !== "No detectado" && (
                <button
                  onClick={() => onJumpToSource(data.demandante.dni, { label: "DNI demandante" })}
                  title="Verificar DNI original"
                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
            <DomicilioItem
              icon={MapPin}
              label="Domicilio real"
              value={domicilios.demandante?.real}
              color="text-emerald-500"
            />
            <DomicilioItem
              icon={MapPin}
              label="Domicilio procesal"
              value={domicilios.demandante?.procesal}
              color="text-blue-500"
            />
            <DomicilioItem
              icon={Briefcase}
              label="Domicilio laboral"
              value={domicilios.demandante?.laboral}
              color="text-amber-500"
            />
          </div>
        </div>

        {/* PARTE DEMANDADA */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-rose-400">
          <div className="flex justify-between items-start mb-3">
            <h5 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Parte Demandada</h5>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-rose-50 p-2 rounded-full text-rose-600">
              <User size={16} />
            </div>
            
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-800">
                {data.demandado?.nombre || "No detectado"}
              </p>
              
              {/* 🚀 BOTÓN DE TRAZABILIDAD PARA EL NOMBRE */}
              {data.demandado?.nombre && data.demandado.nombre !== "No detectado" && (
                <button 
                  onClick={() => onJumpToSource(data.demandado.nombre, { label: "Demandado" })}
                  title="Buscar en el documento original"
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors"
                >
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <CreditCard size={12} className="text-slate-400" />
              <span>DNI: <span className="font-mono text-slate-800">
                {data.demandado?.dni && data.demandado.dni !== "No detectado" ? data.demandado.dni : "No encontrado"}
              </span></span>

              {/* 🚀 BOTÓN DE TRAZABILIDAD PARA EL DNI */}
              {data.demandado?.dni && data.demandado.dni !== "No detectado" && (
                <button
                  onClick={() => onJumpToSource(data.demandado.dni, { label: "DNI demandado" })}
                  title="Verificar DNI original"
                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
            <DomicilioItem
              icon={MapPin}
              label="Domicilio real"
              value={domicilios.demandado?.real}
              color="text-rose-500"
            />
            <DomicilioItem
              icon={MapPin}
              label="Domicilio procesal"
              value={domicilios.demandado?.procesal}
              color="text-blue-500"
            />
            <DomicilioItem
              icon={Briefcase}
              label="Domicilio laboral"
              value={domicilios.demandado?.laboral}
              color="text-amber-500"
            />
          </div>
        </div>

        {domicilios.otros?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Domicilios no asociados</h5>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 font-medium">
              {domicilios.otros.slice(0, 4).map((item, index) => (
                <DomicilioItem
                  key={`${item.tipo}-${index}`}
                  icon={item.tipo === "laboral" ? Briefcase : MapPin}
                  label={item.tipo ? `Domicilio ${item.tipo}` : "Domicilio"}
                  value={item.valor}
                  color="text-slate-500"
                />
              ))}
            </div>
          </div>
        )}

        {/* MONTO SOLICITADO */}
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-3 flex justify-between items-center">
           <span className="text-[10px] font-bold text-slate-500 uppercase">Pretensión Económica:</span>
           <div className="flex items-center gap-2">
             <span className="text-sm font-mono font-bold text-[#2546b0]">
               S/. {data.monto_solicitado?.toFixed(2) || "0.00"}
             </span>
             {data.monto_solicitado > 0 && (
               <button
                 onClick={() => onJumpToSource(`S/. ${Number(data.monto_solicitado).toFixed(2)}`, { label: "Pretension economica" })}
                 title="Ver fuente en PDF"
                 className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
               >
                 <ExternalLink size={12} />
               </button>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};
