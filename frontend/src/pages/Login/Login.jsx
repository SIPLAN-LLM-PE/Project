import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom'; // Importar
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const Login = () => {
  const navigate = useNavigate(); // Inicializar
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulación de validación (luego irá el fetch al backend)
    setTimeout(() => {
      setLoading(false);
      navigate('/dashboard'); // <--- Redirigir al éxito
    }, 1500);
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
        <p className="text-xs text-slate-500 mb-8">Acceda a su panel de gestión judicial</p>

        <form onSubmit={handleLogin}>
          <Input 
            label="Usuario" 
            icon={User} 
            placeholder="Ingrese su usuario" 
            required 
          />
          <Input 
            label="Contraseña" 
            icon={Lock} 
            type="password" 
            placeholder="Ingrese su contraseña" 
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