import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown, Download, Clock, Zap, TrendingUp, Loader2, AlertTriangle, Search, ArrowUpDown, Users, FileStack, BarChart3
} from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import LiveNotifications from '../../components/common/LiveNotifications';

const EXPORTACIONES_POR_PAGINA = 8;

const Reports = () => {
  const navigate = useNavigate();
  const usuarioActivo = JSON.parse(localStorage.getItem('usuario')) || { nombre: 'Usuario SIGEJA', cargo: 'Personal Judicial' };
  // 1. Estados para almacenar la información del backend y manejar la carga
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filtroExpediente, setFiltroExpediente] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [ordenReporte, setOrdenReporte] = useState({ campo: 'fecha', dir: 'desc' });

  // ESTADO DE PAGINACIÓN DE EXPORTACIONES
  const [paginaExport, setPaginaExport] = useState(1);
  const totalExportaciones = dashboardData?.exportaciones_recientes?.length || 0;
  const exportacionesPaginadas = (dashboardData?.exportaciones_recientes || []).slice(
    (paginaExport - 1) * EXPORTACIONES_POR_PAGINA,
    paginaExport * EXPORTACIONES_POR_PAGINA
  );

  const expedientesReporte = useMemo(() => {
    const busqueda = filtroExpediente.trim().toLowerCase();
    return [...(dashboardData?.por_expediente || [])]
      .filter(item => {
        const coincideTexto = !busqueda || [
          item.numero_expediente,
          item.caratula,
          item.estado_auditoria,
          item.riesgo_capacidad,
          item.alerta
        ].some(valor => String(valor || '').toLowerCase().includes(busqueda));
        const coincideEstado = filtroEstado === 'todos' || item.estado === filtroEstado || item.alerta === filtroEstado;
        return coincideTexto && coincideEstado;
      })
      .sort((a, b) => {
        const dir = ordenReporte.dir === 'asc' ? 1 : -1;
        const av = a[ordenReporte.campo] ?? '';
        const bv = b[ordenReporte.campo] ?? '';
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), 'es') * dir;
      });
  }, [dashboardData, filtroExpediente, filtroEstado, ordenReporte]);

  const productividadSemanal = dashboardData?.productividad_semanal || [];
  const maxExpedientesSemana = Math.max(1, ...productividadSemanal.map(item => Number(item.expedientes || 0)));
  const maxDocumentosSemana = Math.max(1, ...productividadSemanal.map(item => Number(item.documentos || 0)));
  const maxAhorroSemana = Math.max(1, ...productividadSemanal.map(item => Number(item.ahorro_min || 0)));
  const productividadTotales = productividadSemanal.reduce((acc, item) => ({
    expedientes: acc.expedientes + Number(item.expedientes || 0),
    documentos: acc.documentos + Number(item.documentos || 0),
    ahorroHoras: acc.ahorroHoras + Number(item.ahorro_horas || 0)
  }), { expedientes: 0, documentos: 0, ahorroHoras: 0 });

  const cambiarOrdenReporte = (campo) => {
    setOrdenReporte(prev => ({
      campo,
      dir: prev.campo === campo && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 2. Cargar las métricas al iniciar el componente
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/reports/dashboard-metrics');
        const data = await response.json();
        setDashboardData(data);
        setPaginaExport(1);
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
      <header className="bg-white border-b border-slate-200 w-full h-[76px] xl:h-[93px] px-4 xl:px-8 sticky top-0 z-10 flex items-center shrink-0">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reportes de Gestión</h2>
          
          <div className="flex items-center gap-2 xl:gap-4">
            <LiveNotifications usuarioActivo={usuarioActivo} />

            <div onClick={() => navigate('/profile')} className="flex items-center bg-[#2546b0] text-white rounded-lg px-3 xl:px-4 py-1.5 gap-2 xl:gap-3 cursor-pointer hover:bg-blue-800 transition-all shadow-sm max-w-[220px] xl:max-w-none">
               <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">{usuarioActivo.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'US'}</div>
               <div className="text-[10px] leading-tight text-left min-w-0">
                 <span className="font-bold block tracking-wide truncate max-w-[130px] xl:max-w-none">{usuarioActivo.nombre}</span>
                 <span className="opacity-80">{usuarioActivo.cargo}</span>
               </div>
               <ChevronDown className="w-4 h-4 ml-1 opacity-60" />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido de Reportes */}
      <main className="p-4 xl:p-8 w-full max-w-[1600px] mx-auto overflow-y-auto custom-scrollbar">
        
        {/* Título de Sección y Botón Exportar */}
        <div className="flex justify-between items-center gap-4 mb-6">
          <h3 className="text-xl xl:text-2xl font-bold text-slate-800 tracking-tight">
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
                  <h4 className="text-sm font-bold text-[#1a3059]">Documentos Procesados</h4>
                  <div className="p-2.5 bg-green-100 text-green-500 rounded-lg">
                    <FileStack size={20} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-green-500">
                    {dashboardData?.kpis?.documentos_procesados || "0"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">docs</span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 mt-3">
                  {dashboardData?.kpis?.volumen_ocr_pags || "0"} pags OCR · {dashboardData?.kpis?.ahorro_total_horas || "0"} h ahorradas
                </p>
              </div>

            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2546b0]">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-[#1a3059] text-sm">Productividad semanal</h4>
                    <p className="text-xs text-slate-500 font-medium">Expedientes, documentos y ahorro estimado por semana</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-right">
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Exp.</p>
                    <p className="text-sm font-black text-[#2546b0]">{productividadTotales.expedientes}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Docs</p>
                    <p className="text-sm font-black text-emerald-600">{productividadTotales.documentos}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ahorro</p>
                    <p className="text-sm font-black text-amber-600">{productividadTotales.ahorroHoras.toFixed(1)} h</p>
                  </div>
                </div>
              </div>

              {productividadSemanal.length > 0 ? (
                <div className="p-5">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {productividadSemanal.map(item => (
                      <div key={item.semana} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semana</p>
                            <h5 className="text-lg font-black text-[#1a3059]">{item.label}</h5>
                          </div>
                          <div className="text-right text-[10px] font-bold text-slate-500 leading-relaxed">
                            <p>{item.paginas || 0} pags OCR</p>
                            <p>{item.tiempo_promedio_seg || 0}s prom.</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-wide mb-1">
                              <span className="text-[#2546b0]">Expedientes</span>
                              <span className="text-slate-500">{item.expedientes} exp</span>
                            </div>
                            <div className="h-3 bg-white border border-blue-50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#2546b0]" style={{ width: `${Math.max(6, (item.expedientes / maxExpedientesSemana) * 100)}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-wide mb-1">
                              <span className="text-emerald-600">Documentos</span>
                              <span className="text-slate-500">{item.documentos} docs</span>
                            </div>
                            <div className="h-3 bg-white border border-emerald-50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(6, (item.documentos / maxDocumentosSemana) * 100)}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-wide mb-1">
                              <span className="text-amber-600">Ahorro estimado</span>
                              <span className="text-slate-500">{item.ahorro_horas} h</span>
                            </div>
                            <div className="h-3 bg-white border border-amber-50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(6, (item.ahorro_min / maxAhorroSemana) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 font-medium">
                  Aun no hay semanas con actividad suficiente para graficar productividad.
                </div>
              )}
            </div>

            {dashboardData?.alertas?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <h4 className="text-sm font-black text-amber-900">Alertas visuales de seguimiento</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {dashboardData.alertas.map((alerta, index) => (
                    <div key={`${alerta.expediente}-${index}`} className="bg-white border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">{alerta.tipo}</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">{alerta.expediente}</p>
                      <p className="text-[10px] text-slate-500 mt-1 truncate">{alerta.detalle}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <TrendingUp size={17} className="text-[#2546b0]" />
                  <h4 className="font-bold text-[#1a3059] text-sm">Métricas por estado</h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {(dashboardData?.por_estado || []).map(item => (
                    <div key={item.estado} className="px-5 py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.estado}</p>
                        <p className="text-slate-500 mt-0.5">OCR prom. {item.ocr_promedio}% · {item.tiempo_promedio}s prom.</p>
                      </div>
                      <span className="text-lg font-black text-[#2546b0]">{item.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Users size={17} className="text-[#2546b0]" />
                  <h4 className="font-bold text-[#1a3059] text-sm">Carga por usuario y rol</h4>
                </div>
                <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto custom-scrollbar">
                  {(dashboardData?.por_usuario || []).map(item => (
                    <div key={`${item.usuario}-${item.rol}`} className="px-5 py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.usuario}</p>
                        <p className="text-slate-500 mt-0.5">{item.rol}</p>
                      </div>
                      <span className="text-lg font-black text-[#2546b0]">{item.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-[#1a3059] mb-1">Métricas por expediente</h4>
                  <p className="text-sm text-slate-500 font-medium">Filtra, ordena y revisa alertas de calidad o riesgo</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[260px_190px] gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={filtroExpediente}
                      onChange={(e) => setFiltroExpediente(e.target.value)}
                      placeholder="Buscar expediente o alerta..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#2546b0]"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-9 text-xs font-bold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#2546b0]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Completado">Completados</option>
                      <option value="Pendiente">Pendientes</option>
                      <option value="Brecha financiera">Brecha financiera</option>
                      <option value="Riesgo de capacidad alto">Riesgo alto</option>
                      <option value="OCR bajo">OCR bajo</option>
                      <option value="BERTScore bajo">BERTScore bajo</option>
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                      <th className="px-5 py-3">
                        <button type="button" onClick={() => cambiarOrdenReporte('numero_expediente')} className="flex items-center gap-1 hover:text-[#2546b0]">Expediente <ArrowUpDown size={12} /></button>
                      </th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3">
                        <button type="button" onClick={() => cambiarOrdenReporte('ocr_precision')} className="flex items-center gap-1 hover:text-[#2546b0]">OCR <ArrowUpDown size={12} /></button>
                      </th>
                      <th className="px-5 py-3">
                        <button type="button" onClick={() => cambiarOrdenReporte('bert_score')} className="flex items-center gap-1 hover:text-[#2546b0]">BERT <ArrowUpDown size={12} /></button>
                      </th>
                      <th className="px-5 py-3">Alerta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                    {expedientesReporte.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-black text-[#1a3059]">{item.numero_expediente}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[280px]">{item.caratula}</p>
                        </td>
                        <td className="px-5 py-4">{item.estado}</td>
                        <td className="px-5 py-4">{item.ocr_precision ?? 'N/D'}%</td>
                        <td className="px-5 py-4">{item.bert_score ?? 'N/D'}</td>
                        <td className="px-5 py-4">
                          {item.alerta ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-[10px]">{item.alerta}</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px]">Sin alerta</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expedientesReporte.length === 0 && (
                  <div className="p-8 text-center text-slate-500 font-medium">No hay expedientes para los filtros seleccionados.</div>
                )}
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
                     {exportacionesPaginadas.map((item) => (
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

               {/* Controles de Paginación */}
               <Pagination
                 currentPage={paginaExport}
                 totalItems={totalExportaciones}
                 itemsPerPage={EXPORTACIONES_POR_PAGINA}
                 onPageChange={setPaginaExport}
                 itemLabel="exportaciones"
               />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Reports;
