import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Genera el listado de páginas a mostrar, colapsando los tramos lejanos con "…"
const buildPageRange = (current, total) => {
  const delta = 1;
  const range = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  const withDots = [];
  let prev = 0;
  for (const i of range) {
    if (prev) {
      if (i - prev === 2) withDots.push(prev + 1);
      else if (i - prev > 2) withDots.push('…');
    }
    withDots.push(i);
    prev = i;
  }
  return withDots;
};

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange, itemLabel = 'registros' }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  if (totalItems === 0) return null;

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);
  const pages = buildPageRange(currentPage, totalPages);

  return (
    <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/30">
      <p className="text-[11px] font-medium text-slate-500">
        Mostrando <span className="font-bold text-slate-700">{from}</span>
        {' '}-{' '}
        <span className="font-bold text-slate-700">{to}</span>
        {' '}de <span className="font-bold text-slate-700">{totalItems}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, idx) =>
          p === '…' ? (
            <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                p === currentPage
                  ? 'bg-[#2546b0] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
