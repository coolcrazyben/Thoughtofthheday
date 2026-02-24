import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

export default function CommunityView() {
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/community')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => { setThoughts(data); setLoading(false); })
      .catch(err => { setError('Could not load community thoughts.'); setLoading(false); console.error(err); });
  }, []);

  if (loading) {
    return <div className="loading"><span className="loading-dot" /></div>;
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="community-view">
      <div className="archive-header">
        <h2 className="archive-title">Community</h2>
        <p className="archive-count">
          {thoughts.length} {thoughts.length === 1 ? 'thought' : 'thoughts'} shared
        </p>
      </div>

      {thoughts.length === 0 ? (
        <div className="archive-empty">
          <p>No thoughts shared yet — be the first!</p>
        </div>
      ) : (
        <div className="archive-list">
          {thoughts.map(thought => (
            <article key={thought.date} className="archive-entry community-entry">
              <header className="entry-header community-entry-header">
                <time className="entry-date" dateTime={thought.date}>
                  {formatDate(thought.date).toUpperCase()}
                </time>
                <span className="entry-author">
                  {thought.username ? (
                    <Link to={`/profile/${thought.username}`} className="author-link">
                      {thought.username}
                    </Link>
                  ) : (
                    <span className="author-anon">Anonymous</span>
                  )}
                </span>
              </header>
              <p className="entry-text">{thought.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
