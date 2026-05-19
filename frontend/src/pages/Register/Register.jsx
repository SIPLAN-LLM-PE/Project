import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Briefcase, IdCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const Register = () => {
  const navigate = useNavigate();

  // 1. ESTADOS PARA CAPTURAR LOS DATOS DEL FORMULARIO
  const [dni, setDni] = useState('');
  const [cargo, setCargo] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados de control de la UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // 2. VALIDACIÓN LOCAL DE CONTRASEÑAS
    if (password !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      setLoading(false);
      return;
    }

    if (!email.endsWith('@pj.gob.pe') && !email.endsWith('@pj.gob') && !email.includes('localhost')) {
      setError('Debe ingresar un correo institucional válido (@pj.gob.pe).');
      setLoading(false);
      return;
    }

    try {
      // 3. LLAMADO POST REAL A LA API DE FASTAPI
      const res = await fetch('http://localhost:8000/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni,
          cargo,
          nombre,
          email,
          password
        })
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setSuccess(data.message);
        
        // Esperamos 3 segundos mostrando el mensaje verde de éxito y redirigimos al Login
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.detail || 'Ocurrió un error al procesar la solicitud de registro.');
      }
    } catch (err) {
      console.error("Error registrando usuario:", err);
      setError('No se pudo conectar con el servidor central de justicia.');
    } finally {
      setLoading(false);
    }
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

        {/* 4. MENSAJES DE ESTADO DE CONTROL DE ACCESO */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 text-left animate-in fade-in zoom-in-95">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2 text-left animate-in fade-in zoom-in-95">
            <CheckCircle size={16} className="shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          {/* Fila 1: DNI y Cargo */}
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="DNI" 
              icon={IdCard} 
              placeholder="Ingrese su DNI" 
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} // Solo números
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
                <select 
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#cbd5e0] rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0] bg-white appearance-none"
                  required
                >
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
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required 
          />

          <Input 
            label="Correo Institucional" 
            icon={Mail} 
            type="email"
            placeholder="ejemplo@pj.gob.pe" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />

          {/* Fila 2: Contraseñas */}
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Contraseña" 
              icon={Lock} 
              type="password"
              placeholder="Cree una clave" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <Input 
              label="Confirmar Contraseña" 
              icon={Lock} 
              type="password"
              placeholder="Repita su clave" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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