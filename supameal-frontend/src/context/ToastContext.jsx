import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

const TYPE_STYLES = {
  info: {
    bg: 'var(--bg-card, #151815)',
    ring: 'var(--primary-border, rgba(245, 166, 35, 0.4))',
    Icon: Info,
    iconColor: 'var(--primary, #f5a623)',
    label: 'Info',
  },
  success: {
    bg: 'var(--bg-card, #151815)',
    ring: 'var(--success-border, rgba(76, 175, 128, 0.4))',
    Icon: CheckCircle,
    iconColor: 'var(--success, #4caf80)',
    label: 'Success',
  },
  error: {
    bg: 'var(--bg-card, #151815)',
    ring: 'var(--error-border, rgba(240, 112, 112, 0.4))',
    Icon: AlertCircle,
    iconColor: 'var(--error, #f07070)',
    label: 'Error',
  },
  warning: {
    bg: 'var(--bg-card, #151815)',
    ring: 'var(--warning, #f5b942)',
    Icon: AlertTriangle,
    iconColor: 'var(--warning, #f5b942)',
    label: 'Warning',
  },
};

const DEFAULT_TIMEOUT_MS = 4000;

let idCounter = 0;
const nextId = () => ++idCounter;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = nextId();
    const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    const style = TYPE_STYLES[type] || TYPE_STYLES.info;
    setToasts((prev) => [...prev, { id, message, type, style }]);
    if (timeout > 0) {
      const timer = setTimeout(() => dismissToast(id), timeout);
      timers.current.set(id, timer);
    }
    return id;
  }, [dismissToast]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toasts }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 360,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(({ id, message, style }) => {
          const { bg, ring, Icon, iconColor, label } = style;
          return (
            <div
              key={id}
              role="status"
              aria-label={`${label} notification`}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                background: bg,
                color: '#fff',
                borderRadius: 10,
                boxShadow: `0 10px 25px rgba(0,0,0,0.12), 0 0 0 1px ${ring}`,
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                fontSize: 14,
                lineHeight: 1.4,
                animation: 'toast-in 180ms ease-out',
              }}
            >
              <Icon size={18} style={{ color: iconColor, marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{message}</div>
              <button
                onClick={() => dismissToast(id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 2,
                  marginLeft: 6,
                  borderRadius: 6,
                  opacity: 0.85,
                  display: 'inline-flex',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};
