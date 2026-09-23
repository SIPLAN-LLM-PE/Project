import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle, Save, Loader2, Bell, ChevronDown, Upload, Trash2, Search, ZoomIn, ZoomOut,
  Printer, Menu, ChevronUp, User, Bot, FileText, FileQuestion, ExternalLink, AlertTriangle, Hash
} from 'lucide-react';

import { AnalysisMenu } from './components/AnalysisMenu';
import { ResumenCard } from './components/ResumenCard';
import { PosturaCard } from './components/PosturaCard';
import { PlazosCard } from './components/PlazosCard';
import { AdmisibilidadCard } from './components/AdmisibilidadCard';
import { NecesidadesCard } from './components/NecesidadesCard';
import { CapacidadCargasCard } from './components/CapacidadCargasCard';
import { ControversiasCard } from './components/ControversiasCard';
import { SujetosProcesalesCard } from './components/SujetosProcesalesCard';
import { FinancieraCard } from './components/FinancieraCard';
import { JurisprudenciaDrawer } from './components/JurisprudenciaDrawer';
import { HistorialDrawer } from './components/HistorialDrawer';
import { CapacidadDetalleDrawer } from './components/CapacidadDetalleDrawer';
import { RatingModal } from './components/RatingModal';
import { PdfEvidenceViewer } from './components/PdfEvidenceViewer';
import { useNavigate } from 'react-router-dom';
import LiveNotifications from '../../components/common/LiveNotifications';

import { apiService } from '../../services/api';

// ==========================================
// CACHÉ DE MEMORIA GLOBAL
// ==========================================
let draftAnalysisData = null;
let draftPdfFiles = [];
let draftActivePdfIndex = 0;
let draftHasDocument = false;
let draftTextoExpediente = "";
let draftHistorialEntries = [];
let draftChatMessages = [
  { rol: 'assistant', contenido: 'Hola, soy el asistente IA de SIGEJA. \u00bfEn qu\u00e9 te puedo ayudar?' }
];
let draftSessionKey = null;
const MAX_UPLOAD_FILE_MB = 50;
const MAX_UPLOAD_FILE_BYTES = MAX_UPLOAD_FILE_MB * 1024 * 1024;
const formatFileSize = (bytes = 0) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const progressStageConfig = {
  preparando: { floor: 2, ceiling: 8, durationMs: 4000 },
  ocr: { floor: 5, ceiling: 41, durationMs: 45000 },
  validaciones: { floor: 42, ceiling: 50, durationMs: 9000 },
  requiere_confirmacion: { floor: 45, ceiling: 48, durationMs: 1000 },
  integridad: { floor: 52, ceiling: 54, durationMs: 5000 },
  ner: { floor: 55, ceiling: 67, durationMs: 35000 },
  rag: { floor: 68, ceiling: 81, durationMs: 95000 },
  plazos: { floor: 82, ceiling: 87, durationMs: 12000 },
  financiera: { floor: 88, ceiling: 92, durationMs: 35000 },
  cargas: { floor: 93, ceiling: 95, durationMs: 25000 },
  ensamblando: { floor: 96, ceiling: 98, durationMs: 12000 },
  completado: { floor: 100, ceiling: 100, durationMs: 1000 },
  error: { floor: 100, ceiling: 100, durationMs: 1000 }
};

const progressStageInsights = {
  preparando: [
    "Ordenando archivos y preparando el expediente para análisis.",
    "Verificando nombres, tamaño y formato de los documentos."
  ],
  ocr: [
    "Leyendo texto nativo de los PDFs.",
    "Separando documentos y midiendo calidad OCR.",
    "Guardando texto extraído para evitar reprocesos futuros.",
    "Clasificando cada PDF por tipo documental."
  ],
  validaciones: [
    "Buscando duplicados por expediente y hash de documento.",
    "Revisando indicios de datos sensibles antes de continuar.",
    "Preparando validaciones de seguridad y anonimización."
  ],
  integridad: [
    "Comparando el número de expediente esperado contra los PDFs.",
    "Validando que los documentos pertenezcan al mismo caso."
  ],
  ner: [
    "Buscando demandante, demandado, DNIs, domicilios y montos.",
    "Combinando reglas spaCy, regex y validación semántica.",
    "Contrastando entidades extraídas con Mistral.",
    "Limpiando posibles errores OCR en nombres y apellidos."
  ],
  rag: [
    "Seleccionando fragmentos clave de demanda, audiencia, sentencia y contestación.",
    "Preparando contexto reducido para Mistral sin perder hechos esenciales.",
    "Mistral está generando la síntesis jurídica y ciudadana.",
    "Revisando postura procesal, estado actual y puntos controvertidos.",
    "Validando que el resumen no contradiga sentencia, audiencia o fallo.",
    "Estructurando la respuesta IA en formato JSON para el dashboard."
  ],
  plazos: [
    "Detectando fechas procesales relevantes.",
    "Calculando plazos y verificando admisibilidad."
  ],
  financiera: [
    "Ubicando petitorio, ofrecimientos, ingresos y gastos acreditados.",
    "Validando montos contra evidencia literal del expediente.",
    "Evitando confundir ingresos del demandado con petitorio."
  ],
  cargas: [
    "Analizando capacidad económica y posibles cargas familiares.",
    "Verificando dependientes, empleador e ingresos reportados.",
    "Calculando estimación económica y alertas de coherencia."
  ],
  ensamblando: [
    "Armando tarjetas del análisis y métricas de auditoría.",
    "Guardando resultado final y trazabilidad del expediente."
  ]
};

const getProgressStageConfig = (stage = "", percentage = 0) => {
  const config = progressStageConfig[String(stage || "").toLowerCase()] || {
    floor: percentage || 0,
    ceiling: Math.min(98, Math.max(percentage || 0, (percentage || 0) + 6)),
    durationMs: 25000
  };
  return {
    ...config,
    floor: Math.max(config.floor, percentage || 0),
    ceiling: Math.max(config.ceiling, percentage || 0)
  };
};

const getAnalysisSessionKey = () => {
  if (typeof window === 'undefined') return 'server';
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return `${usuario.username || ''}:${usuario.rol || ''}`;
  } catch {
    return '';
  }
};

export const clearAnalysisDraftCache = () => {
  draftAnalysisData = null;
  draftPdfFiles = [];
  draftActivePdfIndex = 0;
  draftHasDocument = false;
  draftTextoExpediente = "";
  draftHistorialEntries = [];
  draftChatMessages = [
    { rol: 'assistant', contenido: 'Hola, soy el asistente IA de SIGEJA. \u00bfEn qu\u00e9 te puedo ayudar?' }
  ];
  draftSessionKey = null;
};

const normalizarNombreArchivo = (valor = "") =>
  String(valor).trim().toLowerCase();

const obtenerResumenPdf = (resumenes, nombreArchivo) => {
  const nombre = normalizarNombreArchivo(nombreArchivo);
  return (resumenes || []).find(r => normalizarNombreArchivo(r.archivo) === nombre) || null;
};

