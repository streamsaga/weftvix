import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={12} fill="white" color="white" />
        </div>
        <span className="footer-brand" style={{ letterSpacing: '0.08em' }}>Weft<span style={{ color: 'var(--accent)' }}>Vix</span></span>
      </div>
      <div className="footer-copy">
        Free to watch — No account required.
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
        © {new Date().getFullYear()} WeftVix
      </div>
    </footer>
  );
}
