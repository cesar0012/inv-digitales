import React from 'react';
import { X, AlertTriangle, FileText, Calendar, RefreshCw } from 'lucide-react';
import { InvitationFile } from '../services/apiService';

interface ReplaceInvitationModalProps {
  invitations: InvitationFile[];
  maxInvitations: number;
  onSelect: (filename: string) => void;
  onCancel: () => void;
}

export const ReplaceInvitationModal: React.FC<ReplaceInvitationModalProps> = ({
  invitations,
  maxInvitations,
  onSelect,
  onCancel
}) => {
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

  const getEventLabel = (filename: string, eventType: string) => {
    const num = filename.replace('invitation_', '').replace('.html', '');
    const shortNum = num.length > 6 ? num.slice(-6) : num;
    return `${eventType} #${shortNum}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Límite alcanzado</h2>
                <p className="text-sm text-gray-500">
                  Tienes {maxInvitations} invitación{maxInvitations !== 1 ? 'es' : ''} almacenada{maxInvitations !== 1 ? 's' : ''} como máximo
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/80 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            Selecciona la invitación que deseas <strong>reemplazar</strong>. La invitación anterior se eliminará de tus guardadas y la nueva ocupará su lugar.
          </p>

          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {invitations.map((inv) => (
              <div
                key={inv.filename}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-amber-300 hover:bg-amber-50/50 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-pink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {getEventLabel(inv.filename, inv.event_type)}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(inv.created_at)}
                    </span>
                    <span className="text-xs text-gray-400">{formatSize(inv.size)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onSelect(inv.filename)}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reemplazar</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-400">
            Tus invitaciones en el historial no se verán afectadas
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-colors text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};