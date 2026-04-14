import React from 'react';
import { X, Share2, ExternalLink, Copy, Check } from 'lucide-react';

interface InvitationPreviewModalProps {
  slug: string;
  publicUrl: string;
  eventType: string;
  onClose: () => void;
  onShare: () => void;
}

export const InvitationPreviewModal: React.FC<InvitationPreviewModalProps> = ({
  slug,
  publicUrl,
  eventType,
  onClose,
  onShare
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full max-w-6xl max-h-[95vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden m-4">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">✓</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Vista Previa</h2>
              <p className="text-sm text-gray-500">{eventType}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-500/25"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
          <div className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden">
            <iframe
              src={publicUrl}
              className="w-full h-full border-0"
              title="Vista previa de invitación"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
              <span className="text-sm text-gray-500 truncate flex-1">{publicUrl}</span>
            </div>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Copiar</span>
                </>
              )}
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Nueva pestaña</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
