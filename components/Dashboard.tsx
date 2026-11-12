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
import { UserWithInvitations, InvitationFile, UserPlan } from '../types';

const PLAN_STYLE: Record<string, { label: string; tag: string; bar: string; chip: string; ring: string }> = {
  premium: { label: 'Premium', tag: 'from-amber-500 to-yellow-500', bar: 'from-amber-400 to-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', ring: 'ring-amber-300' },
  catalogo: { label: 'Catálogo', tag: 'from-emerald-500 to-teal-500', bar: 'from-emerald-400 to-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'ring-emerald-300' },
  creativa: { label: 'Creativa', tag: 'from-fuchsia-500 to-pink-500', bar: 'from-fuchsia-400 to-fuchsia-500', chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', ring: 'ring-fuchsia-300' },
  standard: { label: 'Estándar', tag: 'from-violet-500 to-purple-500', bar: 'from-violet-400 to-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200', ring: 'ring-violet-300' },
  basic: { label: 'Básico', tag: 'from-sky-500 to-blue-500', bar: 'from-sky-400 to-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200', ring: 'ring-sky-300' }
};
const planStyle = (slug: string) => PLAN_STYLE[slug] || PLAN_STYLE.basic;

const StatBar: React.FC<{ icon: React.ReactNode; label: string; available: number; total: number; barColor: string }> =
  ({ icon, label, available, total, barColor }) => {
    const pct = total > 0 ? Math.round((available / total) * 100) : 0;
    return (
      <div className="flex flex-col gap-1.5 flex-1 min-w-[100px]">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {icon} {label}
        </div>
        <p className="text-xl font-bold text-slate-800 leading-none">{available}<span className="text-xs text-slate-400 font-normal">/{total}</span></p>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

const PlanCard: React.FC<{ plan: UserPlan; selected: boolean; onSelect?: () => void }> = ({ plan, selected, onSelect }) => {
  const st = planStyle(plan.plan_slug);
  return (
    <button type="button" onClick={onSelect} disabled={!onSelect}
      className={`text-left w-full bg-white rounded-2xl border-2 p-4 transition-all ${selected ? `${st.chip} shadow-md ring-2 ${st.ring}` : 'border-slate-200 hover:border-slate-300'} ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${st.tag}`} />
          <span className="font-bold text-sm">{st.label}</span>
        </div>
        {selected && <span className="flex items-center gap-1 text-[10px] font-semibold text-white bg-slate-900 px-2 py-0.5 rounded-full">Activo</span>}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <StatBar icon={<Zap className="w-3 h-3" />} label="Gen" available={plan.generation_available} total={plan.generation_credits} barColor="from-violet-400 to-violet-500" />
        <StatBar icon={<RefreshCw className="w-3 h-3" />} label="Iter" available={plan.iteration_available} total={plan.iteration_credits} barColor="from-sky-400 to-sky-500" />
        <StatBar icon={<FileText className="w-3 h-3" />} label="Inv" available={plan.invites_available} total={plan.invites_included} barColor="from-pink-400 to-pink-500" />
      </div>
    </button>
  );
};

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
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
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
  if (plans
