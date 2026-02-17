// src/app/(dashboard)/dashboard/customers/new/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.paymentTermDays = parseInt(data.paymentTermDays) || 60;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error); return; }
      router.push('/dashboard/customers');
    } catch (err) {
      setError('Failed to create customer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Customer" subtitle="Add a new customer account" />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Customer Name *</label>
            <input name="name" className="input-field" required />
          </div>
          <div>
            <label className="label-field">Code * (e.g., NK)</label>
            <input name="code" className="input-field" required maxLength={10} style={{ textTransform: 'uppercase' }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Contact Person</label>
            <input name="contactPerson" className="input-field" />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input name="email" type="email" className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Phone</label>
            <input name="phone" className="input-field" />
          </div>
          <div>
            <label className="label-field">Country</label>
            <input name="country" className="input-field" />
          </div>
        </div>

        <div>
          <label className="label-field">Address</label>
          <textarea name="address" className="input-field" rows={2} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label-field">Currency</label>
            <select name="currency" className="select-field" defaultValue="USD">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="HKD">HKD</option>
              <option value="CNY">CNY</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          <div>
            <label className="label-field">Payment Terms (days)</label>
            <input name="paymentTermDays" type="number" className="input-field" defaultValue={60} />
          </div>
          <div>
            <label className="label-field">Terms Basis</label>
            <select name="paymentTermBasis" className="select-field" defaultValue="ROG">
              <option value="ROG">ROG (Receipt of Goods)</option>
              <option value="BL_DATE">B/L Date</option>
              <option value="INVOICE_DATE">Invoice Date</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label-field">Notes</label>
          <textarea name="notes" className="input-field" rows={3} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
