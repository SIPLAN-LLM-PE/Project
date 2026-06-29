import React, { useMemo, useState } from 'react';
import { Edit2, Lock, Mail, MapPin, Phone, Save, ShieldCheck, User, UserCog } from 'lucide-react';
import { TopUserActions } from '../../components/layout/TopUserActions';

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'US';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
};

const getDefaultProfile = () => {
  const usuario = JSON.parse(localStorage.getItem('usuario')) || {};
  const nombre = usuario.nombre || 'Usuario SIGEJA';
  const cargo = usuario.cargo || 'Personal Judicial';
  const username = usuario.username || 'usuario';

  return {
    nombres: nombre,
    dni: usuario.dni || usuario.id || 'No registrado',
    correo: usuario.correo || `${username}@sigeja.gob.pe`,
    especialidad: usuario.especialidad || 'Derecho Alimentario',
    cargo,
    telefono: usuario.telefono || '+51 987 654 321',
    sede: usuario.sede || 'Sede Central - Corte Superior',
    passwordActual: '',
    passwordNueva: ''
  };
};

const Field = ({ label, name, value, type = 'text', onChange }) => (
  <label className="block">
    <span className="block text-[10px] font-bold text-slate-500 mb-2">{label}</span>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0]"
    />
  </label>
);

const Profile = () => {
  const [formData, setFormData] = useState(getDefaultProfile);
  const initials = useMemo(() => getInitials(formData.nombres), [formData.nombres]);
  const displayName = formData.nombres.split(/\s+/).slice(0, 3).join(' ');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const usuario = JSON.parse(localStorage.getItem('usuario')) || {};
    localStorage.setItem('usuario', JSON.stringify({
      ...usuario,
      nombre: formData.nombres,
      cargo: formData.cargo,
      correo: formData.correo,
      dni: formData.dni,
      especialidad: formData.especialidad,
      telefono: formData.telefono,
      sede: formData.sede
    }));
  };

  return (
    <div className="flex-1 bg-[#f8fafc] flex flex-col min-h-screen">
      <header className="bg-white border-b border-slate-200 w-full h-[93px] px-8 sticky top-0 z-10 flex items-center shrink-0">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Mi Perfil</h2>
          <TopUserActions />
        </div>
      </header>

      <main className="p-8 w-full max-w-[1180px] mx-auto overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 mt-10">
          <section className="bg-[#1a3059] rounded-lg shadow-md p-8 text-white">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-[#2546b0] text-4xl font-extrabold shadow-inner">
                  {initials}
                </div>
                <button className="absolute bottom-1 right-1 bg-cyan-400 p-2.5 rounded-full text-[#1a3059] shadow-md hover:bg-cyan-300 transition-colors">
                  <Edit2 size={14} />
                </button>
              </div>

              <h3 className="text-xl font-bold">{displayName}</h3>
              <p className="text-cyan-300 text-sm font-medium mb-7">{formData.cargo}</p>

              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-md">
                  <Mail size={16} className="text-slate-300" />
                  <span className="text-xs text-slate-100 truncate">{formData.correo}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-md">
                  <Phone size={16} className="text-slate-300" />
                  <span className="text-xs text-slate-100">{formData.telefono}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-md">
                  <MapPin size={16} className="text-slate-300" />
                  <span className="text-xs text-slate-100">{formData.sede}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1a3059] px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3 text-white">
                  <UserCog size={18} className="text-cyan-300" />
                  <h3 className="font-bold">Configuracion de Cuenta</h3>
                </div>
                <button
                  onClick={handleSave}
                  className="bg-cyan-400 text-[#1a3059] px-4 py-1.5 rounded text-xs font-bold hover:bg-cyan-300 transition-colors flex items-center gap-2"
                >
                  <Save size={13} /> Guardar Cambios
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Nombres Completos" name="nombres" value={formData.nombres} onChange={handleInputChange} />
                <Field label="DNI / ID Institucional" name="dni" value={formData.dni} onChange={handleInputChange} />
                <Field label="Correo Electronico Laboral" name="correo" type="email" value={formData.correo} onChange={handleInputChange} />
                <Field label="Especialidad Judicial" name="especialidad" value={formData.especialidad} onChange={handleInputChange} />
                <Field label="Telefono Institucional" name="telefono" value={formData.telefono} onChange={handleInputChange} />
                <Field label="Sede Judicial" name="sede" value={formData.sede} onChange={handleInputChange} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1a3059] px-6 py-4 flex items-center gap-3 text-white">
                <Lock size={18} className="text-cyan-300" />
                <h3 className="font-bold">Cambiar Contrasena</h3>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-5 items-end">
                <Field label="Contrasena Actual" name="passwordActual" type="password" value={formData.passwordActual} onChange={handleInputChange} />
                <Field label="Nueva Contrasena" name="passwordNueva" type="password" value={formData.passwordNueva} onChange={handleInputChange} />
                <button className="bg-[#2546b0] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-900 transition-colors shadow-md flex items-center justify-center gap-2">
                  <ShieldCheck size={16} /> Actualizar Seguridad
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Profile;
