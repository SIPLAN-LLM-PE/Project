import React, { useState } from 'react';
import { User, Lock, AlertCircle } from 'lucide-react'; // Añadido AlertCircle para errores
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const Login = () => {
  const navigate = useNavigate();
  
  // 1. ESTADOS PARA CAPTURAR DATOS Y MANEJAR ERRORES
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // Estado para capturar mensajes de error de la API

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(''); // Limpiamos errores anteriores

    try {
      // 2. PETICIÓN REAL AL BACKEND FASTAPI
      const res = await fetch('http://localhost:8000/api/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const responseData = await res.json();

      if (res.ok && responseData.status === 'success') {
        // 3. ÉXITO: Guardamos la sesión en localStorage para consumirla en Dashboard y Análisis
        localStorage.setItem('usuario', JSON.stringify(responseData.data));
        if (responseData.access_token) {
          localStorage.setItem('access_token', responseData.access_token);
          localStorage.setItem('token_type', responseData.token_type || 'bearer');
        }
        
        // Redirigimos al panel principal
        navigate('/dashboard');
      } else {
        // Capturamos el error enviado por FastAPI (ej. HTTPException status 401)
        setError(responseData.detail || 'Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      console.error("Error en autenticación:", err);
      setError('No se pudo conectar con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c2c4c] flex flex-col items-center justify-center p-4">
      
      {/* Header SIGEJA */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white tracking-wider mb-1">SIGEJA</h1>
        <p className="text-sm text-slate-300 max-w-[280px] leading-tight">
          Sistema Inteligente de Gestión Judicial de Alimentos
        </p>
      </div>

      {/* Card Blanca */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Ingresar</h2>
        <p className="text-xs text-slate-500 mb-6">Acceda a su panel de gestión judicial</p>

        {/* 4. ALERTA VISUAL DE ERROR (Si las credenciales fallan) */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 text-left animate-in fade-in zoom-in-95 duration-200">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Vinculamos los inputs con el estado de React */}
          <Input 
            label="Usuario" 
            icon={User} 
            placeholder="Ingrese su usuario" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
          />
          <Input 
            label="Contraseña" 
            icon={Lock} 
            type="password" 
            placeholder="Ingrese su contraseña" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          
          <div className="mt-8">
            <Button type="submit" loading={loading}>
              Iniciar Sesión
            </Button>
          </div>
        </form>

        <Link 
            to="/register" 
            className="mt-6 inline-block text-xs text-[#2546b0] font-semibold hover:underline"
        >
            ¿No tienes cuenta? Regístrate
        </Link>
      </div>
    </div>
  );
};

export default Login;
