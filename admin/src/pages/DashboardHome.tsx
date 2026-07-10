import { useQuery } from '@tanstack/react-query';
import { Film, Eye, Tag, Layers, TrendingUp, Star } from 'lucide-react';
import api from '../lib/api';

interface DashStats {
  totalVideos: number;
  publishedVideos: number;
  draftVideos: number;
  totalGenres: number;
  totalCategories: number;
  totalViews: number;
}

interface DashData {
  stats: DashStats;
  recentVideos: any[];
  topVideos: any[];
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text)', lineHeight: 1 }}>{value.toLocaleString()}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { data, isLoading } = useQuery<DashData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Overview of your Weftvix library</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon={Film} label="Total Videos" value={stats?.totalVideos ?? 0} color="var(--accent)" />
        <StatCard icon={Eye} label="Published" value={stats?.publishedVideos ?? 0} color="var(--success)" />
        <StatCard icon={Film} label="Drafts" value={stats?.draftVideos ?? 0} color="var(--warning)" />
        <StatCard icon={TrendingUp} label="Total Views" value={stats?.totalViews ?? 0} color="var(--info)" />
        <StatCard icon={Tag} label="Genres" value={stats?.totalGenres ?? 0} color="#f687b3" />
        <StatCard icon={Layers} label="Categories" value={stats?.totalCategories ?? 0} color="#68d391" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Videos */}
        <div className="dashboard-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Film size={16} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Recent Uploads</span>
          </div>
          <div>
            {data?.recentVideos.map((v) => (
              <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                {v.poster ? <img src={v.poster} alt="" style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 36, height: 24, background: 'var(--surface2)', borderRadius: 4 }} />}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.views.toLocaleString()} views</div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: v.status === 'published' ? 'rgba(72,187,120,0.12)' : 'rgba(246,173,85,0.12)', color: v.status === 'published' ? 'var(--success)' : 'var(--warning)', fontWeight: 600, textTransform: 'uppercase' }}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Videos */}
        <div className="dashboard-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} color="var(--warning)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Most Viewed</span>
          </div>
          <div>
            {data?.topVideos.map((v, i) => (
              <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? 'var(--accent)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i === 0 ? '#fff' : 'var(--text-muted)', flexShrink: 0 }}>{i + 1}</div>
                {v.poster ? <img src={v.poster} alt="" style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 36, height: 24, background: 'var(--surface2)', borderRadius: 4 }} />}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.views.toLocaleString()} views</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
