// src/components/FileUploader.js
'use client';
import { useState, useRef } from 'react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const ICONS = { pdf: '📄', xlsx: '📊', xls: '📊', doc: '📝', docx: '📝', ai: '🎨', psd: '🎨' };

export default function FileUploader({ files = [], onChange, maxFiles = 20 }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function handleFiles(e) {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    if (files.length + selected.length > maxFiles) { alert(`Maximum ${maxFiles} files`); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      selected.forEach(f => formData.append('file', f));
      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      const data = await res.json();
      const newFiles = Array.isArray(data) ? data : [data];
      onChange([...files, ...newFiles]);
    } catch { alert('Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  function remove(idx) { onChange(files.filter((_, i) => i !== idx)); }

  function getIcon(name) {
    const ext = (name || '').split('.').pop().toLowerCase();
    return ICONS[ext] || '📎';
  }

  return (
    <div>
      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span>{getIcon(f.originalName)}</span>
              <a href={f.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline flex-1 truncate">{f.originalName}</a>
              <span className="text-gray-400 text-xs">{formatSize(f.size)}</span>
              <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="btn-secondary text-xs">
        {uploading ? 'Uploading...' : '+ Attach File'}
      </button>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles}
        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.xlsx,.xls,.doc,.docx,.ai,.psd" />
    </div>
  );
}
