// src/components/DataTable.js
'use client';

import Link from 'next/link';

export default function DataTable({ columns, data, linkPrefix, emptyMessage = 'No records found.' }) {
  if (!data || data.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : {}}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i} className="cursor-pointer">
                {columns.map((col) => (
                  <td key={col.key}>
                    {linkPrefix && col.isLink ? (
                      <Link
                        href={`${linkPrefix}/${row.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </Link>
                    ) : col.render ? (
                      col.render(row)
                    ) : (
                      row[col.key] ?? '—'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
