import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronRight, CreditCard, Gift, RefreshCw, Loader2, Zap, Layers, Database, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { AdminUser } from '../../types';
import { getAdminUsers, syncUsers } from '../../services/adminService';
import { AdminBackup } from './AdminBackup';

const API = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/api`;
const adminHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const PlanBadge: React.FC<{ slug: string }> = ({ slug }) => {
  const colors: Record<string, string> = {
    premium: 'bg-purple-100 text-purple-700 border-purple-200',
    catalogo: 'bg-blue-100 text-blue-700 border-blue-200',
    creativa: 'bg-pink-100 text-pink-700 border-pink-200',
    basic: 'bg-gray-100 text-gray-700 border-gray-200',
    standard: 'bg-green-100 text-green-700 border-green-200',
  };
  const colorClass = colors[slug] || 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {slug}
    </span>
  );
};

const UsageBar: React.FC<{ used: number; total: number; label: string }> = ({ used, total, label }) => {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const barColor = pct >= 100 ? 'bg-red-400' : pct >= 75 ? 'bg-yellow-400' : 'bg-pink-400';
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <span className="text-xs text-gray-500 w-16 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-600 w-12 text-right">{used}/{total}</span>
    </div>
  );
};

type SubTab = 'users' | 'backup';

// ---------------------------------------------------------------------------
// EDITOR DE PLANES POR USUARIO: crear, editar créditos y eliminar planes
// ---------------------------------------------------------------------------
const UserPlansEditor: React.FC<{
  userId: string;
  plans: any[];
  onChanged: () => void;
}> = ({ userId, plans, onChanged }) => {
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newPlan, setNewPlan] = useState({ plan_slug: 'creativa', generation_credits: 7, iteration_credits: 14, invites_included: 1 });
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const startEdit = (plan: any) => {
    setEditing(plan.purchase_id);
    setEditValues({
      generation_credits: plan.generation_credits,
      generation_used: plan.generation_used,
      iteration_credits: plan.iteration_credits,
      iteration_used: plan.iteration_used,
      invites_included: plan.invites_included,
      invites_used: plan.invites_used,
    });
  };

  const saveEdit = async (purchaseId: number) => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/users/${userId}/plans/${purchaseId}`, { method: 'PUT', headers: adminHeaders(), body: JSON.stringify(editValues) });
      if (!r.ok) throw new Error('Error al guardar');
      setEditing(null);
      onChanged();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  const deletePlan = async (purchaseId: number) => {
    if (!confirm('¿Eliminar este plan del usuario?')) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/users/${userId}/plans/${purchaseId}`, { method: 'DELETE', headers: adminHeaders() });
      if (!r.ok) throw new Error('Error al eliminar');
      onChanged();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  const addPlan = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/users/${userId}/plans`, { method: 'POST', headers: adminHeaders(), body: JSON.stringify(newPlan) });
      if (!r.ok) { const j = await r.json(); throw new Error(j.error || 'Error'); }
      setShowAdd(false);
      onChanged();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  const inputCls = 'w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-pink-300';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Planes del usuario</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-600 border border-pink-200 rounded-lg text-xs font-medium hover:bg-pink-100"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar plan
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border-2 border-pink-200 p-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Plan</span>
            <select
              value={newPlan.plan_slug}
              onChange={(e) => setNewPlan({ ...newPlan, plan_slug: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="creativa">Creativa</option>
              <option value="premium">Premium</option>
              <option value="catalogo">Catálogo</option>
              <option value="basic">Básico</option>
              <option value="standard">Estándar</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Gen.</span>
            <input type="number" min="0" value={newPlan.generation_credits} onChange={(e) => setNewPlan({ ...newPlan, generation_credits: +e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Iter.</span>
            <input type="number" min="0" value={newPlan.iteration_credits} onChange={(e) => setNewPlan({ ...newPlan, iteration_credits: +e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Inv.</span>
            <input type="number" min="0" value={newPlan.invites_included} onChange={(e) => setNewPlan({ ...newPlan, invites_included: +e.target.value })} className={inputCls} />
          </label>
          <button onClick={addPlan} disabled={saving} className="px-4 py-1.5 bg-pink-500 text-white rounded-lg text-xs font-medium hover:bg-pink-600 disabled:opacity-50 flex items-center gap-1">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Crear
          </button>
          <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs">Cancelar</button>
        </div>
      )}

      {plans.length === 0 && !showAdd && (
        <p className="text-sm text-gray-400 italic">Sin planes. Usa "Agregar plan" para asignar uno.</p>
      )}

      <div className="grid gap-2">
        {plans.map((plan) => {
          const isEditing = editing === plan.purchase_id;
          return (
            <div key={plan.purchase_id} className={`bg-white rounded-xl border p-3 shadow-sm ${isEditing ? 'border-pink-300 ring-1 ring-pink-200' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <PlanBadge slug={plan.plan_slug} />
                <span className="text-sm font-semibold text-gray-800">{plan.plan_name}</span>
                <span className="text-xs text-gray-400 ml-auto">Purchase #{plan.purchase_id}</span>
                {isEditing ? (
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(plan.purchase_id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Guardar">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg" title="Cancelar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(plan)} className="p-1.5 text-pink-500 hover:bg-pink-50 rounded-lg" title="Editar créditos">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deletePlan(plan.purchase_id)} disabled={saving} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Eliminar plan">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {(['generation_credits', 'generation_used', 'iteration_credits', 'iteration_used', 'invites_included', 'invites_used'] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase">{k.replace(/_/g, ' ')}</span>
                      <input type="number" min="0" value={editValues[k] ?? 0} onChange={(e) => setEditValues({ ...editValues, [k]: +e.target.value })} className={inputCls} />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Gift className="w-3 h-3" /> Invitaciones</div>
                    <UsageBar used={plan.invites_used} total={plan.invites_included} label="" />
                    <span className="text-[10px] text-gray-400 mt-0.5">{plan.deployed_count} desplegada{plan.deployed_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Zap className="w-3 h-3" /> Generación</div>
                    <UsageBar used={plan.generation_used} total={plan.generation_credits} label="" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><CreditCard className="w-3 h-3" /> Iteración</div>
                    <UsageBar used={plan.iteration_used} total={plan.iteration_credits} label="" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Gift className="w-3 h-3" /> Disponibles</div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">{plan.invites_available}</span><span className="text-gray-400 text-xs"> inv.</span>
                      <span className="mx-1 text-gray-300">·</span>
                      <span className="font-medium text-gray-700">{plan.generation_available}</span><span className="text-gray-400 text-xs"> gen.</span>
                      <span className="mx-1 text-gray-300">·</span>
                      <span className="font-medium text-gray-700">{plan.iteration_available}</span><span className="text-gray-400 text-xs"> iter.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AdminUsers: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

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

  // Borrar un usuario: desaparece con sus planes e invitaciones. (Si vuelve a
  // entrar desde Laravel se crea de nuevo, con los planes que tenga comprados.)
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const deleteUser = async (e: React.MouseEvent, user: AdminUser) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar al usuario ${user.name || user.user_id}?\n\nSe borran también sus ${user.plans.length} plan(es) y sus ${user.invitations_count} invitación(es). Esta acción no se puede deshacer.`)) return;
    setBorrandoId(user.user_id);
    try {
      const r = await fetch(`${API}/admin/users/${user.user_id}`, { method: 'DELETE', headers: adminHeaders() });
      if (!r.ok) throw new Error('Error al eliminar');
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setBorrandoId(null);
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

  const toggleExpand = (userId: string) => {
    setExpandedUser(prev => prev === userId ? null : userId);
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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'users' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios
        </button>
        <button
          onClick={() => setSubTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'backup' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database className="w-4 h-4" />
          Backup
        </button>
      </div>

      {subTab === 'backup' ? (
        <AdminBackup />
      ) : (
      <>
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
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
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
                <th className="w-8 py-3 px-2"></th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nombre</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Planes</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Inv. Desplegadas</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Registro</th>
                <th className="w-12 py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isExpanded = expandedUser === user.user_id;
                return (
                  <React.Fragment key={user.user_id}>
                    <tr
                      className={`border-b border-pink-50 hover:bg-pink-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-pink-50/40' : ''}`}
                      onClick={() => toggleExpand(user.user_id)}
                    >
                      <td className="py-3 px-2">
                        {user.plans.length > 0 ? (
                          isExpanded
                            ? <ChevronDown className="w-4 h-4 text-gray-400" />
                            : <ChevronRight className="w-4 h-4 text-gray-400" />
                        ) : (
                          <span className="w-4 h-4 block" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{user.name || 'Sin nombre'}</td>
                      <td className="py-3 px-4 text-sm font-mono text-gray-500">{user.user_id}</td>
                      <td className="py-3 px-4">
                        {user.plans.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.plans.map(p => (
                              <PlanBadge key={p.purchase_id} slug={p.plan_slug} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin plan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <span className="font-medium">{user.invitations_count}</span>
                        <span className="text-gray-400 text-xs ml-1">inv.</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-MX') : '—'}</td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={(e) => deleteUser(e, user)}
                          disabled={borrandoId === user.user_id}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-6 py-3 bg-gray-50/30">
                          <UserPlansEditor
                            userId={user.user_id}
                            plans={user.plans}
                            onChanged={() => loadUsers()}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}
    </div>
  );
};