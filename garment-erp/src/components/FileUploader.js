'use client';

import { useState, useRef } from 'react';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const icons = { pdf: '📄', xlsx: '📊', xls: '📊', doc: '📝', docx: '📝', ai: '🎨', psd: '🎨' };
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return '🖼️';
  return icons[ext] || '📎';
}

export default function FileUploader({ files = [], onChange, maxFiles = 20 }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFileSelect(e) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const remaining = maxFiles - files.length;
    if (remaining <= 0) return;
    const toUpload = selected.slice(0, remaining);

    setUploading(true);
    try {
      const formData = new FormData();
      toUpload.forEach(f => formData.append('file', f));

      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Upload failed');
        return;
      }
      const uploaded = await res.json();
      onChange([...files, ...uploaded]);
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeFile(index) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm group">
              <span className="text-lg">{getFileIcon(file.originalName)}</span>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1">
                {file.originalName}
              </a>
              <span className="text-gray-400 text-xs whitespace-nowrap">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-sm text-blue-500 mb-2">Uploading...</div>
      )}

      {files.length < maxFiles && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Attach File
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.xlsx,.xls,.doc,.docx,.ai,.psd"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
