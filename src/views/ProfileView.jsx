import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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

export default function ProfileView() {
  const { username } = useParams();
  const { user, token } = useAuth();
  const isOwner = user?.username === username;

  const [profile, setProfile] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [bioStatus, setBioStatus] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then(r => {
        if (r.status === 404) throw new Error('not found');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setProfile(data.user);
        setThoughts(data.thoughts);
        setBioInput(data.user.bio || '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message === 'not found' ? 'User not found.' : 'Could not load profile.');
        setLoading(false);
      });
  }, [username]);

  const handleSaveBio = async () => {
    setSavingBio(true);
    setBioStatus(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bio: bioInput }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setProfile(updated);
      setBioInput(updated.bio || '');
      setEditingBio(false);
      setBioStatus('saved');
      setTimeout(() => setBioStatus(null), 2500);
    } catch {
      setBioStatus('error');
    } finally {
      setSavingBio(false);
    }
  };

  if (loading) return <div className="loading"><span className="loading-dot" /></div>;

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="profile-view">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {profile.username.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h1 className="profile-username">{profile.username}</h1>
          <p className="profile-joined">
            Member since{' '}
            {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="profile-bio-section">
        {editingBio ? (
          <div className="bio-editor">
            <textarea
              className="thought-textarea small"
              value={bioInput}
              onChange={e => setBioInput(e.target.value)}
              placeholder="Write a short bio…"
              autoFocus
              maxLength={300}
            />
            <div className="editor-actions">
              <button className="btn-ghost sm" onClick={() => { setEditingBio(false); setBioInput(profile.bio || ''); }}>
                Cancel
              </button>
              <button className="btn-primary sm" onClick={handleSaveBio} disabled={savingBio}>
                {savingBio ? 'Saving…' : 'Save bio'}
              </button>
            </div>
            {bioStatus === 'error' && <p className="status-msg error">Could not save — try again.</p>}
          </div>
        ) : (
          <div className="bio-display">
            {profile.bio ? (
              <p className="profile-bio">{profile.bio}</p>
            ) : isOwner ? (
              <p className="profile-bio-empty">Add a bio to tell people about yourself.</p>
            ) : null}
            {isOwner && (
              <button className="btn-ghost sm" onClick={() => setEditingBio(true)}>
                {profile.bio ? 'Edit bio' : 'Add bio'}
              </button>
            )}
            {bioStatus === 'saved' && <p className="status-msg success" style={{ marginTop: '0.5rem' }}>Saved ✓</p>}
          </div>
        )}
      </div>

      <div className="profile-thoughts">
        <h2 className="profile-section-title">
          Thoughts
          <span className="archive-count" style={{ marginLeft: '0.75rem' }}>
            {thoughts.length} {thoughts.length === 1 ? 'entry' : 'entries'}
          </span>
        </h2>

        {thoughts.length === 0 ? (
          <div className="archive-empty">
            <p>{isOwner ? 'You haven\'t shared any thoughts yet.' : 'No thoughts yet.'}</p>
          </div>
        ) : (
          <div className="archive-list">
            {thoughts.map(thought => (
              <article key={thought.date} className="archive-entry">
                <header className="entry-header">
                  <time className="entry-date" dateTime={thought.date}>
                    {formatDate(thought.date).toUpperCase()}
                  </time>
                </header>
                <p className="entry-text">{thought.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
