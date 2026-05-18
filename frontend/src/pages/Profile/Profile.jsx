import React, { useState } from 'react';
import { 
  Bell, ChevronDown, Mail, Phone, MapPin, Edit2, User, Lock 
} from 'lucide-react';

const Profile = () => {
  // Estados para los menús
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Estados para los formularios (simulando datos del usuario)
  const [formData, setFormData] = useState({
    nombres: 'Diego Alonso Valdivia Mendoza',
    dni: '70214589',
    correo: 'd.valdivia@sigeja.gob.pe',
    especialidad: 'Derecho Alimentario',
    passwordActual: '',
    passwordNueva: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex-1 bg-[#f8fafc] flex flex-col min-h-screen">
      
      {/* Header Superior */}
      <header className="bg-white border-b border-slate-200 w-full h-[93px] px-8 sticky top-0 z-10 flex items-center shrink-0">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Mi Perfil</h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-slate-200 transition-all">
               <Bell className="w-5 h-5 text-slate-600" />
               <div className="text-[10px] leading-tight text-left hidden md:block">
                 <span className="font-bold block text-slate-700">Notificaciones</span>
                 <span className="text-slate-500">Tu buzón de mensajes</span>
               </div>
               <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
            </div>

            {/* Selector de Usuario con Dropdown */}
            <div className="relative">
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center bg-[#2546b0] text-white rounded-lg px-4 py-1.5 gap-3 cursor-pointer hover:bg-blue-800 transition-all shadow-sm"
              >
                 <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center font-bold text-xs shadow-inner">DV</div>
                 <div className="text-[10px] leading-tight text-left">
                   <span className="font-bold block tracking-wide">Dr. Diego Valdivia</span>
                   <span className="opacity-80">Juez de Paz Letrado</span>
                 </div>
                 <ChevronDown className={`w-4 h-4 ml-1 opacity-60 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </div>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-700 bg-slate-50 font-medium">
                    Mi Perfil
                  </button>
                  <div className="h-px bg-slate-200 my-1 w-full"></div>
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors">
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="p-8 w-full max-w-[1200px] mx-auto overflow-y-auto">
        
        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          
          {/* TARJETA IZQUIERDA: RESUMEN DE PERFIL */}
          <div className="w-full lg:w-1/3">
            <div className="bg-[#1a3059] rounded-xl shadow-md p-8 flex flex-col items-center text-center relative overflow-hidden">
              
              {/* Avatar con botón de edición */}
              <div className="relative mb-6 mt-4">
                <div className="w-32 h-32 bg-slate-200 rounded-full border-4 border-[#1a3059] shadow-lg flex items-center justify-center text-slate-400">
                   {/* En un caso real aquí iría una etiqueta <img src={avatarUrl} /> */}
                   <User size={64} opacity={0.5} />
                </div>
                <button className="absolute bottom-1 right-1 bg-cyan-400 p-2.5 rounded-full text-white shadow-md hover:bg-cyan-300 transition-colors border-2 border-[#1a3059]">
                  <Edit2 size={14} />
                </button>
              </div>

              {/* Nombres y Título */}
              <h3 className="text-2xl font-bold text-white mb-1">Dr. Diego Valdivia</h3>
              <p className="text-cyan-400 text-sm font-medium mb-8">Juez de Paz Letrado</p>

              {/* Lista de Contacto */}
              <div className="w-full space-y-3">
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-lg">
                  <Mail size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-200">{formData.correo}</span>
                </div>
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-lg">
                  <Phone size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-200">+51 987 654 321</span>
                </div>
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-lg">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-200">Sede Central - Corte Superior</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: FORMULARIOS */}
          <div className="w-full lg:w-2/3 flex flex-col gap-6">
            
            {/* Formulario 1: Configuración de Cuenta */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Cabecera Tarjeta */}
              <div className="bg-[#1a3059] px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3 text-white">
                  <User size={18} className="text-cyan-400" />
                  <h3 className="font-bold">Configuración de Cuenta</h3>
                </div>
                <button className="bg-cyan-400 text-[#1a3059] px-4 py-1.5 rounded text-xs font-bold hover:bg-cyan-300 transition-colors">
                  Guardar Cambios
                </button>
              </div>
              
              {/* Cuerpo Formulario */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Nombres Completos</label>
                  <input 
                    type="text" 
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">DNI / ID Institucional</label>
                  <input 
                    type="text" 
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Correo Electrónico Laboral</label>
                  <input 
                    type="email" 
                    name="correo"
                    value={formData.correo}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Especialidad Judicial</label>
                  <input 
                    type="text" 
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0]"
                  />
                </div>
              </div>
            </div>

            {/* Formulario 2: Cambiar Contraseña */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Cabecera Tarjeta */}
              <div className="bg-[#1a3059] px-6 py-4 flex items-center gap-3 text-white">
                <Lock size={18} className="text-cyan-400" />
                <h3 className="font-bold">Cambiar Contraseña</h3>
              </div>
              
              {/* Cuerpo Formulario */}
              <div className="p-6 flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 mb-2">Contraseña Actual</label>
                  <input 
                    type="password" 
                    name="passwordActual"
                    value={formData.passwordActual}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0]"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 mb-2">Nueva Contraseña</label>
                  <input 
                    type="password" 
                    name="passwordNueva"
                    value={formData.passwordNueva}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0]"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <button className="w-full md:w-auto bg-[#1a3059] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-900 transition-colors shadow-md">
                    Actualizar Seguridad
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};

export default Profile;