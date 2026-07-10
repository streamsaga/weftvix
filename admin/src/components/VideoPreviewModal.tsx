import { X } from 'lucide-react';
import StreamPlayer from './StreamPlayer';

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

export default function VideoPreviewModal({ url, title, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#000', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 900, boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 0 }}>
          <StreamPlayer src={url} title={title} />
        </div>
      </div>
    </div>
  );
}
