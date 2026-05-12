import React from 'react';
import { 
  Bell, ChevronDown, Download, Clock, Zap, TrendingUp, Database 
} from 'lucide-react';

const Reports = () => {
  return (
    <div className="flex-1 bg-[#f8fafc] flex flex-col min-h-screen">
      
      {/* Header Superior */}
      <header className="bg-white border-b border-slate-200 w-full h-[93px] px-8 sticky top-0 z-10 flex items-center shrink-0">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reportes de Gestión</h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-slate-200 transition-all">
               <Bell className="w-5 h-5 text-slate-600" />
               <div className="text-[10px] leading-tight text-left hidden md:block">
                 <span className="font-bold block text-slate-700">Notificaciones</span>
                 <span className="text-slate-500">Tu buzón de mensajes</span>
               </div>
               <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
            </div>

            <div className="flex items-center bg-[#2546b0] text-white rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-blue-800 transition-all shadow-sm">
               <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">DV</div>
               <div className="text-[10px] leading-tight text-left">
                 <span className="font-bold block tracking-wide">Dr. Diego Valdivia</span>
                 <span className="opacity-80">Juez de Paz Letrado</span>
               </div>
               <ChevronDown className="w-4 h-4 ml-1 opacity-60" />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido de Reportes */}
      <main className="p-8 w-full max-w-[1600px] mx-auto overflow-y-auto">
        
        {/* Título de Sección y Botón Exportar */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            Eficiencia y Ahorro de Tiempo del Sistema SIGEJA
          </h3>
          
          <button className="flex items-center bg-[#2546b0] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors shadow-md">
            <Download size={16} className="mr-2" />
            Exportar CSV
          </button>
        </div>

        {/* Tarjetas de Métricas (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Card 1: Ahorro Promedio */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-bold text-[#1a3059]">Ahorro Promedio</h4>
              <div className="p-2.5 bg-red-100 text-red-500 rounded-lg">
                <Clock size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-slate-800">42</span>
              <span className="text-xs font-bold text-slate-500">min / exp</span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 mt-3">vs. 45 min método manual</p>
          </div>

          {/* Card 2: Tiempo Sistema */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-bold text-[#1a3059]">Tiempo Sistema</h4>
              <div className="p-2.5 bg-blue-100 text-blue-500 rounded-lg">
                <Zap size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-blue-500">1</span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 mt-3">Promedio de inferencia global</p>
          </div>

          {/* Card 3: Tasa Automatización */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-bold text-[#1a3059]">Tasa Automatización</h4>
              <div className="p-2.5 bg-amber-100 text-amber-500 rounded-lg">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-4xl font-extrabold text-amber-500">82.5%</span>
            </div>
            {/* Barra de progreso */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1">
              <div className="bg-[#1a3059] h-1.5 rounded-full" style={{ width: '82.5%' }}></div>
            </div>
          </div>

          {/* Card 4: Volumen OCR */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-bold text-[#1a3059]">Volumen OCR</h4>
              <div className="p-2.5 bg-green-100 text-green-500 rounded-lg">
                <Database size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-green-500">12.4K</span>
              <span className="text-xs font-bold text-slate-500">págs</span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 mt-3">Digitalizadas exitosamente</p>
          </div>

        </div>

        {/* Tabla de Exportaciones */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
           <div className="p-6 border-b border-slate-100">
             <h4 className="text-lg font-bold text-[#1a3059] mb-1">Exportaciones de Metadata</h4>
             <p className="text-sm text-slate-500 font-medium">Registro de descargas CSV recientes</p>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-white text-[#1a3059] font-bold text-[10px] uppercase tracking-widest border-b border-slate-200">
                   <th className="px-6 py-4">Fecha y Hora</th>
                   <th className="px-6 py-4">Usuario</th>
                   <th className="px-6 py-4">Rango de Datos</th>
                   <th className="px-6 py-4">Tamaño</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                 <tr className="hover:bg-slate-50 transition-colors">
                   <td className="px-6 py-6">06/05/2026 14:30</td>
                   <td className="px-6 py-6">Admin - Sede central</td>
                   <td className="px-6 py-6">Abril 2026 - Completo</td>
                   <td className="px-6 py-6">2.4 MB</td>
                 </tr>
                 <tr className="hover:bg-slate-50 transition-colors">
                   <td className="px-6 py-6">02/05/2026 09:15</td>
                   <td className="px-6 py-6">Admin - Sede central</td>
                   <td className="px-6 py-6">Semana 4 (Abril)</td>
                   <td className="px-6 py-6">850 KB</td>
                 </tr>
                 <tr className="hover:bg-slate-50 transition-colors">
                   <td className="px-6 py-6">30/04/2026 10:30</td>
                   <td className="px-6 py-6">Admin - Sede central</td>
                   <td className="px-6 py-6">Marzo 2026 - Completo</td>
                   <td className="px-6 py-6">3.5 MB</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>

      </main>
    </div>
  );
};

export default Reports;