// src/components/PageHeader.js
import Link from 'next/link';

export default function PageHeader({ title, subtitle, action, children }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {action && (
          <Link href={action.href} className="btn-primary">
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
