import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  Server,
  Wifi,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './HealthPage.css';

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
const API_URL = (configuredApiUrl || (import.meta.env.PROD
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : 'http://localhost:3000')).replace(/\/+$/, '');

const initialHealth = {
  live: 'checking',
  ready: 'checking',
  database: 'checking',
  redis: 'checking',
  checkedAt: null,
};

async function requestHealth(path, signal) {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, body };
}

function statusText(status) {
  if (status === 'checking') return 'Checking';
  if (status === 'healthy' || status === 'connected') return 'Operational';
  if (status === 'optional') return 'Not configured';
  if (status === 'unavailable') return 'Unavailable';
  return 'Unknown';
}

function HealthIndicator({ status }) {
  if (status === 'checking') return <span className="health-spinner" aria-hidden="true" />;
  if (status === 'healthy' || status === 'connected') {
    return <CheckCircle2 aria-hidden="true" />;
  }
  if (status === 'unavailable') return <XCircle aria-hidden="true" />;
  return <AlertTriangle aria-hidden="true" />;
}

function HealthRow({ icon: Icon, label, detail, status }) {
  return (
    <div className="health-row">
      <span className="health-row-icon"><Icon size={19} aria-hidden="true" /></span>
      <span className="health-row-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className={`health-row-status is-${status}`}>
        <HealthIndicator status={status} />
        {statusText(status)}
      </span>
    </div>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState(initialHealth);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async (signal) => {
    setChecking(true);
    try {
      const [liveResult, readyResult] = await Promise.all([
        requestHealth('/health/live', signal),
        requestHealth('/health/ready', signal),
      ]);
      const dependencies = readyResult.body?.dependencies || {};

      setHealth({
        live: liveResult.ok && liveResult.body?.status === 'ok' ? 'healthy' : 'unavailable',
        ready: readyResult.ok && readyResult.body?.status === 'ready' ? 'healthy' : 'unavailable',
        database:
          dependencies.database === 'connected'
            ? 'connected'
            : dependencies.database === 'unavailable'
              ? 'unavailable'
              : readyResult.ok
                ? 'unknown'
                : 'unavailable',
        redis:
          dependencies.redis === 'connected'
            ? 'connected'
            : dependencies.redis === 'unavailable'
              ? 'unavailable'
              : readyResult.ok
                ? 'optional'
                : 'unknown',
        checkedAt: new Date(),
      });
    } catch {
      setHealth({
        live: 'unavailable',
        ready: 'unavailable',
        database: 'unknown',
        redis: 'unknown',
        checkedAt: new Date(),
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timeoutId;
    let controller;

    const poll = async () => {
      controller = new AbortController();
      const timeoutIdForRequest = window.setTimeout(() => controller.abort(), 8000);
      await checkHealth(controller.signal);
      window.clearTimeout(timeoutIdForRequest);
      if (active) timeoutId = window.setTimeout(poll, 30_000);
    };

    poll();
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(timeoutId);
    };
  }, [checkHealth]);

  const isOperational = health.live === 'healthy' && health.ready === 'healthy';
  const hasResult = health.checkedAt !== null;

  const refresh = () => {
    const controller = new AbortController();
    checkHealth(controller.signal);
  };

  return (
    <main className="health-page">
      <header className="health-header">
        <Link to="/" className="health-brand" aria-label="SupaMeal home">
          Supa<span>Meal</span>
        </Link>
        <span className="health-header-label"><Activity size={17} /> System status</span>
      </header>

      <section className="health-content" aria-labelledby="health-title">
        <div className={`health-summary ${hasResult && !isOperational ? 'has-issue' : ''}`}>
          <span className="health-summary-icon">
            {hasResult ? (
              isOperational ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />
            ) : (
              <Activity size={24} />
            )}
          </span>
          <div>
            <p className="health-eyebrow">SUPAMEAL PLATFORM</p>
            <h1 id="health-title">
              {!hasResult ? 'Checking system health' : isOperational ? 'All systems operational' : 'Service needs attention'}
            </h1>
            <p className="health-description">
              Live status from the SupaMeal API and its required services.
            </p>
          </div>
          <span className={`health-overall ${!hasResult ? 'is-checking' : isOperational ? 'is-healthy' : 'is-unavailable'}`}>
            <span />{!hasResult ? 'Checking' : isOperational ? 'Operational' : 'Degraded'}
          </span>
        </div>

        <section className="health-panel" aria-label="Service checks">
          <div className="health-panel-heading">
            <div>
              <h2>Service checks</h2>
              <p>Readiness includes the API database and shared Redis connection.</p>
            </div>
            <button className="health-refresh" type="button" onClick={refresh} disabled={checking}>
              <RefreshCw size={16} className={checking ? 'is-spinning' : ''} />
              Refresh
            </button>
          </div>

          <div className="health-rows">
            <HealthRow icon={Server} label="API process" detail="Liveness probe · /health/live" status={health.live} />
            <HealthRow icon={Activity} label="API readiness" detail="Ready to receive application traffic" status={health.ready} />
            <HealthRow icon={Database} label="Database" detail="MongoDB connection" status={health.database} />
            <HealthRow icon={Wifi} label="Shared cache and jobs" detail="Required in production · optional locally" status={health.redis} />
          </div>

          <footer className="health-panel-footer">
            <span><Clock3 size={15} />
              {health.checkedAt ? `Last checked ${health.checkedAt.toLocaleTimeString()}` : 'Waiting for the API response'}
            </span>
            <code>{API_URL || 'API URL is not configured'}</code>
          </footer>
        </section>

        <Link to="/" className="health-home-link"><ArrowLeft size={17} /> Back to SupaMeal</Link>
      </section>
    </main>
  );
}
