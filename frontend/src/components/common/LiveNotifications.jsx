import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ChevronDown, Loader2, ShieldAlert } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const severityStyles = {
  critico: {
    icon: ShieldAlert,
    iconClass: 'text-rose-600 bg-rose-50 border-rose-100',
    badgeClass: 'bg-rose-100 text-rose-700',
  },
  advertencia: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 bg-amber-50 border-amber-100',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  info: {
    icon: CheckCircle2,
    iconClass: 'text-blue-600 bg-blue-50 border-blue-100',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
};

const formatTimestamp = (value) => {
  if (!value) return '';
  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LiveNotifications = ({ usuarioActivo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestId, setLatestId] = useState(0);
  const dropdownRef = useRef(null);

  const usuario = useMemo(() => {
    if (usuarioActivo?.username || usuarioActivo?.rol) return usuarioActivo;
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
      return {};
    }
  }, [usuarioActivo]);

  const username = usuario?.username || usuario?.nombre || 'Invitado';
  const rol = usuario?.rol || usuario?.role || '';
  const storageKey = `sigeja_notifications_seen_${username}`;
  const [lastSeenId, setLastSeenId] = useState(() => Number(localStorage.getItem(storageKey) || 0));

  useEffect(() => {
    const stored = Number(localStorage.getItem(storageKey) || 0);
    setLastSeenId(stored);
  }, [storageKey]);

  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          username,
          rol,
          since_id: String(lastSeenId || 0),
          limit: '8',
        });
        const response = await fetch(`${API_BASE}/api/v1/notifications/live?${params.toString()}`);
        const data = await response.json();
        if (!mounted || data.status !== 'success') return;
        setNotifications(data.notifications || []);
        setUnreadCount(isOpen ? 0 : Number(data.unread_count || 0));
        setLatestId(Number(data.latest_id || 0));
      } catch (error) {
        console.warn('No se pudieron cargar notificaciones live:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [username, rol, lastSeenId, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && latestId > 0) {
      localStorage.setItem(storageKey, String(latestId));
      setLastSeenId(latestId);
      setUnreadCount(0);
    }
  }, [isOpen, latestId, storageKey]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative flex items-center bg-slate-100 border border-slate-200 rounded-lg px-3 xl:px-4 py-1.5 gap-2 xl:gap-3 cursor-pointer hover:bg-slate-200 transition-all"
      >
        <div className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <div className="text-[10px] leading-tight text-left hidden xl:block">
          <span className="font-bold block text-slate-700">Notificaciones</span>
          <span className="text-slate-500 font-medium">{unreadCount > 0 ? `${unreadCount} alerta(s) nueva(s)` : 'Alertas del sistema'}</span>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 ml-1 text-slate-400 animate-spin" />
        ) : (
          <ChevronDown className={`w-4 h-4 ml-1 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[360px] max-w-[calc(100vw-32px)] bg-white border border-slate-200 rounded-lg shadow-xl z-[80] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-black text-[#061a3d]">Alertas en vivo</p>
            <p className="text-[11px] text-slate-500">Actualizado automaticamente cada 15 segundos</p>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No hay notificaciones recientes.
              </div>
            ) : notifications.map((item) => {
              const style = severityStyles[item.severidad] || severityStyles.info;
              const Icon = style.icon;
              return (
                <div key={item.id} className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-3">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${style.iconClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-black text-slate-800 leading-snug">{item.titulo}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${style.badgeClass}`}>
                          {item.severidad}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">{item.detalle}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span className="truncate">{item.expediente || '-'}</span>
                        <span className="shrink-0">{formatTimestamp(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveNotifications;
