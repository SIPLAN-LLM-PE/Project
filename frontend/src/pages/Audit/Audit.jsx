import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown, Download, BrainCircuit, Activity, Fingerprint, ShieldCheck, Loader2, X, ChevronRight,
  Upload, Save, RefreshCw, BarChart3
} from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import LiveNotifications from '../../components/common/LiveNotifications';

const LOGS_POR_PAGINA = 8;

const NER_VALIDATION_FIELDS = [
  { key: 'nombre_demandante', label: 'Nombre de la demandante', multiline: false, helper: 'Parte que solicita alimentos.' },
  { key: 'nombre_demandado', label: 'Nombre del demandado', multiline: false, helper: 'Parte obligada o presunto obligado.' },
  { key: 'menor', label: 'Nombre o iniciales del menor', multiline: false, helper: 'Usa iniciales si el documento está anonimizado.' },
  { key: 'dni_demandante', label: 'DNI de la demandante', multiline: false, helper: 'DNI adulto, no CUI del menor.' },
  { key: 'dni_demandado', label: 'DNI del demandado', multiline: false, helper: 'DNI adulto, no CUI del menor.' },
  { key: 'monto_petitorio', label: 'Petitorio', multiline: false, helper: 'Monto principal solicitado por alimentos.' },
  { key: 'ingreso_demandado', label: 'Ingreso del demandado', multiline: false, helper: 'Ingreso o remuneración base detectada.' },
  { key: 'monto_fijado_ofrecido', label: 'Monto fijado/ofrecido', multiline: false, helper: 'Monto ordenado, conciliado u ofrecido.' },
  { key: 'fecha_presentacion_demanda', label: 'Presentación de demanda', multiline: false, helper: 'Fecha de ingreso o presentación de la demanda.' },
  { key: 'fecha_audiencia_unica', label: 'Audiencia única', multiline: false, helper: 'Fecha de audiencia única o acta de audiencia.' },
  { key: 'fecha_resolucion_admisorio', label: 'Resolución/admisorio', multiline: false, helper: 'Fecha de auto admisorio o resolución principal.' }
];

const NER_FIELD_LABELS = Object.fromEntries(NER_VALIDATION_FIELDS.map(field => [field.key, field.label]));