const estilosTipoDocumental = (tipo = "") => {
  const normalizado = tipo.toLowerCase();
  if (normalizado.includes("demanda") || normalizado.includes("contestacion")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
  if (normalizado.includes("admisorio") || normalizado.includes("resolucion")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (normalizado.includes("notificacion")) {
    return "bg-cyan-50 text-cyan-700 border-cyan-200";
  }
  if (normalizado.includes("acta")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (normalizado.includes("oficio")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (normalizado.includes("anexo")) {
    return "bg-slate-50 text-slate-700 border-slate-200";
  }
  return "bg-gray-50 text-gray-600 border-gray-200";
};

export const Analysis = () => {
  const navigate = useNavigate();
  const sessionKey = getAnalysisSessionKey();
  if (draftSessionKey && draftSessionKey !== sessionKey) {
    clearAnalysisDraftCache();
  }
  if (!draftSessionKey) {
    draftSessionKey = sessionKey;
  }

  const usuarioHeader = JSON.parse(localStorage.getItem('usuario')) || {
    nombre: 'Usuario SIGEJA',
    cargo: 'Personal Judicial'
  };

  const crearMensajesChatIniciales = () => [
    { rol: 'assistant', contenido: 'Hola, soy el asistente IA de SIGEJA. \u00bfEn qu\u00e9 te puedo ayudar?' }
  ];

  // 1. ESTADOS DE INTERFAZ
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSimpleTone, setIsSimpleTone] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isJurisprudenciaOpen, setIsJurisprudenciaOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const [forzarOCR, setForzarOCR] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [isSavedDB, setIsSavedDB] = useState(false);
  const [isExpedienteModalOpen, setIsExpedienteModalOpen] = useState(false);
  const [listaExpedientes, setListaExpedientes] = useState([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [pdfSearchTerm, setPdfSearchTerm] = useState("");
  const [pdfEvidence, setPdfEvidence] = useState(null);
  const [activeEvidence, setActiveEvidence] = useState(null);
  const [isResumenPdfsOpen, setIsResumenPdfsOpen] = useState(false);
  const [resumenPorPdf, setResumenPorPdf] = useState([]);
  const [sensitiveModal, setSensitiveModal] = useState({
    isOpen: false,
    hallazgos: [],
    files: []
  });

  // 2. ESTADOS DE DATOS
  const [analysisData, setAnalysisData] = useState(draftAnalysisData);
  const [textoExpediente, setTextoExpediente] = useState(draftTextoExpediente);
  const [historialEntries, setHistorialEntries] = useState(draftHistorialEntries);
  const [hasDocument, setHasDocument] = useState(draftHasDocument);
  const [accessDenied, setAccessDenied] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfFiles, setPdfFiles] = useState(draftPdfFiles);
  const [activePdfIndex, setActivePdfIndex] = useState(draftActivePdfIndex);
  const fileInputRef = useRef(null);
  const chatScrollRef = useRef(null);
  const uploadInProgressRef = useRef(false);
  const backendProgressRef = useRef({
    stage: "",
    floor: 0,
    ceiling: 0,
    startedAt: 0,
    durationMs: 20000
  });

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Iniciando...");
  const [loadingInsight, setLoadingInsight] = useState("Preparando lectura de documentos.");
  const [usingBackendProgress, setUsingBackendProgress] = useState(false);

  // 3. ESTADOS DEL CHAT
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState(draftChatMessages);

  // 4. CONFIGURACIÓN DE TARJETAS
  const [cardVisibility, setCardVisibility] = useState({
    resumen: false, postura: false, plazos: false, admisibilidad: false,
    necesidades: false, capacidad: false, controversias: false, sujetos: false, financiera: false
  });

  const toggleCard = (key) => {
    setCardVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetChat = () => {
    const mensajesIniciales = crearMensajesChatIniciales();
    setChatInput("");
    setIsChatLoading(false);
    setChatMessages(mensajesIniciales);
    draftChatMessages = mensajesIniciales;
  };

  // ==========================================
  // HOOKS
  // ==========================================

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatExpanded]);

  useEffect(() => {
    draftSessionKey = sessionKey;
    draftAnalysisData = analysisData;
    draftPdfFiles = pdfFiles;
    draftActivePdfIndex = activePdfIndex;
    draftHasDocument = hasDocument;
    draftTextoExpediente = textoExpediente;
    draftHistorialEntries = historialEntries;
  }, [sessionKey, analysisData, pdfFiles, activePdfIndex, hasDocument, textoExpediente, historialEntries]);

  useEffect(() => {
    const cargarAnalisisExistente = async () => {
      if (!expedienteSeleccionado) return;
      setAccessDenied(null);
      setPdfFiles([]);
      setActivePdfIndex(0);
      setResumenPorPdf([]);
      setPdfSearchTerm("");
      setPdfEvidence(null);
      setActiveEvidence(null);
      resetChat();
      try {
        const res = await fetch(`/api/v1/expedientes/${expedienteSeleccionado.numero_expediente}`);
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setAccessDenied(`No tienes permisos para ver el expediente ${expedienteSeleccionado.numero_expediente}.`);
          setAnalysisData(null);
          setHasDocument(false);
          setPdfFiles([]);
          setActivePdfIndex(0);
          return;
        }
        if (res.ok && data.data && data.data.tiene_analisis) {
          setAnalysisData(data.data.resultados);
          setResumenPorPdf(data.data.resultados?.resumen_por_pdf || []);
          setHasDocument(true);
          cargarPDFsDesdeServidor(expedienteSeleccionado.numero_expediente);
          setCardVisibility({
            resumen: true, postura: true, plazos: true, sujetos: true,
            financiera: true, capacidad: true, controversias: true
          });
        } else {
          setAnalysisData(null);
          setHasDocument(false);
          setPdfFiles([]);
          setActivePdfIndex(0);
        }
      } catch (err) {
        console.error("Error al recuperar el análisis de la BD:", err);
      }
    };
    cargarAnalisisExistente();
  }, [expedienteSeleccionado]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasDocument) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDocument]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingProgress(0);
      setUsingBackendProgress(false);
      setLoadingInsight("Preparando lectura de documentos.");
      backendProgressRef.current = { stage: "", floor: 0, ceiling: 0, startedAt: 0, durationMs: 20000 };
      return;
    }
    if (usingBackendProgress) return;
    const timer = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + (Math.random() * 2.5);
        return next >= 65 ? 65 : next;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [isLoading, usingBackendProgress]);

  useEffect(() => {
    if (!isLoading || !usingBackendProgress) return;
    const timer = setInterval(() => {
      const etapa = backendProgressRef.current;
      if (!etapa.startedAt || etapa.ceiling <= etapa.floor) return;
      const elapsed = Date.now() - etapa.startedAt;
      const ratio = Math.min(0.985, 1 - Math.exp(-elapsed / Math.max(1000, etapa.durationMs)));
      const estimado = etapa.floor + ((etapa.ceiling - etapa.floor) * ratio);
      setLoadingProgress((prev) => Math.min(etapa.ceiling, Math.max(prev, estimado)));
    }, 500);
    return () => clearInterval(timer);
  }, [isLoading, usingBackendProgress]);

  useEffect(() => {
    if (usingBackendProgress) return;
    if (loadingProgress < 15) setLoadingText("Escaneando documento PDF...");
    else if (loadingProgress < 30) setLoadingText("Extrayendo texto (Módulo OCR)...");
    else if (loadingProgress < 50) setLoadingText("Identificando sujetos procesales...");
    else if (loadingProgress < 85) setLoadingText("Analizando contexto legal con Mistral IA...");
    else if (loadingProgress < 95) setLoadingText("Generando auditoría financiera y cargas...");
    else setLoadingText("Ensamblando informe final, casi listo...");
  }, [loadingProgress, usingBackendProgress]);

  useEffect(() => {
    if (!isLoading) return;
    const actualizarInsight = () => {
      const stage = backendProgressRef.current.stage || "preparando";
      const mensajes = progressStageInsights[stage] || [
        "El backend sigue procesando el expediente.",
        "Esperando respuesta del motor de análisis.",
        "Conservando la etapa actual hasta recibir avance confirmado."
      ];
      const elapsed = backendProgressRef.current.startedAt
        ? Date.now() - backendProgressRef.current.startedAt
        : Date.now();
      const index = Math.floor(elapsed / 3500) % mensajes.length;
      setLoadingInsight(mensajes[index]);
    };
    actualizarInsight();
    const timer = setInterval(actualizarInsight, 3500);
    return () => clearInterval(timer);
  }, [isLoading, usingBackendProgress]);

  useEffect(() => {
    if (!isLoading || !expedienteSeleccionado?.numero_expediente) return;
    let cancelado = false;
    const consultarProgreso = async () => {
      try {
        const numero = encodeURIComponent(expedienteSeleccionado.numero_expediente);
        const res = await fetch(`/api/v1/analysis-progress/${numero}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelado || !data) return;
        const porcentaje = Number(data.porcentaje || 0);
        if (porcentaje > 0) {
          const etapa = String(data.etapa || "procesando").toLowerCase();
          const config = getProgressStageConfig(etapa, porcentaje);
          const previo = backendProgressRef.current;
          if (previo.stage !== etapa || porcentaje > previo.floor) {
            backendProgressRef.current = {
              stage: etapa,
              floor: Math.max(porcentaje, previo.stage === etapa ? previo.floor : config.floor),
              ceiling: config.ceiling,
              startedAt: Date.now(),
              durationMs: config.durationMs
            };
          }
          setUsingBackendProgress(true);
          setLoadingProgress((prev) => Math.min(99, Math.max(prev, porcentaje)));
          setLoadingText(data.detalle || data.etapa || "Procesando expediente...");
        }
      } catch (err) {
        // Fallback silencioso: se mantiene la barra simulada si el backend aun no expone progreso.
      }
    };
    consultarProgreso();
    const timer = setInterval(consultarProgreso, 1200);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [isLoading, expedienteSeleccionado?.numero_expediente]);

  useEffect(() => {
    const inicializarVistaAnalisis = async () => {
      const usuarioActivo = JSON.parse(localStorage.getItem('usuario')) || { username: "", rol: "" };
      try {
        const res = await fetch(`/api/v1/expedientes?username=${usuarioActivo.username}&rol=${usuarioActivo.rol}`);
        const data = await res.json();
        if (data.status === 'success') {
          const listaMapeada = data.data.map(e => ({
            ...e,
            tiene_analisis: e.estado === "Completado"
          }));
          setListaExpedientes(listaMapeada);

          const params = new URLSearchParams(window.location.search);
          const expedienteUrl = params.get('exp');
          if (expedienteUrl) {
            const casoEncontrado = listaMapeada.find(e => e.numero_expediente === expedienteUrl);
            if (casoEncontrado) {
              setExpedienteSeleccionado(casoEncontrado);
              if (casoEncontrado.tiene_analisis) {
                const resDetalle = await fetch(`/api/v1/expedientes/${casoEncontrado.numero_expediente}`);
                const dataDetalle = await resDetalle.json().catch(() => ({}));
                if (resDetalle.status === 403) {
                  setAccessDenied(`No tienes permisos para ver el expediente ${casoEncontrado.numero_expediente}.`);
                  setAnalysisData(null);
                  setHasDocument(false);
                  setPdfFiles([]);
                  setActivePdfIndex(0);
                  return;
                }
                if (resDetalle.ok && dataDetalle.data && dataDetalle.data.tiene_analisis) {
                  const resData = dataDetalle.data.resultados;
                  setAnalysisData(resData);
                  setHasDocument(true);
                  setIsReadOnly(true);
                  cargarPDFsDesdeServidor(casoEncontrado.numero_expediente);
                  if (resData && resData.historial) {
                    setHistorialEntries(resData.historial);
                  } else {
                    setHistorialEntries([]);
                  }
                  setCardVisibility({
                    resumen: true, postura: true, plazos: true, sujetos: true,
                    financiera: true, capacidad: true, controversias: true
                  });
                }
              }
            } else {
              const resDetalle = await fetch(`/api/v1/expedientes/${expedienteUrl}`);
              const dataDetalle = await resDetalle.json().catch(() => ({}));
              if (resDetalle.status === 403) {
                setAccessDenied(`No tienes permisos para ver el expediente ${expedienteUrl}.`);
                setAnalysisData(null);
                setHasDocument(false);
                setPdfFiles([]);
                setActivePdfIndex(0);
                return;
              }
              if (resDetalle.ok && dataDetalle.data && dataDetalle.data.tiene_analisis) {
                const resData = dataDetalle.data.resultados;
                setAnalysisData(resData);
                setHasDocument(true);
                setIsReadOnly(true);
                cargarPDFsDesdeServidor(expedienteUrl);
                setHistorialEntries(resData?.historial || []);
                setCardVisibility({
                  resumen: true, postura: true, plazos: true, sujetos: true,
                  financiera: true, capacidad: true, controversias: true
                });
              } else {
                setAccessDenied(`No se pudo abrir el expediente ${expedienteUrl}.`);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error inicializando la pantalla de análisis:", err);
      }
    };
    inicializarVistaAnalisis();
  }, []);

  const seleccionarExpedienteDeBandeja = (expediente, event) => {
    if (event) event.stopPropagation();
    setAccessDenied(null);
    setExpedienteSeleccionado(expediente);

    if (expediente.tiene_analisis) {
      const deseaVerExistente = window.confirm(
        `El expediente ${expediente.numero_expediente} ya cuenta con un análisis guardado.\n\n` +
        `• Presiona ACEPTAR si deseas ver el análisis oficial ya registrado (Modo Lectura).\n` +
        `• Presiona CANCELAR si deseas cargar un nuevo documento PDF y generar un nuevo análisis.`
      );
      if (deseaVerExistente) {
        setIsExpedienteModalOpen(false);
        setIsLoading(true);
        fetch(`/api/v1/expedientes/${expediente.numero_expediente}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.data && (data.data.resultados_json || data.data.resultados)) {
              const resData = data.data.resultados_json || data.data.resultados;
              setAnalysisData(resData);
              setHasDocument(true);
              setIsReadOnly(true);
              cargarPDFsDesdeServidor(expediente.numero_expediente);
              if (resData && resData.historial) {
                setHistorialEntries(resData.historial);
              } else {
                setHistorialEntries([]);
              }
              setCardVisibility({
                resumen: true, postura: true, plazos: true, sujetos: true,
                financiera: true, capacidad: true, controversias: true
              });
            }
          })
          .catch(error => console.error("Error cargando expediente guardado:", error))
          .finally(() => setIsLoading(false));
      } else {
        if (fileInputRef && fileInputRef.current) fileInputRef.current.click();
        setIsExpedienteModalOpen(false);
        setIsReadOnly(false);
        setHasDocument(false);
        setPdfFiles([]);
        setActivePdfIndex(0);
      }
    } else {
      if (fileInputRef && fileInputRef.current) fileInputRef.current.click();
      setIsExpedienteModalOpen(false);
      setIsReadOnly(false);
      setHasDocument(false);
      setPdfFiles([]);
      setActivePdfIndex(0);
    }
  };

  // ==========================================
  // FUNCIONES DE LÓGICA
  // ==========================================

  const construirSnapshotVersion = (data = analysisData) => {
    if (!data) {
      return {
        sintesis: "Sin analisis",
        postura: "Sin postura registrada",
        demandante: "-",
        demandado: "-",
        monto_petitorio: "-",
        plazo_principal: "-",
        alertas_financieras: "Sin datos",
        tono: isSimpleTone ? "ciudadano" : "tecnico"
      };
    }

    const sujetos = data.sujetos_procesales || {};
    const plazos = data.plazos_legales || {};
    const financiera = data.revision_financiera || {};
    const sintesis = data.sintesis_rag?.estandar || data.sintesis_rag?.tecnico || data.sintesis || data.resumen || "";
    const postura = data.postura_contestacion?.resumen || data.postura_contestacion || data.postura || "";

    return {
      sintesis: String(sintesis || "Sin sintesis registrada").slice(0, 500),
      postura: String(postura || "Sin postura registrada").slice(0, 500),
      demandante: sujetos.demandante?.nombre || data.demandante || "-",
      demandado: sujetos.demandado?.nombre || data.demandado || "-",
      monto_petitorio: data.monto_petitorio || data.pretension_economica || financiera.monto_petitorio || "-",
      plazo_principal: plazos.fecha_presentacion
        ? `Presentacion: ${plazos.fecha_presentacion}`
        : (plazos.dias_habiles_transcurridos ? `${plazos.dias_habiles_transcurridos} dias habiles` : "-"),
      alertas_financieras: financiera.alerta ? (financiera.mensaje || "Con alerta financiera") : "Sin alerta financiera",
      tono: data.configuracion_ia?.tono_visualizacion || (isSimpleTone ? "ciudadano" : "tecnico"),
      version_analisis: data.version_analisis || data.configuracion_ia?.version_analisis || "-"
    };
  };

  const registrarCambioManual = (descripcion) => {
    const usuarioActivo = JSON.parse(localStorage.getItem('usuario'));
    const firmaUsuario = usuarioActivo ? `${usuarioActivo.username} (${usuarioActivo.rol === 'admin' ? 'Admin' : 'Sec'})` : 'm.gomez (Sec)';
    setHistorialEntries(prev => {
      const nuevaVersion = `v${prev.length + 1}`;
      const nuevoHito = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        version: nuevaVersion,
        titulo: 'Edición Manual',
        usuario: firmaUsuario,
        comentario: descripcion,
        snapshot: construirSnapshotVersion(),
        isActual: true
      };
      return prev.map(h => ({ ...h, isActual: false })).concat(nuevoHito);
    });
  };

  const construirConfiguracionIA = (extra = {}) => {
    const usuarioActivo = JSON.parse(localStorage.getItem('usuario') || '{}');
    return {
      version_analisis: extra.version_analisis || `v${historialEntries.length + 1}`,
      pipeline_version: "SIGEJA-RAG-2026.08",
      modelo_principal: "mistral",
      proveedor_modelo: "Ollama local",
      endpoint_modelo: "localhost:11434",
      tono_visualizacion: isSimpleTone ? "ciudadano" : "tecnico",
      parametros: {
        temperature_resumen: 0.1,
        temperature_chat: 0.15,
        temperature_feedback: 0.1,
        top_p: 0.85,
        modelo_embeddings: "nomic-embed-text",
        vector_db: "PostgreSQL + pgvector"
      },
      usuario: usuarioActivo.username || usuarioActivo.nombre || "Usuario SIGEJA",
      fecha_configuracion: new Date().toISOString(),
      evento: extra.evento || "ANALISIS_IA",
      observacion: extra.observacion || ""
    };
  };

  const construirHitoHistorial = (descripcion, titulo = 'Edición Manual') => {
    const usuarioActivo = JSON.parse(localStorage.getItem('usuario') || '{}');
    const firmaUsuario = usuarioActivo?.username
      ? `${usuarioActivo.username} (${usuarioActivo.rol === 'admin' ? 'Admin' : 'Sec'})`
      : 'Usuario SIGEJA';
    return {
      id: Date.now(),
      fecha: new Date().toLocaleString(),
      version: `v${historialEntries.length + 1}`,
      titulo,
      usuario: firmaUsuario,
      comentario: descripcion,
        snapshot: construirSnapshotVersion(),
        isActual: true
    };
  };


  const persistirBorradorAnalisis = async (resultadosActualizados, detalle) => {
    const numero = expedienteSeleccionado?.numero_expediente || "";
    if (!numero || !resultadosActualizados) return;
    const usuarioActivo = JSON.parse(localStorage.getItem('usuario') || '{}');
    const token = localStorage.getItem('access_token');
    const res = await fetch(`/api/v1/expedientes/${encodeURIComponent(numero)}/analysis-draft`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        resultados_json: resultadosActualizados,
        detalle,
        usuario: usuarioActivo.username || usuarioActivo.nombre || "Usuario SIGEJA"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status !== "success") {
      throw new Error(data.detail || "No se pudo guardar la edición del análisis.");
    }
  };

  const handleActualizarPuntoSugerido = async (index, puntoActualizado, descripcion) => {
    if (!analysisData) return;
    const hitoEdicion = construirHitoHistorial(descripcion, "Edición de Sugerencia");
    const historialActualizado = historialEntries.map(h => ({ ...h, isActual: false })).concat(hitoEdicion);
    const puntosActualizados = (analysisData.puntos_sugeridos || []).map((punto, idx) =>
      idx === index ? puntoActualizado : punto
    );
    const resultadosActualizados = {
      ...analysisData,
      puntos_sugeridos: puntosActualizados,
      version_analisis: hitoEdicion.version,
      configuracion_ia: construirConfiguracionIA({
        version_analisis: hitoEdicion.version,
        evento: "EDICION_SUGERENCIA",
        observacion: descripcion
      }),
      trazabilidad_cambios: historialActualizado,
      historial: historialActualizado
    };

    setAnalysisData(resultadosActualizados);
    setHistorialEntries(historialActualizado);

    try {
      await persistirBorradorAnalisis(resultadosActualizados, descripcion);
    } catch (error) {
      console.error("Error guardando edición de sugerencia:", error);
      window.alert(error.message || "No se pudo guardar la edición. Intenta nuevamente.");
    }
  };

  const handleCambiarTonoIA = () => {
    const nuevoTonoSimple = !isSimpleTone;
    setIsSimpleTone(nuevoTonoSimple);
    setAnalysisData(prev => {
      if (!prev) return prev;
      const versionActual = prev.version_analisis || prev.configuracion_ia?.version_analisis || historialEntries[historialEntries.length - 1]?.version || "v1";
      return {
        ...prev,
        configuracion_ia: {
          ...construirConfiguracionIA({
            version_analisis: versionActual,
            evento: "CAMBIO_TONO_VISUAL",
            observacion: `Tono activo: ${nuevoTonoSimple ? 'lenguaje ciudadano' : 'lenguaje técnico'}`
          }),
          tono_visualizacion: nuevoTonoSimple ? "ciudadano" : "tecnico"
        }
      };
    });
  };

  const cargarPDFsDesdeServidor = async (numero) => {
    setPdfFiles([]);
    setActivePdfIndex(0);
    if (!numero) return;
    try {
      const res = await fetch(`/api/v1/expedientes/${numero}/pdfs`);
      const data = await res.json();
      if (res.ok && data.files && data.files.length > 0) {
        const archivos = data.files.map(nombre => ({
          name: nombre,
          url: `/api/v1/expedientes/${numero}/pdf/${encodeURIComponent(nombre)}`
        }));
        setPdfFiles(archivos);
        setActivePdfIndex(0);
      } else {
        setPdfFiles([]);
        setActivePdfIndex(0);
      }
    } catch (err) {
      console.error("Error cargando PDFs desde servidor:", err);
      setPdfFiles([]);
      setActivePdfIndex(0);
    }
  };

  const handleFileUpload = (event) => {
    if (uploadInProgressRef.current || isLoading) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const files = Array.from(event.target.files);
    if (!files.length) return;
    const archivoGrande = files.find(file => file.size > MAX_UPLOAD_FILE_BYTES);
    if (archivoGrande) {
      window.alert(
        `No se pudo cargar "${archivoGrande.name}".\n\n` +
        `Tamaño detectado: ${formatFileSize(archivoGrande.size)}.\n` +
        `Límite permitido: ${MAX_UPLOAD_FILE_MB} MB por PDF.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    procesarEnvioDocumento(files);
  };

  const procesarEnvioDocumento = async (files, opciones = {}) => {
    if (uploadInProgressRef.current && !opciones.confirmacionDatosSensibles && !opciones.confirmacionDuplicados) return;
    uploadInProgressRef.current = true;
    backendProgressRef.current = { stage: "", floor: 0, ceiling: 0, startedAt: 0, durationMs: 20000 };
    setIsLoading(true);
    setLoadingProgress(0);
    setUsingBackendProgress(false);
    setLoadingText("Preparando archivos del expediente...");
    setLoadingInsight("Ordenando PDFs y preparando el análisis.");
    setPdfFiles([]);
    setActivePdfIndex(0);
    setResumenPorPdf([]);
    setPdfSearchTerm("");
    setPdfEvidence(null);
    setActiveEvidence(null);
    resetChat();

    const usuarioActivo = JSON.parse(localStorage.getItem('usuario'));
    const firmaUsuario = usuarioActivo ? `${usuarioActivo.username}` : 'm.gomez';

    try {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      formData.append("forzar_ocr", forzarOCR ? "true" : "false");
      formData.append("numero_expediente", expedienteSeleccionado.numero_expediente);
      formData.append("usuario_auditoria", firmaUsuario);
      formData.append("confirmacion_datos_sensibles", opciones.confirmacionDatosSensibles ? "true" : "false");
      formData.append("confirmacion_duplicados", opciones.confirmacionDuplicados ? "true" : "false");

      const res = await fetch("/api/v1/analyze-document", {
        method: "POST",
        body: formData
      });
      const response = await res.json().catch(() => ({
        detail: "No se pudo interpretar la respuesta del servidor."
      }));

      if (res.ok && response?.status === "requires_sensitive_confirmation") {
        setIsLoading(false);
        uploadInProgressRef.current = false;
        setSensitiveModal({
          isOpen: true,
          hallazgos: response.hallazgos_sensibles || [],
          files
        });
        return;
      }

      if (res.ok && response?.status === "requires_duplicate_confirmation") {
        setIsLoading(false);
        const detalleDuplicados = (response.duplicados || [])
          .map((item, index) => `${index + 1}. ${item.tipo}: ${item.detalle}`)
          .join('\n');
        const confirmarReproceso = window.confirm(
          `Se detectaron posibles duplicados en la carga.\n\n${detalleDuplicados}\n\n` +
          'Si continuas, se reemplazaran los documentos guardados y se reprocesara el expediente. Deseas continuar?'
        );
        uploadInProgressRef.current = false;
        if (confirmarReproceso) {
          await procesarEnvioDocumento(files, {
            ...opciones,
            confirmacionDuplicados: true
          });
        } else if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      if (res.ok && response && (response.status === "success" || response.resultados)) {
        setLoadingProgress(100);
        setLoadingText("¡Análisis Completado!");
        setTimeout(async () => {
          const data = response.resultados || response;
          setAnalysisData(data);
          setTextoExpediente(response.texto_ocr || response.texto_completo || "");
          if (response.resumen_por_pdf) setResumenPorPdf(response.resumen_por_pdf);
          setHasDocument(true);
          await cargarPDFsDesdeServidor(expedienteSeleccionado.numero_expediente);
          if (data && data.historial) {
            setHistorialEntries(data.historial);
          } else {
            setHistorialEntries([{
              id: Date.now(),
              fecha: new Date().toLocaleString(),
              version: 'v1',
              titulo: 'Generación Inicial RAG',
              usuario: 'Sistema SIPLAN (IA)',
              comentario: 'Análisis automático completado con éxito.',
              snapshot: construirSnapshotVersion(data),
              isActual: true
            }]);
          }
          setCardVisibility({
            resumen: true, postura: true, plazos: true, sujetos: true,
            financiera: true, capacidad: true, controversias: true
          });
          uploadInProgressRef.current = false;
          setIsLoading(false);
        }, 600);
      } else {
        const mensajeError = res.status === 413
          ? (response.detail || `Uno de los PDFs supera el límite permitido de ${MAX_UPLOAD_FILE_MB} MB.`)
          : (response.detail || "Error de validación en el expediente.");
        setLoadingText(mensajeError);
        setTimeout(() => {
          setIsLoading(false);
          setHasDocument(false);
          setPdfFiles([]);
          setActivePdfIndex(0);
          uploadInProgressRef.current = false;
          if (fileInputRef.current) fileInputRef.current.value = "";
        }, 4500);
      }
    } catch (error) {
      console.error("Error:", error);
      setLoadingText("Error en el análisis. Revisa la conexión o intenta con un PDF más liviano.");
      setTimeout(() => {
        uploadInProgressRef.current = false;
        setIsLoading(false);
      }, 2000);
    }
  };

  const registrarDecisionDatosSensibles = async (decision, hallazgosCount) => {
    const usuarioActivo = JSON.parse(localStorage.getItem('usuario'));
    const firmaUsuario = usuarioActivo ? `${usuarioActivo.username}` : 'm.gomez';
    try {
      await fetch("/api/v1/audit/sensitive-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_expediente: expedienteSeleccionado?.numero_expediente || "",
          usuario: firmaUsuario,
          decision,
          hallazgos_count: hallazgosCount
        })
      });
    } catch (err) {
      console.error("No se pudo registrar la validacion sensible:", err);
    }
  };

  const confirmarDatosAnonimizados = async () => {
    const filesPendientes = sensitiveModal.files;
    setSensitiveModal({ isOpen: false, hallazgos: [], files: [] });
    await procesarEnvioDocumento(filesPendientes, { confirmacionDatosSensibles: true });
  };

  const cancelarAnalisisPorDatosSensibles = async () => {
    const hallazgosCount = sensitiveModal.hallazgos.length;
    setSensitiveModal({ isOpen: false, hallazgos: [], files: [] });
    uploadInProgressRef.current = false;
    setIsLoading(false);
    setHasDocument(false);
    setPdfFiles([]);
    setActivePdfIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await registrarDecisionDatosSensibles("cancelado", hallazgosCount);
  };

  const normalizarBusquedaPdf = (valor) => {
    if (valor === null || valor === undefined) return "";
    const texto = String(valor).replace(/\s+/g, " ").trim();
    if (!texto || texto === "No detectado" || texto === "No encontrado") return "";
    const monto = texto.match(/(?:S\/\.?\s*)?(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?|\d+(?:[,.]\d{2})?)/);
    if (texto.includes("S/") && monto) return monto[1];
    const palabras = texto.split(" ").filter(Boolean);
    return palabras.length > 5 ? palabras.slice(0, 5).join(" ") : texto.replace(/[,:;]+$/g, "");
  };

  const construirUrlPdfConEvidencia = (baseUrl, evidencia) => {
    if (!baseUrl) return "";
    const partes = [];
    if (evidencia?.page) partes.push(`page=${evidencia.page}`);
    if (evidencia?.term) partes.push(`search=${encodeURIComponent(evidencia.term)}`);
    return partes.length ? `${baseUrl}#${partes.join("&")}` : baseUrl;
  };

  const buscarEvidenciaEnServidor = async (termino) => {
    const numero = expedienteSeleccionado?.numero_expediente;
    if (!numero || !termino) return null;
    try {
      const res = await fetch(`/api/v1/expedientes/${encodeURIComponent(numero)}/buscar-evidencia?term=${encodeURIComponent(termino)}`);
      const data = await res.json();
      if (res.ok && data?.status === "success") return data;
    } catch (err) {
      console.error("Error buscando evidencia en PDFs:", err);
    }
    return null;
  };

  const buscarIndicePdfPorEvidencia = (termino) => {
    const normalizado = normalizarBusquedaPdf(termino).toLowerCase();
    if (!normalizado) return activePdfIndex;

    const partes = String(textoExpediente || "").split(/--- \[DOCUMENTO \d+:\s*([^\]]+)\] ---/i);
    for (let i = 1; i < partes.length; i += 2) {
      const nombreDoc = partes[i];
      const textoDoc = (partes[i + 1] || "").toLowerCase();
      if (textoDoc.includes(normalizado)) {
        const idx = pdfFiles.findIndex(pdf => pdf.name === nombreDoc || pdf.name.toLowerCase() === nombreDoc.toLowerCase());
        if (idx >= 0) return idx;
      }
    }

    const idxResumen = resumenPorPdf.findIndex(resumen => JSON.stringify(resumen || {}).toLowerCase().includes(normalizado));
    if (idxResumen >= 0 && idxResumen < pdfFiles.length) return idxResumen;
    return activePdfIndex;
  };

  const handleJumpToSource = async (textoExtraido, opciones = {}) => {
    const termino = normalizarBusquedaPdf(opciones.searchTerm || textoExtraido);
    if (!termino) return;
    const resultadoServidor = await buscarEvidenciaEnServidor(termino);
    if (resultadoServidor && resultadoServidor.found === false) {
      setActiveEvidence({
        label: opciones.label || "Evidencia seleccionada",
        term: termino,
        pdfName: "No se encontro coincidencia exacta",
        notFound: true
      });
      setPdfSearchTerm("");
      setPdfEvidence(null);
      return;
    }
    let targetIndex = Number.isInteger(opciones.pdfIndex) ? opciones.pdfIndex : buscarIndicePdfPorEvidencia(termino);
    let pagina = 1;
    let terminoFinal = termino;

    if (resultadoServidor?.archivo) {
      const idxServidor = pdfFiles.findIndex(pdf =>
        pdf.name === resultadoServidor.archivo ||
        pdf.name.toLowerCase() === String(resultadoServidor.archivo).toLowerCase()
      );
      if (idxServidor >= 0) targetIndex = idxServidor;
      pagina = Number(resultadoServidor.pagina || 1);
      terminoFinal = normalizarBusquedaPdf(resultadoServidor.search_term || termino);
    }

    if (targetIndex >= 0 && targetIndex < pdfFiles.length) {
      setActivePdfIndex(targetIndex);
    }
    setActiveEvidence({
      label: opciones.label || "Evidencia seleccionada",
      term: terminoFinal,
      pdfName: pdfFiles[targetIndex]?.name || pdfFiles[activePdfIndex]?.name || "Documento activo"
    });
    setPdfSearchTerm("");
    setPdfEvidence(null);
    setTimeout(() => {
      setPdfSearchTerm(terminoFinal);
      setPdfEvidence({ term: terminoFinal, page: pagina, nonce: Date.now() });
    }, 120);
  };

  const handleRegenerarResumen = async (correcciones) => {
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/v1/regenerate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto_expediente: textoExpediente,
          entidades_previas: analysisData.sujetos_procesales || {},
          correcciones_usuario: correcciones,
          numero_expediente: expedienteSeleccionado?.numero_expediente || pdfFiles[0]?.name || "",
          usuario: JSON.parse(localStorage.getItem('usuario') || '{}')?.username || "Usuario SIGEJA"
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        const hitoCorreccion = construirHitoHistorial(`Regeneración IA por corrección de datos: "${correcciones}"`, 'Corrección IA');
        const historialActualizado = historialEntries.map(h => ({ ...h, isActual: false })).concat(hitoCorreccion);
        const configCorreccion = construirConfiguracionIA({
          version_analisis: hitoCorreccion.version,
          evento: "CORRECCION_IA",
          observacion: correcciones
        });
        setAnalysisData(prev => ({
          ...prev,
          sujetos_procesales: data.resultados_corregidos.sujetos_procesales || prev.sujetos_procesales,
          sintesis_rag: data.resultados_corregidos.resumen,
          postura_defensa: data.resultados_corregidos.postura,
          puntos_sugeridos: data.resultados_corregidos.puntos_controvertidos,
          version_analisis: hitoCorreccion.version,
          configuracion_ia: configCorreccion,
          trazabilidad_cambios: historialActualizado,
          historial: historialActualizado
        }));
        setHistorialEntries(historialActualizado);
      }
    } catch (error) {
      console.error("Error al regenerar resumen:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleClearDocument = () => {
    setAccessDenied(null);
    setHasDocument(false);
    setPdfFiles([]);
    setActivePdfIndex(0);
    setAnalysisData(null);
    setTextoExpediente("");
    setHistorialEntries([]);
    setPdfSearchTerm("");
    setPdfEvidence(null);
    setActiveEvidence(null);
    setChatMessages([
      { rol: 'assistant', contenido: 'Hola, soy el asistente IA de SIGEJA. \u00bfEn qu\u00e9 te puedo ayudar?' }
    ]);
    setCardVisibility(Object.keys(cardVisibility).reduce((acc, key) => ({ ...acc, [key]: false }), {}));
    draftAnalysisData = null;
    draftPdfFiles = [];
    draftActivePdfIndex = 0;
    draftHasDocument = false;
    draftTextoExpediente = "";
    draftHistorialEntries = [];
    draftChatMessages = [
      { rol: 'assistant', contenido: 'Hola, soy el asistente IA de SIGEJA. \u00bfEn qu\u00e9 te puedo ayudar?' }
    ];
  };

  const handleGuardarEnBD = async () => {
    if (!analysisData) return;
    setIsSavingDB(true);
    try {
      const hitoAprobacion = construirHitoHistorial("Análisis oficial aprobado y guardado en la base de datos central.", "Aprobación Oficial");
      const historialActualizado = historialEntries.map(h => ({ ...h, isActual: false })).concat(hitoAprobacion);
      const configuracionIA = construirConfiguracionIA({
        version_analisis: hitoAprobacion.version,
        evento: "APROBACION_ANALISIS",
        observacion: "Análisis aprobado por usuario revisor"
      });
      const resultadosVersionados = {
        ...analysisData,
        version_analisis: hitoAprobacion.version,
        configuracion_ia: configuracionIA,
        trazabilidad_cambios: historialActualizado,
        historial: historialActualizado
      };
      const res = await fetch('/api/v1/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_expediente: expedienteSeleccionado?.numero_expediente || "",
          tiempo_procesamiento_seg: 15.5,
          paginas_ocr: 2,
          resultados_json: resultadosVersionados
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setIsSavedDB(true);
        setHistorialEntries(historialActualizado);
        setAnalysisData(resultadosVersionados);
        setTimeout(() => setIsSavedDB(false), 3000);
      }
    } catch (error) {
      console.error("Error al guardar en BD:", error);
    } finally {
      setIsSavingDB(false);
    }
  };

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    const contextoChat = textoExpediente?.trim()
      ? textoExpediente
      : analysisData
        ? JSON.stringify(analysisData)
        : "";
    if (!chatInput.trim() || !contextoChat || isChatLoading) return;
    const pdfActivo = pdfFiles[activePdfIndex] || null;
    const userMsg = { rol: 'user', contenido: chatInput };
    const nuevosMensajes = [...chatMessages, userMsg];
    setChatMessages(nuevosMensajes);
    draftChatMessages = nuevosMensajes;
    setChatInput("");
    setIsChatLoading(true);
    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.contenido,
          texto_expediente: contextoChat,
          numero_expediente: expedienteSeleccionado?.numero_expediente || "",
          documento_activo: pdfActivo?.name || "",
          pagina_activa: pdfEvidence?.page || 1,
          historial: chatMessages.map(m => ({ rol: m.rol, contenido: m.contenido })),
          datos_extraidos: analysisData || {},
          resumen_por_pdf: resumenPorPdf || []
        })
      });
      const data = await res.json();
      const respuesta = res.ok
        ? (data.respuesta || "No hay informacion sobre esto en el expediente.")
        : (data.detail || "No se pudo consultar el expediente.");
      const msjsConRespuesta = [...nuevosMensajes, { rol: 'assistant', contenido: respuesta }];
      setChatMessages(msjsConRespuesta);
      draftChatMessages = msjsConRespuesta;
    } catch (error) {
      const msjsConError = [...nuevosMensajes, { rol: 'assistant', contenido: 'Error de conexión.' }];
      setChatMessages(msjsConError);
      draftChatMessages = msjsConError;
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleExportWord = async () => {
    if (!analysisData) return;
    setIsLoading(true);
    const nombreExpediente = expedienteSeleccionado?.numero_expediente || pdfFiles[0]?.name || "Expediente";
    const usuarioActivo = JSON.parse(localStorage.getItem('usuario') || '{}');
    try {
      const exportData = {
        expediente: nombreExpediente,
        usuario: usuarioActivo.username || usuarioActivo.nombre || "Usuario SIGEJA",
        fecha_generacion: new Date().toISOString(),
        resumen: isSimpleTone ? analysisData.sintesis_rag?.estandar : analysisData.sintesis_rag?.tecnico,
        postura: isSimpleTone ? analysisData.postura_defensa?.estandar : analysisData.postura_defensa?.tecnico,
        financiera: analysisData.revision_financiera || {},
        sujetos: analysisData.sujetos_procesales || {},
        capacidad: analysisData.capacidad_cargas || {},
        calculadora_economica: analysisData.calculadora_economica || {},
        plazos: analysisData.plazos || {},
        admisibilidad: analysisData.admisibilidad || [],
        puntos_controvertidos: analysisData.puntos_sugeridos || [],
        resumen_por_pdf: analysisData.resumen_por_pdf || resumenPorPdf || [],
        metricas: {
          bert_score: analysisData.bert_score,
          f1_ner: analysisData.f1_ner,
          ocr_precision: analysisData.ocr_precision
        },
        configuracion_ia: analysisData.configuracion_ia || construirConfiguracionIA({ evento: "EXPORT_WORD" }),
        version_analisis: analysisData.version_analisis || analysisData.configuracion_ia?.version_analisis || "v1",
        trazabilidad_cambios: analysisData.trazabilidad_cambios || analysisData.historial || historialEntries
      };
      const response = await fetch('/api/v1/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_SIPLAN_${nombreExpediente}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Error al exportar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAdmisibilidadPdf = async () => {
    if (!analysisData?.admisibilidad) return;
    const usuarioActivo = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nombreExpediente = expedienteSeleccionado?.numero_expediente || pdfFiles[0]?.name || "Expediente";
    try {
      const response = await fetch('/api/v1/export-admisibilidad-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_expediente: nombreExpediente,
          usuario: usuarioActivo.username || usuarioActivo.nombre || "Usuario SIGEJA",
          admisibilidad: analysisData.admisibilidad || [],
          sujetos_procesales: analysisData.sujetos_procesales || {},
          revision_financiera: analysisData.revision_financiera || {}
        }),
      });
      if (!response.ok) throw new Error("No se pudo generar el PDF de admisibilidad");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Admisibilidad_${nombreExpediente}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar PDF de admisibilidad:", error);
    }
  };

  return (
    <div className="flex-1 bg-[#f8fafc] flex flex-col h-full overflow-hidden">

      {/* 1. Header Superior */}
      <header className="bg-white border-b border-slate-200 w-full h-[76px] xl:h-[93px] px-4 xl:px-8 flex items-center shrink-0 z-10">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Análisis IA</h2>
          <div className="flex items-center gap-2 xl:gap-4">
            <LiveNotifications usuarioActivo={usuarioHeader} />
            <div onClick={() => navigate('/profile')} className="flex items-center bg-[#2546b0] text-white rounded-lg px-3 xl:px-4 py-1.5 gap-2 xl:gap-3 cursor-pointer hover:bg-blue-800 transition-all shadow-sm max-w-[220px] xl:max-w-none">
              <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">
                {usuarioHeader.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || "US"}
              </div>
              <div className="text-[10px] leading-tight text-left font-bold min-w-0">
                <span className="block truncate max-w-[130px] xl:max-w-none">
                {usuarioHeader.nombre || "Usuario SIGEJA"}<br/>
                </span>
                <span className="opacity-80 font-medium text-[9px]">
                  {usuarioHeader.cargo || "Personal Judicial"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 ml-1 opacity-60" />
            </div>
          </div>
        </div>
      </header>

      {/* 2. Área de Trabajo */}
      <main className="flex-1 flex min-h-0 overflow-hidden">

        {/* COLUMNA IZQUIERDA: VISOR DE EXPEDIENTE */}
        <section className="flex-[6] min-w-0 flex flex-col border-r border-slate-300 bg-slate-200 relative min-h-0">

          {/* POP-UP MODAL: Bandeja de expedientes */}
          {isExpedienteModalOpen && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-[#1a3059] p-5 text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-bold tracking-wide">Bandeja de Expedientes Asignados</h2>
                    <p className="text-[10px] text-blue-200 mt-0.5">Selecciona el caso correspondiente antes de proceder con la carga o revisión.</p>
                  </div>
                  <button
                    onClick={() => setIsExpedienteModalOpen(false)}
                    className="text-slate-300 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="p-3 max-h-[380px] overflow-y-auto custom-scrollbar bg-slate-50">
                  {listaExpedientes.map((exp) => (
                    <div
                      key={exp.numero_expediente}
                      onClick={(event) => seleccionarExpedienteDeBandeja(exp, event)}
                      className="p-3.5 mb-2 bg-white border border-slate-200 rounded-xl hover:border-[#2546b0] hover:shadow-sm cursor-pointer transition-all flex justify-between items-center group"
                    >
                      <div className="text-left">
                        <h3 className="font-bold text-slate-800 text-xs tracking-tight group-hover:text-[#2546b0] transition-colors">
                          {exp.numero_expediente}
                        </h3>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#2546b0]">
                          <Hash size={10} /> {exp.codigo_seguimiento || 'SIGEJA-S/C'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium max-w-[340px] truncate uppercase">
                          {exp.caratula}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {exp.tiene_analisis ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[9px] font-bold border border-emerald-200/60 block text-center">
                            Ver Análisis
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[9px] font-bold border border-amber-200/60 block text-center">
                            Cargar PDF
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BARRA SUPERIOR (Azul) */}
          <div className="bg-[#2546b0] px-3 xl:px-4 py-2 flex gap-2 xl:gap-3 shrink-0 items-center overflow-x-auto custom-scrollbar">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf"
              multiple
            />

            <button
              onClick={() => setIsExpedienteModalOpen(true)}
              disabled={isLoading || hasDocument}
              className={`shrink-0 flex items-center text-white px-3 py-1.5 rounded text-xs font-bold transition-colors border border-white/10 ${isLoading || hasDocument ? 'opacity-50 cursor-not-allowed bg-white/5' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {isLoading ? (
                <span className="animate-pulse flex items-center"><Bot size={14} className="mr-2" /> Procesando con IA...</span>
              ) : (
                <><Upload size={14} className="mr-2" /> Subir Expediente</>
              )}
            </button>

            {!hasDocument && (
              <label className="shrink-0 flex items-center text-white text-[11px] font-medium cursor-pointer hover:bg-white/10 px-2 py-1 rounded transition-colors xl:ml-2">
                <input
                  type="checkbox"
                  checked={forzarOCR}
                  onChange={(e) => setForzarOCR(e.target.checked)}
                  className="mr-2 cursor-pointer"
                />
                Forzar OCR Profundo (Tesseract)
              </label>
            )}

            <button
              onClick={handleClearDocument}
              disabled={!hasDocument}
              className={`shrink-0 flex items-center text-white px-3 py-1.5 rounded text-xs font-bold transition-colors border border-white/10 ${!hasDocument ? 'opacity-50 cursor-not-allowed bg-white/5' : 'bg-red-500/20 hover:bg-red-500/40 text-red-100 border-red-500/30'}`}
            >
              <Trash2 size={14} className="mr-2" /> Eliminar
            </button>

            {hasDocument && (
              <button
                onClick={handleGuardarEnBD}
                disabled={isSavingDB || isSavedDB}
                className={`shrink-0 flex items-center text-white px-3 py-1.5 rounded text-xs font-bold transition-all shadow-sm ml-auto ${
                  isSavedDB
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/30'
                }`}
              >
                {isSavingDB ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : isSavedDB ? (
                  <CheckCircle size={14} className="mr-2" />
                ) : (
                  <Save size={14} className="mr-2" />
                )}
                {isSavingDB ? "Guardando..." : isSavedDB ? "¡Aprobado y Guardado!" : "Aprobar y Guardar Análisis"}
              </button>
            )}
          </div>

          {/* TABS DE DOCUMENTOS PDF */}
          <div className={`bg-slate-100 px-3 py-2 flex flex-wrap items-center gap-1.5 border-b border-slate-300 shrink-0 transition-opacity max-h-[96px] overflow-y-auto custom-scrollbar ${hasDocument ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            {pdfFiles.length > 0 ? (
              pdfFiles.map((pdf, i) => {
                const resumenDoc = obtenerResumenPdf(resumenPorPdf, pdf.name);
                const tipoDoc = resumenDoc?.tipo_documental;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setActivePdfIndex(i);
                      setPdfSearchTerm("");
                      setPdfEvidence(null);
                      setActiveEvidence(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all max-w-[280px] ${
                      activePdfIndex === i
                        ? 'bg-white border border-slate-300 text-[#1a3059] shadow-sm'
                        : 'text-slate-500 hover:bg-slate-200'
                    }`}
                    title={tipoDoc ? `${pdf.name} - ${tipoDoc}` : pdf.name}
                  >
                    <FileText size={12} className="shrink-0" />
                    <span className="truncate max-w-[150px]">{pdf.name}</span>
                    {tipoDoc && (
                      <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] leading-none ${estilosTipoDocumental(tipoDoc)}`}>
                        {tipoDoc}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="flex items-center text-xs text-slate-700 font-bold">
                <FileText size={14} className="mr-2 text-slate-500" />
                <span>Sin documento</span>
              </div>
            )}
            {resumenPorPdf.length > 0 && (
              <button
                onClick={() => setIsResumenPdfsOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all whitespace-nowrap"
                title="Ver qué datos extrajo SIGEJA de cada PDF"
              >
                <Search size={12} />
                Ver extracción por PDF
              </button>
            )}
          </div>

          {/* MODAL RESUMEN POR PDF */}
          {isResumenPdfsOpen && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-10 px-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                  <div>
                    <h2 className="text-sm font-bold text-[#1a3059]">Extracción por documento PDF</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{resumenPorPdf.length} archivo(s) analizados — verifica que SIGEJA leyó cada PDF correctamente</p>
                  </div>
                  <button onClick={() => setIsResumenPdfsOpen(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none">×</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-4">
                  {resumenPorPdf.map((r, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="flex items-start justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                          <FileText size={14} className="text-[#2546b0]" />
                            <span className="text-xs font-bold text-[#1a3059] truncate max-w-[300px]">{r.archivo}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${estilosTipoDocumental(r.tipo_documental || "")}`}>
                              {r.tipo_documental || "Documento no clasificado"}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {r.categoria_documental || "Otros"}
                              {typeof r.confianza_clasificacion === "number" ? ` - ${Math.round(r.confianza_clasificacion * 100)}% confianza` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                          <span>~{r.paginas_estimadas} pág.</span>
                          <span>{Number(r.caracteres_extraidos || 0).toLocaleString()} chars</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            r.calidad_extraccion === 'Alta' ? 'bg-green-100 text-green-700' :
                            r.calidad_extraccion === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{r.calidad_extraccion}</span>
                        </div>
                      </div>
                      <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="col-span-2">
                          <p className="font-bold text-slate-600 mb-1">Senales de clasificacion</p>
                          <div className="flex flex-wrap gap-1">
                            {r.senales_clasificacion?.length > 0
                              ? r.senales_clasificacion.map((senal, j) => <span key={j} className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{senal}</span>)
                              : <span className="text-slate-400 italic">Sin senales suficientes</span>}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-600 mb-1">Nombres detectados</p>
                          {r.entidades_detectadas.nombres.length > 0
                            ? r.entidades_detectadas.nombres.slice(0, 5).map((n, j) => <div key={j} className="text-slate-700 truncate">· {n}</div>)
                            : <span className="text-slate-400 italic">Ninguno</span>}
                        </div>
                        <div>
                          <p className="font-bold text-slate-600 mb-1">DNIs detectados</p>
                          {r.entidades_detectadas.dnis.length > 0
                            ? r.entidades_detectadas.dnis.map((d, j) => <div key={j} className="text-slate-700 font-mono">· {d}</div>)
                            : <span className="text-slate-400 italic">Ninguno</span>}
                          <p className="font-bold text-slate-600 mb-1 mt-2">Montos S/.</p>
                          {r.entidades_detectadas.montos.length > 0
                            ? r.entidades_detectadas.montos.slice(0, 4).map((m, j) => <div key={j} className="text-slate-700">· {m}</div>)
                            : <span className="text-slate-400 italic">Ninguno</span>}
                        </div>
                        <div className="col-span-2">
                          <p className="font-bold text-slate-600 mb-1">Fechas detectadas</p>
                          <div className="flex flex-wrap gap-1">
                            {r.entidades_detectadas.fechas.length > 0
                              ? r.entidades_detectadas.fechas.map((f, j) => <span key={j} className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{f}</span>)
                              : <span className="text-slate-400 italic">Ninguna</span>}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="font-bold text-slate-600 mb-1">Preview del texto extraído</p>
                          <p className="text-slate-500 text-[11px] bg-slate-50 rounded p-2 leading-relaxed font-mono">{r.preview || '(vacío)'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ZONA PRINCIPAL DE CONTENIDO */}
          <div className="flex-1 overflow-y-auto p-3 xl:p-4 flex justify-center items-center custom-scrollbar bg-slate-300/50 relative">

            {/* PANTALLA DE CARGA */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8 transition-opacity">
                <div className="w-full max-w-sm text-center">
                  <div className="mb-8 relative flex justify-center">
                    <Bot size={56} className="text-[#2546b0] animate-pulse" />
                    <div className="absolute top-0 right-[40%] w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-ping"></div>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a3059] mb-2">Analizando Expediente</h3>
                  <p className="text-[11px] font-medium text-slate-500 mb-8 h-4 transition-all duration-300 uppercase tracking-wide">
                    {loadingText}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-5 min-h-[34px] leading-relaxed px-4">
                    {loadingInsight}
                  </p>
                  <div className="w-full bg-slate-200/60 rounded-full h-2.5 mb-3 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-[#2546b0] h-full rounded-full transition-all duration-300 ease-out relative"
                      style={{ width: `${loadingProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>0%</span>
                    <span className="text-[#2546b0] text-xs">{Math.round(loadingProgress)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* VISOR DEL PDF */}
            {!isLoading && hasDocument && pdfFiles[activePdfIndex] && (
              <div className="w-full h-full bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-300 relative z-10">
                {activeEvidence && (
                  <div className={`absolute top-3 left-3 right-3 z-20 rounded-md border bg-white/95 shadow-lg px-3 py-2 flex items-center justify-between gap-3 ${activeEvidence.notFound ? 'border-amber-200' : 'border-blue-200'}`}>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${activeEvidence.notFound ? 'text-amber-700' : 'text-blue-700'}`}>
                        {activeEvidence.notFound ? 'Fuente no ubicada' : 'Fuente documental activa'}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {activeEvidence.label}: <span className="font-bold text-slate-900">{activeEvidence.term}</span>
                        <span className="text-slate-400"> · {activeEvidence.pdfName}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfSearchTerm("");
                        setPdfEvidence(null);
                        setActiveEvidence(null);
                      }}
                      className="shrink-0 text-[10px] font-bold text-slate-500 hover:text-slate-900 border border-slate-200 rounded px-2 py-1 bg-white"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
                <PdfEvidenceViewer
                  file={pdfFiles[activePdfIndex]}
                  evidence={pdfEvidence}
                  key={`${activePdfIndex}-${pdfFiles[activePdfIndex]?.url || "pdf"}`}
                />
              </div>
            )}

            {!isLoading && !hasDocument && accessDenied && (
              <div className="flex flex-col items-center justify-center text-center -mt-16 px-6">
                <div className="bg-red-50 border border-red-200 p-5 rounded-full mb-4">
                  <AlertTriangle size={56} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-red-700 mb-2 tracking-tight">Acceso denegado</h3>
                <p className="text-sm text-slate-500 max-w-md font-medium">
                  {accessDenied} El intento fue rechazado por el backend y quedo registrado en Auditoria.
                </p>
              </div>
            )}

            {/* EMPTY STATE */}
            {!isLoading && !hasDocument && !accessDenied && (
              <div className="flex flex-col items-center justify-center text-slate-400 -mt-20">
                <div className="bg-slate-200/50 p-6 rounded-full mb-4">
                  <FileText size={64} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-500 mb-2 tracking-tight">Sube un Expediente para analizar</h3>
                <p className="text-sm text-slate-400 text-center max-w-sm font-medium">
                  El asistente IA requiere un documento en formato PDF para iniciar la extracción de entidades y el análisis legal.
                </p>
              </div>
            )}

          </div>
        </section>

        {/* COLUMNA DERECHA: PANEL DE INTELIGENCIA */}
        <section className="flex-[4] flex flex-col bg-slate-50 relative min-w-[320px] xl:min-w-[380px] border-l border-slate-300 min-h-0">

          <div className={`h-[46px] text-white px-3 xl:px-4 flex items-center justify-between shrink-0 relative z-30 shadow-sm transition-colors ${hasDocument ? 'bg-[#1a3059]' : 'bg-slate-400'}`}>
            <div className="flex items-center gap-3">
              <Menu
                size={18}
                className={`transition-all ${hasDocument ? 'cursor-pointer hover:opacity-100' : 'cursor-not-allowed opacity-50'} ${isMenuOpen ? 'bg-white/20 rounded-md p-0.5' : 'opacity-80'}`}
                onClick={() => hasDocument && setIsMenuOpen(!isMenuOpen)}
              />
              <span className="text-[10px] xl:text-xs font-bold tracking-widest opacity-90 uppercase truncate">
                {hasDocument ? `Exp. N° ${expedienteSeleccionado?.numero_expediente || ''}` : 'SIN EXPEDIENTE ACTIVO'}
              </span>
              {hasDocument && (
                <span className="hidden xl:inline-flex items-center gap-1 rounded bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] font-black tracking-wider text-blue-100">
                  <Hash size={10} /> {expedienteSeleccionado?.codigo_seguimiento || 'SIGEJA-S/C'}
                </span>
              )}
            </div>
          </div>

          <AnalysisMenu
            isMenuOpen={isMenuOpen}
            isSimpleTone={isSimpleTone}
            setIsSimpleTone={handleCambiarTonoIA}
            cardVisibility={cardVisibility}
            toggleCard={toggleCard}
            onOpenJurisprudencia={() => { setIsJurisprudenciaOpen(true); setIsMenuOpen(false); }}
            onOpenHistorial={() => { setIsHistorialOpen(true); setIsMenuOpen(false); }}
            onExportWord={handleExportWord}
            onOpenRating={() => setIsRatingOpen(true)}
          />

          <div className="flex-1 overflow-y-auto p-4 xl:p-6 pb-[170px] xl:pb-[180px] custom-scrollbar bg-[#f8fafc] z-10 flex flex-col">
            {hasDocument && analysisData ? (
              <>
                {cardVisibility.resumen && <ResumenCard data={analysisData.sintesis_rag} isSimpleTone={isSimpleTone} />}
                {cardVisibility.postura && <PosturaCard data={analysisData.postura_defensa} isSimpleTone={isSimpleTone} />}
                {cardVisibility.plazos && <PlazosCard data={analysisData.plazos} onJumpToSource={handleJumpToSource} />}
                {cardVisibility.admisibilidad && <AdmisibilidadCard data={analysisData.admisibilidad} onJumpToSource={handleJumpToSource} onExportPdf={handleExportAdmisibilidadPdf} />}
                {cardVisibility.necesidades && <NecesidadesCard data={analysisData.revision_financiera} />}
                {cardVisibility.capacidad && <CapacidadCargasCard data={analysisData.capacidad_cargas} onOpenDetalle={() => setIsDetalleOpen(true)} onJumpToSource={handleJumpToSource} />}
                {cardVisibility.controversias && (
                  <ControversiasCard
                    puntos={analysisData.puntos_sugeridos}
                    onRegenerate={handleRegenerarResumen}
                    onUpdatePoint={handleActualizarPuntoSugerido}
                    isRegenerating={isRegenerating}
                  />
                )}
                {cardVisibility.sujetos && <SujetosProcesalesCard data={analysisData.sujetos_procesales} onJumpToSource={handleJumpToSource} />}
                {cardVisibility.financiera && <FinancieraCard data={analysisData.revision_financiera} calculadora={analysisData.calculadora_economica} onJumpToSource={handleJumpToSource} />}
                {!Object.values(cardVisibility).some(Boolean) && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60 italic">
                    <Search size={40} className="mb-2" />
                    <p className="text-sm font-medium">Usa el menú para mostrar información</p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-80">
                <FileQuestion size={48} className="mb-4 text-slate-300" />
                <p className="text-sm font-bold text-slate-400">Esperando expediente...</p>
              </div>
            )}
          </div>

          {/* ASISTENTE IA INTERACTIVO */}
          <div
            className={`absolute bottom-0 w-full bg-white border-t border-slate-200 z-50 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] ${
              !hasDocument ? 'translate-y-full opacity-0' : isChatExpanded ? 'h-[calc(100%-46px)] translate-y-0 opacity-100' : 'h-[150px] xl:h-[160px] translate-y-0 opacity-100'
            }`}
          >
            <div className="absolute left-0 right-0 -top-4 flex justify-center z-[100]">
              <div
                className="bg-[#1a3059] text-white rounded-full p-1.5 cursor-pointer shadow-lg hover:bg-blue-800 transition-transform hover:scale-110"
                onClick={() => setIsChatExpanded(!isChatExpanded)}
              >
                <ChevronUp size={18} className={`transition-transform duration-500 ${isChatExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <div className="p-4 xl:p-5 pt-7 flex flex-col h-full">
              {isChatExpanded ? (
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-5 mb-4">
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 max-w-[90%] ${msg.rol === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.rol === 'user' ? 'bg-slate-200' : 'bg-blue-100'}`}>
                        {msg.rol === 'user' ? <User size={14} className="text-slate-600" /> : <Bot size={14} className="text-blue-700" />}
                      </div>
                      <div className={`border p-3.5 rounded-xl text-[11px] shadow-sm leading-relaxed ${
                        msg.rol === 'user'
                          ? 'bg-[#1a3059] text-white border-[#1a3059] rounded-tr-sm'
                          : 'bg-[#f8fafc] border-slate-200 text-slate-700 rounded-tl-sm'
                      }`}>
                        {msg.contenido}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-3 max-w-[90%]">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Bot size={14} className="text-blue-700" />
                      </div>
                      <div className="bg-[#f8fafc] border border-slate-200 text-slate-500 p-3.5 rounded-xl rounded-tl-sm text-[11px] shadow-sm animate-pulse">
                        Consultando el expediente...
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="bg-[#1a3059] text-white p-3.5 rounded-xl text-[11px] mb-4 font-medium shadow-md leading-relaxed border-l-4 border-blue-400 cursor-pointer hover:bg-[#203a6b] transition-colors shrink-0 line-clamp-2"
                  onClick={() => setIsChatExpanded(true)}
                >
                  {chatMessages[chatMessages.length - 1]?.contenido || "Hola, hazme una pregunta sobre el expediente."}
                </div>
              )}

              {hasDocument && (
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                  <Bot size={12} className="text-[#2546b0] shrink-0" />
                  <span className="truncate">
                    Contexto IA: {expedienteSeleccionado?.numero_expediente || "Expediente activo"}
                    {pdfFiles[activePdfIndex]?.name ? ` / ${pdfFiles[activePdfIndex].name}` : ""}
                  </span>
                </div>
              )}

              <form onSubmit={handleSendChat} className="relative mt-auto shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      handleSendChat(e);
                    }
                  }}
                  placeholder="Pregúntale a la IA sobre este expediente..."
                  disabled={isChatLoading || !hasDocument}
                  className="w-full border border-slate-300 bg-slate-50 rounded-xl px-5 py-3 text-[11px] font-bold focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0] transition-all shadow-sm pr-12 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2546b0] cursor-pointer hover:scale-110 transition-transform disabled:opacity-50"
                >
                  <ChevronUp className="rotate-90" size={18} />
                </button>
              </form>
            </div>
          </div>

        </section>
      </main>

      <JurisprudenciaDrawer
        isOpen={isJurisprudenciaOpen}
        onClose={() => setIsJurisprudenciaOpen(false)}
        textoExpediente={textoExpediente}
        numeroExpediente={expedienteSeleccionado?.numero_expediente || ""}
        analysisData={analysisData}
      />
      <HistorialDrawer
        isOpen={isHistorialOpen}
        onClose={() => setIsHistorialOpen(false)}
        historial={historialEntries}
        snapshotActual={construirSnapshotVersion(analysisData)}
        configuracion={analysisData?.configuracion_ia || (analysisData ? construirConfiguracionIA({
          version_analisis: analysisData.version_analisis || historialEntries[historialEntries.length - 1]?.version || "v1",
          evento: "VISUALIZACION_ANALISIS"
        }) : null)}
      />
      <CapacidadDetalleDrawer
        isOpen={isDetalleOpen}
        onClose={() => setIsDetalleOpen(false)}
        data={analysisData?.capacidad_cargas}
      />
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        expediente={expedienteSeleccionado?.numero_expediente || pdfFiles[0]?.name || ""}
        usuario={usuarioHeader}
        onSaved={registrarCambioManual}
      />

      {sensitiveModal.isOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white border border-amber-200 shadow-2xl rounded-lg overflow-hidden">
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Validacion de datos sensibles</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Se detectaron posibles datos sensibles asociados a menores. Revisa el documento y confirma si ya esta anonimizado antes de continuar con el analisis IA.
                </p>
              </div>
            </div>

            <div className="p-5">
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="grid grid-cols-[minmax(130px,180px)_minmax(110px,170px)_minmax(0,1fr)] bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <div className="px-3 py-2">Tipo</div>
                  <div className="px-3 py-2">Dato</div>
                  <div className="px-3 py-2">Contexto</div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {sensitiveModal.hallazgos.map((hallazgo, index) => (
                    <div key={`${hallazgo.tipo}-${index}`} className="grid grid-cols-[minmax(130px,180px)_minmax(110px,170px)_minmax(0,1fr)] text-xs border-b border-slate-100 last:border-b-0">
                      <div className="px-3 py-2 font-bold text-slate-700 min-w-0 break-words">{hallazgo.tipo}</div>
                      <div className="px-3 py-2 font-mono text-slate-900 min-w-0 break-all leading-relaxed">{hallazgo.valor}</div>
                      <div className="px-3 py-2 text-slate-500 leading-relaxed min-w-0 break-words">{hallazgo.contexto}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                Esta validacion no anonimiza automaticamente el PDF. Solo deja constancia de que el usuario reviso los hallazgos y confirma que el documento puede procesarse.
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelarAnalisisPorDatosSensibles}
                className="px-4 py-2 rounded-md border border-slate-300 text-xs font-bold text-slate-600 hover:bg-white"
              >
                Cancelar analisis
              </button>
              <button
                type="button"
                onClick={confirmarDatosAnonimizados}
                className="px-4 py-2 rounded-md bg-[#2546b0] text-xs font-bold text-white hover:bg-[#1d3a94] shadow-sm"
              >
                Confirmo que esta anonimizado
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Analysis;

