import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Calendar, Globe, Star, Eye, Tag } from 'lucide-react';
import api from '../lib/api';
import StreamPlayer from '../components/StreamPlayer';
import { VideoCard, VideoCardSkeleton } from '../components/VideoCard';

interface Quality {
  label: string;
  url: string;
  bitrate?: number;
}

interface VideoDetail {
  _id: string;
  title: string;
  slug: string;
  description: string;
  poster: string;
  banner: string;
  videoUrl: string;
  hlsMasterPlaylistUrl: string;
  qualities: Quality[];
  duration: number;
  releaseYear: number;
  ageRating: string;
  director: string;
  cast: string[];
  language: string;
  tags: string[];
  views: number;
  averageRating: number;
  genres: { _id: string; name: string; slug: string }[];
  categories: { _id: string; name: string; slug: string }[];
}

export default function WatchPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: videoData, isLoading, error } = useQuery<VideoDetail>({
    queryKey: ['video', slug],
    queryFn: () => api.get(`/videos/public/${slug}`).then((r) => r.data.data),
    enabled: !!slug,
  });

  const { data: relatedData } = useQuery({
    queryKey: ['related', videoData?.genres?.[0]?._id, videoData?._id],
    queryFn: async () => {
      const genreId = videoData?.genres?.[0]?._id;
      if (genreId) {
        const res = await api.get(`/videos/public?genre=${genreId}&limit=8`);
        const videos = res.data.data.videos || [];
        const filtered = videos.filter((v: any) => v._id !== videoData?._id);
        if (filtered.length >= 4) {
          return { videos: filtered };
        }
      }
      // Fallback: get recent videos
      const resFallback = await api.get(`/videos/public?limit=10`);
      const allVideos = resFallback.data.data.videos || [];
      const filtered = allVideos.filter((v: any) => v._id !== videoData?._id);
      return { videos: filtered };
    },
    enabled: !!videoData?._id,
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ aspectRatio: '16/9', background: 'var(--surface2)', borderRadius: 16, marginBottom: 24 }} className="skeleton" />
        <div className="skeleton" style={{ height: 32, width: '60%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 16, width: '40%' }} />
      </div>
    );
  }

  if (error || !videoData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Video not found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>This video may have been removed or is not yet published.</p>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 600 }}>
          <ArrowLeft size={16} />
          Go Home
        </Link>
      </div>
    );
  }

  const videoSrc = videoData.hlsMasterPlaylistUrl || videoData.videoUrl;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* Back */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, transition: 'color 0.15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
        <ArrowLeft size={15} />
        Back to Home
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>
        {/* Left: Player + Info */}
        <div>
          {/* Player */}
          {videoSrc ? (
            <StreamPlayer
              src={videoSrc}
              poster={videoData.banner || videoData.poster}
              title={videoData.title}
              qualities={videoData.qualities || []}
            />
          ) : (
            <div style={{ aspectRatio: '16/9', background: 'var(--surface2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 40 }}>🎬</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Video is being processed…</p>
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Please check back soon.</p>
            </div>
          )}

          {/* Title & Meta */}
          <div style={{ marginTop: 24 }}>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
              {videoData.title}
            </h1>

            {/* Meta Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} color="var(--accent)" />
                {videoData.releaseYear}
              </span>
              {videoData.duration > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} color="var(--accent)" />
                  {Math.floor(videoData.duration / 60)}h {videoData.duration % 60}m
                </span>
              )}
              {videoData.language && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Globe size={13} color="var(--accent)" />
                  {videoData.language}
                </span>
              )}
              {videoData.views > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Eye size={13} color="var(--accent)" />
                  {videoData.views.toLocaleString()} views
                </span>
              )}
              {videoData.ageRating && videoData.ageRating !== 'NR' && (
                <span style={{ padding: '1px 8px', borderRadius: 4, border: '1px solid var(--border-light)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {videoData.ageRating}
                </span>
              )}
            </div>

            {/* Genres */}
            {videoData.genres?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {videoData.genres.map((g) => (
                  <Link key={g._id} to={`/browse?genre=${g._id}`} style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.25)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, transition: 'background 0.15s' }}>
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Description */}
            {videoData.description && (
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                {videoData.description}
              </p>
            )}

            {/* Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', fontSize: 14 }}>
              {videoData.director && (
                <>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Director</span>
                  <span>{videoData.director}</span>
                </>
              )}
              {videoData.cast?.length > 0 && (
                <>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Cast</span>
                  <span>{videoData.cast.join(', ')}</span>
                </>
              )}
              {videoData.tags?.length > 0 && (
                <>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Tags</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {videoData.tags.map((t) => (
                      <span key={t} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{t}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div style={{ marginTop: 24, padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Keyboard Shortcuts</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px 16px', fontSize: 12 }}>
              {[
                ['Space / K', 'Play / Pause'],
                ['← / →', 'Seek ±10s'],
                ['↑ / ↓', 'Volume ±10%'],
                ['M', 'Toggle Mute'],
                ['F', 'Fullscreen'],
                ['J / L', 'Seek ±10s'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', color: 'var(--accent)', fontSize: 11, flexShrink: 0 }}>{key}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Related Videos */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>More to Watch</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!relatedData
              ? Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={i} />)
              : relatedData.videos
                  .filter((v: any) => v.slug !== slug)
                  .slice(0, 6)
                  .map((v: any) => (
                    <Link key={v._id} to={`/watch/${v.slug}`} style={{ display: 'flex', gap: 12, borderRadius: 10, overflow: 'hidden', transition: 'background 0.15s', padding: 6, margin: -6 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: 120, height: 68, borderRadius: 8, overflow: 'hidden', background: 'var(--surface2)', flexShrink: 0, position: 'relative' }}>
                        {v.poster ? <img src={v.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--surface2), var(--surface3))' }} />}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden', paddingTop: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{v.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.releaseYear}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{v.views?.toLocaleString()} views</div>
                      </div>
                    </Link>
                  ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
