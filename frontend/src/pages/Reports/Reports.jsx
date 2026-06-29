import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, ChevronDown, Download, Clock, Zap, TrendingUp, Database, Loader2 
} from 'lucide-react';

const Reports = () => {
  const navigate = useNavigate();
  const usuarioActivo = JSON.parse(localStorage.getItem('usuario')) || { nombre: 'Usuario SIGEJA', cargo: 'Personal Judicial' };
  // 1. Estados para almacenar la información del backend y manejar la carga
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 2. Cargar las métricas al iniciar el componente
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/reports/dashboard-metrics');
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Error al cargar las métricas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // 3. Función para descargar el CSV
  const handleExportarCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/reports/export-csv');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Metadata_SIGEJA_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar el CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

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

            <div onClick={() => navigate('/profile')} className="flex items-center bg-[#2546b0] text-white rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-blue-800 transition-all shadow-sm">
               <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">{usuarioActivo.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'US'}</div>
               <div className="text-[10px] leading-tight text-left">
                 <span className="font-bold block tracking-wide">{usuarioActivo.nombre}</span>
                 <span className="opacity-80">{usuarioActivo.cargo}</span>
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
          
          <button 
            onClick={handleExportarCSV}
            disabled={isExporting || isLoading}
            className={`flex items-center bg-[#2546b0] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-md ${isExporting || isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-800'}`}
          >
            {isExporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>

        {/* Pantalla de carga mientras trae los datos de FastAPI */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-[#2546b0]">
            <Loader2 size={40} className="animate-spin" />
            <span className="ml-3 font-bold text-lg">Cargando métricas del sistema...</span>
          </div>
        ) : (
          <>
            {/* Tarjetas de Métricas (KPIs) dinámicas */}
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
                  <span className="text-4xl font-extrabold text-slate-800">
                    {dashboardData?.kpis?.ahorro_promedio_min || "0"}
                  </span>
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
                  <span className="text-4xl font-extrabold text-blue-500">
                    {dashboardData?.kpis?.tiempo_sistema_seg || "0"}
                  </span>
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
                  <span className="text-4xl font-extrabold text-amber-500">
                    {dashboardData?.kpis?.tasa_automatizacion_pct || "0"}%
                  </span>
                </div>
                {/* Barra de progreso dinámica */}
                <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1">
                  <div 
                    className="bg-[#1a3059] h-1.5 rounded-full" 
                    style={{ width: `${dashboardData?.kpis?.tasa_automatizacion_pct || 0}%` }}
                  ></div>
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
                  <span className="text-4xl font-extrabold text-green-500">
                    {dashboardData?.kpis?.volumen_ocr_pags || "0"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">págs</span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 mt-3">Digitalizadas exitosamente</p>
              </div>

            </div>

            {/* Tabla de Exportaciones dinámica */}
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
                     {dashboardData?.exportaciones_recientes?.map((item) => (
                       <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-6">{item.fecha}</td>
                         <td className="px-6 py-6">{item.usuario}</td>
                         <td className="px-6 py-6">{item.rango}</td>
                         <td className="px-6 py-6">{item.tamano}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 
                 {/* Mensaje si no hay historial */}
                 {(!dashboardData?.exportaciones_recientes || dashboardData.exportaciones_recientes.length === 0) && (
                    <div className="p-8 text-center text-slate-500 font-medium">
                      Aún no hay exportaciones registradas en el sistema.
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

export default Reports;