const emptyNerReference = () => Object.fromEntries(NER_VALIDATION_FIELDS.map(field => [field.key, '']));

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 2)}%`;
};

const getNerFieldClass = (value) => {
  if (value === null || value === undefined) return 'text-slate-400 bg-slate-50 border-slate-200';
  if (Number(value) >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (Number(value) >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
};

const getLogBadgeClass = (severidad = 'INFO') => {
  const value = String(severidad || 'INFO').toUpperCase();
  if (value === 'CRITICO') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (value === 'ADVERTENCIA') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const Audit = () => {
  const navigate = useNavigate();
  const usuarioActivo = JSON.parse(localStorage.getItem('usuario')) || { nombre: 'Usuario SIGEJA', cargo: 'Personal Judicial' };
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

  const [validationExpedientes, setValidationExpedientes] = useState([]);
  const [selectedValidationExp, setSelectedValidationExp] = useState('');
  const [validationMetrics, setValidationMetrics] = useState(null);
  const [validationSummary, setValidationSummary] = useState(null);
  const [ocrReferenceFile, setOcrReferenceFile] = useState(null);
  const [nerReference, setNerReference] = useState(emptyNerReference());
  const [isValidationMetricsOpen, setIsValidationMetricsOpen] = useState(false);
  const [isNerDatasetOpen, setIsNerDatasetOpen] = useState(false);
  const [nerDatasetScope, setNerDatasetScope] = useState('global');
  const [bertReference, setBertReference] = useState('');
  const [isValidatingMetrics, setIsValidatingMetrics] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // ESTADO DE PAGINACIÓN DEL LOG DE SEGURIDAD
  const [paginaLogs, setPaginaLogs] = useState(1);
  const totalLogs = securityData?.logs?.length || 0;
  const logsPaginados = (securityData?.logs || []).slice(
    (paginaLogs - 1) * LOGS_POR_PAGINA,
    paginaLogs * LOGS_POR_PAGINA
  );
  const nerExpedienteRows = (validationMetrics?.detalle?.ner?.detalle_campos || []).map((item) => ({
    campo: item.campo,
    accuracy: item.estado === 'correcto' ? 100 : 0,
    correctos: item.estado === 'correcto' ? 1 : 0,
    fallidos: item.estado === 'correcto' ? 0 : 1,
    evaluados: 1
  }));
  const nerConsolidadoRows = nerDatasetScope === 'expediente'
    ? nerExpedienteRows
    : (validationSummary?.ner_por_campo || []);
  const nerScopeLabel = nerDatasetScope === 'expediente'
    ? (selectedValidationExp || 'expediente seleccionado')
    : 'dataset completo';

  // 2. Fetch para traer los datos del backend al cargar la página
  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const response = await fetch('/api/v1/security/dashboard-metrics');
        const data = await response.json();
        setSecurityData(data);
        setPaginaLogs(1);
      } catch (error) {
        console.error("Error al cargar las métricas de seguridad:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSecurityData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchValidationSummary = async () => {
    const res = await fetch('/api/v1/validation-metrics/summary', { headers: getAuthHeaders() });
    setValidationSummary(await res.json());
  };

  const fetchValidationMetrics = async (numero) => {
    if (!numero) {
      setValidationMetrics(null);
      return;
    }
    const res = await fetch(`/api/v1/validation-metrics/${encodeURIComponent(numero)}`, { headers: getAuthHeaders() });
    const data = await res.json();
    setValidationMetrics(data.metricas || null);
  };

  useEffect(() => {
    const fetchValidationData = async () => {
      try {
        const [expRes] = await Promise.all([
          fetch('/api/v1/validation-metrics/expedientes', { headers: getAuthHeaders() }),
          fetchValidationSummary()
        ]);
        const expData = await expRes.json();
        setValidationExpedientes(expData.expedientes || []);
        if (!selectedValidationExp && expData.expedientes?.length) {
          setSelectedValidationExp(expData.expedientes[0].numero_expediente);
        }
      } catch (error) {
        console.error('Error cargando módulo de validación:', error);
      }
    };
    fetchValidationData();
  }, []);

  useEffect(() => {
    fetchValidationMetrics(selectedValidationExp);
  }, [selectedValidationExp]);

  useEffect(() => {
    if (!validationMetrics) return;
    const refs = validationMetrics?.ner?.referencias || {};
    setNerReference(Object.fromEntries(NER_VALIDATION_FIELDS.map(({ key }) => [
      key,
      Array.isArray(refs[key]) ? refs[key].join('\n') : (refs[key] || '')
    ])));
    setBertReference(validationMetrics?.bert?.resumen_referencia || '');
  }, [validationMetrics]);

  const formatExtractedValue = (value, fieldKey) => {
    if (!Array.isArray(value)) return value || 'No detectado';
    if (!value.length) return 'No detectado';

    const uniqueValues = [...new Set(value.filter(Boolean))];
    return uniqueValues.join('\n');
  };

  // 3. Abrir el modal con detalle OCR por expediente
  const handleAbrirOcrDetalle = async () => {
    setIsOcrModalOpen(true);
    if (ocrDetails) return; // ya cargado
    setIsLoadingOcr(true);
    try {
      const res = await fetch('/api/v1/security/ocr-details');
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
      const res = await fetch('/api/v1/security/bertscore-details');
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
      const res = await fetch('/api/v1/security/f1-details');
      setF1Details(await res.json());
    } catch (e) {
      console.error('Error cargando detalle F1:', e);
    } finally {
      setIsLoadingF1(false);
    }
  };

  const refrescarValidacionActual = async () => {
    await Promise.all([
      fetchValidationMetrics(selectedValidationExp),
      fetchValidationSummary()
    ]);
  };

  const handleValidarOCR = async () => {
    if (!selectedValidationExp || !ocrReferenceFile) {
      setValidationMessage('Selecciona un expediente y carga un TXT de referencia.');
      return;
    }
    setIsValidatingMetrics(true);
    setValidationMessage('');
    try {
      const formData = new FormData();
      formData.append('numero_expediente', selectedValidationExp);
      formData.append('usuario', usuarioActivo.username || usuarioActivo.nombre || 'Usuario SIGEJA');
      formData.append('referencia_txt', ocrReferenceFile);
      const res = await fetch('/api/v1/validation-metrics/ocr', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo validar OCR.');
      setValidationMessage(`OCR validado: accuracy ${data.ocr.ocr_accuracy}% · CER ${data.ocr.ocr_cer}`);
      await refrescarValidacionActual();
    } catch (error) {
      setValidationMessage(error.message);
    } finally {
      setIsValidatingMetrics(false);
    }
  };

  const handleValidarNER = async () => {
    if (!selectedValidationExp) return;
    setIsValidatingMetrics(true);
    setValidationMessage('');
    try {
      const res = await fetch('/api/v1/validation-metrics/ner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          numero_expediente: selectedValidationExp,
          usuario: usuarioActivo.username || usuarioActivo.nombre || 'Usuario SIGEJA',
          entidades_referencia: nerReference
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo validar NER.');
      setValidationMessage(`NER validado: F1 ${data.ner.ner_f1} · precision ${data.ner.ner_precision} · recall ${data.ner.ner_recall}`);
      await refrescarValidacionActual();
    } catch (error) {
      setValidationMessage(error.message);
    } finally {
      setIsValidatingMetrics(false);
    }
  };

  const handleValidarBERT = async () => {
    if (!selectedValidationExp || !bertReference.trim()) {
      setValidationMessage('Ingresa un resumen manual de referencia para BERTScore.');
      return;
    }
    setIsValidatingMetrics(true);
    setValidationMessage('');
    try {
      const res = await fetch('/api/v1/validation-metrics/bertscore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          numero_expediente: selectedValidationExp,
          usuario: usuarioActivo.username || usuarioActivo.nombre || 'Usuario SIGEJA',
          resumen_referencia: bertReference
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo validar BERTScore.');
      setValidationMessage(`BERTScore validado: F1 ${data.bert.bert_f1} · precision ${data.bert.bert_precision} · recall ${data.bert.bert_recall}`);
      await refrescarValidacionActual();
    } catch (error) {
      setValidationMessage(error.message);
    } finally {
      setIsValidatingMetrics(false);
    }
  };

  const handleRecalcularMetricas = async () => {
    if (!selectedValidationExp) return;
    setIsValidatingMetrics(true);
    setValidationMessage('');
    try {
      const res = await fetch(`/api/v1/validation-metrics/${encodeURIComponent(selectedValidationExp)}/recalculate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo recalcular.');
      setValidationMessage('Métricas recalculadas con las referencias guardadas.');
      await refrescarValidacionActual();
    } catch (error) {
      setValidationMessage(error.message);
    } finally {
      setIsValidatingMetrics(false);
    }
  };

  // 4. Función para descargar el CSV de auditoría
  const handleExportarCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/v1/security/export-csv');
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
      <header className="bg-white border-b border-slate-200 w-full h-[76px] xl:h-[93px] px-4 xl:px-8 sticky top-0 z-10 flex items-center shrink-0">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Calidad y Auditoría</h2>
          
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

      {/* Contenido Principal */}
      <main className="p-4 xl:p-8 w-full max-w-[1600px] mx-auto overflow-y-auto custom-scrollbar">
        
        {/* Título de Sección y Botón Exportar */}
        <div className="flex justify-between items-center gap-4 mb-6">
          <h3 className="text-xl xl:text-2xl font-bold text-slate-800 tracking-tight">
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
              <div className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between ${
                Number(securityData?.kpis?.fuga_datos || 0) > 0 ? 'border-rose-200' : 'border-slate-200'
              }`}>
                <h4 className="text-sm font-bold text-[#1a3059] mb-4">Fuga de Datos</h4>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-extrabold ${
                      Number(securityData?.kpis?.fuga_datos || 0) > 0 ? 'text-rose-500' : 'text-green-500'
                    }`}>
                      {securityData?.kpis?.fuga_datos || "0"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">incidentes</span>
                  </div>
                  <div className={`p-2.5 rounded-lg ${
                    Number(securityData?.kpis?.fuga_datos || 0) > 0 ? 'bg-rose-100 text-rose-500' : 'bg-green-100 text-green-500'
                  }`}>
                    <ShieldCheck size={24} />
                  </div>
                </div>
                <div className="text-[10px] font-medium">
                  <span className="text-slate-500">
                    {Number(securityData?.kpis?.fuga_datos || 0) > 0
                      ? "Revisar eventos de exposicion de datos"
                      : `No se detecto fuga de datos (${securityData?.kpis?.incidentes_seguridad || 0} evento(s) de seguridad registrados)`}
                  </span>
                </div>
              </div>

            </div>

            {/* Módulo de Validación de Métricas con Ground Truth */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#1a3059]">
                    <BarChart3 size={18} />
                    <h4 className="text-lg font-bold">Validación de Métricas por Expediente</h4>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Compara OCR, NER y BERTScore contra referencias humanas y consolida resultados del dataset.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsValidationMetricsOpen(prev => !prev)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 text-xs font-black text-blue-700 hover:bg-blue-100"
                >
                  {isValidationMetricsOpen ? 'Ocultar validación' : 'Mostrar validación'}
                  <ChevronDown size={15} className={`transition-transform ${isValidationMetricsOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isValidationMetricsOpen && (
                <>
                <div className="px-6 pt-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                  <div className="flex gap-2 items-center">
                  <select
                    value={selectedValidationExp}
                    onChange={(e) => setSelectedValidationExp(e.target.value)}
                    className="h-10 min-w-[280px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-[#2546b0]"
                  >
                    <option value="">Seleccionar expediente procesado</option>
                    {validationExpedientes.map((exp) => (
                      <option key={exp.numero_expediente} value={exp.numero_expediente}>
                        {exp.numero_expediente}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleRecalcularMetricas}
                    disabled={!selectedValidationExp || isValidatingMetrics}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    title="Recalcular NER/BERTScore con las referencias guardadas"
                  >
                    <RefreshCw size={16} className={isValidatingMetrics ? 'animate-spin' : ''} />
                  </button>
                  </div>
                </div>

              <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="text-sm font-black text-[#1a3059] mb-1">OCR Accuracy</h5>
                  <p className="text-[11px] text-slate-500 mb-4">Carga un TXT corregido manualmente para calcular CER.</p>
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={(e) => setOcrReferenceFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-amber-700"
                  />
                  <button
                    onClick={handleValidarOCR}
                    disabled={!ocrReferenceFile || !selectedValidationExp || isValidatingMetrics}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    <Upload size={14} /> Validar OCR
                  </button>
                  <div className="mt-4 rounded-lg bg-white border border-slate-200 p-3 text-xs">
                    <p className="font-bold text-slate-500">Resultado guardado</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">
                      {validationMetrics?.ocr?.accuracy != null ? `${validationMetrics.ocr.accuracy}%` : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">CER: {validationMetrics?.ocr?.cer ?? '—'}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <div className="mb-2">
                    <h5 className="text-sm font-black text-[#1a3059] mb-1">NER Precision / Recall / F1</h5>
                    <p className="text-[11px] text-slate-500">
                      Compara entidades extraídas contra hallazgos humanos.
                    </p>
                  </div>

                    <div className="mt-3">
                      <div className="max-h-[315px] overflow-auto rounded-xl border border-slate-200 bg-white mb-3">
                        <table className="w-full min-w-[700px] text-left">
                          <thead className="sticky top-0 z-[1]">
                            <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                              <th className="px-3 py-3 w-[170px]">Campo</th>
                              <th className="px-3 py-3">Extraído por SIGEJA</th>
                              <th className="px-3 py-3">Hallazgo humano</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {NER_VALIDATION_FIELDS.map((field) => {
                              const extraido = validationMetrics?.ner?.predicciones?.[field.key];
                              return (
                                <tr key={field.key} className="align-top">
                                  <td className="px-3 py-3">
                                    <p className="text-[11px] font-black text-[#1a3059]">{field.label}</p>
                                    <p className="mt-1 text-[10px] font-medium leading-snug text-slate-400">{field.helper}</p>
                                  </td>
                                  <td className="px-3 py-3">
                                    <pre className="min-h-[38px] whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-slate-600">
                                      {formatExtractedValue(extraido, field.key)}
                                    </pre>
                                  </td>
                                  <td className="px-3 py-3">
                                    <input
                                      value={nerReference[field.key] || ''}
                                      onChange={(e) => setNerReference(prev => ({ ...prev, [field.key]: e.target.value }))}
                                      placeholder={`Ingresa ${field.label.toLowerCase()}`}
                                      className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-400"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={handleValidarNER}
                        disabled={!selectedValidationExp || isValidatingMetrics}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Save size={14} /> Guardar Validación NER
                      </button>
                    </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white border border-slate-200 p-2">
                      <p className="text-[10px] text-slate-400 font-bold">Precision</p>
                      <p className="font-black text-blue-600">{validationMetrics?.ner?.precision ?? '—'}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-2">
                      <p className="text-[10px] text-slate-400 font-bold">Recall</p>
                      <p className="font-black text-blue-600">{validationMetrics?.ner?.recall ?? '—'}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-2">
                      <p className="text-[10px] text-slate-400 font-bold">F1</p>
                      <p className="font-black text-blue-600">{validationMetrics?.ner?.f1 ?? '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="text-sm font-black text-[#1a3059] mb-1">BERTScore</h5>
                  <p className="text-[11px] text-slate-500 mb-3">Pega el resumen manual de referencia para compararlo con la síntesis IA.</p>
                  <textarea
                    value={bertReference}
                    onChange={(e) => setBertReference(e.target.value)}
                    placeholder="Resumen manual de referencia..."
                    rows={10}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-rose-300"
                  />
                  <button
                    onClick={handleValidarBERT}
                    disabled={!selectedValidationExp || !bertReference.trim() || isValidatingMetrics}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    <BrainCircuit size={14} /> Calcular BERTScore
                  </button>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white border border-slate-200 p-2">
                      <p className="text-[10px] text-slate-400 font-bold">BERT P</p>
                      <p className="font-black text-rose-500">{validationMetrics?.bert?.precision ?? '—'}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-2">
                      <p className="text-[10px] text-slate-400 font-bold">BERT R</p>
                      <p className="font-black text-rose-500">{validationMetrics?.bert?.recall ?? '—'}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-2">
                      <p className="text-[10px] text-slate-400 font-bold">BERT F1</p>
                      <p className="font-black text-rose-500">{validationMetrics?.bert?.f1 ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6">
                {validationMessage && (
                  <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">
                    {validationMessage}
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-[#1a3059]">Consolidado del dataset validado</p>
                      <p className="text-[11px] text-slate-500">
                        {validationSummary?.global?.total || 0} expediente(s) con métricas manuales guardadas.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-black">
                      <span className="rounded bg-white border border-slate-200 px-3 py-1">OCR {validationSummary?.global?.ocr_accuracy ?? '—'}%</span>
                      <span className="rounded bg-white border border-slate-200 px-3 py-1">NER F1 {validationSummary?.global?.ner_f1 ?? '—'}</span>
                      <span className="rounded bg-white border border-slate-200 px-3 py-1">BERT F1 {validationSummary?.global?.bert_f1 ?? '—'}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="border-b border-slate-200 bg-white">
                      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <button
                          type="button"
                          onClick={() => setIsNerDatasetOpen(prev => !prev)}
                          className="flex items-center gap-3 text-left"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
                            <BarChart3 size={16} />
                          </span>
                          <span>
                            <span className="block text-[11px] font-black uppercase tracking-widest text-slate-500">
                              Rendimiento NER por campo
                            </span>
                            <span className="block text-[11px] font-medium text-slate-400">
                              Vista actual: {nerScopeLabel}
                            </span>
                          </span>
                          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isNerDatasetOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-black">
                          <button
                            type="button"
                            onClick={() => setNerDatasetScope('global')}
                            className={`rounded-md px-3 py-1.5 transition-colors ${nerDatasetScope === 'global' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Global
                          </button>
                          <button
                            type="button"
                            onClick={() => setNerDatasetScope('expediente')}
                            className={`rounded-md px-3 py-1.5 transition-colors ${nerDatasetScope === 'expediente' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Expediente
                          </button>
                        </div>
                      </div>
                      {isNerDatasetOpen && (
                        nerConsolidadoRows.length ? (
                          <table className="w-full min-w-[760px] text-left text-xs">
                            <thead className="border-y border-slate-100 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Campo NER</th>
                                <th className="px-4 py-3">Acierto</th>
                                <th className="px-4 py-3 text-right">Correctos</th>
                                <th className="px-4 py-3 text-right">Fallos</th>
                                <th className="px-4 py-3 text-right">Evaluados</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {nerConsolidadoRows.map((item) => (
                                <tr key={item.campo} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-bold text-[#1a3059]">
                                    {NER_FIELD_LABELS[item.campo] || item.campo}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                          className={`h-full rounded-full ${Number(item.accuracy) >= 80 ? 'bg-emerald-500' : Number(item.accuracy) >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                          style={{ width: `${Math.max(0, Math.min(100, Number(item.accuracy || 0)))}%` }}
                                        />
                                      </div>
                                      <span className={`inline-flex min-w-[62px] justify-center rounded-full border px-2 py-1 text-[10px] font-black ${getNerFieldClass(item.accuracy)}`}>
                                        {formatPercent(item.accuracy)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-black text-emerald-600">{item.correctos}</td>
                                  <td className="px-4 py-3 text-right font-black text-rose-500">{item.fallidos}</td>
                                  <td className="px-4 py-3 text-right font-black text-slate-600">{item.evaluados}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="border-t border-slate-100 px-4 py-5 text-[11px] font-bold text-slate-400">
                            {nerDatasetScope === 'expediente'
                              ? 'El expediente seleccionado aún no tiene validación NER guardada.'
                              : 'Aún no hay validaciones NER guardadas para consolidar.'}
                          </div>
                        )
                      )}
                    </div>
                    <table className="w-full min-w-[720px] text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-widest text-slate-500 border-y border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Expediente</th>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3 text-right">OCR Accuracy</th>
                          <th className="px-4 py-3 text-right">NER F1</th>
                          <th className="px-4 py-3 text-right">BERT F1</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(validationSummary?.expedientes || []).map((item) => (
                          <tr key={item.numero_expediente} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.numero_expediente}</td>
                            <td className="px-4 py-3 text-slate-500">{item.fecha}</td>
                            <td className="px-4 py-3 text-right font-black text-amber-500">{item.ocr_accuracy != null ? `${item.ocr_accuracy}%` : '—'}</td>
                            <td className="px-4 py-3 text-right font-black text-blue-600">{item.ner_f1 ?? '—'}</td>
                            <td className="px-4 py-3 text-right font-black text-rose-500">{item.bert_f1 ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
                </>
              )}
            </section>

            {/* Tabla de Logs de Seguridad dinámica */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
               <div className="p-6 border-b border-slate-100">
                 <h4 className="text-lg font-bold text-[#1a3059] mb-1">Log de Seguridad y Auditoría</h4>
                 <p className="text-sm text-slate-500 font-medium">Registro inalterable de accesos y modificaciones críticas</p>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full min-w-[1100px] text-left border-collapse">
                   <thead>
                     <tr className="bg-white text-[#1a3059] font-bold text-[10px] uppercase tracking-widest border-b border-slate-200">
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Severidad</th>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Acción Registrada</th>
                       <th className="px-6 py-4">Expediente</th>
                       <th className="px-6 py-4">IP Origen</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-800">
                    {logsPaginados.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-6">{item.timestamp}</td>
                        <td className="px-6 py-6">
                          <span className={`inline-flex px-2 py-1 rounded border text-[9px] font-black ${getLogBadgeClass(item.severidad)}`}>
                            {item.severidad || 'INFO'}
                          </span>
                        </td>
                        <td className="px-6 py-6">{item.usuario}</td>
                        <td className="px-6 py-6 text-[10px] text-slate-500">{item.tipo_evento || 'GENERAL'}</td>
                        <td className="px-6 py-6 min-w-[280px]">{item.accion_registrada || item.accion || '—'}</td>
                         <td className="px-6 py-6">{item.expediente}</td>
                         <td className="px-6 py-6">{item.ip_origen || item.ip || '—'}</td>
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

               {/* Controles de Paginación */}
               <Pagination
                 currentPage={paginaLogs}
                 totalItems={totalLogs}
                 itemsPerPage={LOGS_POR_PAGINA}
                 onPageChange={setPaginaLogs}
                 itemLabel="eventos"
               />
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
