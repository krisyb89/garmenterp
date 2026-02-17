'use client';

import { useState, useRef } from 'react';

export default function ImageUploader({ images = [], onChange, maxImages = 10 }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) return;
    const toUpload = files.slice(0, remaining);

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
      onChange([...images, ...uploaded.map(u => u.url)]);
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(index) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}

        {uploading && (
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center bg-blue-50">
            <div className="text-xs text-blue-500 text-center">Uploading...</div>
          </div>
        )}

        {images.length < maxImages && !uploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="text-gray-400 text-sm text-center leading-tight">+ Add<br/>Image</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
