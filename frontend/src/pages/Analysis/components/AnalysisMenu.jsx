// Archivo: src/pages/Analysis/components/AnalysisMenu.jsx
import React from 'react';
import { 
  FileText, CheckCircle, Download, FileCheck, Baby, 
  Coins, Hammer, Users, Calculator, Eye, EyeOff, Scale, History, Clock, Gavel
} from 'lucide-react';

export const AnalysisMenu = ({ 
  isMenuOpen, 
  isSimpleTone,
  setIsSimpleTone,
  cardVisibility, 
  toggleCard,
  onOpenJurisprudencia,
  onOpenHistorial,
  onExportWord,
  onOpenRating 
}) => {
  if (!isMenuOpen) return null;

  const menuCards = [
    { key: 'resumen', icon: FileText, label: "Resumen Generado" },
    { key: 'postura', icon: Gavel, label: "Postura Contestación" },
    { key: 'plazos', icon: Clock, label: "Control de Plazos" },
    { key: 'admisibilidad', icon: FileCheck, label: "Admisibilidad (HU08)" },
    { key: 'necesidades', icon: Baby, label: "Necesidades Alimentista" },
    { key: 'capacidad', icon: Coins, label: "Capacidad / Cargas" },
    { key: 'controversias', icon: Hammer, label: "Puntos Controvertidos" },
    { key: 'sujetos', icon: Users, label: "Sujetos Procesales" },
    { key: 'financiera', icon: Calculator, label: "Revisión Financiera" },
  ];

  return (
    <div className="absolute top-[46px] left-0 w-[280px] bg-white border-r border-b border-slate-200 shadow-[4px_10px_15px_rgba(0,0,0,0.05)] z-40 rounded-br-xl pb-4">
      
      {/* SECCIÓN 1: ACCIONES PRINCIPALES */}
      <div className="py-2">
        <h5 className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acciones Principales</h5>
        
        {/* Tono Técnico */}
        <div className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 cursor-pointer" onClick={() => setIsSimpleTone(!isSimpleTone)}>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <FileText size={16} className="text-emerald-500" /> Lenguaje Ciudadano
          </div>
          <div className={`w-8 h-4 rounded-full relative flex items-center transition-colors ${isSimpleTone ? 'bg-emerald-500' : 'bg-slate-200'}`}>
            <div className={`w-3 h-3 bg-white rounded-full absolute shadow-sm transition-transform ${isSimpleTone ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div 
          className="flex items-center px-5 py-2.5 hover:bg-slate-50 cursor-pointer gap-3 text-xs font-bold text-slate-600"
          onClick={onOpenRating} // <--- 2. CONECTAMOS EL EVENTO AQUÍ
        >
          <CheckCircle size={16} className="text-emerald-500" />
          Calificar Análisis RAG
        </div>

        {/* 2. CONECTAMOS EL BOTÓN DE EXPORTACIÓN AQUÍ */}
        <div 
          className="flex items-center px-5 py-2.5 hover:bg-slate-50 cursor-pointer gap-3 text-xs font-bold text-slate-600"
          onClick={onExportWord} 
        >
          <Download size={16} className="text-indigo-500" />
          Exportar a Word (.docx)
        </div>
      </div>

      <div className="w-full border-t border-slate-100 my-1"></div>

      {/* SECCIÓN 2: MOSTRAR / OCULTAR TARJETAS */}
      <div className="py-2">
        <h5 className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrar / Ocultar Tarjetas</h5>
        {menuCards.map((item) => (
          <div key={item.key} className="flex items-center justify-between px-5 py-2 hover:bg-slate-50 cursor-pointer group" onClick={() => toggleCard(item.key)}>
            <div className={`flex items-center gap-3 text-xs font-medium transition-colors ${cardVisibility[item.key] ? 'text-slate-700' : 'text-slate-500'}`}>
              <item.icon size={14} className={cardVisibility[item.key] ? 'text-[#2546b0]' : 'text-slate-400 group-hover:text-slate-500'} /> 
              {item.label}
            </div>
            {cardVisibility[item.key] ? (
              <Eye size={14} className="text-blue-500" />
            ) : (
              <EyeOff size={14} className="text-slate-300 group-hover:text-slate-400" />
            )}
          </div>
        ))}
      </div>

      <div className="w-full border-t border-slate-100 my-1"></div>

      {/* SECCIÓN 3: PANELES AUXILIARES */}
      <div className="py-2">
        <h5 className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paneles Auxiliares</h5>
        <div 
          className="flex items-center px-5 py-2 hover:bg-slate-50 cursor-pointer gap-3 text-xs font-bold text-slate-600 group"
          onClick={onOpenJurisprudencia} 
        >
          <Scale size={14} className="text-slate-400 group-hover:text-[#2546b0]" />
          Jurisprudencia (HU19)
        </div>
        <div 
          className="flex items-center px-5 py-2 hover:bg-slate-50 cursor-pointer gap-3 text-xs font-bold text-slate-600 group"
          onClick={onOpenHistorial}
        >
          <History size={14} className="text-slate-400 group-hover:text-[#2546b0]" />
          Historial RAG (HU26)
        </div>
      </div>
    </div>
  );
};