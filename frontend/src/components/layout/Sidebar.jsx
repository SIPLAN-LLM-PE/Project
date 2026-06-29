import { Home, BrainCircuit, BarChart3, ShieldCheck, LogOut, UserCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // 🚀 1. Importamos useNavigate

const menuItems = [
  { icon: Home, label: 'Página Principal', path: '/dashboard' },
  { icon: BrainCircuit, label: 'Análisis IA', path: '/analysis' },
  { icon: BarChart3, label: 'Reportes', path: '/reports' },
  { icon: ShieldCheck, label: 'Auditoria', path: '/audit' },
  { icon: UserCircle, label: 'Mi Perfil', path: '/profile' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate(); // 🚀 2. Inicializamos el hook de navegación

  // 🚀 3. Creamos la función que maneja el cierre de sesión
  const handleLogout = () => {
    // Limpiamos los datos de la sesión actual guardados en el navegador
    localStorage.removeItem('usuario');
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    
    // Redirigimos al usuario a la pantalla de login (asumiendo que tu ruta raíz es '/')
    navigate('/');
  };

  return (
    <div className="w-64 bg-[#1a3059] min-h-screen flex flex-col text-white shadow-xl">
      
      {/* 1. Encabezado con altura fija para alinear con el Dashboard */}
      <div className="h-[93px] px-6 flex flex-col justify-center border-b border-slate-700/50"> 
        <h1 className="text-2xl font-bold tracking-tighter leading-none">SIGEJA</h1>
        <p className="text-[10px] text-slate-400 leading-tight mt-1.5">
          Sistema Inteligente de Gestión Judicial de Alimentos
        </p>
      </div>

      {/* 2. Navegación */}
      <nav className="flex-1 mt-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-4 transition-all ${
                isActive 
                  ? 'bg-[#2546b0] border-l-4 border-white shadow-inner' 
                  : 'hover:bg-[#2546b0]/40'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium text-slate-300'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* 3. Footer del Sidebar */}
      <div className="p-4 border-t border-slate-700/50">
        <button 
          onClick={handleLogout} // 🚀 4. Conectamos la función al evento clic del botón
          className="flex items-center w-full px-4 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-white transition-all text-sm font-bold shadow-md active:scale-95"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};
