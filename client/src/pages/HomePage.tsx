import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Star, TrendingUp, Film } from 'lucide-react';
import api from '../lib/api';
import { VideoCard, VideoCardSkeleton } from '../components/VideoCard';

interface Video {
  _id: string;
  title: string;
  slug: string;
  poster: string;
  banner: string;
  description: string;
  duration: number;
  releaseYear: number;
  ageRating: string;
  isFeatured: boolean;
  isTrending: boolean;
  views: number;
  genres?: { name: string }[];
}

function useVideos(params: Record<string, string | boolean>) {
  return useQuery<{ videos: Video[] }>({
    queryKey: ['videos-public', params],
    queryFn: () => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      ).toString();
      return api.get(`/videos/public?${qs}&limit=12`).then((r) => r.data.data);
    },
  });
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data: featuredData } = useVideos({ featured: 'true', limit: '1' });
  const { data: trendingData, isLoading: trendingLoading } = useVideos({ trending: 'true' });
  const { data: allData, isLoading: allLoading } = useVideos({});

  const hero = featuredData?.videos?.[0] || allData?.videos?.[0];

  return (
    <div>
      {/* Hero */}
      {hero && (
        <section className="hero">
          <div
            className="hero-bg"
            style={{ backgroundImage: `url(${hero.banner || hero.poster})` }}
          />
          <div className="hero-gradient" />
          <div className="hero-content">
            <div className="hero-badge">
              <Star size={10} fill="currentColor" />
              Featured
            </div>
            <h1 className="hero-title">{hero.title}</h1>
            <div className="hero-meta">
              <span>{hero.releaseYear}</span>
              <span className="hero-meta-dot" />
              <span>{hero.ageRating}</span>
              {hero.genres?.[0] && (
                <>
                  <span className="hero-meta-dot" />
                  <span>{hero.genres[0].name}</span>
                </>
              )}
              {hero.duration > 0 && (
                <>
                  <span className="hero-meta-dot" />
                  <span>{Math.floor(hero.duration / 60)}h {hero.duration % 60}m</span>
                </>
              )}
            </div>
            <p className="hero-desc">{hero.description}</p>
            <div className="hero-actions">
              <button
                className="hero-btn-play"
                onClick={() => navigate(`/watch/${hero.slug}`)}
              >
                <Play size={18} fill="currentColor" />
                Watch Now
              </button>
              <button
                className="hero-btn-info"
                onClick={() => navigate(`/watch/${hero.slug}`)}
              >
                <Info size={16} />
                More Info
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Trending */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-title-accent" />
            <TrendingUp size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--danger)' }} />
            Trending Now
          </h2>
          <a href="/browse?trending=true" className="section-view-all">View all →</a>
        </div>
        <div className="video-grid">
          {trendingLoading
            ? Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)
            : trendingData?.videos?.length
              ? trendingData.videos.map((v) => <VideoCard key={v._id} video={v} />)
              : <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No trending videos yet</p>
          }
        </div>
      </section>

      {/* All Videos */}
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-title-accent" />
            <Film size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--accent)' }} />
            All Videos
          </h2>
          <a href="/browse" className="section-view-all">Browse all →</a>
        </div>
        <div className="video-grid">
          {allLoading
            ? Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)
            : allData?.videos?.length
              ? allData.videos.map((v) => <VideoCard key={v._id} video={v} />)
              : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <Film size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p style={{ fontSize: 16, fontWeight: 600 }}>No videos yet</p>
                  <p style={{ fontSize: 14, marginTop: 4 }}>Check back soon!</p>
                </div>
              )
          }
        </div>
      </section>
    </div>
  );
}
