import { useState, useEffect } from 'react';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function TodayView({ today, todayThought, onSave, onDelete }) {
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // null | 'saved' | 'error'

  // Sync local state when the thought prop changes (e.g. after server fetch)
  useEffect(() => {
    if (todayThought) {
      setContent(todayThought.content);
      setEditing(false);
    } else {
      setContent('');
      setEditing(true);
    }
  }, [todayThought]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSaving(true);
    setStatus(null);
    try {
      const isNew = !todayThought;
      const res = await fetch(
        isNew ? '/api/thoughts' : `/api/thoughts/${today}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isNew ? { date: today, content: trimmed } : { content: trimmed }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('saved');
      setEditing(false);
      onSave();
      setTimeout(() => setStatus(null), 2500);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete today's thought? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/thoughts/${today}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setContent('');
      setEditing(true);
      onDelete();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCancelEdit = () => {
    setContent(todayThought.content);
    setEditing(false);
    setStatus(null);
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="today-view">
      <div className="date-header">
        <span className="date-label">{formatDate(today)}</span>
        <span className="year-label">{today.slice(0, 4)}</span>
      </div>

      <div className="thought-card">
        {!editing && todayThought ? (
          /* ── Read mode ── */
          <div className="thought-display">
            <p className="thought-text">{todayThought.content}</p>
            <div className="thought-actions">
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          /* ── Write / edit mode ── */
          <div className="thought-editor">
            <textarea
              className="thought-textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind today?"
              autoFocus
              aria-label="Today's thought"
            />
            <div className="editor-footer">
              <span className="word-count" aria-live="polite">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
              <div className="editor-actions">
                {todayThought && (
                  <button className="btn-ghost" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={saving || !content.trim()}
                  title="Ctrl+Enter"
                >
                  {saving ? 'Saving…' : 'Save thought'}
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'saved' && <p className="status-msg success">Saved ✓</p>}
        {status === 'error' && <p className="status-msg error">Something went wrong — try again.</p>}
      </div>

      {!todayThought && (
        <p className="prompt-text">Every day is a new page. Write yours.</p>
      )}
    </div>
  );
}
