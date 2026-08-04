import React, { useState } from 'react';
import { User, Lock, AlertCircle, KeyRound } from 'lucide-react'; // Añadido AlertCircle para errores
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { clearAnalysisDraftCache } from '../Analysis/Analysis';

const Login = () => {
  const navigate = useNavigate();
  
  // 1. ESTADOS PARA CAPTURAR DATOS Y MANEJAR ERRORES
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // Estado para capturar mensajes de error de la API
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryUser, setRecoveryUser] = useState('');
  const [resetUser, setResetUser] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

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

      const responseData = await res.json().catch(() => ({}));

      if (res.ok && responseData.status === 'success') {
        // 3. ÉXITO: Guardamos la sesión en localStorage para consumirla en Dashboard y Análisis
        clearAnalysisDraftCache();
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

  const handleRecoveryRequest = async () => {
    setRecoveryLoading(true);
    setError('');
    setRecoveryMessage('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/password-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username_or_email: recoveryUser })
      });
      const data = await res.json().catch(() => ({}));
      setRecoveryMessage(data.message || 'Solicitud registrada.');
      if (data.dev_reset_token) {
        setResetUser(data.dev_username || recoveryUser);
        setResetToken(data.dev_reset_token);
      }
    } catch (err) {
      setError('No se pudo registrar la solicitud de recuperacion.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setRecoveryLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: resetUser,
          reset_token: resetToken,
          password_nueva: newPassword
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRecoveryMessage(data.message || 'Contrasena restablecida correctamente.');
        setShowRecovery(false);
        setPassword('');
      } else {
        setError(data.detail || 'No se pudo restablecer la contrasena.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor de recuperacion.');
    } finally {
      setRecoveryLoading(false);
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
        <button
          type="button"
          onClick={() => setShowRecovery(prev => !prev)}
          className="block mx-auto mt-3 text-xs text-slate-500 font-semibold hover:text-[#2546b0] hover:underline"
        >
          Olvide mi contrasena
        </button>

        {showRecovery && (
          <div className="mt-5 border border-slate-200 rounded-lg p-4 text-left bg-slate-50">
            <div className="flex items-center gap-2 mb-3 text-[#1a3059]">
              <KeyRound size={16} />
              <h3 className="text-sm font-bold">Recuperar contrasena</h3>
            </div>
            <input
              value={recoveryUser}
              onChange={(e) => setRecoveryUser(e.target.value)}
              placeholder="Usuario institucional"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:border-[#2546b0]"
            />
            <button
              type="button"
              onClick={handleRecoveryRequest}
              disabled={recoveryLoading || !recoveryUser.trim()}
              className="w-full bg-[#2546b0] text-white rounded-lg py-2 text-xs font-bold disabled:opacity-50"
            >
              Solicitar codigo temporal
            </button>
            {recoveryMessage && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-3">{recoveryMessage}</p>
            )}
            <div className="grid grid-cols-1 gap-2 mt-4">
              <input
                value={resetUser}
                onChange={(e) => setResetUser(e.target.value)}
                placeholder="Usuario"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2546b0]"
              />
              <input
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Codigo temporal"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2546b0]"
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                placeholder="Nueva contrasena"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2546b0]"
              />
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={recoveryLoading || !resetUser.trim() || !resetToken.trim() || !newPassword.trim()}
                className="w-full bg-slate-800 text-white rounded-lg py-2 text-xs font-bold disabled:opacity-50"
              >
                Restablecer contrasena
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
