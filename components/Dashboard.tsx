import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, FileText, CreditCard, Sparkles, Plus, Eye, Loader2, AlertCircle, 
  Calendar, ArrowRight, Share2, LogOut, User as UserIcon, RefreshCw, Package
} from 'lucide-react';
import { getUser } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { InvitationPreviewModal } from './InvitationPreviewModal';
import { ShareModal } from './ShareModal';
import { UserPlan, UserWithInvitations, InvitationFile } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, logout, token } = useAuth();
  const [userData, setUserData] = useState<UserWithInvitations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animateStats, setAnimateStats] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  const [previewInvitation, setPreviewInvitation] = useState<InvitationFile | null>(null);
  const [shareInvitation, setShareInvitation] = useState<InvitationFile | null>(null);

  const plans = userData?.plans || [];
  const selectedPlan = plans.find(p => p.purchase_id === selectedPlanId) || plans[0] || null;

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) return;
      
      try {
        const data = await getUser(authUser.id.toString(), token);
        setUserData(data);
        if (data.plans && data.plans.length > 0 && !selectedPlanId) {
          setSelectedPlanId(data.plans[0].purchase_id);
        }
        setTimeout(() => setAnimateStats(true), 100);
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authUser]);

  const handleCreateNew = () => {
    if (!selectedPlan) return;
    navigate(`/editor?purchaseId=${selectedPlan.purchase_id}`);
  };

  const handleReplaceInvitation = () => {
    if (!selectedPlan?.invitation) return;
    navigate(`/editor/${encodeURIComponent(selectedPlan.invitation.filename)}?purchaseId=${selectedPlan.purchase_id}`);
  };

  const handleOpenEditor = (inv: InvitationFile) => {
    const purchaseId = inv.purchase_id || selectedPlan?.purchase_id || '';
    navigate(`/editor/${encodeURIComponent(inv.filename)}?purchaseId=${purchaseId}`);
  };

  const handlePreview = (inv: InvitationFile) => {
    setPreviewInvitation(inv);
  };

  const handleShare = (inv: InvitationFile) => {
    setPreviewInvitation(null);
    setShareInvitation(inv);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/test');
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPlanLabel = (slug: string) => {
    const labels: Record<string, string> = {
      premium: 'Premium',
      catalogo: 'Catálogo',
      creativa: 'Creativa',
      standard: 'Estándar',
      basic: 'Básico'
    };
    return labels[slug] || slug;
  };

  const getPlanColor = (slug: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; gradient: string; shadow: string }> = {
      premium: { bg: 'from-amber-100 to-yellow-50', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-500 to-yellow-500', shadow: 'shadow-amber-200/40' },
      catalogo: { bg: 'from-emerald-100 to-green-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-200/40' },
      creativa: { bg: 'from-fuchsia-100 to-pink-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', gradient: 'from-fuchsia-500 to-pink-500', shadow: 'shadow-fuchsia-200/40' },
      standard: { bg: 'from-violet-100 to-purple-50', text: 'text-violet-700', border: 'border-violet-200', gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-200/40' },
      basic: { bg: 'from-sky-100 to-blue-50', text: 'text-sky-700', border: 'border-sky-200', gradient: 'from-sky-500 to-blue-500', shadow: 'shadow-sky-200/40' }
    };
    return colors[slug] || colors.basic;
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-pink-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-pink-500 rounded-full absolute top-0 left-0 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-red-200 shadow-2xl p-10 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error de conexión</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-500/25"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50  via-white to-rose-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-10 max-w-md text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sin planes activos</h2>
          <p className="text-gray-500 mb-6">No tienes planes activos. Adquiere un plan para comenzar a crear invitaciones.</p>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 text-gray-800 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pink-200/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-[150px]" />
        <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-amber-100/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col items-center w-full">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/25 mb-4">
              <Heart className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 tracking-tight text-center">
              Invitaciones Digitales
            </h1>
            <p className="text-gray-500 mt-1 text-base">Panel de Control</p>
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-xl px-4 py-2 border border-gray-100">
            <UserIcon className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-gray-600">{authUser?.name}</span>
            <span className="text-xs text-gray-400">({authUser?.role_name})</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Cerrar sesión</span>
          </button>
        </div>

        {plans.length >= 1 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-pink-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Mis Planes</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const colors = getPlanColor(plan.plan_slug);
                const isSelected = selectedPlan?.purchase_id === plan.purchase_id;
                return (
                  <button
                    key={plan.purchase_id}
                    onClick={() => setSelectedPlanId(plan.purchase_id)}
                    className={`text-left bg-gradient-to-br ${colors.bg} rounded-2xl border-2 p-4 transition-all hover:shadow-lg ${
                      isSelected ? colors.border + ' shadow-lg ring-2 ring-offset-2 ring-pink-300' : 'border-transparent shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-lg ${colors.text}`}>{getPlanLabel(plan.plan_slug)}</span>
                      {isSelected && (
                        <span className="text-xs bg-white/80 text-pink-600 px-2 py-0.5 rounded-full font-medium">Activo</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{plan.plan_name}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-800">{plan.generation_available}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Generación</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-800">{plan.iteration_available}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Iteración</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-800">{plan.invites_available}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Invitaciones</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedPlan && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/30 p-5 transition-all hover:shadow-xl hover:border-violet-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-violet-50 rounded-xl flex items-center justify-center shrink-0 border border-violet-200/50">
                    <Sparkles className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Generación</p>
                    <p className="text-2xl font-bold text-violet-600">
                      {selectedPlan.generation_available}
                      <span className="text-base text-violet-500/70 font-normal">/{selectedPlan.generation_credits}</span>
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-400 to-violet-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: animateStats ? `${selectedPlan.generation_credits > 0 ? (selectedPlan.generation_available / selectedPlan.generation_credits) * 100 : 0}%` : '0%' }}
                  />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-blue-100 shadow-lg shadow-blue-100/30 p-5 transition-all hover:shadow-xl hover:border-blue-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-200/50">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Iteración</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedPlan.iteration_available}
                      <span className="text-base text-blue-500/70 font-normal">/{selectedPlan.iteration_credits}</span>
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: animateStats ? `${selectedPlan.iteration_credits > 0 ? (selectedPlan.iteration_available / selectedPlan.iteration_credits) * 100 : 0}%` : '0%' }}
                  />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 shadow-lg shadow-pink-100/30 p-5 transition-all hover:shadow-xl hover:border-pink-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center shrink-0 border border-pink-200/50">
                    <FileText className="w-5 h-5 text-pink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Invitaciones</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {selectedPlan.invites_available}
                      <span className="text-base text-pink-500/70 font-normal">/{selectedPlan.invites_included}</span>
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: animateStats ? `${selectedPlan.invites_included > 0 ? (selectedPlan.invites_available / selectedPlan.invites_included) * 100 : 0}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center mb-8">
              {selectedPlan.has_invitation ? (
                <button
                  onClick={handleReplaceInvitation}
                  disabled={selectedPlan.generation_available < 1}
                  className={`px-8 py-4 rounded-2xl font-semibold text-lg transition-all flex items-center gap-3 ${
                    selectedPlan.generation_available >= 1
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>{selectedPlan.generation_available >= 1 ? 'Reemplazar Invitación' : 'Sin Créditos para Reemplazar'}</span>
                </button>
              ) : (
                <button
                  onClick={handleCreateNew}
                  disabled={selectedPlan.generation_available < 1 || selectedPlan.invites_available < 1}
                  className={`px-8 py-4 rounded-2xl font-semibold text-lg transition-all flex items-center gap-3 ${
                    selectedPlan.generation_available >= 1 && selectedPlan.invites_available >= 1
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  <span>
                    {selectedPlan.generation_available < 1
                      ? 'Sin Créditos de Generación'
                      : selectedPlan.invites_available < 1
                        ? 'Sin Invitaciones Disponibles'
                        : 'Crear Nueva Invitación'}
                  </span>
                  {selectedPlan.generation_available >= 1 && selectedPlan.invites_available >= 1 && <ArrowRight className="w-5 h-5 opacity-70" />}
                </button>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-pink-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Invitación del Plan {getPlanLabel(selectedPlan.plan_slug)}
                </h2>
              </div>
            </div>

            {selectedPlan.invitation ? (() => {
              const inv = selectedPlan.invitation;
              const invFile: InvitationFile = {
                filename: inv.filename,
                slug: inv.slug,
                publicUrl: getPublicUrlForSlug(inv.slug),
                event_type: inv.event_type,
                created_at: '',
                size: 0,
                purchase_id: selectedPlan.purchase_id,
                plan_slug: selectedPlan.plan_slug
              };
              return (
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 shadow-lg shadow-pink-100/30 overflow-hidden hover:border-pink-200 transition-all hover:shadow-xl max-w-md">
                  <div 
                    className="aspect-[16/10] bg-gradient-to-br from-pink-50 to-rose-50 relative overflow-hidden cursor-pointer"
                    onClick={() => handlePreview(invFile)}
                  >
                    <iframe
                      src={invFile.publicUrl}
                      className="w-[200%] h-[200%] origin-top-left scale-[0.5] pointer-events-none"
                      title={`Preview ${inv.filename}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                    <div className="absolute bottom-2 right-2">
                      <div className="px-2 py-1 bg-white/90 rounded-lg text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Ver
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-800 truncate text-sm">{inv.event_type}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${getPlanColor(selectedPlan.plan_slug).text} bg-white/80`}>
                        {getPlanLabel(selectedPlan.plan_slug)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreview(invFile)}
                        className="flex-1 py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => handleShare(invFile)}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Compartir</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditor(invFile)}
                        className="py-2 px-3 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        title="Editar"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-pink-100 p-10 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-200/50">
                  <FileText className="w-8 h-8 text-pink-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Sin invitación en este plan</h3>
                <p className="text-gray-500 max-w-sm mx-auto text-sm">
                  Crea tu primera invitación para este plan haciendo clic en el botón de arriba.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {previewInvitation && (
        <InvitationPreviewModal
          slug={previewInvitation.slug}
          publicUrl={previewInvitation.publicUrl}
          eventType={previewInvitation.event_type}
          onClose={() => setPreviewInvitation(null)}
          onShare={() => handleShare(previewInvitation)}
        />
      )}

      {shareInvitation && (
        <ShareModal
          publicUrl={shareInvitation.publicUrl}
          eventType={shareInvitation.event_type}
          onClose={() => setShareInvitation(null)}
        />
      )}
    </div>
  );
};

const getPublicUrlForSlug = (slug: string): string => {
  const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
  return `${PUBLIC_BASE}/i/${slug}`;
};