import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, SearchX, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const getTokens = (term) =>
  normalizeText(term)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 4);

const shouldHighlightItem = (itemText, term) => {
  const item = normalizeText(itemText);
  const target = normalizeText(term);
  if (!item || !target) return false;
  if (item.includes(target) || target.includes(item)) return item.length >= 3;
  return getTokens(target).some((token) => item.includes(token) || token.includes(item));
};

export const PdfEvidenceViewer = ({ file, evidence }) => {
  const canvasRef = useRef(null);
  const layerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [highlightCount, setHighlightCount] = useState(0);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1.25);

  const evidenceTerm = evidence?.term || '';
  const evidencePage = evidence?.page || 1;

  useEffect(() => {
    let cancelled = false;
    setPdfDoc(null);
    setNumPages(0);
    setPageNumber(1);
    setHighlightCount(0);
    setError('');

    if (!file?.url) return undefined;

    setLoading(true);
    const task = pdfjsLib.getDocument({ url: file.url });
    task.promise
      .then((doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNumber(Math.min(Math.max(Number(evidencePage || 1), 1), doc.numPages));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'No se pudo cargar el PDF.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [file?.url]);

  useEffect(() => {
    if (!pdfDoc) return;
    const targetPage = Math.min(Math.max(Number(evidencePage || 1), 1), pdfDoc.numPages);
    setPageNumber(targetPage);
  }, [evidence?.nonce, evidencePage, pdfDoc]);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || !layerRef.current) return;
      setLoading(true);
      setHighlightCount(0);
      layerRef.current.innerHTML = '';

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Render cancellation is expected while changing pages quickly.
        }
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const scale = zoom;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const outputScale = Math.max(1, window.devicePixelRatio || 1);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        layerRef.current.style.width = `${viewport.width}px`;
        layerRef.current.style.height = `${viewport.height}px`;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        renderTaskRef.current = page.render({ canvasContext: context, viewport });
        await renderTaskRef.current.promise;
        if (cancelled) return;

        const textContent = await page.getTextContent();
        let matches = 0;
        textContent.items.forEach((item) => {
          if (!shouldHighlightItem(item.str, evidenceTerm)) return;
          const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const x = tx[4];
          const y = tx[5];
          const width = Math.max(8, (item.width || item.str.length * 5) * scale);
          const height = Math.max(10, Math.abs(tx[3]) || 12);

          const mark = document.createElement('div');
          mark.className = 'absolute bg-yellow-300/55 border border-yellow-500/70 rounded-sm pointer-events-none';
          mark.style.left = `${x}px`;
          mark.style.top = `${y - height}px`;
          mark.style.width = `${width}px`;
          mark.style.height = `${height + 3}px`;
          layerRef.current.appendChild(mark);
          matches += 1;
        });
        setHighlightCount(matches);
      } catch (err) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') {
          setError(err?.message || 'No se pudo renderizar la página.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, evidenceTerm, evidence?.nonce, zoom]);

  const statusText = useMemo(() => {
    if (!evidenceTerm) return 'Selecciona una evidencia para resaltar su fuente.';
    if (loading) return 'Buscando evidencia en la página...';
    if (highlightCount > 0) return `${highlightCount} coincidencia(s) resaltada(s).`;
    return 'No se pudo resaltar el término exacto en esta página.';
  }, [evidenceTerm, highlightCount, loading]);

  if (!file?.url) return null;

  return (
    <div className="w-full h-full bg-slate-200 border border-slate-300 rounded-lg overflow-hidden flex flex-col">
      <div className="h-10 shrink-0 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{file.name}</p>
          <p className={`text-[10px] ${highlightCount > 0 ? 'text-emerald-600' : 'text-slate-400'} truncate`}>
            {statusText}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(0.85, Number((value - 0.1).toFixed(2))))}
            className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
            title="Reducir zoom"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="h-7 min-w-[46px] px-2 inline-flex items-center justify-center rounded border border-slate-200 text-[10px] font-black text-slate-600 hover:bg-slate-50"
            title="Zoom 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(2.25, Number((value + 0.1).toFixed(2))))}
            className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
            title="Aumentar zoom"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
            title="Página anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-[11px] font-bold text-slate-600 min-w-[72px] text-center">
            {pageNumber} / {numPages || '-'}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
            disabled={!numPages || pageNumber >= numPages}
            className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
            title="Página siguiente"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto p-4 flex justify-center bg-slate-300">
        {loading && (
          <div className="absolute top-4 right-4 z-30 rounded bg-white/95 border border-slate-200 shadow px-3 py-2 text-[11px] font-bold text-slate-500 flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" />
            Renderizando
          </div>
        )}
        {error ? (
          <div className="m-auto bg-white rounded border border-rose-200 p-4 text-xs text-rose-600 flex items-center gap-2">
            <SearchX size={16} />
            {error}
          </div>
        ) : (
          <div className="relative bg-white shadow-2xl">
            <canvas ref={canvasRef} className="block" />
            <div ref={layerRef} className="absolute inset-0 pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
};
