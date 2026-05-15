import React, { useState, useEffect } from 'react';
import { 
  Bell, ChevronDown, Download, BrainCircuit, Activity, Fingerprint, ShieldCheck, Loader2 
} from 'lucide-react';

const Audit = () => {
  // 1. Estados para almacenar los datos de seguridad y manejar las pantallas de carga
  const [securityData, setSecurityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 2. Fetch para traer los datos del backend al cargar la página
  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/security/dashboard-metrics');
        const data = await response.json();
        setSecurityData(data);
      } catch (error) {
        console.error("Error al cargar las métricas de seguridad:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSecurityData();
  }, []);

  // 3. Función para descargar el CSV de auditoría
  const handleExportarCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/security/export-csv');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Log_Seguridad_SIPLAN_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar el log:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#f8fafc] flex flex-col min-h-screen">
      
      {/* Header Superior */}
      <header className="bg-white border-b border-slate-200 w-full h-[93px] px-8 sticky top-0 z-10 flex items-center shrink-0">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Calidad y Auditoría</h2>
          
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

      {/* Contenido Principal */}
      <main className="p-8 w-full max-w-[1600px] mx-auto overflow-y-auto">
        
        {/* Título de Sección y Botón Exportar */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            Metricas de validación y monitorización de seguridad
          </h3>
          
          <button 
            onClick={handleExportarCSV}
            disabled={isExporting || isLoading}
            className={`flex items-center bg-[#2546b0] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors ${isExporting || isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-800'}`}
          >
            {isExporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>

        {/* Pantalla de carga mientras trae los datos de la base de datos */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-[#2546b0]">
            <Loader2 size={40} className="animate-spin" />
            <span className="ml-3 font-bold text-lg">Cargando auditoría de seguridad...</span>
          </div>
        ) : (
          <>
            {/* Tarjetas de Métricas de Calidad dinámicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              
              {/* Card 1: BERTScore */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h4 className="text-sm font-bold text-[#1a3059] mb-4">BERTSCORE (RAG)</h4>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-800">
                      {securityData?.kpis?.bertscore || "0.00"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">/ 1.0</span>
                  </div>
                  <div className="p-2.5 bg-red-100 text-red-400 rounded-lg">
                    <BrainCircuit size={24} />
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] font-medium">
                  <span className="text-slate-700">Meta Superada</span>
                  <span className="text-slate-400">Objetivo: {'>'} 0.70</span>
                </div>
              </div>

              {/* Card 2: F1-Score NER */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h4 className="text-sm font-bold text-[#1a3059] mb-4">F1 - Score (NER)</h4>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-blue-600">
                      {securityData?.kpis?.f1_score || "0.00"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">/ 1.0</span>
                  </div>
                  <div className="p-2.5 bg-blue-100 text-blue-500 rounded-lg">
                    <Activity size={24} />
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] font-medium">
                  <span className="text-slate-700">Meta Superada</span>
                  <span className="text-slate-400">Objetivo: {'>'} 0.80</span>
                </div>
              </div>

              {/* Card 3: Precisión OCR */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h4 className="text-sm font-bold text-[#1a3059] mb-4">Presición OCR</h4>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-amber-500">
                      {securityData?.kpis?.precision_ocr || "0"}%
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-100 text-amber-500 rounded-lg">
                    <Fingerprint size={24} />
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] font-medium">
                  <span className="text-slate-700">Óptimo</span>
                  <span className="text-slate-400">Objetivo: {'>'} 0.85%</span>
                </div>
              </div>

              {/* Card 4: Fuga de Datos */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h4 className="text-sm font-bold text-[#1a3059] mb-4">Fuga de Datos</h4>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-green-500">
                      {securityData?.kpis?.fuga_datos || "0"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">incidentes</span>
                  </div>
                  <div className="p-2.5 bg-green-100 text-green-500 rounded-lg">
                    <ShieldCheck size={24} />
                  </div>
                </div>
                <div className="text-[10px] font-medium">
                  <span className="text-slate-500">No se detecto fuga de datos</span>
                </div>
              </div>

            </div>

            {/* Tabla de Logs de Seguridad dinámica */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
               <div className="p-6 border-b border-slate-100">
                 <h4 className="text-lg font-bold text-[#1a3059] mb-1">Log de Seguridad y Auditoría</h4>
                 <p className="text-sm text-slate-500 font-medium">Registro inalterable de accesos y modificaciones críticas</p>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-white text-[#1a3059] font-bold text-[10px] uppercase tracking-widest border-b border-slate-200">
                       <th className="px-6 py-4">Timestamp</th>
                       <th className="px-6 py-4">Usuario</th>
                       <th className="px-6 py-4">Acción Registrada</th>
                       <th className="px-6 py-4">Expediente</th>
                       <th className="px-6 py-4">IP Origen</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-800">
                     {securityData?.logs?.map((item) => (
                       <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-6">{item.timestamp}</td>
                         <td className="px-6 py-6">{item.usuario}</td>
                         <td className="px-6 py-6">{item.accion}</td>
                         <td className="px-6 py-6">{item.expediente}</td>
                         <td className="px-6 py-6">{item.ip}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>

                 {/* Mensaje si la tabla está vacía */}
                 {(!securityData?.logs || securityData.logs.length === 0) && (
                    <div className="p-8 text-center text-slate-500 font-medium">
                      Aún no hay eventos registrados en el log de seguridad.
                    </div>
                 )}
               </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
};

export default Audit;