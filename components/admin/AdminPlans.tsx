import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, CreditCard, AlertTriangle, Download, Upload } from 'lucide-react';
import { getAdminPlans, createPlan, updatePlan, deletePlan, downloadPlansBackup, uploadPlansBackup, PlanConfig, PlansBackupData } from '../../services/adminService';

interface EditingPlan extends Partial<PlanConfig> {
  isNew?: boolean;
}

export const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<EditingPlan | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingPlans, setDownloadingPlans] = useState(false);
  const [uploadingPlans, setUploadingPlans] = useState(false);
  const [plansFile, setPlansFile] = useState<File | null>(null);
  const [plansPreview, setPlansPreview] = useState<PlansBackupData | null>(null);
  const [confirmPlansRestore, setConfirmPlansRestore] = useState(false);
  const plansFileRef = useRef<HTMLInputElement>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const result = await getAdminPlans();
      setPlans(result.plans);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al cargar planes' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleCreate = () => {
    setEditing({
      isNew: true,
      plan_slug: '',
      plan_name: '',
      invites_included: 1,
      generation_credits: 5,
      iteration_credits: 10,
      has_rsvp: 0,
    });
  };

  const handleEdit = (plan: PlanConfig) => {
    setEditing({ ...plan, isNew: false });
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    try {
      if (editing.isNew) {
        if (!editing.plan_slug || !editing.plan_name) {
          setMessage({ type: 'error', text: 'Slug y nombre son requeridos' });
          setSaving(false);
          return;
        }
        await createPlan({
          plan_slug: editing.plan_slug,
          plan_name: editing.plan_name,
          invites_included: editing.invites_included ?? 1,
          generation_credits: editing.generation_credits ?? 5,
          iteration_credits: editing.iteration_credits ?? 10,
          has_rsvp: editing.has_rsvp ?? 0,
        });
        setMessage({ type: 'success', text: 'Plan creado correctamente' });
      } else {
        await updatePlan(editing.plan_slug!, {
          plan_name: editing.plan_name,
          invites_included: editing.invites_included,
          generation_credits: editing.generation_credits,
          iteration_credits: editing.iteration_credits,
          has_rsvp: editing.has_rsvp,
        });
        setMessage({ type: 'success', text: 'Plan actualizado correctamente' });
      }
      setEditing(null);
      fetchPlans();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar plan' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await deletePlan(slug);
      setMessage({ type: 'success', text: 'Plan eliminado correctamente' });
      setDeleting(null);
      fetchPlans();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al eliminar plan' });
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const handlePlansDownload = async () => {
    setDownloadingPlans(true);
    setMessage(null);
    try {
      await downloadPlansBackup();
      setMessage({ type: 'success', text: 'Backup de planes descargado correctamente' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al descargar backup de planes' });
    } finally {
      setDownloadingPlans(false);
    }
  };

  const handlePlansFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlansFile(file);
    setConfirmPlansRestore(false);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.version || !data.data || !Array.isArray(data.data.plan_config)) {
          setMessage({ type: 'error', text: 'Formato de backup de planes inválido' });
          setPlansPreview(null);
          return;
        }
        setPlansPreview(data);
      } catch {
        setMessage({ type: 'error', text: 'El archivo no es un JSON válido' });
        setPlansPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handlePlansUpload = async () => {
    if (!plansPreview) return;
    setUploadingPlans(true);
    setMessage(null);
    try {
      const result = await uploadPlansBackup(plansPreview);
      setMessage({ type: 'success', text: result.message || 'Planes importados correctamente' });
      setConfirmPlansRestore(false);
      setPlansFile(null);
      setPlansPreview(null);
      if (plansFileRef.current) plansFileRef.current.value = '';
      fetchPlans();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al importar planes' });
      setConfirmPlansRestore(false);
    } finally {
      setUploadingPlans(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Configuración de Planes</h2>
            <p className="text-sm text-gray-500">Gestiona los planes disponibles y sus créditos</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={editing !== null}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Agregar Plan
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-xl ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'error' ? <AlertTriangle className="w-5 h-5 flex-shrink-0" /> : <Check className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Descargar Planes</h3>
              <p className="text-sm text-gray-500">Exportar configuración de planes como JSON</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Descarga un archivo JSON con todos los planes configurados. Útil como copia de seguridad o para migrar entre servidores.
          </p>
          <button
            onClick={handlePlansDownload}
            disabled={downloadingPlans}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {downloadingPlans ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar Planes
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Importar Planes</h3>
              <p className="text-sm text-gray-500">Cargar planes desde un archivo de backup</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Selecciona un archivo JSON previamente descargado. <strong className="text-red-600">Esto reemplazará todos los planes actuales.</strong>
          </p>
          <input
            ref={plansFileRef}
            type="file"
            accept=".json"
            onChange={handlePlansFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 file:cursor-pointer cursor-pointer"
          />
        </div>
      </div>

      {plansPreview && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Vista previa de planes a importar</h3>
              <p className="text-sm text-gray-500">
                Exportado: {new Date(plansPreview.exported_at).toLocaleString('es-MX')} · {plansPreview.data.plan_config.length} plan(es)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Slug</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Invitaciones</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Créditos Gen.</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Créditos Iter.</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">RSVP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plansPreview.data.plan_config.map((plan) => (
                  <tr key={plan.plan_slug} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 font-mono text-gray-600">{plan.plan_slug}</td>
                    <td className="py-2 px-3 font-medium text-gray-800">{plan.plan_name}</td>
                    <td className="py-2 px-3 text-center text-gray-700">{plan.invites_included}</td>
                    <td className="py-2 px-3 text-center text-blue-600">{plan.generation_credits}</td>
                    <td className="py-2 px-3 text-center text-purple-600">{plan.iteration_credits}</td>
                    <td className="py-2 px-3 text-center">{(plan as any).has_rsvp ? <Check className="w-4 h-4 text-green-500 inline-block" /> : <X className="w-4 h-4 text-gray-300 inline-block" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!confirmPlansRestore ? (
            <button
              onClick={() => setConfirmPlansRestore(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Importar Planes (reemplazar actuales)
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Confirmar importación</p>
                    <p className="text-sm text-red-600 mt-1">
                      Esto reemplazará TODOS los planes actuales con los del archivo. Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPlansRestore(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePlansUpload}
                  disabled={uploadingPlans}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {uploadingPlans ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Confirmar importación
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invitaciones</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Créditos Generación</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Créditos Iteración</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">RSVP</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {editing?.isNew && (
              <tr className="bg-purple-50/50">
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={editing.plan_slug}
                    onChange={(e) => setEditing({ ...editing, plan_slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                    placeholder="plan-slug"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={editing.plan_name || ''}
                    onChange={(e) => setEditing({ ...editing, plan_name: e.target.value })}
                    placeholder="Nombre del Plan"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    min="0"
                    value={editing.invites_included ?? 1}
                    onChange={(e) => setEditing({ ...editing, invites_included: parseInt(e.target.value) || 0 })}
                    className="w-20 text-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    min="0"
                    value={editing.generation_credits ?? 5}
                    onChange={(e) => setEditing({ ...editing, generation_credits: parseInt(e.target.value) || 0 })}
                    className="w-20 text-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    min="0"
                    value={editing.iteration_credits ?? 10}
                    onChange={(e) => setEditing({ ...editing, iteration_credits: parseInt(e.target.value) || 0 })}
                    className="w-20 text-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </td>
                <td className="py-3 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={editing.has_rsvp === 1}
                    onChange={(e) => setEditing({ ...editing, has_rsvp: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={handleSave} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={handleCancel} disabled={saving} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {plans.map((plan) => (
              editing && !editing.isNew && editing.plan_slug === plan.plan_slug ? (
                <tr key={plan.plan_slug} className="bg-blue-50/50">
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-gray-600">{plan.plan_slug}</span>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={editing.plan_name || ''}
                      onChange={(e) => setEditing({ ...editing, plan_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      value={editing.invites_included ?? plan.invites_included}
                      onChange={(e) => setEditing({ ...editing, invites_included: parseInt(e.target.value) || 0 })}
                      className="w-20 text-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      value={editing.generation_credits ?? plan.generation_credits}
                      onChange={(e) => setEditing({ ...editing, generation_credits: parseInt(e.target.value) || 0 })}
                      className="w-20 text-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      value={editing.iteration_credits ?? plan.iteration_credits}
                      onChange={(e) => setEditing({ ...editing, iteration_credits: parseInt(e.target.value) || 0 })}
                      className="w-20 text-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={editing.has_rsvp === 1}
                      onChange={(e) => setEditing({ ...editing, has_rsvp: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={handleSave} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button onClick={handleCancel} disabled={saving} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={plan.plan_slug} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{plan.plan_slug}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-gray-800">{plan.plan_name}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm font-semibold text-gray-700">{plan.invites_included}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm font-semibold text-blue-600">{plan.generation_credits}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm font-semibold text-purple-600">{plan.iteration_credits}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {plan.has_rsvp ? (
                      <Check className="w-4 h-4 text-green-500 inline-block" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 inline-block" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(plan)}
                        disabled={editing !== null}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleting === plan.plan_slug ? (
                        <>
                          <button
                            onClick={() => handleDelete(plan.plan_slug)}
                            disabled={saving}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Confirmar eliminación"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleting(null)}
                            disabled={saving}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleting(plan.plan_slug)}
                          disabled={editing !== null}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            ))}
            {plans.length === 0 && !editing && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                  No hay planes configurados. Haz clic en "Agregar Plan" para crear uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};