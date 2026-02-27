// src/components/ImageUploader.js
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

export default function ImageUploader({ images = [], onChange, maxImages = 10 }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Keep a ref to latest images + onChange so the paste handler never goes stale
  const imagesRef = useRef(images);
  const onChangeRef = useRef(onChange);
  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const uploadFiles = useCallback(async (files) => {
    if (!files.length) return;
    const current = imagesRef.current;
    if (current.length + files.length > maxImages) {
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
      onChangeRef.current([...imagesRef.current, ...urls]);
    } catch { alert('Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }, [maxImages]);

  // Global paste handler — Ctrl+V / ⌘+V anywhere on the page uploads images
  useEffect(() => {
    async function handlePaste(e) {
      if (!e.clipboardData) return;
      const imageFiles = Array.from(e.clipboardData.items)
        .filter(item => item.type.startsWith('image/'))
        .map(item => item.getAsFile())
        .filter(Boolean);
      if (!imageFiles.length) return;
      e.preventDefault();
      await uploadFiles(imageFiles);
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [uploadFiles]);

  async function handleFileInput(e) {
    await uploadFiles(Array.from(e.target.files));
  }

  function remove(idx) { onChange(images.filter((_, i) => i !== idx)); }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-2">
        {images.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden group shadow-sm">
            <img src={url} alt="" className="w-full h-full object-contain bg-gray-100" />
            <button type="button" onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
        ))}
        {images.length < maxImages && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm gap-1">
            {uploading
              ? <span className="text-xs animate-pulse">Uploading…</span>
              : <><span className="text-xl">📷</span><span className="text-xs">Add photo</span></>}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
      <p className="text-xs text-gray-400 mt-1">
        {images.length > 0 ? `${images.length}/${maxImages} images` : ''}
        {images.length < maxImages && (images.length > 0 ? ' · ' : '') + 'Paste with ⌘V / Ctrl+V'}
      </p>
    </div>
  );
}
