import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, Settings, Heart, X, ImagePlus, Palette, Type, ChevronDown } from 'lucide-react';
import { IMAGE_SOURCES } from '../constants';
import { Attachment, ImageSource } from '../types';

interface InitialViewProps {
  onGenerate: (prompt: string, attachments: Attachment[]) => void;
}

const EVENT_TYPES = [
  'Boda',
  'XV Años',
  'Bautizo',
  'Primera Comunión',
  'Confirmación',
  'Cumpleaños',
  'Baby Shower',
  'Otro'
];

export const InitialView: React.FC<InitialViewProps> = ({ 
  onGenerate
}) => {
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [theme, setTheme] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#f472b6');
  const [secondaryColor, setSecondaryColor] = useState('#fb7185');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  const [showEventTypeSelector, setShowEventTypeSelector] = useState(false);
  const eventTypeRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (eventTypeRef.current && !eventTypeRef.current.contains(event.target as Node)) {
        setShowEventTypeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSend = () => {
    // Construct the prompt based on the structured inputs
    let prompt = `Genera una invitación para un evento de tipo: ${eventType}.`;
    
    if (theme) {
      prompt += `\nEl tema o estilo visual principal debe ser: ${theme}.`;
    }
    
    prompt += `\nLa paleta de colores debe ser:`;
    if (primaryColor) prompt += `\n- Color Principal/Base: ${primaryColor}`;
    if (secondaryColor) prompt += `\n- Color Secundario/Acento: ${secondaryColor}`;

    onGenerate(prompt, attachments);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setAttachments(prev => [...prev, {
            type: 'image',
            content: result,
            mimeType: file.type
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-pink-50 relative overflow-y-auto text-gray-800 p-6">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-200/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center transition-all duration-300 py-12">
        
        {/* Logo / Header */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-pink-500/20 rotate-3 border border-pink-300/50">
            <Heart className="w-9 h-9 text-white fill-pink-300/50" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-gray-800 to-gray-600 tracking-tight text-center">
            Invitaciones Digitales
          </h1>
        </div>
        
        <h2 className="text-xl md:text-2xl font-light text-gray-600 mb-10 text-center leading-relaxed max-w-2xl">
          Diseña invitaciones únicas definiendo el estilo y los colores de tu evento.
        </h2>

        {/* Main Form Area */}
        <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl border border-pink-200 shadow-xl shadow-pink-100/50 flex flex-col p-8 gap-6">
          
          {/* Event Type Dropdown */}
          <div className="flex flex-col gap-2 relative" ref={eventTypeRef}>
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-pink-500" />
              Tipo de Evento
            </label>
            <button 
              onClick={() => { setShowEventTypeSelector(!showEventTypeSelector); setShowImageSelector(false); }}
              className="w-full flex items-center justify-between bg-white border border-pink-200 hover:border-pink-400 px-4 py-3 rounded-xl text-left text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all shadow-sm"
            >
              <span className="text-lg">{eventType}</span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>
            
            {showEventTypeSelector && (
              <div className="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-white border border-pink-200 rounded-2xl shadow-2xl z-[100] p-2 custom-scrollbar">
                {EVENT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => { setEventType(type); setShowEventTypeSelector(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center ${eventType === type ? 'bg-pink-50 text-pink-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Type className="w-4 h-4 text-pink-500" />
              Tema de la Invitación
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ej: Elegante, Floral, Rústico, Minimalista, Playa..."
              className="w-full bg-white border border-pink-200 hover:border-pink-400 px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all shadow-sm text-lg placeholder:text-gray-400"
            />
          </div>

          {/* Color Palette */}
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-500" />
              Paleta de Colores
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">Color Principal / Base</span>
                <div className="flex items-center gap-3 bg-white border border-pink-200 hover:border-pink-400 px-3 py-2 rounded-xl transition-all shadow-sm">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-sm text-gray-700 font-mono uppercase">{primaryColor}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">Color Secundario / Acento</span>
                <div className="flex items-center gap-3 bg-white border border-pink-200 hover:border-pink-400 px-3 py-2 rounded-xl transition-all shadow-sm">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-sm text-gray-700 font-mono uppercase">{secondaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-pink-500" />
              Imagen de Inspiración (Opcional)
            </label>
            <div className="flex flex-col gap-3">
              <label className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-pink-300 hover:border-pink-500 hover:bg-pink-50 rounded-xl cursor-pointer transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ImageIcon className="w-8 h-8 text-pink-400 mb-2" />
                  <p className="text-sm text-gray-500"><span className="font-semibold text-pink-600">Haz clic para subir</span> o arrastra una imagen</p>
                </div>
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
              </label>
              
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-pink-200 shadow-sm">
                      <img src={att.content} alt="Inspiración" className="w-20 h-20 object-cover" />
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="absolute top-1 right-1 bg-white/80 hover:bg-red-500 hover:text-white text-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-2">
            {/* Generate Button */}
            <button 
              onClick={handleSend}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
            >
              Generar Invitación
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
