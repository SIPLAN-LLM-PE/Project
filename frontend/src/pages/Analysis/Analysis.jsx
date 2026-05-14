import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, ChevronDown, Upload, Trash2, Search, ZoomIn, ZoomOut, 
  Printer, Menu, ChevronUp, User, Bot, FileText, FileQuestion 
} from 'lucide-react';

// Importación de componentes locales
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

// Importación de servicios
import { apiService } from '../../services/api';

// ==========================================
// CACHÉ DE MEMORIA GLOBAL
// ==========================================
let draftAnalysisData = null;
let draftPdfUrl = null;
let draftPdfName = "";
let draftHasDocument = false;

export const Analysis = () => {
  // 1. ESTADOS DE INTERFAZ
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSimpleTone, setIsSimpleTone] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isJurisprudenciaOpen, setIsJurisprudenciaOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  // 2. ESTADOS DE DATOS
  const [analysisData, setAnalysisData] = useState(draftAnalysisData);
  const [textoExpediente, setTextoExpediente] = useState("");
  const [historialEntries, setHistorialEntries] = useState([]);
  const [hasDocument, setHasDocument] = useState(draftHasDocument);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(draftPdfUrl);
  const [pdfName, setPdfName] = useState(draftPdfName || "Expediente.pdf"); 
  
  const fileInputRef = useRef(null);
  const chatScrollRef = useRef(null);
  
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Iniciando...");

  // 3. ESTADOS DEL CHAT
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { rol: 'assistant', contenido: 'Hola, soy el asistente IA de SIPLAN. ¿En qué te puedo ayudar?' }
  ]);

  // 4. CONFIGURACIÓN DE TARJETAS
  const [cardVisibility, setCardVisibility] = useState({
    resumen: false, postura: false, plazos: false, admisibilidad: false,
    necesidades: false, capacidad: false, controversias: false, sujetos: false, financiera: false
  });

  const toggleCard = (key) => {
    setCardVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ==========================================
  // BLOQUE DE HOOKS (USE EFFECT)
  // ==========================================

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatExpanded]);

  useEffect(() => {
    draftAnalysisData = analysisData;
    draftPdfUrl = pdfUrl;
    draftPdfName = pdfName;
    draftHasDocument = hasDocument;
  }, [analysisData, pdfUrl, pdfName, hasDocument]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasDocument) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDocument]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingProgress(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + (Math.random() * 2.5);
        if (next >= 95) return 95;
        return next;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    if (loadingProgress < 15) setLoadingText("Escaneando documento PDF...");
    else if (loadingProgress < 30) setLoadingText("Extrayendo texto (Módulo OCR)...");
    else if (loadingProgress < 50) setLoadingText("Identificando sujetos procesales...");
    else if (loadingProgress < 85) setLoadingText("Analizando contexto legal con Mistral IA...");
    else if (loadingProgress < 95) setLoadingText("Generando auditoría financiera y cargas...");
    else setLoadingText("Ensamblando informe final, casi listo...");
  }, [loadingProgress]);


  // ==========================================
  // 5. FUNCIONES DE LÓGICA
  // ==========================================

  const registrarCambioManual = (descripcion) => {
    setHistorialEntries(prev => {
      const nuevaVersion = `v${prev.length + 1}`;
      const nuevoHito = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        version: nuevaVersion,
        titulo: 'Edición Manual',
        usuario: 'm.gomez (Sec)',
        comentario: descripcion,
        isActual: true
      };
      return prev.map(h => ({ ...h, isActual: false })).concat(nuevoHito);
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingProgress(0);
    setPdfName(file.name);
    
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    try {
      const response = await apiService.uploadExpediente(file);
      
      if (response && (response.status === "success" || response.resultados)) {
        setLoadingProgress(100);
        setLoadingText("¡Análisis Completado!");

        setTimeout(() => {
          const data = response.resultados || response;
          setAnalysisData(data);
          setTextoExpediente(response.texto_ocr || response.texto_completo || "");
          setHasDocument(true);

          const hitoInicial = {
            id: Date.now(),
            fecha: new Date().toLocaleString(),
            version: 'v1',
            titulo: 'Generación Inicial RAG',
            usuario: 'Sistema SIPLAN (IA)',
            comentario: 'Análisis automático completado con éxito.',
            isActual: true
          };
          setHistorialEntries([hitoInicial]);

          setCardVisibility({
            resumen: true, postura: true, plazos: true, sujetos: true,
            financiera: true, capacidad: true, controversias: true
          });
          
          setIsLoading(false);
        }, 600);
      }
    } catch (error) {
      console.error("Error:", error);
      setLoadingText("Error en el análisis. Revisa la consola.");
      setTimeout(() => setIsLoading(false), 2000);
    }
  };

  const handleClearDocument = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setHasDocument(false);
    setPdfUrl(null);
    setPdfName("");
    setAnalysisData(null);
    setTextoExpediente("");
    setHistorialEntries([]); 
    setCardVisibility(Object.keys(cardVisibility).reduce((acc, key) => ({ ...acc, [key]: false }), {}));

    draftAnalysisData = null;
    draftPdfUrl = null;
    draftPdfName = "";
    draftHasDocument = false;
  };

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !textoExpediente) return;

    const userMsg = { rol: 'user', contenido: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.contenido,
          texto_expediente: textoExpediente,
          historial: chatMessages.map(m => ({ rol: m.rol, contenido: m.contenido })),
          datos_extraidos: analysisData ? analysisData.sujetos_procesales : {}
        })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { rol: 'assistant', contenido: data.respuesta }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { rol: 'assistant', contenido: 'Error de conexión.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

const handleExportWord = async () => {
  if (!analysisData) return;
  setIsLoading(true);

  const pVal = parseFloat(analysisData.revision_financiera?.petitorio || 0);
  const gVal = parseFloat(analysisData.revision_financiera?.suma_gastos_sustentados || 0);
  const diferencia = pVal - gVal;

  try {
    const exportData = {
      
      expediente: pdfName,
      resumen: isSimpleTone ? analysisData.sintesis_rag?.estandar : analysisData.sintesis_rag?.tecnico,
      postura: isSimpleTone ? analysisData.postura_defensa?.estandar : analysisData.postura_defensa?.tecnico,
      
      // MAPEO CORRECTO SEGÚN TU FUNCIÓN 5.3
      financiera: {
        monto_petitorio: pVal.toFixed(2),
        suma_gastos: gVal.toFixed(2),
        brecha: diferencia.toFixed(2),
        estado: (diferencia > 10) ? "BRECHA DETECTADA" : "RAZONABLE"
      },

      sujetos: analysisData.sujetos_procesales || {},
      capacidad: analysisData.capacidad_cargas || {},
      puntos_controvertidos: analysisData.puntos_sugeridos || []
    };

    const response = await fetch('http://localhost:8000/api/v1/export-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportData),
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_SIPLAN_${pdfName}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    console.error("Error al exportar:", error);
  } finally {
    setIsLoading(false);
  }
};

  // --- FIN DE LA PARTE 1 (Ahora sigue el return...) ---

  return (
    <div className="flex-1 bg-[#f8fafc] flex flex-col h-full overflow-hidden">
      
      {/* 1. Header Superior */}
      <header className="bg-white border-b border-slate-200 w-full h-[93px] px-8 flex items-center shrink-0 z-10">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Análisis IA</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-slate-200 transition-all">
               <Bell className="w-5 h-5 text-slate-600" />
               <div className="text-[10px] leading-tight text-left hidden md:block">
                 <span className="font-bold block text-slate-700">Notificaciones</span>
                 <span className="text-slate-500 font-medium">Tu buzón de mensajes</span>
               </div>
               <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
            </div>
            <div className="flex items-center bg-[#2546b0] text-white rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-blue-800 transition-all shadow-sm">
               <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">DV</div>
               <div className="text-[10px] leading-tight text-left font-bold">
                 Dr. Diego Valdivia<br/>
                 <span className="opacity-80 font-medium text-[9px]">Juez de Paz Letrado</span>
               </div>
               <ChevronDown className="w-4 h-4 ml-1 opacity-60" />
            </div>
          </div>
        </div>
      </header>

      {/* 2. Área de Trabajo */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: VISOR DE EXPEDIENTE */}
        <section className="flex-[6] flex flex-col border-r border-slate-300 bg-slate-200 relative min-h-0">
          
          {/* BARRA SUPERIOR (Azul) */}
          <div className="bg-[#2546b0] px-4 py-2 flex gap-3 shrink-0">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden" 
              accept=".pdf"
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              disabled={isLoading || hasDocument}
              className={`flex items-center text-white px-3 py-1.5 rounded text-xs font-bold transition-colors border border-white/10 ${isLoading || hasDocument ? 'opacity-50 cursor-not-allowed bg-white/5' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {isLoading ? (
                <span className="animate-pulse flex items-center"><Bot size={14} className="mr-2" /> Procesando con IA...</span>
              ) : (
                <><Upload size={14} className="mr-2" /> Subir Expediente</>
              )}
            </button>
            <button 
              onClick={handleClearDocument}
              disabled={!hasDocument}
              className={`flex items-center text-white px-3 py-1.5 rounded text-xs font-bold transition-colors border border-white/10 ${!hasDocument ? 'opacity-50 cursor-not-allowed bg-white/5' : 'bg-red-500/20 hover:bg-red-500/40 text-red-100 border-red-500/30'}`}
            >
              <Trash2 size={14} className="mr-2" /> Eliminar
            </button>
          </div>

          {/* BARRA DE HERRAMIENTAS DEL PDF (Gris) */}
          <div className={`bg-slate-100 px-4 py-2.5 flex items-center border-b border-slate-300 shrink-0 transition-opacity ${hasDocument ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <div className="flex items-center text-xs text-slate-700 font-bold">
              <FileText size={14} className="mr-2 text-slate-500" />
              <span className="truncate max-w-[400px]">{hasDocument ? pdfName : 'Sin documento'}</span>
            </div>
          </div>

          {/* ZONA PRINCIPAL DE CONTENIDO (Aquí va el PDF, el Empty State o la Carga) */}
          <div className="flex-1 overflow-y-auto p-4 flex justify-center items-center custom-scrollbar bg-slate-300/50 relative">
            
            {/* 1. PANTALLA DE CARGA (Posicionada solo dentro de esta zona) */}
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
                  {/* BARRA DE PROGRESO */}
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

            {/* 2. VISOR DEL PDF */}
            {!isLoading && hasDocument && pdfUrl && (
              <div className="w-full h-full bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-300 relative z-10">
                <embed 
                  src={pdfUrl} 
                  type="application/pdf" 
                  width="100%" 
                  height="100%" 
                  className="min-h-full"
                />
              </div>
            )}

            {/* 3. EMPTY STATE */}
            {!isLoading && !hasDocument && (
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
        <section className="flex-[4] flex flex-col bg-slate-50 relative min-w-[380px] border-l border-slate-300 min-h-0">
          
          <div className={`h-[46px] text-white px-4 flex items-center justify-between shrink-0 relative z-30 shadow-sm transition-colors ${hasDocument ? 'bg-[#1a3059]' : 'bg-slate-400'}`}>
            <div className="flex items-center gap-3">
              <Menu 
                size={18} 
                // Bloqueamos el click del menú si no hay documento
                className={`transition-all ${hasDocument ? 'cursor-pointer hover:opacity-100' : 'cursor-not-allowed opacity-50'} ${isMenuOpen ? 'bg-white/20 rounded-md p-0.5' : 'opacity-80'}`}
                onClick={() => hasDocument && setIsMenuOpen(!isMenuOpen)} 
              />
              <span className="text-xs font-bold tracking-widest opacity-90 uppercase">
                {hasDocument ? 'Exp. N° 00245-2026-0-1801' : 'SIN EXPEDIENTE ACTIVO'}
              </span>
            </div>
          </div>

          <AnalysisMenu 
            isMenuOpen={isMenuOpen}
            isSimpleTone={isSimpleTone}
            setIsSimpleTone={setIsSimpleTone}
            cardVisibility={cardVisibility}
            toggleCard={toggleCard}
            onOpenJurisprudencia={() => { setIsJurisprudenciaOpen(true); setIsMenuOpen(false); }}
            onOpenHistorial={() => { setIsHistorialOpen(true); setIsMenuOpen(false); }}
            onExportWord={handleExportWord}
            onOpenRating={() => setIsRatingOpen(true)}
          />

        <div className="flex-1 overflow-y-auto p-6 pb-[180px] custom-scrollbar bg-[#f8fafc] z-10 flex flex-col">
            {hasDocument && analysisData ? (
              <>
                {/* 👇 AQUI PASAMOS analysisData.sintesis_rag 👇 */}
                {cardVisibility.resumen && <ResumenCard data={analysisData.sintesis_rag} isSimpleTone={isSimpleTone}/>}
                
                {cardVisibility.postura && <PosturaCard data={analysisData.postura_defensa} isSimpleTone={isSimpleTone} />}
                {cardVisibility.plazos && <PlazosCard data={analysisData.plazos} />}
                {cardVisibility.admisibilidad && (<AdmisibilidadCard data={analysisData.admisibilidad} />
)}
                {cardVisibility.necesidades && <NecesidadesCard data={analysisData.revision_financiera} />}
                {cardVisibility.capacidad && <CapacidadCargasCard data={analysisData.capacidad_cargas} onOpenDetalle={() => setIsDetalleOpen(true)} />}
                
                {/* 👇 AQUI PASAMOS los puntos controvertidos 👇 */}
                {cardVisibility.controversias && <ControversiasCard puntos={analysisData.puntos_sugeridos} onNotifyChange={registrarCambioManual} />}
                
                {cardVisibility.sujetos && <SujetosProcesalesCard data={analysisData.sujetos_procesales} />}
                {cardVisibility.financiera && <FinancieraCard data={analysisData.revision_financiera} />}
                
                {!Object.values(cardVisibility).some(Boolean) && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60 italic">
                    <Search size={40} className="mb-2" />
                    <p className="text-sm font-medium">Usa el menú para mostrar información</p>
                  </div>
                )}
              </>
            ) : (
               // ... el Empty State que ya teníamos ...
              /* EMPTY STATE DEL PANEL IA */
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-80">
                <FileQuestion size={48} className="mb-4 text-slate-300" />
                <p className="text-sm font-bold text-slate-400">Esperando expediente...</p>
              </div>
            )}
          </div>

          {/* ASISTENTE IA INTERACTIVO (SLIDER BOTTOM SHEET) */}
          <div 
            className={`absolute bottom-0 w-full bg-white border-t border-slate-200 z-50 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] ${
              !hasDocument ? 'translate-y-full opacity-0' : isChatExpanded ? 'h-[calc(100%-46px)] translate-y-0 opacity-100' : 'h-[160px] translate-y-0 opacity-100'
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
            
            <div className="p-5 pt-7 flex flex-col h-full">
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
              // Vista minimizada: Muestra solo el último mensaje de la IA
              <div 
                className="bg-[#1a3059] text-white p-3.5 rounded-xl text-[11px] mb-4 font-medium shadow-md leading-relaxed border-l-4 border-blue-400 cursor-pointer hover:bg-[#203a6b] transition-colors shrink-0 line-clamp-2"
                onClick={() => setIsChatExpanded(true)}
              >
                {chatMessages[chatMessages.length - 1]?.contenido || "Hola, hazme una pregunta sobre el expediente."}
              </div>
            )}
              
              <form onSubmit={handleSendChat} className="relative mt-auto shrink-0">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
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

      <JurisprudenciaDrawer isOpen={isJurisprudenciaOpen} onClose={() => setIsJurisprudenciaOpen(false)} />
      <HistorialDrawer 
        isOpen={isHistorialOpen} 
        onClose={() => setIsHistorialOpen(false)} 
        historial={historialEntries} 
      />
      <CapacidadDetalleDrawer 
          isOpen={isDetalleOpen} 
          onClose={() => setIsDetalleOpen(false)} 
          data={analysisData?.capacidad_cargas}
      />
      <RatingModal 
         isOpen={isRatingOpen} 
         onClose={() => setIsRatingOpen(false)} 
         expediente={pdfName} 
       />
    </div>
  );
};

export default Analysis;