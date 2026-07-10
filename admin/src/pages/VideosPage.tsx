import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Star, TrendingUp, Eye, EyeOff, Play, Upload, X, Check, Loader2, AlertTriangle, Film } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import VideoPreviewModal from '../components/VideoPreviewModal';
import VideoFormModal from '../components/VideoFormModal';

interface Video {
  _id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'processing';
  poster: string;
  videoUrl: string;
  hlsMasterPlaylistUrl: string;
  isFeatured: boolean;
  isTrending: boolean;
  views: number;
  releaseYear: number;
  duration: number;
  createdAt: string;
}

export default function VideosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState<Video | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', page, search],
    queryFn: () => api.get(`/videos?page=${page}&limit=15${search ? `&search=${encodeURIComponent(search)}` : ''}`).then((r) => r.data.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-videos'] });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/videos/${id}`),
    onSuccess: () => { toast.success('Video deleted'); setDeleting(null); invalidate(); },
    onError: () => toast.error('Delete failed'),
  });

  const publishMut = useMutation({
    mutationFn: (id: string) => api.patch(`/videos/${id}/publish`),
    onSuccess: invalidate,
  });

  const featuredMut = useMutation({
    mutationFn: (id: string) => api.patch(`/videos/${id}/featured`),
    onSuccess: invalidate,
  });

  const trendingMut = useMutation({
    mutationFn: (id: string) => api.patch(`/videos/${id}/trending`),
    onSuccess: invalidate,
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>Videos</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {data?.pagination?.total ?? 0} videos in library
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="btn btn-primary"
          style={{ gap: 8 }}
        >
          <Plus size={16} />
          Add Video
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search videos…"
          className="input"
          style={{ paddingLeft: 38 }}
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Year</th>
              <th>Status</th>
              <th>Views</th>
              <th>Flags</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin" /></div>
              </td></tr>
            )}
            {!isLoading && data?.videos?.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <Film size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <div>No videos yet. Click "Add Video" to upload your first video.</div>
              </td></tr>
            )}
            {data?.videos?.map((video: Video) => (
              <tr key={video._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {video.poster
                      ? <img src={video.poster} alt="" style={{ width: 44, height: 28, objectFit: 'cover', borderRadius: 6 }} />
                      : <div style={{ width: 44, height: 28, background: 'var(--surface3)', borderRadius: 6 }} />}
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{video.title}</span>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 13 }}>{video.releaseYear}</td>
                <td>
                  <span className={`badge badge-${video.status}`}>{video.status}</span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)' }}>{video.views.toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button title="Toggle Featured" onClick={() => featuredMut.mutate(video._id)} className="btn-icon" style={{ color: video.isFeatured ? 'var(--warning)' : 'var(--text-muted)' }}>
                      <Star size={15} fill={video.isFeatured ? 'currentColor' : 'none'} />
                    </button>
                    <button title="Toggle Trending" onClick={() => trendingMut.mutate(video._id)} className="btn-icon" style={{ color: video.isTrending ? 'var(--live)' : 'var(--text-muted)' }}>
                      <TrendingUp size={15} />
                    </button>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <button
                      title="Preview"
                      disabled={!video.hlsMasterPlaylistUrl && !video.videoUrl}
                      onClick={() => setPreview({ url: video.hlsMasterPlaylistUrl || video.videoUrl, title: video.title })}
                      className="btn-icon"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Play size={15} fill="currentColor" />
                    </button>
                    <button title={video.status === 'published' ? 'Unpublish' : 'Publish'} onClick={() => publishMut.mutate(video._id)} className="btn-icon">
                      {video.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button title="Edit" onClick={() => { setEditing(video); setFormOpen(true); }} className="btn-icon">
                      <Pencil size={15} />
                    </button>
                    <button title="Delete" onClick={() => setDeleting(video)} className="btn-icon" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
            {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid', borderColor: p === page ? 'var(--accent)' : 'var(--border)', background: p === page ? 'var(--accent)' : 'transparent', color: p === page ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      {deleting && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420, padding: 32 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(252,129,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} color="var(--danger)" />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Video</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                  Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>"{deleting.title}"</strong>? This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setDeleting(null)} className="btn btn-secondary btn-sm">Cancel</button>
                  <button onClick={() => deleteMut.mutate(deleting._id)} className="btn btn-danger btn-sm" disabled={deleteMut.isPending}>
                    {deleteMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Form Modal */}
      <VideoFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing}
        onSuccess={() => { setFormOpen(false); setEditing(null); invalidate(); }}
      />

      {/* Preview Modal */}
      {preview && (
        <VideoPreviewModal
          url={preview.url}
          title={preview.title}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
