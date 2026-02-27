'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className=min-h-screen flex items-center justify-center bg-gray-50>
      <div className=max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center>
        <h2 className=text-2xl font-bold text-gray-900 mb-4>
          出错了
        </h2>
        <p className=text-gray-600 mb-6>
          {error?.message || '页面加载时发生错误'}
        </p>
        
        <div className=flex gap-4 justify-center>
          <button
            onClick={() => reset()}
            className=px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors
          >
            重试
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className=px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
