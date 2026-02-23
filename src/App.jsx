import { useState, useEffect, useCallback } from 'react';
import NavBar from './components/NavBar.jsx';
import TodayView from './views/TodayView.jsx';
import ArchiveView from './views/ArchiveView.jsx';

export default function App() {
  const [view, setView] = useState('today');
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchThoughts = useCallback(async () => {
    try {
      const res = await fetch('/api/thoughts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setThoughts(await res.json());
      setError(null);
    } catch (err) {
      setError('Could not load thoughts. Is the server running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThoughts();
  }, [fetchThoughts]);

  // Today's date in YYYY-MM-DD using local time
  const today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const todayThought = thoughts.find(t => t.date === today) ?? null;

  return (
    <div className="app">
      <NavBar view={view} setView={setView} />

      <main className="main-content">
        {loading ? (
          <div className="loading">
            <span className="loading-dot" />
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button className="btn-primary" onClick={fetchThoughts}>Retry</button>
          </div>
        ) : view === 'today' ? (
          <TodayView
            today={today}
            todayThought={todayThought}
            onSave={fetchThoughts}
            onDelete={fetchThoughts}
          />
        ) : (
          <ArchiveView
            thoughts={thoughts}
            onUpdate={fetchThoughts}
            onDelete={fetchThoughts}
          />
        )}
      </main>
    </div>
  );
}
