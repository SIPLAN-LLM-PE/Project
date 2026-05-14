// Archivo: src/pages/Analysis/components/RatingModal.jsx
import React, { useState } from 'react';
import { X, Star, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const RatingModal = ({ isOpen, onClose, expediente }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    // Simulación de envío al backend
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Limpiar y cerrar después de 2 segundos
      setTimeout(() => {
        setIsSuccess(false);
        setRating(0);
        setComentario("");
        onClose();
      }, 2000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#1a3059]">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h3 className="font-bold text-sm">Calificar Análisis de IA</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">¡Gracias por tu feedback!</h4>
              <p className="text-xs text-slate-500">Esta información ayudará a reentrenar a SIPLAN-ALIM-PE.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-4 text-center">
                ¿Qué tan preciso fue el análisis RAG para el expediente <br/>
                <span className="font-bold text-slate-700">{expediente || "actual"}</span>?
              </p>

              {/* Estrellas Interactivas */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star 
                      size={36} 
                      className={`transition-colors ${
                        (hoveredRating || rating) >= star 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'fill-slate-100 text-slate-200'
                      }`} 
                    />
                  </button>
                ))}
              </div>

              {/* Caja de Comentarios */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <MessageSquare size={14} /> Comentarios adicionales (Opcional)
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Ej. Omitió un ingreso variable detallado en el Anexo 3..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none min-h-[80px]"
                ></textarea>
              </div>

              {/* Botón de Envío */}
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                  rating === 0 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md hover:shadow-lg'
                }`}
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Enviando evaluación...</span>
                ) : (
                  <> <Send size={16} /> Enviar Calificación </>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};