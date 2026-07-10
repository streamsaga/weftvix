import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

interface Video {
  _id: string;
  title: string;
  slug: string;
  poster: string;
  duration: number;
  releaseYear: number;
  isFeatured: boolean;
  isTrending: boolean;
  views: number;
  genres?: { name: string }[];
}

function formatDuration(mins: number): string {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function VideoCard({ video }: { video: Video }) {
  return (
    <Link to={`/watch/${video.slug}`} className="video-card" style={{ display: 'block' }}>
      <div className="video-card-thumb">
        {video.poster ? (
          <img src={video.poster} alt={video.title} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--surface2), var(--surface3))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={28} color="var(--text-dim)" />
          </div>
        )}
        <div className="video-card-overlay">
          <div className="video-card-play">
            <Play size={18} fill="white" color="white" />
          </div>
        </div>
        {video.duration > 0 && (
          <div className="video-card-duration">{formatDuration(video.duration)}</div>
        )}
        {video.isFeatured && <div className="video-card-badge">Featured</div>}
        {video.isTrending && !video.isFeatured && <div className="video-card-badge" style={{ background: 'var(--danger)' }}>Hot</div>}
      </div>
      <div className="video-card-body">
        <div className="video-card-title">{video.title}</div>
        <div className="video-card-meta">
          <span>{video.releaseYear}</span>
          {video.genres?.[0] && <><span>·</span><span>{video.genres[0].name}</span></>}
          {video.views > 0 && <><span>·</span><span>{video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views} views</span></>}
        </div>
      </div>
    </Link>
  );
}

export function VideoCardSkeleton() {
  return (
    <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div className="skeleton" style={{ aspectRatio: '16/9', width: '100%' }} />
      <div style={{ padding: '12px 14px' }}>
        <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '50%' }} />
      </div>
    </div>
  );
}
