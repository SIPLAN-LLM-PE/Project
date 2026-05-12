import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, Mail, Briefcase, IdCard } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const Register = () => {
  const [loading, setLoading] = useState(false);

  const handleRegister = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1c2c4c] flex flex-col items-center justify-center p-4">
      
      {/* Header SIGEJA */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white tracking-wider mb-1">SIGEJA</h1>
        <p className="text-sm text-slate-300 max-w-[320px] leading-tight mx-auto">
          Sistema Inteligente de Gestión Judicial de Alimentos
        </p>
      </div>

      {/* Card Blanca de Registro */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] p-8 text-center">
        <h2 className="text-2xl font-bold text-[#1c2c4c] text-left mb-1">Registrarse</h2>
        <p className="text-[11px] text-slate-500 text-left mb-6">Complete sus datos institucionales para solicitar acceso.</p>

        <form onSubmit={handleRegister}>
          {/* Fila 1: DNI y Cargo */}
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="DNI" 
              icon={IdCard} 
              placeholder="Ingrese su DNI" 
              maxLength={8}
              required 
            />
            <div className="text-left">
              <label className="block text-[10px] font-bold text-[#4a5568] uppercase tracking-widest mb-1.5 ml-1">
                Cargo/Rol
              </label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2546b0]">
                  <Briefcase size={18} />
                </div>
                <select className="w-full pl-10 pr-4 py-2.5 border border-[#cbd5e0] rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0] bg-white appearance-none">
                  <option value="">Seleccione su cargo</option>
                  <option value="juez">Juez</option>
                  <option value="secretario">Secretario Judicial</option>
                  <option value="especialista">Especialista Legal</option>
                </select>
              </div>
            </div>
          </div>

          <Input 
            label="Nombres Completos" 
            icon={User} 
            placeholder="Ingrese sus nombres y apellidos" 
            required 
          />

          <Input 
            label="Correo Institucional" 
            icon={Mail} 
            type="email"
            placeholder="ejemplo@pj.gob.pe" 
            required 
          />

          {/* Fila 2: Contraseñas */}
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Contraseña" 
              icon={Lock} 
              type="password"
              placeholder="Cree una clave" 
              required 
            />
            <Input 
              label="Confirmar Contraseña" 
              icon={Lock} 
              type="password"
              placeholder="Repita su clave" 
              required 
            />
          </div>
          
          <div className="mt-4">
            <Button type="submit" loading={loading}>
              Solicitar Registro
            </Button>
          </div>
        </form>

        <Link 
                to="/login" 
                className="mt-6 inline-block text-[11px] text-[#2546b0] font-semibold hover:underline"
            >
                ¿Ya tienes una cuenta aprobada? Iniciar Sesión
        </Link>
      </div>
    </div>
  );
};

export default Register;