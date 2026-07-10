import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import api from '../lib/api';
import { VideoCard, VideoCardSkeleton } from '../components/VideoCard';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');
  const [page, setPage] = useState(1);

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: () => api.get('/genres').then((r) => r.data.data),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['browse', search, genre, page],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: '24', page: String(page) });
      if (search) qs.set('search', search);
      if (genre) qs.set('genre', genre);
      return api.get(`/videos/public?${qs}`).then((r) => r.data.data);
    },
  });

  // Sync URL params
  useEffect(() => {
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (genre) p.genre = genre;
    setSearchParams(p);
    setPage(1);
  }, [search, genre]);

  // Sync state when URL params change (e.g. from Navbar search)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Browse Videos</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {data?.pagination?.total ?? 0} videos available — no account required
        </p>
      </div>

      {/* Search + Filter */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description…"
            style={{
              width: '100%',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 14px 10px 38px',
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
      </form>

      {/* Genre Pills */}
      <div className="filter-pills">
        <button
          className={`filter-pill ${!genre ? 'active' : ''}`}
          onClick={() => setGenre('')}
        >
          All
        </button>
        {(genresData || []).map((g: any) => (
          <button
            key={g._id}
            className={`filter-pill ${genre === g._id ? 'active' : ''}`}
            onClick={() => setGenre(genre === g._id ? '' : g._id)}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="video-grid">
        {(isLoading || isFetching)
          ? Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)
          : data?.videos?.map((v: any) => <VideoCard key={v._id} video={v} />)
        }
        {!isLoading && !isFetching && data?.videos?.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <Search size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>No videos found</p>
            <p style={{ fontSize: 14, marginTop: 4 }}>Try a different search term or clear filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 36 }}>
          {page > 1 && (
            <button onClick={() => setPage(page - 1)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>← Prev</button>
          )}
          <span style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            Page {page} of {data.pagination.totalPages}
          </span>
          {page < data.pagination.totalPages && (
            <button onClick={() => setPage(page + 1)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>Next →</button>
          )}
        </div>
      )}
    </div>
  );
}
