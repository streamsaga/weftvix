import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Search, X } from 'lucide-react';

export default function Navbar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/browse?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <nav className="navbar">
      {/* Brand */}
      <Link to="/" className="navbar-brand">
        <div className="navbar-logo">
          <Play size={16} fill="white" color="white" />
        </div>
        <span className="navbar-title">Weft<span style={{ color: 'var(--accent)' }}>Vix</span></span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: 20, marginLeft: 8 }}>
        <Link to="/" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>Home</Link>
        <Link to="/browse" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>Browse</Link>
      </div>

      {/* Search */}
      <form className="navbar-search" onSubmit={handleSearch}>
        <Search size={15} className="navbar-search-icon" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos…"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', padding: 2 }}
          >
            <X size={14} />
          </button>
        )}
      </form>
    </nav>
  );
}
