import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronRight, CreditCard, Gift, RefreshCw, Loader2, Zap, Layers } from 'lucide-react';
import { AdminUser } from '../../types';
import { getAdminUsers, syncUsers } from '../../services/adminService';

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

export const AdminUsers: React.FC = () => {
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
                    </tr>
                    {isExpanded && user.plans.length > 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-3 bg-gray-50/30">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Layers className="w-4 h-4 text-gray-500" />
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Planes del usuario</span>
                            </div>
                            <div className="grid gap-2">
                              {user.plans.map(plan => (
                                <div key={plan.purchase_id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <PlanBadge slug={plan.plan_slug} />
                                    <span className="text-sm font-semibold text-gray-800">{plan.plan_name}</span>
                                    <span className="text-xs text-gray-400 ml-auto">Purchase #{plan.purchase_id}</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Gift className="w-3 h-3" />
                                        Invitaciones
                                      </div>
                                      <UsageBar used={plan.invites_used} total={plan.invites_included} label="" />
                                      <span className="text-[10px] text-gray-400 mt-0.5">
                                        {plan.deployed_count} desplegada{plan.deployed_count !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Zap className="w-3 h-3" />
                                        Generación
                                      </div>
                                      <UsageBar used={plan.generation_used} total={plan.generation_credits} label="" />
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <CreditCard className="w-3 h-3" />
                                        Iteración
                                      </div>
                                      <UsageBar used={plan.iteration_used} total={plan.iteration_credits} label="" />
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                        <Gift className="w-3 h-3" />
                                        Disponibles
                                      </div>
                                      <div className="text-sm">
                                        <span className="font-medium text-gray-700">{plan.invites_available}</span>
                                        <span className="text-gray-400 text-xs"> inv.</span>
                                        <span className="mx-1 text-gray-300">·</span>
                                        <span className="font-medium text-gray-700">{plan.generation_available}</span>
                                        <span className="text-gray-400 text-xs"> gen.</span>
                                        <span className="mx-1 text-gray-300">·</span>
                                        <span className="font-medium text-gray-700">{plan.iteration_available}</span>
                                        <span className="text-gray-400 text-xs"> iter.</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {isExpanded && user.plans.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-3 bg-gray-50/30">
                          <p className="text-sm text-gray-400 italic">Este usuario no tiene planes asociados. Los créditos se gestionan desde la tabla legacy.</p>
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
    </div>
  );
};