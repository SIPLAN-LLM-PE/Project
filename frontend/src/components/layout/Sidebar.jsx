import { Home, BrainCircuit, BarChart3, ShieldCheck, LogOut, UserCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAnalysisDraftCache } from '../../pages/Analysis/Analysis';

const menuItems = [
  { icon: Home, label: 'Página Principal', path: '/dashboard' },
  { icon: BrainCircuit, label: 'Análisis IA', path: '/analysis' },
  { icon: BarChart3, label: 'Reportes', path: '/reports' },
  { icon: ShieldCheck, label: 'Auditoria', path: '/audit' },
  { icon: UserCircle, label: 'Mi Perfil', path: '/profile' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAnalysisDraftCache();
    localStorage.removeItem('usuario');
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    navigate('/');
  };

  return (
    <div className="w-20 xl:w-64 bg-[#1a3059] min-h-screen flex flex-col text-white shadow-xl transition-[width] duration-200">
      <div className="h-[76px] xl:h-[93px] px-3 xl:px-6 flex flex-col justify-center items-center xl:items-start border-b border-slate-700/50">
        <h1 className="text-lg xl:text-2xl font-bold tracking-tighter leading-none">SIGEJA</h1>
        <p className="hidden xl:block text-[10px] text-slate-400 leading-tight mt-1.5">
          Sistema Inteligente de Gestión Judicial de Alimentos
        </p>
      </div>

      <nav className="flex-1 mt-3 xl:mt-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`flex items-center justify-center xl:justify-start px-0 xl:px-6 py-4 transition-all ${
                isActive
                  ? 'bg-[#2546b0] border-l-4 border-white shadow-inner'
                  : 'hover:bg-[#2546b0]/40'
              }`}
            >
              <item.icon className={`w-5 h-5 xl:mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className={`hidden xl:inline text-sm ${isActive ? 'font-bold' : 'font-medium text-slate-300'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 xl:p-4 border-t border-slate-700/50">
        <button
          onClick={handleLogout}
          title="Cerrar Sesión"
          className="flex items-center justify-center xl:justify-start w-full px-0 xl:px-4 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-white transition-all text-sm font-bold shadow-md active:scale-95"
        >
          <LogOut className="w-4 h-4 xl:mr-2" />
          <span className="hidden xl:inline">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
