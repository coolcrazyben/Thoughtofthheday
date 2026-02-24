import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

const PUSH_SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export default function NavBar({ view, setView }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [showPanel, setShowPanel] = useState(false);
  const [notifyTime, setNotifyTime] = useState('09:00');
  // 'idle' | 'loading' | 'enabled' | 'error' | 'unsupported' | 'blocked'
  const [notifStatus, setNotifStatus] = useState(PUSH_SUPPORTED ? 'idle' : 'unsupported');
  const [statusMsg, setStatusMsg] = useState('');
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  const isMain = location.pathname === '/';
  const isDiscover = location.pathname === '/discover';
  const isCommunity = location.pathname === '/community';

  // On mount: check if already subscribed
  useEffect(() => {
    if (!PUSH_SUPPORTED) return;
    if (Notification.permission === 'denied') {
      setNotifStatus('blocked');
      return;
    }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setNotifStatus('enabled'); })
      .catch(() => {});
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  const handleEnable = async () => {
    setNotifStatus('loading');
    setStatusMsg('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotifStatus('blocked');
        return;
      }

      const keyRes = await fetch('/api/vapid-key');
      if (!keyRes.ok) {
        setStatusMsg('Push notifications not configured on the server.');
        setNotifStatus('error');
        return;
      }
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, notifyTime }),
      });
      if (!res.ok) throw new Error('Subscribe API failed');

      setNotifStatus('enabled');
      setStatusMsg('');
    } catch (err) {
      console.error('[push] enable failed:', err);
      setNotifStatus('error');
      setStatusMsg('Failed to enable notifications. Try again.');
    }
  };

  const handleDisable = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setNotifStatus('idle');
    } catch (err) {
      console.error('[push] disable failed:', err);
    }
  };

  const handleUpdateTime = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), notifyTime }),
      });
      setStatusMsg('Time updated ✓');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (err) {
      console.error('[push] update time failed:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isEnabled = notifStatus === 'enabled';

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="brand-link" onClick={() => setView('today')}>
          <span className="brand-icon">✦</span>
          <span className="brand-name">Thought of the Day</span>
        </Link>
      </div>

      <nav className="navbar-nav" aria-label="Main">
        <button
          className={`nav-btn ${isMain ? 'active' : ''}`}
          onClick={() => { navigate('/'); setView('today'); }}
        >
          Today
        </button>
        <button
          className={`nav-btn ${isDiscover ? 'active' : ''}`}
          onClick={() => navigate('/discover')}
        >
          Discover
        </button>
        <button
          className={`nav-btn ${isCommunity ? 'active' : ''}`}
          onClick={() => navigate('/community')}
        >
          Community
        </button>
      </nav>

      <div className="navbar-right">
        {user ? (
          <div className="nav-user">
            <Link to={`/profile/${user.username}`} className="nav-username">
              {user.username}
            </Link>
            <button className="btn-ghost sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className={`nav-btn ${location.pathname === '/login' || location.pathname === '/signup' ? 'active' : ''}`}
          >
            Log in
          </Link>
        )}

        <div className="notif-wrapper">
          <button
            ref={btnRef}
            className={`notif-btn ${isEnabled ? 'enabled' : ''}`}
            onClick={() => setShowPanel(v => !v)}
            aria-label="Notification settings"
            title="Notification settings"
          >
            {isEnabled ? '🔔' : '🔕'}
          </button>

          {showPanel && (
            <div className="notif-panel" ref={panelRef} role="dialog" aria-label="Notification settings">
              <h3 className="panel-title">Daily Reminder</h3>

              {notifStatus === 'unsupported' ? (
                <p className="panel-note">
                  Push notifications aren't supported in this browser.
                </p>
              ) : (
                <>
                  <div className="panel-field">
                    <label htmlFor="notif-time" className="panel-label">
                      Remind me at
                    </label>
                    <input
                      id="notif-time"
                      type="time"
                      className="time-input"
                      value={notifyTime}
                      onChange={e => setNotifyTime(e.target.value)}
                    />
                  </div>

                  {isEnabled ? (
                    <div className="panel-actions">
                      <button className="btn-primary sm" onClick={handleUpdateTime}>
                        Update time
                      </button>
                      <button className="btn-ghost sm" onClick={handleDisable}>
                        Disable
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-primary sm"
                      onClick={handleEnable}
                      disabled={notifStatus === 'loading'}
                      style={{ width: '100%' }}
                    >
                      {notifStatus === 'loading' ? 'Enabling…' : 'Enable notifications'}
                    </button>
                  )}

                  {notifStatus === 'blocked' && (
                    <p className="panel-note warning">
                      Notifications are blocked. Allow them in your browser settings.
                    </p>
                  )}
                  {statusMsg && (
                    <p className={`panel-note ${notifStatus === 'error' ? 'warning' : ''}`}>
                      {statusMsg}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
