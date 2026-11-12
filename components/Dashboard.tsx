import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, FileText, Plus, Eye, Loader2, AlertCircle, ArrowRight, Share2,
  LogOut, Package, Pencil, Star, Trash2, Check,
  Zap, RefreshCw, Clock3, ChevronRight
} from 'lucide-react';
import { getUser, activateInvitation, deleteInvitation } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { InvitationPreviewModal } from './InvitationPreviewModal';
import { ShareModal } from './ShareModal';
import { UserWithInvitations, InvitationFile } from '../types';

const PLAN_STYLE: Record<string, { label: string; tag: string; bar: string; chip: string }> = {
  premium: { label: 'Premium', tag: 'from-amber-500 to-yellow-500', bar: 'from-amber-400 to-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  catalogo: { label: 'Catálogo', tag: 'from-emerald-500 to-teal-500', bar: 'from-emerald-400 to-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  creativa: { label: 'Creativa', tag: 'from-fuchsia-500 to-pink-500', bar: 'from-fuchsia-400 to-fuchsia-500', chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  standard: { label: 'Estándar', tag: 'from-violet-500 to-purple-500', bar: 'from-violet-400 to-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  basic: { label: 'Básico', tag: 'from-sky-500 to-blue-500', bar: 'from-sky-400 to-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200' }
};
const planStyle = (slug: string) => PLAN_STYLE[slug] || PLAN_STYLE.basic;

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, logout, token } = useAuth();
  const [userData, setUserData] = useState<UserWithInvitations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [previewInvitation, setPreviewInvitation] = useState<InvitationFile | null>(null);
  const [shareInvitation, setShareInvitation] = useState<InvitationFile | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null);

  const plans = userData?.plans || [];
  const selectedPlan = plans.find(p => p.purchase_id === selectedPlanId) || plans[0] || null;

  const refreshUserData = async () => {
    if (!authUser) return;
    const data = await getUser(authUser.id.toString(), token);
    setUserData(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) return;
      try {
        const data = await getUser(authUser.id.toString(), token);
        setUserData(data);
        if (data.plans?.length && !selectedPlanId) setSelectedPlanId(data.plans[0].purchase_id);
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authUser]);

  const handleCreateNew = () => { if (selectedPlan) navigate(`/editor?purchaseId=${selectedPlan.purchase_id}`); };
  const handleOpenEditor = (inv: InvitationFile) => {
    navigate(`/editor/${encodeURIComponent(inv.filename)}?purchaseId=${inv.purchase_id || selectedPlan?.purchase_id || ''}`);
  };
  const handleActivate = async (inv: InvitationFile) => {
    if (!inv.id) return;
    setActionLoadingId(inv.id);
    try { await activateInvitation(token, inv.id); await refreshUserData(); }
    catch (err: any) { alert(err.message); }
    finally { setActionLoadingId(null); }
  };
  const handleDelete = async (inv: InvitationFile) => {
    if (!inv.id) return;
    setActionLoadingId(inv.id);
    try { await deleteInvitation(token, inv.id); setConfirmDeleteId(null); await refreshUserData(); }
    catch (err: any) { alert(err.message); }
    finally { setActionLoadingId(null); }
  };
  const handleLogout = async () => { await logout(); navigate('/test'); };
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-slate-200 rounded-full border-t-pink-500 animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Cargando tu panel...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm text-center shadow-lg">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Error de conexión</h2>
          <p className="text-slate-500 text-sm mb-5">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900">Reintentar</button>
        </div>
      </div>
    );
  }
  if (plans.length === 0) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm text-center shadow-lg">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Sin planes activos</h2>
          <p className="text-slate-500 text-sm mb-5">Adquiere un plan para comenzar a crear invitaciones.</p>
          <button onClick={handleLogout} className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200">Cerrar sesión</button>
        </div>
      </div>
    );
  }

  const StatCard: React.FC<{ icon: React.ReactNode; label: string; available: number; total: number; barColor: string }> =
    ({ icon, label, available, total, barColor }) => {
      const pct = total > 0 ? Math.round((available / total) * 100) : 0;
      return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="text-slate-400">{icon}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-none">{available}<span className="text-sm text-slate-400 font-normal">/{total}</span></p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    };

  return (
    <div className="min-h-screen w-full bg-slate-50/80 text-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mis Invitaciones</h1>
              <p className="text-xs text-slate-400 mt-0.5">Bienvenido, {authUser?.name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-50 hover:text-slate-700 transition-colors">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

        {/* Plan SIEMPRE visible */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">{plans.length > 1 ? 'Mis planes' : 'Mi plan'}</h2>
            {plans.length > 1 && <span className="text-[10px] text-slate-400">— toca para cambiar</span>}
          </div>
          <div className={`grid gap-3 ${plans.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {plans.map((plan) => {
              const st = planStyle(plan.plan_slug);
              const active = selectedPlan?.purchase_id === plan.purchase_id;
              return (
                <button key={plan.purchase_id} onClick={plans.length > 1 ? () => setSelectedPlanId(plan.purchase_id) : undefined}
                  className={`text-left bg-white rounded-2xl border-2 p-4 transition-all ${active ? `${st.chip} shadow-md` : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${st.tag}`} />
                      <span className="font-bold text-sm">{st.label}</span>
                    </div>
                    {active && <span className="text-[10px] font-semibold text-white bg-slate-900 px-2 py-0.5 rounded-full">Activo</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <StatCard icon={<Zap className="w-3.5 h-3.5" />} label="Gen" available={plan.generation_available} total={plan.generation_credits} barColor="from-violet-400 to-violet-500" />
                    <StatCard icon={<RefreshCw className="w-3.5 h-3.5" />} label="Iter" available={plan.iteration_available} total={plan.iteration_credits} barColor="from-sky-400 to-sky-500" />
                    <StatCard icon={<FileText className="w-3.5 h-3.5" />} label="Inv" available={plan.invites_available} total={plan.invites_included} barColor="from-pink-400 to-pink-500" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedPlan && (
          <>
            {/* CTA */}
            <button onClick={handleCreateNew}
              disabled={selectedPlan.generation_available < 1 || selectedPlan.invites_available < 1}
              className={`w-full mb-8 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${selectedPlan.generation_available >= 1 && selectedPlan.invites_available >= 1 ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10 hover:scale-[1.01] active:scale-[0.99]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              <Plus className="w-5 h-5" />
              {selectedPlan.generation_available < 1 ? 'Sin créditos de generación' : selectedPlan.invites_available < 1 ? 'Sin invitaciones disponibles' : 'Crear nueva invitación'}
              {selectedPlan.generation_available >= 1 && selectedPlan.invites_available >= 1 && <ArrowRight className="w-4 h-4 opacity-60" />}
            </button>

            {/* Invitación destacada */}
            {selectedPlan.active_invitation ? (() => {
              const inv = selectedPlan.active_invitation;
              const invFile: InvitationFile = {
                id: inv.id, filename: inv.filename, slug: inv.slug,
                publicUrl: getPublicUrlForSlug(inv.slug),
                previewUrl: getPreviewUrlForFilename(authUser?.id?.toString() || '', inv.filename),
                event_type: inv.event_type, created_at: '', size: 0,
                purchase_id: selectedPlan.purchase_id, plan_slug: selectedPlan.plan_slug
              };
              return (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-500" fill="currentColor" />
                    <h2 className="text-sm font-semibold text-slate-700">Invitación destacada</h2>
                    <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium border border-amber-200">Pública</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow max-w-sm">
                    <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden cursor-pointer group" onClick={() => setPreviewInvitation(invFile)}>
                      <iframe src={invFile.previewUrl} className="w-[200%] h-[200%] origin-top-left scale-[0.5] pointer-events-none" title={`Preview ${inv.filename}`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                        <span className="flex items-center gap-1.5 text-white text-xs font-medium"><Eye className="w-3.5 h-3.5" /> Ver invitación</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-700">{inv.event_type}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${planStyle(selectedPlan.plan_slug).chip}`}>{planStyle(selectedPlan.plan_slug).label}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewInvitation(invFile)} className="flex-1 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"><Eye className="w-3.5 h-3.5" /> Ver</button>
                        <button onClick={() => { setPreviewInvitation(null); setShareInvitation(invFile); }} className="flex-1 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"><Share2 className="w-3.5 h-3.5" /> Compartir</button>
                        <button onClick={() => handleOpenEditor(invFile)} className="py-2 px-3 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center mb-8">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-600 mb-1">Sin invitación destacada</h3>
                <p className="text-xs text-slate-400">Genera tu primera invitación y destácala aquí para compartir el enlace público.</p>
              </div>
            )}

            {/* Historial */}
            {selectedPlan.plan_invitations && selectedPlan.plan_invitations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock3 className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-700">Historial ({selectedPlan.plan_invitations.length})</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedPlan.plan_invitations.map((inv) => {
                    const isActive = inv.is_active === 1;
                    const isLoading = actionLoadingId === inv.id;
                    const isConfirming = confirmDeleteId === inv.id;
                    return (
                      <div key={inv.id || inv.filename} className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md ${isActive ? 'border-amber-300/60' : 'border-slate-200'}`}>
                        <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden cursor-pointer" onClick={() => setPreviewInvitation(inv)}>
                          <iframe src={getPreviewUrlForFilename(authUser?.id?.toString() || '', inv.filename)} className="w-[200%] h-[200%] origin-top-left scale-[0.5] pointer-events-none" title={`Preview ${inv.filename}`} />
                          {isActive && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-semibold flex items-center gap-1"><Star className="w-2.5 h-2.5" fill="currentColor" /> Pública</div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-slate-700 truncate">{inv.event_type}</p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{inv.created_at ? formatDate(inv.created_at) : ''}</span>
                          </div>
                          {isConfirming ? (
                            <div className="flex gap-1.5 items-center">
                              <span className="text-[11px] text-slate-500 flex-1">¿Eliminar?</span>
                              <button onClick={() => handleDelete(inv)} disabled={isLoading} className="px-2 py-1 bg-red-500 text-white rounded-md text-[11px] font-medium hover:bg-red-600 flex items-center gap-1">{isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Sí</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[11px] font-medium hover:bg-slate-200">No</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setPreviewInvitation(inv)} className="flex-1 py-1.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"><Eye className="w-3 h-3" /> Ver</button>
                              <button onClick={() => handleOpenEditor(inv)} className="py-1.5 px-2 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Editar"><Pencil className="w-3 h-3" /></button>
                              {!isActive ? (
                                <>
                                  <button onClick={() => handleActivate(inv)} disabled={isLoading} className="py-1.5 px-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors" title="Destacar">{isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}</button>
                                  <button onClick={() => setConfirmDeleteId(inv.id || inv.filename)} disabled={isLoading} className="py-1.5 px-2 bg-red-50 text-red-400 hover:bg-red-100 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                                </>
                              ) : (
                                <span className="py-1.5 px-2 bg-amber-50 text-amber-500 rounded-lg flex items-center" title="Invitación pública actual"><Star className="w-3 h-3" fill="currentColor" /></span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {previewInvitation && (
        <InvitationPreviewModal
          slug={previewInvitation.slug} publicUrl={previewInvitation.publicUrl}
          previewUrl={previewInvitation.previewUrl || (previewInvitation.filename ? getPreviewUrlForFilename(authUser?.id?.toString() || '', previewInvitation.filename) : undefined)}
          eventType={previewInvitation.event_type}
          onClose={() => setPreviewInvitation(null)}
          onShare={() => { setPreviewInvitation(null); setShareInvitation(previewInvitation); }}
        />
      )}
      {shareInvitation && (
        <ShareModal publicUrl={shareInvitation.publicUrl} eventType={shareInvitation.event_type} onClose={() => setShareInvitation(null)} />
      )}
    </div>
  );
};

const getPublicUrlForSlug = (slug: string): string => {
  const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
  return `${PUBLIC_BASE}/i/${slug}`;
};
const getPreviewUrlForFilename = (userId: string, filename: string): string => {
  return `${window.location.origin}/api/preview/${userId}/${encodeURIComponent(filename)}`;
};
