// src/components/ImageUploader.js
'use client';
import { useState, useRef } from 'react';

export default function ImageUploader({ images = [], onChange, maxImages = 10 }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('file', f));
      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      const data = await res.json();
      const urls = Array.isArray(data) ? data.map(d => d.url) : [data.url];
      onChange([...images, ...urls]);
    } catch { alert('Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  function remove(idx) { onChange(images.filter((_, i) => i !== idx)); }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-2">
        {images.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
        ))}
        {images.length < maxImages && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm">
            {uploading ? <span className="animate-pulse">...</span> : <>📷<span className="text-xs mt-1">Add</span></>}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      {images.length > 0 && <p className="text-xs text-gray-400">{images.length}/{maxImages} images</p>}
    </div>
  );
}
