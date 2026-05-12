import React from 'react';
import { 
  Bell, 
  ChevronDown, 
  AlertCircle, 
  Clock, 
  FolderOpen, 
  CheckCircle2, 
  Search,
  Filter
} from 'lucide-react';

// Componente para las tarjetas de estadísticas (KPIs)
const StatCard = ({ label, value, subtext, icon: Icon, color, iconColor }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start transition-transform hover:scale-[1.02]">
    <div className="text-left">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</p>
      <h3 className={`text-4xl font-extrabold ${color}`}>{value}</h3>
      <p className="text-[10px] text-slate-400 mt-2 font-medium">{subtext}</p>
    </div>
    <div className={`p-2.5 rounded-lg ${iconColor} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${iconColor}`} />
    </div>
  </div>
);

const Dashboard = () => {
  // Datos de ejemplo para la tabla (luego vendrán del Backend)
  const expedientes = [
    { id: "00245-2026-0-1801-JP-CI-01", caratula: "GUTIÉRREZ FLORES, ANA c/ SÁNCHEZ ROJAS, CARLOS s/ ALIMENTOS", tipo: "Aumento de Alimentos", estado: "Pendiente", vencimiento: "2026-05-08", dias: "10 días restantes" },
    { id: "00198-2026-0-1801-JP-LA-02", caratula: "RODRÍGUEZ SILVA, ELENA c/ CASTILLO RAMOS, LUIS s/ PROCESO DE ALIMENTOS", tipo: "Fijación de Alimentos", estado: "En Proceso", vencimiento: "2026-05-08", dias: "10 días restantes" },
    { id: "00312-2026-0-1801-JP-FC-01", caratula: "LOZANO DIAZ, MIGUEL c/ FERNÁNDEZ QUISPE, ROSA s/ EXONERACIÓN DE ALIMENTOS", tipo: "Exoneración de Alimentos", estado: "Urgente", vencimiento: "2026-05-08", dias: "10 días restantes" },
  ];

  return (
    <div className="flex-1 bg-[#f8fafc] min-h-screen flex flex-col">
      
        {/* 1. Header Superior con la misma altura que el header de la Sidebar */}
        <header className="bg-white border-b border-slate-200 w-full h-[93px] px-8 sticky top-0 z-10 flex items-center">
        <div className="flex justify-between items-center w-full">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Página Principal</h2>
            
            <div className="flex items-center gap-4">
            {/* Botón Notificaciones */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-slate-200 transition-all">
                <Bell className="w-5 h-5 text-slate-600" />
                <div className="text-[10px] leading-tight text-left hidden md:block">
                <span className="font-bold block text-slate-700">Notificaciones</span>
                <span className="text-slate-500">Tu buzón de mensajes</span>
                </div>
                <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
            </div>

            {/* Perfil de Usuario */}
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

      {/* 2. Contenido Principal */}
      <main className="p-8 w-full max-w-[1600px] mx-auto">
        <h3 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">
          Vista general de expedientes asignados
        </h3>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Urgentes" value="2" subtext="Requieren atención inmediata" icon={AlertCircle} color="text-red-500" iconColor="text-red-500" />
          <StatCard label="En Proceso" value="1" subtext="En curso de tramitación" icon={Clock} color="text-blue-500" iconColor="text-blue-500" />
          <StatCard label="Pendiente" value="2" subtext="Esperando revisión" icon={FolderOpen} color="text-amber-500" iconColor="text-amber-500" />
          <StatCard label="Completados" value="1" subtext="Finalizados este mes" icon={CheckCircle2} color="text-green-500" iconColor="text-green-500" />
        </div>

        {/* Filtros y Buscador */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 mb-6 items-center">
          <div className="flex-1 min-w-[300px] relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Buscar por expediente o carátula..." 
               className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0] bg-slate-50/50" 
             />
          </div>
          <div className="flex gap-3">
            {/* Agregamos appearance-none y pr-10 aquí */}
            <select className="appearance-none pr-10 border border-slate-200 rounded-lg pl-4 py-2.5 text-xs font-bold text-slate-600 bg-white cursor-pointer hover:bg-slate-50 focus:outline-none focus:border-[#2546b0]">
              <option>Todos los estados</option>
              <option>Urgente</option>
              <option>Pendiente</option>
            </select>
            {/* Y también aquí */}
            <select className="appearance-none pr-10 border border-slate-200 rounded-lg pl-4 py-2.5 text-xs font-bold text-slate-600 bg-white cursor-pointer hover:bg-slate-50 focus:outline-none focus:border-[#2546b0]">
              <option>Todos los tipos</option>
            </select>
          </div>
        </div>

        {/* Tabla de Expedientes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
           <div className="p-5 border-b border-slate-100 bg-slate-50/30">
             <h4 className="font-bold text-slate-700 text-sm">Expedientes Asignados ({expedientes.length})</h4>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                   <th className="px-6 py-4">Expediente</th>
                   <th className="px-6 py-4">Carátula</th>
                   <th className="px-6 py-4">Tipo</th>
                   <th className="px-6 py-4">Estado</th>
                   <th className="px-6 py-4">Vencimiento</th>
                   <th className="px-6 py-4 text-center">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {expedientes.map((exp, index) => (
                   <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                     <td className="px-6 py-5 font-bold text-slate-700 text-xs">{exp.id}</td>
                     <td className="px-6 py-5 text-[11px] text-slate-600 leading-relaxed max-w-xs">{exp.caratula}</td>
                     <td className="px-6 py-5 text-[11px] text-slate-500 font-medium">{exp.tipo}</td>
                     <td className="px-6 py-5">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-sm ${
                         exp.estado === 'Urgente' ? 'bg-red-100 text-red-600 border border-red-200' :
                         exp.estado === 'En Proceso' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
                         'bg-amber-100 text-amber-600 border border-amber-200'
                       }`}>
                         {exp.estado}
                       </span>
                     </td>
                     <td className="px-6 py-5">
                        <div className="text-[11px] font-bold text-slate-700">{exp.vencimiento}</div>
                        <div className="text-[9px] text-slate-400 font-medium">{exp.dias}</div>
                     </td>
                     <td className="px-6 py-5 text-center">
                       <button className="text-[#2546b0] font-bold text-xs hover:underline flex items-center justify-center w-full gap-1 group-hover:translate-x-1 transition-transform">
                         Ver análisis <span className="text-lg">›</span>
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;