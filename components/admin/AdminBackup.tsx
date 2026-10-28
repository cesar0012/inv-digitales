import React, { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Loader2, Database, HardDrive } from 'lucide-react';
import { downloadBackup, uploadBackup, BackupData } from '../../services/adminService';

export const AdminBackup: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupData | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setMessage(null);
    try {
      await downloadBackup();
      setMessage({ type: 'success', text: 'Backup descargado correctamente' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al descargar backup' });
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setConfirmRestore(false);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.version || !data.data) {
          setMessage({ type: 'error', text: 'Formato de backup inválido' });
          setPreview(null);
          return;
        }
        setPreview(data);
      } catch {
        setMessage({ type: 'error', text: 'El archivo no es un JSON válido' });
        setPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!preview) return;
    setUploading(true);
    setMessage(null);
    try {
      const result = await uploadBackup(preview);
      setMessage({ type: 'success', text: result.message || 'Backup restaurado correctamente' });
      setConfirmRestore(false);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al restaurar backup' });
      setConfirmRestore(false);
    } finally {
      setUploading(false);
    }
  };

  const tableLabels: Record<string, string> = {
    users: 'Usuarios',
    user_plans: 'Planes de usuario',
    invitations: 'Invitaciones',
    plan_config: 'Configuración de planes',
    local_users: 'Usuarios locales'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Descargar Backup</h3>
              <p className="text-sm text-gray-500">Exportar todos los datos de la base de datos</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Descarga un archivo JSON con todas las tablas: usuarios, planes, invitaciones y configuración.
          </p>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar Backup
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
              <h3 className="font-semibold text-gray-800">Restaurar Backup</h3>
              <p className="text-sm text-gray-500">Cargar datos desde un archivo de backup</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Selecciona un archivo JSON previamente descargado. <strong className="text-red-600">Esto reemplazará todos los datos actuales.</strong>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 file:cursor-pointer cursor-pointer"
          />
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-xl ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {preview && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Vista previa del backup</h3>
              <p className="text-sm text-gray-500">
                Exportado: {new Date(preview.exported_at).toLocaleString('es-MX')} · Versión {preview.version}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {Object.entries(tableLabels).map(([key, label]) => {
              const count = preview.data[key as keyof typeof preview.data]?.length ?? 0;
              return (
                <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{count}</span>
                  <span className="text-xs text-gray-400 ml-1">regs</span>
                </div>
              );
            })}
          </div>

          {!confirmRestore ? (
            <button
              onClick={() => setConfirmRestore(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Restaurar Backup (reemplazar datos)
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Confirmar restauración</p>
                    <p className="text-sm text-red-600 mt-1">
                      Esto reemplazará TODOS los datos actuales con los del backup. Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRestore(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Confirmar restauración
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};