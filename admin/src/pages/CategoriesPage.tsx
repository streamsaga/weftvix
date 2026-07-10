import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function CategoriesPage() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data.data) });

  const createMut = useMutation({
    mutationFn: () => api.post('/categories', { name, description: desc }),
    onSuccess: () => { toast.success('Category created'); setName(''); setDesc(''); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: () => toast.error('Failed to create category'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['categories'] }); },
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700 }}>Categories</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Organize videos into sections</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 600 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Category name" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input" placeholder="Description (optional)" />
        <button onClick={() => name && createMut.mutate()} className="btn btn-primary" disabled={!name || createMut.isPending} style={{ whiteSpace: 'nowrap' }}>
          {createMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Description</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {(data || []).map((c: any) => (
                <tr key={c._id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={15} color="var(--accent)" /><span style={{ fontWeight: 500 }}>{c.name}</span></div></td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{c.slug}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.description || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => deleteMut.mutate(c._id)} className="btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No categories yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
