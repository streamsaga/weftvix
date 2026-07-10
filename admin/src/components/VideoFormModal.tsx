import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Upload, Check, Loader2, Film, Image, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface VideoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial: any | null;
  onSuccess: () => void;
}

interface UploadProgress {
  stage: 'idle' | 'uploading' | 'done' | 'error';
  pct: number;
  url: string;
  key: string;
}

const emptyProgress: UploadProgress = { stage: 'idle', pct: 0, url: '', key: '' };

/**
 * Upload a file directly to R2 via presigned PUT URL.
 * Handles multipart chunking for large files via the browser's native XHR.
 */
async function uploadToR2(
  file: File,
  kind: string,
  onProgress: (pct: number) => void
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);

  const res = await api.post(`/uploads/asset`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (e) => {
      if (e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });

  const { url, key } = res.data.data;
  return { url, key };
}

export default function VideoFormModal({ isOpen, onClose, initial, onSuccess }: VideoFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseYear, setReleaseYear] = useState(new Date().getFullYear());
  const [duration, setDuration] = useState(0);
  const [ageRating, setAgeRating] = useState('NR');
  const [director, setDirector] = useState('');
  const [castStr, setCastStr] = useState('');
  const [language, setLanguage] = useState('English');
  const [tags, setTags] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [videoProg, setVideoProg] = useState<UploadProgress>(emptyProgress);
  const [posterProg, setPosterProg] = useState<UploadProgress>(emptyProgress);
  const [bannerProg, setBannerProg] = useState<UploadProgress>(emptyProgress);

  const videoRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const { data: genresData } = useQuery({ queryKey: ['genres'], queryFn: () => api.get('/genres').then((r) => r.data.data) });
  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data.data) });

  // Populate form when editing
  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '');
      setDescription(initial.description || '');
      setReleaseYear(initial.releaseYear || new Date().getFullYear());
      setDuration(initial.duration || 0);
      setAgeRating(initial.ageRating || 'NR');
      setDirector(initial.director || '');
      setCastStr((initial.cast || []).join(', '));
      setLanguage(initial.language || 'English');
      setTags((initial.tags || []).join(', '));
      setSelectedGenres((initial.genres || []).map((g: any) => g._id || g));
      setSelectedCategories((initial.categories || []).map((c: any) => c._id || c));
      setVideoProg({ stage: initial.videoUrl || initial.hlsMasterPlaylistUrl ? 'done' : 'idle', pct: 100, url: initial.videoUrl || initial.hlsMasterPlaylistUrl || '', key: initial.rawVideoKey || '' });
      setPosterProg({ stage: initial.poster ? 'done' : 'idle', pct: 100, url: initial.poster || '', key: '' });
      setBannerProg({ stage: initial.banner ? 'done' : 'idle', pct: 100, url: initial.banner || '', key: '' });
    } else {
      // Reset
      setTitle(''); setDescription(''); setReleaseYear(new Date().getFullYear());
      setDuration(0); setAgeRating('NR'); setDirector(''); setCastStr('');
      setLanguage('English'); setTags(''); setSelectedGenres([]); setSelectedCategories([]);
      setVideoProg(emptyProgress); setPosterProg(emptyProgress); setBannerProg(emptyProgress);
    }
  }, [initial, isOpen]);

  const handleFileUpload = async (
    file: File,
    kind: string,
    setProgress: (p: UploadProgress) => void
  ) => {
    setProgress({ stage: 'uploading', pct: 0, url: '', key: '' });
    try {
      const { url, key } = await uploadToR2(file, kind, (pct) => {
        setProgress({ stage: 'uploading', pct, url: '', key: '' });
      });
      setProgress({ stage: 'done', pct: 100, url, key });
      toast.success(`${kind} uploaded!`);
    } catch (err: any) {
      setProgress({ stage: 'error', pct: 0, url: '', key: '' });
      toast.error(`Upload failed: ${err.message}`);
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!title) throw new Error('Title is required');

      const payload = {
        title,
        description,
        releaseYear,
        duration,
        ageRating,
        director,
        cast: castStr.split(',').map((s) => s.trim()).filter(Boolean),
        language,
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
        genres: selectedGenres,
        categories: selectedCategories,
        videoUrl: videoProg.url || undefined,
        hlsMasterPlaylistUrl: videoProg.url?.includes('.m3u8') ? videoProg.url : undefined,
        rawVideoKey: videoProg.key || undefined,
        poster: posterProg.url || undefined,
        banner: bannerProg.url || undefined,
      };

      if (initial) {
        return api.put(`/videos/${initial._id}`, payload);
      } else {
        return api.post('/videos', payload);
      }
    },
    onSuccess: () => {
      toast.success(initial ? 'Video updated!' : 'Video created!');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Save failed');
    },
  });

  if (!isOpen) return null;

  const isUploading = [videoProg, posterProg, bannerProg].some((p) => p.stage === 'uploading');

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 680 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 18 }}>{initial ? 'Edit Video' : 'Add New Video'}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{initial ? 'Update video details and assets' : 'Upload a new video to your library'}</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upload Zone: Video */}
          <UploadZone
            label="Video File"
            icon={<Film size={20} />}
            accept="video/*"
            prog={videoProg}
            inputRef={videoRef}
            hint="MP4, MOV, WebM — any size"
            color="var(--accent)"
            onChange={(file) => handleFileUpload(file, 'video', setVideoProg)}
          />

          {/* Upload Zone: Poster + Banner side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <UploadZone
              label="Poster"
              icon={<Image size={18} />}
              accept="image/*"
              prog={posterProg}
              inputRef={posterRef}
              hint="JPG, PNG, WebP"
              color="#f687b3"
              onChange={(file) => handleFileUpload(file, 'poster', setPosterProg)}
            />
            <UploadZone
              label="Banner"
              icon={<Image size={18} />}
              accept="image/*"
              prog={bannerProg}
              inputRef={bannerRef}
              hint="JPG, PNG, WebP"
              color="#68d391"
              onChange={(file) => handleFileUpload(file, 'banner', setBannerProg)}
            />
          </div>

          {/* Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div>
              <label className="label">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Enter video title" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" style={{ minHeight: 72, resize: 'vertical' }} placeholder="Brief description…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Release Year</label>
                <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(+e.target.value)} className="input" min={1900} max={2099} />
              </div>
              <div>
                <label className="label">Duration (min)</label>
                <input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} className="input" min={0} />
              </div>
              <div>
                <label className="label">Age Rating</label>
                <select value={ageRating} onChange={(e) => setAgeRating(e.target.value)} className="input">
                  {['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Director</label>
                <input value={director} onChange={(e) => setDirector(e.target.value)} className="input" placeholder="Director name" />
              </div>
              <div>
                <label className="label">Language</label>
                <input value={language} onChange={(e) => setLanguage(e.target.value)} className="input" placeholder="English" />
              </div>
            </div>
            <div>
              <label className="label">Cast (comma separated)</label>
              <input value={castStr} onChange={(e) => setCastStr(e.target.value)} className="input" placeholder="Actor One, Actor Two, …" />
            </div>
            <div>
              <label className="label">Tags (comma separated)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="input" placeholder="action, thriller, …" />
            </div>

            {/* Genres multi-select */}
            <MultiSelect
              label="Genres"
              options={(genresData || []).map((g: any) => ({ id: g._id, name: g.name }))}
              selected={selectedGenres}
              onChange={setSelectedGenres}
            />

            {/* Categories multi-select */}
            <MultiSelect
              label="Categories"
              options={(catsData || []).map((c: any) => ({ id: c._id, name: c.name }))}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={() => saveMut.mutate()}
            className="btn btn-primary"
            disabled={saveMut.isPending || isUploading || !title}
          >
            {saveMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {initial ? 'Save Changes' : 'Create Video'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UploadZone Component ────────────────────────────────────────────────────
function UploadZone({
  label, icon, accept, prog, inputRef, hint, color, onChange
}: {
  label: string;
  icon: React.ReactNode;
  accept: string;
  prog: UploadProgress;
  inputRef: React.RefObject<HTMLInputElement | null>;
  hint: string;
  color: string;
  onChange: (file: File) => void;
}) {
  const isDone = prog.stage === 'done';
  const isUploading = prog.stage === 'uploading';
  const isError = prog.stage === 'error';

  return (
    <div>
      <label className="label">{label}</label>
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDone ? color : isError ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: '16px 20px',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          background: isDone ? `${color}08` : 'var(--surface2)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
        onMouseEnter={(e) => { if (!isDone && !isUploading) (e.currentTarget as HTMLElement).style.borderColor = color; }}
        onMouseLeave={(e) => { if (!isDone && !isUploading) (e.currentTarget as HTMLElement).style.borderColor = isError ? 'var(--danger)' : 'var(--border)'; }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : isDone ? <Check size={18} /> : icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isUploading ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Uploading to R2… {prog.pct}%</div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${prog.pct}%` }} /></div>
            </>
          ) : isDone ? (
            <div style={{ fontSize: 13, color, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✓ {prog.url ? decodeURIComponent(prog.url.split('/').pop() || 'Uploaded') : 'Uploaded'}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Click to select {label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>
            </>
          )}
        </div>
        {isDone && (
          <button
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            Replace
          </button>
        )}
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}

// ─── MultiSelect Component ───────────────────────────────────────────────────
function MultiSelect({
  label, options, selected, onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div>
      <label className="label">{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid',
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'rgba(229,9,20,0.15)' : 'var(--surface2)',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.name}
            </button>
          );
        })}
        {options.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>No {label.toLowerCase()} created yet</span>}
      </div>
    </div>
  );
}
