import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, ChevronDown, AlertCircle, Clock, FolderOpen, CheckCircle2, Search, Loader2, Users, ShieldAlert, FolderPlus, Edit, Trash2
} from 'lucide-react';

const StatCard = ({ label, value, subtext, icon: Icon, color, iconColor }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start transition-transform hover:scale-[1.02]">
    <div className="text-left">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</p>
      <h3 className={`text-4xl font-extrabold ${color}`}>{value}</h3>
      <p className="text-[10px] text-slate-400 mt-2 font-medium">{subtext}</p>
    </div>
    <div className={`p-2.5 rounded-lg ${iconColor} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${iconColor}`} />
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  
  // DETECCIÓN DE USUARIO Y ROL DESDE LOCALSTORAGE
  const usuarioActivo = JSON.parse(localStorage.getItem('usuario')) || { nombre: "Invitado", cargo: "Sin Cargo", rol: "secretario" };
  const isAdmin = usuarioActivo.role === 'admin' || usuarioActivo.rol === 'admin';

  // ESTADOS DEL SISTEMA
  const [expedientes, setExpedientes] = useState([]);
  const [personalJudicial, setPersonalJudicial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ESTADOS DEL MODAL DE ASIGNACIÓN (EXCLUSIVO ADMIN)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [formAsignacion, setFormAsignacion] = useState({
    asignado_juez: '', asignado_secretario: '', asignado_asistente: '', asignado_mesapartes: '', asignado_liquidador: ''
  });

  // ESTADOS PARA EDITAR EXPEDIENTE
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expedienteAEditar, setExpedienteAEditar] = useState({
    numero_expediente: '', demandante: '', demandado: ''
  });

  // ESTADOS PARA EL NUEVO FORMULARIO "AÑADIR EXPEDIENTE"
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [nuevoExpForm, setNuevoExpForm] = useState({
    numero_expediente: '', demandante: '', demandado: '', tipo: 'Proceso de Alimentos',
    asignado_juez: '', asignado_secretario: '', asignado_asistente: '', asignado_mesapartes: '', asignado_liquidador: ''
  });

  const [searchTerms, setSearchTerms] = useState({
    asignado_juez: '',
    asignado_secretario: '',
    asignado_asistente: '',
    asignado_mesapartes: '',
    asignado_liquidador: ''
  });

  useEffect(() => {
    cargarDashboard();
    if (isAdmin) {
      cargarPersonalJudicial();
    }
  }, []);

  const cargarDashboard = async () => {
    setIsLoading(true);
    try {
      // 🚀 PASAMOS LAS CREDENCIALES ACTIVAS EN LA URL PARA FILTRAR LA BD
      const res = await fetch(`http://localhost:8000/api/v1/expedientes?username=${usuarioActivo.username}&rol=${usuarioActivo.rol}`);
      const data = await res.json();
      if (data.status === 'success') {
        setExpedientes(data.data);
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarPersonalJudicial = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/usuarios-personal');
      const data = await res.json();
      if (data.status === 'success') setPersonalJudicial(data.data);
    } catch (e) {
      console.error("Error cargando personal:", e);
    }
  };

  const abrirPanelAsignacion = async (exp) => {
    setExpedienteSeleccionado(exp);
    
    // 👇 Limpiamos los filtros de búsqueda al abrir el modal de un nuevo caso
    setSearchTerms({ asignado_juez: '', asignado_secretario: '', asignado_asistente: '', asignado_mesapartes: '', asignado_liquidador: '' });

    try {
      const res = await fetch(`http://localhost:8000/api/v1/expedientes/${exp.numero_expediente}`);
      const data = await res.json();
      if (data.status === "success") {
        setFormAsignacion({
          asignado_juez: data.data.asignado_juez || '',
          asignado_secretario: data.data.asignado_secretario || '',
          asignado_asistente: data.data.asignado_asistente || '',
          asignado_mesapartes: data.data.asignado_mesapartes || '',
          asignado_liquidador: data.data.asignado_liquidador || ''
        });
      }
    } catch (e) {
      setFormAsignacion({ asignado_juez: '', asignado_secretario: '', asignado_asistente: '', asignado_mesapartes: '', asignado_liquidador: '' });
    }
    setIsModalOpen(true);
  };

  const handleCambiarAsignacion = async (columna, username) => {
    setFormAsignacion(prev => ({ ...prev, [columna]: username }));
    try {
      await fetch('http://localhost:8000/api/v1/asignar-expediente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_expediente: expedienteSeleccionado.numero_expediente,
          rol_columna: columna,
          username_usuario: username
        })
      });
    } catch (e) {
      console.error("Error guardando asignación:", e);
    }
  };

  const handleCrearExpediente = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/v1/crear-expediente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoExpForm)
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert("¡Éxito! " + data.message);
        setIsCreateModalOpen(false);
        // Reseteamos el formulario
        setNuevoExpForm({
          numero_expediente: '', demandante: '', demandado: '', tipo: 'Proceso de Alimentos',
          asignado_juez: '', asignado_secretario: '', asignado_asistente: '', asignado_mesapartes: '', asignado_liquidador: ''
        });
        cargarDashboard(); // Recargamos la tabla
      } else {
        alert("Error: " + (data.detail || "No se pudo registrar"));
      }
    } catch (error) {
      console.error("Error creando expediente:", error);
    }
  };

  const abrirModalEditar = (exp) => {
    // Extraemos limpiamente al demandante y demandado de la carátula (o si lo prefieres, se lo pedimos al backend, 
    // pero como el string "caratula" es "DEMANDANTE c/ DEMANDADO s/ ALIMENTOS", lo separamos mágicamente)
    const partes = exp.caratula.split(' c/ ');
    const demandanteExtraido = partes[0] || '';
    const demandadoExtraido = partes[1] ? partes[1].split(' s/ ')[0] : '';

    setExpedienteAEditar({
      numero_expediente: exp.numero_expediente,
      demandante: demandanteExtraido,
      demandado: demandadoExtraido
    });
    setIsEditModalOpen(true);
  };

  const handleEditarExpediente = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8000/api/v1/expedientes/${expedienteAEditar.numero_expediente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demandante: expedienteAEditar.demandante,
          demandado: expedienteAEditar.demandado
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("¡Éxito! " + data.message);
        setIsEditModalOpen(false);
        cargarDashboard();
      } else {
        alert("Error: " + data.detail);
      }
    } catch (error) {
      console.error("Error al editar:", error);
    }
  };

  const handleEliminarExpediente = async (numero) => {
    const confirmar = window.confirm(`⚠️ PELIGRO:\n\n¿Estás absolutamente seguro de eliminar el expediente ${numero}?\n\nEsta acción es irreversible y destruirá cualquier análisis IA asociado.`);
    if (!confirmar) return;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/expedientes/${numero}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        cargarDashboard();
      } else {
        alert("Error: " + data.detail);
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  return (
    <div className="flex-1 bg-[#f8fafc] min-h-screen flex flex-col relative">
      
      {/* Header Superior Dinámico */}
      <header className="bg-white border-b border-slate-200 w-full h-[93px] px-8 sticky top-0 z-10 flex items-center">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {isAdmin ? "Panel de Administración de Módulo" : "Página Principal"}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-slate-200 transition-all">
              <Bell className="w-5 h-5 text-slate-600" />
              <div className="text-[10px] leading-tight text-left hidden md:block">
                <span className="font-bold block text-slate-700">Notificaciones</span>
                <span className="text-slate-500">Buzón del sistema</span>
              </div>
              <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
            </div>

            <div className="flex items-center bg-[#2546b0] text-white rounded-lg px-4 py-1.5 gap-3 shadow-sm">
              <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">
                {usuarioActivo.nombre?.split(' ').map(n => n[0]).join('') || "AD"}
              </div>
              <div className="text-[10px] leading-tight text-left">
                <span className="font-bold block tracking-wide">{usuarioActivo.nombre}</span>
                <span className="opacity-80 font-medium">{usuarioActivo.cargo}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="p-8 w-full max-w-[1600px] mx-auto flex-1">
        
        {/* VISTA DE TARJETAS DE CONTROL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Urgentes" value="0" subtext="Atención inmediata requerida" icon={AlertCircle} color="text-red-500" iconColor="text-red-500" />
          <StatCard label="En Tramitación" value="0" subtext="Expedientes en despacho" icon={Clock} color="text-blue-500" iconColor="text-blue-500" />
          <StatCard label="Por Asignar" value="0" subtext="Pendientes de asignación" icon={FolderOpen} color="text-amber-500" iconColor="text-amber-500" />
          <StatCard label="Total Carga" value={expedientes.length} subtext="Expedientes registrados" icon={CheckCircle2} color="text-green-500" iconColor="text-green-500" />
        </div>

        {/* Tabla Principal */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
            <h4 className="font-bold text-slate-700 text-sm">
              {isAdmin ? "Bandeja Global de Carga Judicial" : "Mis Expedientes Asignados"} ({expedientes.length})
            </h4>
          
            {isAdmin && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 transition-all"
              >
                <FolderPlus size={15} /> Añadir Expediente
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Expediente</th>
                  <th className="px-6 py-4">Carátula</th>
                  <th className="px-6 py-4">Materia</th>
                  <th className="px-6 py-4">Estado Análisis</th>
                  <th className="px-6 py-4 text-center">Acciones del Módulo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Cargando Registros de Carga</p>
                    </td>
                  </tr>
                )}

                {!isLoading && expedientes.map((exp, index) => (
                  <tr key={exp.id || index} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-5 font-bold text-slate-700 text-xs">{exp.numero_expediente}</td>
                    <td className="px-6 py-5 text-[11px] text-slate-600 leading-relaxed max-w-xs truncate uppercase">{exp.caratula}</td>
                    <td className="px-6 py-5 text-[11px] text-slate-500 font-medium">{exp.tipo}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-sm ${
                        exp.estado === 'Pendiente' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {exp.estado}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {isAdmin ? (
                        /* ACCIONES ADMIN: ASIGNAR, EDITAR, ELIMINAR */
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => abrirPanelAsignacion(exp)}
                            title="Asignar Personal"
                            className="text-[#2546b0] bg-blue-50 border border-blue-200 hover:bg-[#2546b0] hover:text-white p-2 rounded-lg transition-all shadow-sm"
                          >
                            <Users size={16} />
                          </button>
                          
                          <button 
                            onClick={() => abrirModalEditar(exp)}
                            title="Editar Carátula"
                            className="text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-500 hover:text-white p-2 rounded-lg transition-all shadow-sm"
                          >
                            <Edit size={16} />
                          </button>
                          
                          <button 
                            onClick={() => handleEliminarExpediente(exp.numero_expediente)}
                            title="Eliminar Expediente"
                            className="text-red-600 bg-red-50 border border-red-200 hover:bg-red-500 hover:text-white p-2 rounded-lg transition-all shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        /* ACCIÓN SECRETARIOS / JUECES */
                        <button 
                          onClick={() => navigate(`/analysis?exp=${exp.numero_expediente}`)}
                          className="text-[#2546b0] font-bold text-xs hover:underline flex items-center justify-center w-full gap-1 group-hover:translate-x-1 transition-transform"
                        >
                          Ver análisis <span className="text-lg">›</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

{/* MODAL DE ASIGNACIÓN JURÍDICA (EXCLUSIVO PARA ROL ADMIN - CON FILTRO DE ROLES Y BÚSQUEDA) */}
      {isModalOpen && expedienteSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            
            {/* Cabecera */}
            <div className="bg-[#1a3059] p-5 text-white flex items-center gap-3 shrink-0">
              <Users size={20} className="text-blue-300" />
              <div>
                <h3 className="font-bold text-sm tracking-wide">Asignar Auxiliares Jurisdiccionales</h3>
                <p className="text-[10px] text-blue-200 mt-0.5">Exp: {expedienteSeleccionado.numero_expediente}</p>
              </div>
            </div>
            
            {/* Contenido Scrolleable */}
            <div className="p-6 flex flex-col gap-4 bg-slate-50 overflow-y-auto flex-1 custom-scrollbar">
              {[
                { label: "Juez de Paz Letrado", col: "asignado_juez", roleKey: "juez" },
                { label: "Secretario Judicial", col: "asignado_secretario", roleKey: "secretario" },
                { label: "Asistente Jurisdiccional", col: "asignado_asistente", roleKey: "asistente" },
                { label: "Mesa de Partes", col: "asignado_mesapartes", roleKey: "mesapartes" },
                { label: "Liquidador Judicial", col: "asignado_liquidador", roleKey: "liquidador" }
              ].map((item) => {
                
                // 🔍 APLICACIÓN DE FILTROS EN TIEMPO REAL:
                const personalFiltrado = personalJudicial.filter(p => {
                  // 1. Filtrado estricto por Rol de base de datos
                  const coincideRol = p.rol === item.roleKey;
                  
                  // 2. Filtrado dinámico por la barra de búsqueda (por nombre o usuario)
                  const busquedaMin = searchTerms[item.col].toLowerCase();
                  const coincideBusqueda = p.nombre.toLowerCase().includes(busquedaMin) || p.username.toLowerCase().includes(busquedaMin);
                  
                  return coincideRol && coincideBusqueda;
                });

                return (
                  <div key={item.col} className="text-left bg-white p-3.5 border border-slate-200 rounded-xl shadow-sm">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {item.label}
                    </label>
                    
                    {/* Input Mini-Buscador Interno */}
                    <div className="relative mb-2">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder={`Buscar ${item.label.toLowerCase()}...`}
                        value={searchTerms[item.col]}
                        onChange={(e) => setSearchTerms(prev => ({ ...prev, [item.col]: e.target.value }))}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-medium focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0] bg-slate-50/50"
                      />
                    </div>

                    {/* Selector de personal filtrado */}
                    {/* Selector de personal filtrado con flecha única corregida */}
                      <div className="relative">
                        <select 
                          value={formAsignacion[item.col] || ""} 
                          onChange={(e) => handleCambiarAsignacion(item.col, e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-8 text-xs font-semibold focus:outline-none focus:border-[#2546b0] bg-white cursor-pointer transition-colors appearance-none"
                        >
                          <option value="">-- Sin Personal Asignado (Quitar acceso) --</option>
                          {personalFiltrado.map(p => (
                            <option key={p.username} value={p.username}>
                              {p.nombre} ({p.username})
                            </option>
                          ))}
                        </select>
                        {/* Icono único controlado de forma absoluta */}
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                    {/* Pequeño aviso si la búsqueda no arroja resultados */}
                    {personalFiltrado.length === 0 && searchTerms[item.col] && (
                      <p className="text-[9px] text-amber-600 mt-1 font-medium italic">No se encontró personal coincidente con ese nombre.</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botón de Cierre */}
            <div className="bg-white px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => { setIsModalOpen(false); cargarDashboard(); }}
                className="bg-[#1a3059] text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-blue-900 transition-colors shadow-md"
              >
                Finalizar Gestión
              </button>
            </div>
          </div>
        </div>
      )}

{/* MODAL 2: FORMULARIO "AÑADIR EXPEDIENTE" */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center backdrop-blur-sm p-4">
          <form onSubmit={handleCrearExpediente} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="bg-emerald-700 p-5 text-white">
              <h3 className="font-bold text-sm tracking-wide">Pre-Registrar Nuevo Expediente Judicial</h3>
              <p className="text-[10px] text-emerald-100 mt-0.5">Ingresa los metadatos oficiales del caso asignado por Mesa de Partes.</p>
            </div>
            
            <div className="p-6 flex flex-col gap-4 bg-slate-50 overflow-y-auto flex-1 custom-scrollbar text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número de Expediente *</label>
                <input type="text" placeholder="Ej: 00450-2026-0-1801-JP-FC-01" required value={nuevoExpForm.numero_expediente} onChange={(e)=>setNuevoExpForm({...nuevoExpForm, numero_expediente: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Demandante *</label>
                  <input type="text" placeholder="Nombres y Apellidos" required value={nuevoExpForm.demandante} onChange={(e)=>setNuevoExpForm({...nuevoExpForm, demandante: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Demandado *</label>
                  <input type="text" placeholder="Nombres y Apellidos" required value={nuevoExpForm.demandado} onChange={(e)=>setNuevoExpForm({...nuevoExpForm, demandado: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white" />
                </div>
              </div>

              {/* Selector de Materia / Tipo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Materia / Tipo</label>
                <div className="relative">
                  <select 
                    value={nuevoExpForm.tipo} 
                    onChange={(e)=>setNuevoExpForm({...nuevoExpForm, tipo: e.target.value})} 
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-8 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white appearance-none"
                  >
                    <option value="Proceso de Alimentos">Fijación de Alimentos</option>
                    <option value="Aumento de Alimentos">Aumento de Alimentos</option>
                    <option value="Exoneración de Alimentos">Exoneración de Alimentos</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Bloque Opcional: Juez y Secretario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1">Juez</label>
                  <div className="relative">
                    <select 
                      value={nuevoExpForm.asignado_juez} 
                      onChange={(e)=>setNuevoExpForm({...nuevoExpForm, asignado_juez: e.target.value})} 
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 pr-8 text-xs bg-white appearance-none"
                    >
                      <option value="">-- Sin asignar --</option>
                      {personalJudicial.filter(p=>p.rol==='juez').map(p=><option key={p.username} value={p.username}>{p.nombre}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1">Secretario</label>
                  <div className="relative">
                    <select 
                      value={nuevoExpForm.asignado_secretario} 
                      onChange={(e)=>setNuevoExpForm({...nuevoExpForm, asignado_secretario: e.target.value})} 
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 pr-8 text-xs bg-white appearance-none"
                    >
                      <option value="">-- Sin asignar --</option>
                      {personalJudicial.filter(p=>p.rol==='secretario').map(p=><option key={p.username} value={p.username}>{p.nombre}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={()=>setIsCreateModalOpen(false)} className="border border-slate-200 text-slate-500 font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-emerald-700 shadow-md">Pre-Registrar Caso</button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: FORMULARIO "EDITAR EXPEDIENTE" (SOLO ADMIN)      */}
      {/* ========================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center backdrop-blur-sm p-4">
          <form onSubmit={handleEditarExpediente} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="bg-amber-600 p-5 text-white flex items-center gap-3">
              <Edit size={22} className="text-amber-100" />
              <div>
                <h3 className="font-bold text-sm tracking-wide">Editar Metadatos del Expediente</h3>
                <p className="text-[10px] text-amber-100 mt-0.5">Exp: {expedienteAEditar.numero_expediente}</p>
              </div>
            </div>
            
            <div className="p-6 flex flex-col gap-4 bg-slate-50 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número de Expediente</label>
                <input 
                  type="text" 
                  value={expedienteAEditar.numero_expediente} 
                  disabled 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold bg-slate-100 text-slate-500 cursor-not-allowed" 
                />
                <p className="text-[9px] text-slate-400 mt-1 italic">El número de código es inmutable por seguridad.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Demandante *</label>
                  <input 
                    type="text" 
                    required 
                    value={expedienteAEditar.demandante} 
                    onChange={(e)=>setExpedienteAEditar({...expedienteAEditar, demandante: e.target.value})} 
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Demandado *</label>
                  <input 
                    type="text" 
                    required 
                    value={expedienteAEditar.demandado} 
                    onChange={(e)=>setExpedienteAEditar({...expedienteAEditar, demandado: e.target.value})} 
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={()=>setIsEditModalOpen(false)} 
                className="border border-slate-200 text-slate-500 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-amber-700 shadow-md transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Dashboard;