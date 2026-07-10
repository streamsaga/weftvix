import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function GenresPage() {
  const [name, setName] = useState('');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['genres'], queryFn: () => api.get('/genres').then((r) => r.data.data) });

  const createMut = useMutation({
    mutationFn: () => api.post('/genres', { name }),
    onSuccess: () => { toast.success('Genre created'); setName(''); qc.invalidateQueries({ queryKey: ['genres'] }); },
    onError: () => toast.error('Failed to create genre'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/genres/${id}`),
    onSuccess: () => { toast.success('Genre deleted'); qc.invalidateQueries({ queryKey: ['genres'] }); },
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700 }}>Genres</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Manage video genres for filtering</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 480 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Genre name (e.g. Action, Drama)" onKeyDown={(e) => e.key === 'Enter' && name && createMut.mutate()} />
        <button onClick={() => name && createMut.mutate()} className="btn btn-primary" disabled={!name || createMut.isPending}>
          {createMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {(data || []).map((g: any) => (
            <div key={g._id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
              <Tag size={13} color="var(--accent)" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</span>
              <button onClick={() => deleteMut.mutate(g._id)} className="btn-icon" style={{ padding: 2, color: 'var(--text-muted)' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {data?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No genres yet</p>}
        </div>
      )}
    </div>
  );
}
