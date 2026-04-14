import React, { useState, useEffect } from 'react';
import { Users, Edit, X, Save, Loader2, RefreshCw } from 'lucide-react';
import { AdminUser } from '../../types';
import { getAdminUsers, updateAdminUser, syncUsers } from '../../services/adminService';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editCredits, setEditCredits] = useState('');
  const [editMaxInvitations, setEditMaxInvitations] = useState('');
  const [editGenerationCredits, setEditGenerationCredits] = useState('');
  const [editMaxGenerationCredits, setEditMaxGenerationCredits] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
    handleSync();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getAdminUsers();
      setUsers(response.users);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncUsers();
      await loadUsers();
    } catch (error) {
      console.error('Error syncing users:', error);
    } finally {
      setSyncing(false);
    }
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setEditCredits(user.iteration_credits.toString());
    setEditMaxInvitations(user.max_invitations?.toString() || '20');
    setEditGenerationCredits(user.generation_credits?.toString() || '10');
    setEditMaxGenerationCredits(user.max_generation_credits?.toString() || '10');
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    try {
      await updateAdminUser(editingUser.user_id, {
        iteration_credits: parseInt(editCredits),
        max_invitations: parseInt(editMaxInvitations),
        generation_credits: parseInt(editGenerationCredits),
        max_generation_credits: parseInt(editMaxGenerationCredits)
      });
      await loadUsers();
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
        <span className="ml-2 text-gray-500">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Usuarios Registrados</h2>
            <p className="text-sm text-gray-500">{users.length} usuarios en el sistema</p>
          </div>
        </div>
        
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar desde Laravel'}
        </button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-pink-100">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nombre</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Invitaciones</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Créditos Iter.</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Créditos Gen.</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Restantes</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Máx Inv.</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="border-b border-pink-50 hover:bg-pink-50/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">{user.name || 'Sin nombre'}</td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-500">{user.user_id}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.invitations_count}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.iteration_credits}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.generation_credits ?? 10}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.invitations_remaining || 0}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.max_invitations || 20}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{user.created_at}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Editar Usuario #{editingUser.user_id}</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Créditos de Iteración</label>
                <input
                  type="number"
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  className="w-full px-4 py-2 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Invitaciones</label>
                <input
                  type="number"
                  value={editMaxInvitations}
                  onChange={(e) => setEditMaxInvitations(e.target.value)}
                  className="w-full px-4 py-2 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Créditos de Generación</label>
                <input
                  type="number"
                  value={editGenerationCredits}
                  onChange={(e) => setEditGenerationCredits(e.target.value)}
                  className="w-full px-4 py-2 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Créditos de Generación</label>
                <input
                  type="number"
                  value={editMaxGenerationCredits}
                  onChange={(e) => setEditMaxGenerationCredits(e.target.value)}
                  className="w-full px-4 py-2 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                disabled={saving}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};