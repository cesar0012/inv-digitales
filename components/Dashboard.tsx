import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, FileText, Plus, Eye, Loader2, AlertCircle, ArrowRight, Share2,
  LogOut, Package, Pencil, Star, Trash2, Check,
  Zap, RefreshCw, Clock3
} from 'lucide-react';
import { getUser, activateInvitation, deleteInvitation } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { InvitationPreviewModal } from './InvitationPreviewModal';
import { ShareModal } from './ShareModal';
import { UserWithInvitations, InvitationFile } from '../types';

// Etiquetas de plan (la marca visual la lleva el rosa/rose del sitio;
// el chip mantiene un tono suave por plan solo como identificador).
const PLAN_STYLE: Record<string, { label: string; tag: string; chip: string }> = {
  premium: { label: 'Premium', tag: 'from-amber-400 to-pink-400', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  catalogo: { label: 'Catálogo', tag: 'from-pink-400 to-rose-400', chip: 'bg-pink-50 text-pink-700 border-pink-200' },
  creativa: { label: 'Creativa', tag: 'from-pink-500 to-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
  standard: { label: 'Estándar', tag: 'from-fuchsia-400 to-pink-400', chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  basic: { label: 'Básico', tag: 'from-rose-300 to-pink-300', chip: 'bg-rose-50 text-gray-600 border-rose-200' }
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
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-pink-200 rounded-full border-t-pink-500 animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Cargando tu panel...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-pink-100 p-8 max-w-sm text-center shadow-xl shadow-pink-500/10">
          <AlertCircle className="w-10 h-10 text-pink-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Error de conexión</h2>
          <p className="text-gray-500 text-sm mb-5">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/25">Reintentar</button>
        </div>
      </div>
    );
  }
  if (plans.length === 0) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-pink-100 p-8 max-w-sm text-center shadow-xl shadow-pink-500/10">
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Sin planes activos</h2>
          <p className="text-gray-500 text-sm mb-5">Adquiere un plan para comenzar a crear invitaciones.</p>
          <button onClick={handleLogout} className="px-5 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-medium hover:bg-pink-100">Cerrar sesión</button>
        </div>
      </div>
    );
  }

  const StatBlock: React.FC<{ icon: React.ReactNode; label: string; available: number; total: number }> =
    ({ icon, label, available, total }) => {
      const pct = total > 0 ? Math.round((available / total) * 100) : 0;
      return (
        <div className="flex-1 min-w-0 bg-gray-50/80 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-pink-500">{icon}</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
          </div>
          <p className="text-lg font-bold text-gray-800 leading-none mb-1.5">{available}<span className="text-xs text-gray-400 font-normal">/{total}</span></p>
          <div className="h-1 bg-pink-100/70 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-400 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 text-gray-800 relative">
      {/* Ambiente radial suave, mismo lenguaje del inicio */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 15% 10%, rgba(236,72,153,0.08) 0%, transparent 45%), radial-gradient(circle at 85% 90%, rgba(244,114,182,0.08) 0%, transparent 45%)' }} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header — mismo logo que el inicio */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/20 rotate-3 border border-pink-300/50">
              <Heart className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">Mis Invitaciones</h1>
              <p className="text-xs text-gray-400 mt-0.5">Hola, {authUser?.name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white/90 border border-pink-200 text-gray-500 rounded-xl text-sm hover:bg-white hover:text-pink-600 transition-all shadow-lg hover:shadow-xl backdrop-blur-sm">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

        {/* Planes siempre visibles */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-pink-500" />
            <h2 className="text-sm font-semibold text-gray-700">{plans.length > 1 ? 'Mis planes' : 'Mi plan'}</h2>
            {plans.length > 1 && <span className="text-[10px] text-gray-400">— toca para cambiar</span>}
          </div>
          <div className={`grid gap-3 ${plans.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {plans.map((plan) => {
              const st = planStyle(plan.plan_slug);
              const active = selectedPlan?.purchase_id === plan.purchase_id;
              return (
                <button key={plan.purchase_id} onClick={plans.length > 1 ? () => setSelectedPlanId(plan.purchase_id) : undefined}
                  className={`text-left bg-white/90 backdrop-blur-sm rounded-2xl border-2 p-4 transition-all ${active ? 'border-pink-300 shadow-xl shadow-pink-500/10' : 'border-pink-100/70 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-500/5'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${st.tag}`} />
                      <span className="font-bold text-sm text-gray-800">{st.label}</span>
                    </div>
                    {active && <span className="text-[10px] font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 px-2.5 py-0.5 rounded-full shadow-sm">Activo</span>}
                  </div>
                  <div className="flex gap-2.5">
                    <StatBlock icon={<Zap className="w-3.5 h-3.5" />} label="Generación" available={plan.generation_available} total={plan.generation_credits} />
                    <StatBlock icon={<RefreshCw className="w-3.5 h-3.5" />} label="Cambios IA" available={plan.iteration_available} total={plan.iteration_credits} />
                    <StatBlock icon={<FileText className="w-3.5 h-3.5" />} label="Invitaciones" available={plan.invites_available} total={plan.invites_included} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedPlan && (
          <>
            {/* CTA principal — gradiente rosa del sitio */}
            <button onClick={handleCreateNew}
              disabled={selectedPlan.generation_available < 1 || selectedPlan.invites_available < 1}
              className={`w-full mb-8 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${selectedPlan.generation_available >= 1 && selectedPlan.invites_available >= 1 ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-xl shadow-pink-500/25 hover:shadow-2xl hover:shadow-pink-500/30 hover:scale-[1.01] active:scale-[0.99]' : 'bg-white/70 text-gray-400 cursor-not-allowed border border-pink-100'}`}>
              <Plus className="w-5 h-5" />
              {selectedPlan.generation_available < 1 ? 'Sin créditos de generación' : selectedPlan.invites_available < 1 ? 'Sin invitaciones disponibles' : 'Crear nueva invitación'}
              {selectedPlan.generation_available >= 1 && selectedPlan.invites_available >= 1 && <ArrowRight className="w-4 h-4 opacity-70" />}
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
                    <Star className="w-4 h-4 text-pink-500" fill="currentColor" />
                    <h2 className="text-sm font-semibold text-gray-700">Invitación destacada</h2>
                    <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium border border-pink-200">Pública</span>
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-pink-100 overflow-hidden shadow-xl shadow-pink-500/10 hover:shadow-2xl hover:shadow-pink-500/15 transition-all max-w-sm">
                    <div className="aspect-[16/10] bg-pink-50/60 relative overflow-hidden cursor-pointer group" onClick={() => setPreviewInvitation(invFile)}>
                      <iframe src={invFile.previewUrl} className="w-[200%] h-[200%] origin-top-left scale-[0.5] pointer-events-none" title={`Preview ${inv.filename}`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-pink-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                        <span className="flex items-center gap-1.5 text-white text-xs font-medium"><Eye className="w-3.5 h-3.5" /> Ver invitación</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700">{inv.event_type}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${planStyle(selectedPlan.plan_slug).chip}`}>{planStyle(selectedPlan.plan_slug).label}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewInvitation(invFile)} className="flex-1 py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"><Eye className="w-3.5 h-3.5" /> Ver</button>
                        <button onClick={() => { setPreviewInvitation(null); setShareInvitation(invFile); }} className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-md shadow-pink-500/20"><Share2 className="w-3.5 h-3.5" /> Compartir</button>
                        <button onClick={() => handleOpenEditor(invFile)} className="py-2 px-3 bg-pink-50 text-pink-500 hover:bg-pink-100 rounded-xl transition-colors" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-dashed border-pink-200 p-10 text-center mb-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Sin invitación destacada</h3>
                <p className="text-xs text-gray-400">Genera tu primera invitación y destácala aquí para compartir el enlace público.</p>
              </div>
            )}

            {/* Historial */}
            {selectedPlan.plan_invitations && selectedPlan.plan_invitations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock3 className="w-4 h-4 text-pink-500" />
                  <h2 className="text-sm font-semibold text-gray-700">Historial ({selectedPlan.plan_invitations.length})</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedPlan.plan_invitations.map((inv) => {
                    const isActive = inv.is_active === 1;
                    const isLoading = actionLoadingId === inv.id;
                    const isConfirming = confirmDeleteId === inv.id;
                    return (
                      <div key={inv.id || inv.filename} className={`bg-white/90 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all hover:shadow-xl hover:shadow-pink-500/10 ${isActive ? 'border-pink-300' : 'border-pink-100/70'}`}>
                        <div className="aspect-[16/10] bg-pink-50/60 relative overflow-hidden cursor-pointer" onClick={() => setPreviewInvitation(inv)}>
                          <iframe src={getPreviewUrlForFilename(authUser?.id?.toString() || '', inv.filename)} className="w-[200%] h-[200%] origin-top-left scale-[0.5] pointer-events-none" title={`Preview ${inv.filename}`} />
                          {isActive && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 shadow-sm"><Star className="w-2.5 h-2.5" fill="currentColor" /> Pública</div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-700 truncate">{inv.event_type}</p>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">{inv.created_at ? formatDate(inv.created_at) : ''}</span>
                          </div>
                          {isConfirming ? (
                            <div className="flex gap-1.5 items-center">
                              <span className="text-[11px] text-gray-500 flex-1">¿Eliminar?</span>
                              <button onClick={() => handleDelete(inv)} disabled={isLoading} className="px-2 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-md text-[11px] font-medium hover:from-pink-600 hover:to-rose-600 flex items-center gap-1">{isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Sí</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-pink-50 text-gray-500 rounded-md text-[11px] font-medium hover:bg-pink-100">No</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setPreviewInvitation(inv)} className="flex-1 py-1.5 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"><Eye className="w-3 h-3" /> Ver</button>
                              <button onClick={() => handleOpenEditor(inv)} className="py-1.5 px-2 bg-pink-50 text-pink-500 hover:bg-pink-100 rounded-lg transition-colors" title="Editar"><Pencil className="w-3 h-3" /></button>
                              {!isActive ? (
                                <>
                                  <button onClick={() => handleActivate(inv)} disabled={isLoading} className="py-1.5 px-2 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg transition-colors" title="Destacar">{isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}</button>
                                  <button onClick={() => setConfirmDeleteId(inv.id || inv.filename)} disabled={isLoading} className="py-1.5 px-2 bg-pink-50 text-pink-400 hover:bg-pink-100 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                                </>
                              ) : (
                                <span className="py-1.5 px-2 bg-pink-100 text-pink-500 rounded-lg flex items-center" title="Invitación pública actual"><Star className="w-3 h-3" fill="currentColor" /></span>
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
