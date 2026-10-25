import { ShieldCheck, AlertTriangle } from 'lucide-react';

// Resultado de comparar lo que se extrajo del PDF con el texto del expediente (lo calcula el backend).
// "revisar": no se pudo confirmar con el texto, conviene mirar el documento; "verificada": el texto lo confirma.
export const EstadoVerificacion = ({ verificacion }) => {
  if (verificacion?.estado === 'revisar') {
    const motivos = (verificacion.motivos || []).join('; ');
    return (
      <span
        title={motivos ? `No se pudo confirmar con el texto: ${motivos}` : 'No se pudo confirmar con el texto'}
        className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide"
      >
        <AlertTriangle size={10} /> Revisar
      </span>
    );
  }
  if (verificacion?.estado === 'verificada') {
    return (
      <span
        title="Confirmado con el texto del expediente"
        className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide"
      >
        <ShieldCheck size={10} /> Verificado
      </span>
    );
  }
  return null;
};
