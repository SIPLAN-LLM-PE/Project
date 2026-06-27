import React, { useState, useEffect } from 'react';
import {
  Bell, ChevronDown, Download, BrainCircuit, Activity, Fingerprint, ShieldCheck, Loader2, X, ChevronRight
} from 'lucide-react';

const Audit = () => {
  // 1. Estados para almacenar los datos de seguridad y manejar las pantallas de carga
  const [securityData, setSecurityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrDetails, setOcrDetails] = useState(null);
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);

  const [isBertModalOpen, setIsBertModalOpen] = useState(false);
  const [bertDetails, setBertDetails] = useState(null);
  const [isLoadingBert, setIsLoadingBert] = useState(false);

  const [isF1ModalOpen, setIsF1ModalOpen] = useState(false);
  const [f1Details, setF1Details] = useState(null);
  const [isLoadingF1, setIsLoadingF1] = useState(false);

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

  // 3. Abrir el modal con detalle OCR por expediente
  const handleAbrirOcrDetalle = async () => {
    setIsOcrModalOpen(true);
    if (ocrDetails) return; // ya cargado
    setIsLoadingOcr(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/security/ocr-details');
      const data = await res.json();
      setOcrDetails(data);
    } catch (e) {
      console.error('Error cargando detalle OCR:', e);
    } finally {
      setIsLoadingOcr(false);
    }
  };

  const handleAbrirBertDetalle = async () => {
    setIsBertModalOpen(true);
    if (bertDetails) return;
    setIsLoadingBert(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/security/bertscore-details');
      setBertDetails(await res.json());
    } catch (e) {
      console.error('Error cargando detalle BERTScore:', e);
    } finally {
      setIsLoadingBert(false);
    }
  };

  const handleAbrirF1Detalle = async () => {
    setIsF1ModalOpen(true);
    if (f1Details) return;
    setIsLoadingF1(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/security/f1-details');
      setF1Details(await res.json());
    } catch (e) {
      console.error('Error cargando detalle F1:', e);
    } finally {
      setIsLoadingF1(false);
    }
  };

  // 4. Función para descargar el CSV de auditoría
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
              
              {/* Card 1: BERTScore — clickeable */}
              <div
                onClick={securityData?.kpis?.docs_bert > 0 ? handleAbrirBertDetalle : undefined}
                className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all ${securityData?.kpis?.docs_bert > 0 ? 'cursor-pointer hover:border-slate-400 hover:shadow-md' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-bold text-[#1a3059]">BERTSCORE (RAG)</h4>
                  {securityData?.kpis?.docs_bert > 0 && (
                    <span className="text-[9px] font-bold text-slate-500 flex items-center gap-0.5">
                      Ver detalle <ChevronRight size={10} />
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-800">
                      {securityData?.kpis?.bertscore ?? "—"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">/ 1.0</span>
                  </div>
                  <div className="p-2.5 bg-red-100 text-red-400 rounded-lg">
                    <BrainCircuit size={24} />
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] font-medium">
                  <span className="text-slate-700">
                    {securityData?.kpis?.docs_bert > 0
                      ? `Promedio de ${securityData.kpis.docs_bert} doc(s)`
                      : "Sin datos aún"}
                  </span>
                  <span className="text-slate-400">Objetivo: {'>'} 0.70</span>
                </div>
              </div>

              {/* Card 2: F1-Score NER — clickeable */}
              <div
                onClick={securityData?.kpis?.docs_f1 > 0 ? handleAbrirF1Detalle : undefined}
                className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all ${securityData?.kpis?.docs_f1 > 0 ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-bold text-[#1a3059]">F1 - Score (NER)</h4>
                  {securityData?.kpis?.docs_f1 > 0 && (
                    <span className="text-[9px] font-bold text-blue-500 flex items-center gap-0.5">
                      Ver detalle <ChevronRight size={10} />
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-blue-600">
                      {securityData?.kpis?.f1_score ?? "—"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">/ 1.0</span>
                  </div>
                  <div className="p-2.5 bg-blue-100 text-blue-500 rounded-lg">
                    <Activity size={24} />
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] font-medium">
                  <span className="text-slate-700">
                    {securityData?.kpis?.docs_f1 > 0
                      ? `Promedio de ${securityData.kpis.docs_f1} doc(s)`
                      : "Sin datos aún"}
                  </span>
                  <span className="text-slate-400">Objetivo: {'>'} 0.80</span>
                </div>
              </div>

              {/* Card 3: Precisión OCR — clickeable para ver detalle por expediente */}
              <div
                onClick={securityData?.kpis?.docs_ocr > 0 ? handleAbrirOcrDetalle : undefined}
                className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all ${securityData?.kpis?.docs_ocr > 0 ? 'cursor-pointer hover:border-amber-300 hover:shadow-md' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-bold text-[#1a3059]">Precisión OCR</h4>
                  {securityData?.kpis?.docs_ocr > 0 && (
                    <span className="text-[9px] font-bold text-amber-500 flex items-center gap-0.5">
                      Ver detalle <ChevronRight size={10} />
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-amber-500">
                      {securityData?.kpis?.precision_ocr ?? "—"}{securityData?.kpis?.precision_ocr != null ? "%" : ""}
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-100 text-amber-500 rounded-lg">
                    <Fingerprint size={24} />
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] font-medium">
                  <span className="text-slate-700">
                    {securityData?.kpis?.docs_ocr > 0
                      ? `Promedio de ${securityData.kpis.docs_ocr} doc(s)`
                      : securityData?.kpis?.primera_fecha
                        ? `Desde ${securityData.kpis.primera_fecha.split(" ")[0]}`
                        : "Sin datos aún"}
                  </span>
                  <span className="text-slate-400">Objetivo: {'>'} 85%</span>
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

      {/* Modal de detalle OCR por expediente */}
      {isOcrModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-[#1a3059]">Precisión OCR por Expediente</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Comparación texto nativo (PyPDF2) vs texto procesado por OCR.
                  Para PDFs escaneados sin texto nativo se usa una heurística de calidad de caracteres.
                </p>
              </div>
              <button
                onClick={() => setIsOcrModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors ml-4 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="overflow-y-auto flex-1 p-6">
              {isLoadingOcr ? (
                <div className="flex items-center justify-center h-32 text-amber-500">
                  <Loader2 size={28} className="animate-spin mr-2" />
                  <span className="text-sm font-bold">Cargando datos...</span>
                </div>
              ) : ocrDetails?.expedientes?.length > 0 ? (
                <>
                  {/* Resumen global */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Promedio global</p>
                      <p className="text-3xl font-extrabold text-amber-600">{ocrDetails.promedio_global}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{ocrDetails.total} expediente(s) analizados</p>
                      <p className="text-[10px] text-slate-400 mt-1">Objetivo: &gt; 85%</p>
                    </div>
                  </div>

                  {/* Un bloque por expediente */}
                  <div className="flex flex-col gap-3">
                    {ocrDetails.expedientes.map((exp, idx) => {
                      const colorProm = exp.ocr_promedio >= 85 ? 'text-emerald-600' : exp.ocr_promedio >= 70 ? 'text-amber-500' : 'text-red-500';
                      return (
                        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                          {/* Cabecera del expediente */}
                          <div className="flex justify-between items-center bg-slate-50 px-4 py-3 border-b border-slate-200">
                            <div>
                              <p className="text-[11px] font-mono font-bold text-slate-700">{exp.expediente}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{exp.fecha}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 font-medium">Promedio expediente</p>
                              <p className={`text-xl font-extrabold ${colorProm}`}>{exp.ocr_promedio}%</p>
                            </div>
                          </div>

                          {/* Desglose por PDF */}
                          {exp.documentos && exp.documentos.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                              {exp.documentos.map((pdf, pIdx) => {
                                const colorPdf = pdf.ocr_precision >= 85 ? 'text-emerald-600' : pdf.ocr_precision >= 70 ? 'text-amber-500' : 'text-red-500';
                                const badgeColor = pdf.metodo === 'PyPDF2'
                                  ? 'bg-blue-100 text-blue-600'
                                  : pdf.metodo === 'pdfplumber'
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-orange-100 text-orange-600';
                                return (
                                  <div key={pIdx} className="flex justify-between items-center px-4 py-2.5 hover:bg-slate-50">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badgeColor}`}>
                                        {pdf.metodo}
                                      </span>
                                      <span className="text-[11px] text-slate-600 truncate font-medium" title={pdf.archivo}>
                                        {pdf.archivo}
                                      </span>
                                    </div>
                                    <span className={`text-sm font-extrabold shrink-0 ml-3 ${colorPdf}`}>
                                      {pdf.ocr_precision}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="px-4 py-2.5 text-[11px] text-slate-400 italic">
                              Detalle por PDF no disponible (analizado antes de esta versión)
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Leyenda */}
                  <div className="flex gap-4 mt-5 text-[10px] font-medium text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>≥ 85% Bueno</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>70–84% Aceptable</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>&lt; 70% Revisar</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 py-10 text-sm">
                  No hay expedientes con datos de precisión OCR aún.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal BERTScore */}
      {isBertModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[75vh] flex flex-col">
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-[#1a3059]">BERTScore (RAG) por Expediente</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fracción del vocabulario del resumen IA que proviene del documento fuente.
                  Valores cercanos a 1.0 indican alta fidelidad (sin alucinaciones).
                </p>
              </div>
              <button onClick={() => setIsBertModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg ml-4 shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {isLoadingBert ? (
                <div className="flex items-center justify-center h-32 text-slate-500">
                  <Loader2 size={28} className="animate-spin mr-2" /><span className="text-sm font-bold">Cargando...</span>
                </div>
              ) : bertDetails?.expedientes?.length > 0 ? (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Promedio global</p>
                      <p className="text-3xl font-extrabold text-slate-800">{bertDetails.promedio_global}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{bertDetails.total} expediente(s)</p>
                      <p className="text-[10px] text-slate-400 mt-1">Objetivo: &gt; 0.70</p>
                    </div>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                        <th className="pb-3 pr-4">Expediente</th>
                        <th className="pb-3 pr-4">Fecha</th>
                        <th className="pb-3 pr-4 text-right">Score</th>
                        <th className="pb-3 text-right">Chars resumen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bertDetails.expedientes.map((e, i) => {
                        const color = e.bert_score >= 0.70 ? 'text-emerald-600' : e.bert_score >= 0.50 ? 'text-amber-500' : 'text-red-500';
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-3 pr-4 font-mono font-bold text-slate-700 text-[10px]">{e.expediente}</td>
                            <td className="py-3 pr-4 text-slate-500">{e.fecha}</td>
                            <td className={`py-3 pr-4 text-right font-extrabold text-sm ${color}`}>{e.bert_score}</td>
                            <td className="py-3 text-right text-slate-400">{e.chars_resumen > 0 ? `${e.chars_resumen} chars` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex gap-4 mt-4 text-[10px] font-medium text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>≥ 0.70 Fiel</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>0.50–0.69 Aceptable</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>&lt; 0.50 Revisar</span>
                  </div>
                </>
              ) : (
                <p className="text-center text-slate-500 py-10 text-sm">Sin datos aún.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal F1-Score NER */}
      {isF1ModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-[#1a3059]">F1-Score NER por Expediente</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Campos detectados por el sistema NER (spaCy + Regex + Mistral). 5 campos esperados por expediente.
                </p>
              </div>
              <button onClick={() => setIsF1ModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg ml-4 shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {isLoadingF1 ? (
                <div className="flex items-center justify-center h-32 text-blue-500">
                  <Loader2 size={28} className="animate-spin mr-2" /><span className="text-sm font-bold">Cargando...</span>
                </div>
              ) : f1Details?.expedientes?.length > 0 ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Promedio global</p>
                      <p className="text-3xl font-extrabold text-blue-600">{f1Details.promedio_global}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{f1Details.total} expediente(s)</p>
                      <p className="text-[10px] text-slate-400 mt-1">Objetivo: &gt; 0.80</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {f1Details.expedientes.map((exp, idx) => {
                      const nulos = ['No detectado', 'No encontrado', '', null, undefined];
                      const campos = exp.campos || {};
                      const filas = [
                        { label: 'Nombre demandante', valor: campos.demandante_nombre },
                        { label: 'DNI demandante',    valor: campos.demandante_dni },
                        { label: 'Nombre demandado',  valor: campos.demandado_nombre },
                        { label: 'DNI demandado',     valor: campos.demandado_dni },
                        { label: 'Monto petitorio',   valor: campos.monto > 0 ? `S/. ${campos.monto.toFixed(2)}` : null },
                      ];
                      const colorF1 = exp.f1_ner >= 0.80 ? 'text-emerald-600' : exp.f1_ner >= 0.60 ? 'text-amber-500' : 'text-red-500';
                      return (
                        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="flex justify-between items-center bg-slate-50 px-4 py-3 border-b border-slate-200">
                            <div>
                              <p className="text-[11px] font-mono font-bold text-slate-700">{exp.expediente}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{exp.fecha}</p>
                            </div>
                            <p className={`text-xl font-extrabold ${colorF1}`}>{exp.f1_ner} / 1.0</p>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {filas.map((f, fi) => {
                              const detectado = f.valor && !nulos.includes(f.valor);
                              return (
                                <div key={fi} className="flex justify-between items-center px-4 py-2.5">
                                  <span className="text-[11px] text-slate-600 font-medium">{f.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-mono ${detectado ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                      {detectado ? f.valor : 'No encontrado'}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${detectado ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-center text-slate-500 py-10 text-sm">Sin datos aún.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Audit;