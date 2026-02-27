// src/app/global-error.js
'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#dc2626', marginBottom: 16 }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>{error?.message || 'An unexpected error occurred'}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              onClick={() => reset()}
              style={{ background: '#2563eb', color: '#fff', padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#6b7280', color: '#fff', padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
            >
              Hard Reload
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ background: '#059669', color: '#fff', padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
