import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function UserCard({ user: initial }) {
  const { user: authUser, token } = useAuth();
  const navigate = useNavigate();
  const isOwn = authUser?.username === initial.username;

  const [followerCount, setFollowerCount] = useState(initial.followerCount);
  const [isFollowing, setIsFollowing] = useState(initial.isFollowing);
  const [followLoading, setFollowLoading] = useState(false);

  // Sync if parent re-renders with fresh data (e.g. new search)
  useEffect(() => {
    setFollowerCount(initial.followerCount);
    setIsFollowing(initial.isFollowing);
  }, [initial.username, initial.followerCount, initial.isFollowing]);

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!authUser) { navigate('/login'); return; }

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount(c => wasFollowing ? c - 1 : c + 1);
    setFollowLoading(true);
    try {
      const res = await fetch('/api/follow', {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username: initial.username }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setIsFollowing(wasFollowing);
      setFollowerCount(c => wasFollowing ? c + 1 : c - 1);
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <article
      className="user-card"
      onClick={() => navigate(`/profile/${initial.username}`)}
    >
      <div className="user-card-avatar" aria-hidden="true">
        {initial.username.charAt(0).toUpperCase()}
      </div>

      <div className="user-card-body">
        <div className="user-card-name-row">
          <span className="user-card-username">{initial.username}</span>
          <span className="user-card-followers">
            {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
          </span>
        </div>
        {initial.bio && (
          <p className="user-card-bio">
            {initial.bio.length > 120 ? initial.bio.slice(0, 120) + '…' : initial.bio}
          </p>
        )}
      </div>

      {!isOwn && (
        <button
          className={`follow-btn ${isFollowing ? 'following' : ''}`}
          onClick={handleFollow}
          disabled={followLoading}
          aria-label={isFollowing ? `Unfollow ${initial.username}` : `Follow ${initial.username}`}
        >
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}
    </article>
  );
}

export default function DiscoverView() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  const fetchUsers = useCallback((q, tkn) => {
    setLoading(true);
    const url = `/api/users/search?q=${encodeURIComponent(q)}`;
    const headers = tkn ? { 'Authorization': `Bearer ${tkn}` } : {};
    fetch(url, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setResults(data); setLoading(false); })
      .catch(() => { setResults([]); setLoading(false); });
  }, []);

  // Load defaults on mount and whenever auth token resolves
  useEffect(() => {
    fetchUsers(query, token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(q, token), 300);
  };

  const isEmpty = !loading && results.length === 0;

  return (
    <div className="discover-view">
      <div className="archive-header">
        <h2 className="archive-title">Discover</h2>
        <p className="archive-count">Find people to follow</p>
      </div>

      <div className="search-bar-wrapper">
        <input
          type="search"
          className="search-input"
          placeholder="Search by username…"
          value={query}
          onChange={handleQueryChange}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search users"
        />
      </div>

      {loading ? (
        <div className="loading"><span className="loading-dot" /></div>
      ) : isEmpty ? (
        <div className="archive-empty">
          <p>{query ? `No users found for "${query}"` : 'No users yet — be the first to sign up!'}</p>
        </div>
      ) : (
        <div className="user-list">
          {results.map(u => <UserCard key={u.username} user={u} />)}
        </div>
      )}
    </div>
  );
}
