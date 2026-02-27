// src/app/not-found.js
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>Page Not Found</h2>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>The page you are looking for does not exist.</p>
      <Link href="/dashboard" style={{ color: '#2563eb' }}>Go to Dashboard</Link>
    </div>
  );
}
