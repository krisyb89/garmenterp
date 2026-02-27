// src/app/(dashboard)/dashboard/admin/users/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MERCHANDISER', label: 'Merchandiser' },
  { value: 'PRODUCTION_MANAGER', label: 'Production Manager' },
  { value: 'SOURCING_BUYER', label: 'Sourcing Buyer' },
  { value: 'QC_MANAGER', label: 'QC Manager' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'PACKING', label: 'Packing' },
];

const roleBadgeColor = (role) => {
  const map = {
    ADMIN: 'bg-red-100 text-red-700',
    MERCHANDISER: 'bg-blue-100 text-blue-700',
    FINANCE: 'bg-green-100 text-green-700',
    MANAGEMENT: 'bg-purple-100 text-purple-700',
    PRODUCTION_MANAGER: 'bg-amber-100 text-amber-700',
    QC_MANAGER: 'bg-teal-100 text-teal-700',
    SHIPPING: 'bg-cyan-100 text-cyan-700',
    WAREHOUSE: 'bg-orange-100 text-orange-700',
    PACKING: 'bg-pink-100 text-pink-700',
    SOURCING_BUYER: 'bg-indigo-100 text-indigo-700',
  };
  return map[role] || 'bg-gray-100 text-gray-700';
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'MERCHANDISER', phone: '' });
  // Edit form
  const [editForm, setEditForm] = useState({});

  function loadUsers() {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '', role: 'MERCHANDISER', phone: '' });
      loadUsers();
    } catch {
      setError('Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...editForm };
      // Only send password if provided
      if (!payload.password) delete payload.password;
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      setEditingUser(null);
      loadUsers();
    } catch {
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) loadUsers();
    else {
      const data = await res.json();
      setError(data.error || 'Failed to update user');
    }
  }

  function startEdit(u) {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || '', password: '' });
    setShowCreate(false);
    setError('');
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle="Add users and assign roles" />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Create / Edit Form */}
      {(showCreate || editingUser) && (
        <div className="card mb-6 max-w-2xl">
          <h2 className="font-semibold mb-4">{editingUser ? `Edit: ${editingUser.name}` : 'Create New User'}</h2>
          <form onSubmit={editingUser ? handleEdit : handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Full Name *</label>
                <input
                  className="input-field"
                  required
                  value={editingUser ? editForm.name : createForm.name}
                  onChange={e => editingUser ? setEditForm({ ...editForm, name: e.target.value }) : setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Email *</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  value={editingUser ? editForm.email : createForm.email}
                  onChange={e => editingUser ? setEditForm({ ...editForm, email: e.target.value }) : setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">{editingUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input
                  className="input-field"
                  type="password"
                  {...(!editingUser ? { required: true } : {})}
                  minLength={6}
                  placeholder={editingUser ? '(unchanged)' : 'Min 6 characters'}
                  value={editingUser ? editForm.password : createForm.password}
                  onChange={e => editingUser ? setEditForm({ ...editForm, password: e.target.value }) : setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Role *</label>
                <select
                  className="select-field"
                  value={editingUser ? editForm.role : createForm.role}
                  onChange={e => editingUser ? setEditForm({ ...editForm, role: e.target.value }) : setCreateForm({ ...createForm, role: e.target.value })}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Phone</label>
                <input
                  className="input-field"
                  value={editingUser ? editForm.phone : createForm.phone}
                  onChange={e => editingUser ? setEditForm({ ...editForm, phone: e.target.value }) : setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowCreate(false); setEditingUser(null); setError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add User Button */}
      {!showCreate && !editingUser && (
        <button onClick={() => { setShowCreate(true); setError(''); }} className="btn-primary mb-4">+ Add User</button>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleBadgeColor(u.role)}`}>
                      {ROLES.find(r => r.value === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(u)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                      <button onClick={() => toggleActive(u)} className={`text-sm font-medium ${u.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
