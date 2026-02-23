import { useState } from 'react';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${year}`;
}

function ThoughtEntry({ thought, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(thought.content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/thoughts/${thought.date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(thought.content);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete the thought from ${formatDate(thought.date)}?`)) return;
    try {
      const res = await fetch(`/api/thoughts/${thought.date}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onDelete();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <article className="archive-entry">
      <header className="entry-header">
        <time className="entry-date" dateTime={thought.date}>
          {formatDate(thought.date)}
        </time>
      </header>

      {editing ? (
        <div className="entry-edit">
          <textarea
            className="thought-textarea small"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Edit thought"
          />
          <div className="editor-actions">
            <button className="btn-ghost sm" onClick={handleCancel}>Cancel</button>
            <button
              className="btn-primary sm"
              onClick={handleSave}
              disabled={saving || !content.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="entry-body">
          <p className="entry-text">{thought.content}</p>
          <div className="entry-actions">
            <button className="btn-ghost sm" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn-danger sm" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function ArchiveView({ thoughts, onUpdate, onDelete }) {
  if (thoughts.length === 0) {
    return (
      <div className="archive-view">
        <div className="archive-header">
          <h2 className="archive-title">Archive</h2>
        </div>
        <div className="archive-empty">
          <p>No entries yet — start writing today!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="archive-view">
      <div className="archive-header">
        <h2 className="archive-title">Archive</h2>
        <p className="archive-count">
          {thoughts.length} {thoughts.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      <div className="archive-list">
        {thoughts.map(thought => (
          <ThoughtEntry
            key={thought.date}
            thought={thought}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
