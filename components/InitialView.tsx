import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Settings, Heart, X, ImagePlus, Palette, Type, ChevronDown, Save, Home, AlertCircle, FileText, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Attachment, EditorConfig } from '../types';
import { compressImage, SUPPORTED_IMAGE_TYPES, SUPPORTED_FORMATS_LABEL } from '../services/imageCompressionService';
import { EVENT_TYPES, EVENT_DEFAULT_COLORS, VISUAL_STYLES, MOODS, EVENT_STYLE_SUGGESTIONS } from '../constants';

interface InitialViewProps {
  onGenerate: (prompt: string, attachments: Attachment[], config: EditorConfig) => void;
  onSaveInvitation?: () => void;
  hasCode?: boolean;
  isReplace?: boolean;
  initialEventType?: string;
  initialTheme?: string;
  initialPrimaryColor?: string;
  initialSecondaryColor?: string;
  initialEventDetails?: string;
  initialEventDate?: string;
  initialEventTime?: string;
}

export const InitialView: React.FC<InitialViewProps> = ({ 
  onGenerate,
  onSaveInvitation,
  hasCode = false,
  isReplace = false,
  initialEventType = '',
  initialTheme = '',
  initialPrimaryColor = '#f472b6',
  initialSecondaryColor = '#fb7185',
  initialEventDetails = '',
  initialEventDate = '',
  initialEventTime = ''
}) => {
  const navigate = useNavigate();
  const [eventType, setEventType] = useState(initialEventType || '');
  const [theme, setTheme] = useState(initialTheme);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondaryColor);
  const [eventDetails, setEventDetails] = useState(initialEventDetails);
  const [eventDate, setEventDate] = useState(initialEventDate || '');
  const [eventTime, setEventTime] = useState(initialEventTime || '');
  const [visualStyle, setVisualStyle] = useState('');
  const [mood, setMood] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showEventTypeSelector, setShowEventTypeSelector] = useState(false);
  const [showVisualStyleSelector, setShowVisualStyleSelector] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const eventTypeRef = useRef<HTMLDivElement>(null);
  const visualStyleRef = useRef<HTMLDivElement>(null);
  const moodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialEventType) setEventType(initialEventType);
    if (initialTheme) setTheme(initialTheme);
    if (initialPrimaryColor) setPrimaryColor(initialPrimaryColor);
    if (initialSecondaryColor) setSecondaryColor(initialSecondaryColor);
    if (initialEventDetails) setEventDetails(initialEventDetails);
    if (initialEventDate) setEventDate(initialEventDate);
    if (initialEventTime) setEventTime(initialEventTime);
  }, [initialEventType, initialTheme, initialPrimaryColor, initialSecondaryColor, initialEventDetails, initialEventDate, initialEventTime]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (eventTypeRef.current && !eventTypeRef.current.contains(event.target as Node)) {
        setShowEventTypeSelector(false);
      }
      if (visualStyleRef.current && !visualStyleRef.current.contains(event.target as Node)) {
        setShowVisualStyleSelector(false);
      }
      if (moodRef.current && !moodRef.current.contains(event.target as Node)) {
        setShowMoodSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSend = () => {
    if (!eventType) {
      setError('Por favor, selecciona un tipo de evento');
      return;
    }
    if (!eventDetails || eventDetails.trim().length < 10) {
      setError('Por favor, agrega detalles del evento (mínimo 10 caracteres)');
      return;
    }
    setError(null);

    let prompt = `Genera una invitación para un evento de tipo: ${eventType}.`;
    
    if (theme) {
      prompt += `\nEl tema o estilo visual principal debe ser: ${theme}.`;
    }
    
    if (visualStyle) {
      prompt += `\nEstilo visual preferido: ${visualStyle}.`;
    }
    
    if (mood) {
      prompt += `\nTono y ánimo: ${mood}.`;
    }
    
    prompt += `\n\nDetalles específicos del evenimiento:\n${eventDetails.trim()}`;
    
    if (eventDate) {
      prompt += `\n\nLa fecha del evento es: ${eventDate}`;
    }
    if (eventTime) {
      prompt += `\nLa hora del evento es: ${eventTime}`;
    }
    
    prompt += `\n\nLa paleta de colores debe ser:`;
    if (primaryColor) prompt += `\n- Color Principal/Base: ${primaryColor}`;
    if (secondaryColor) prompt += `\n- Color Secundario/Acento: ${secondaryColor}`;

    const config: EditorConfig = {
      eventType,
      theme: theme || '',
      primaryColor,
      secondaryColor,
      eventDetails: eventDetails.trim(),
      eventDate: eventDate || undefined,
      eventTime: eventTime || undefined,
      visualStyle: visualStyle || undefined,
      mood: mood || undefined
    };

    onGenerate(prompt, attachments, config);
  };

  const processFiles = async (files: FileList | File[]) => {
    setIsCompressing(true);
    for (const file of Array.from(files)) {
      const name = file.name.toLowerCase();
      const type = file.type.toLowerCase();
      const isHeic = type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
      const isSupported = type.startsWith('image/') || isHeic;

      if (!isSupported) {
        alert(`Formato no soportado. Usa: ${SUPPORTED_FORMATS_LABEL}`);
        continue;
      }

      try {
        const compressedBase64 = await compressImage(file);
        setAttachments(prev => [...prev, {
          type: 'image',
          content: compressedBase64,
          mimeType: 'image/jpeg'
        }]);
      } catch (error) {
        console.error('Error al procesar imagen:', error);
        alert(`Error al procesar la imagen. Formatos soportados: ${SUPPORTED_FORMATS_LABEL}`);
      }
    }
    setIsCompressing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    e.target.value = '';
    await processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-pink-50 relative overflow-y-auto text-gray-800 p-6">
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-200/30 rounded-full blur-[120px]" />
      </div>

      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/90 hover:bg-white border border-pink-200 rounded-xl text-gray-600 hover:text-pink-600 transition-all shadow-lg hover:shadow-xl backdrop-blur-sm"
        >
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </button>
      </div>
      
      {hasCode && onSaveInvitation && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => onSaveInvitation()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl ${
              isReplace
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">{isReplace ? 'Guardar y Reemplazar' : 'Guardar'}</span>
          </button>
        </div>
      )}

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center transition-all duration-300 py-12 pt-20">
        
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-pink-500/20 rotate-3 border border-pink-300/50">
            <Heart className="w-9 h-9 text-white fill-pink-300/50" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-gray-800 to-gray-600 tracking-tight text-center">
            Invitaciones Digitales
          </h1>
        </div>
        
        <h2 className="text-xl md:text-2xl font-light text-gray-600 mb-10 text-center leading-relaxed max-w-2xl">
          {isReplace ? 'Genera una nueva invitación para reemplazar la anterior.' : 'Diseña invitaciones únicas definiendo el estilo y los colores de tu evento.'}
        </h2>

        <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl border border-pink-200 shadow-xl shadow-pink-100/50 flex flex-col p-8 gap-6">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 relative" ref={eventTypeRef}>
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-pink-500" />
              Tipo de Evento <span className="text-red-400">*</span>
            </label>
            <button 
              onClick={() => setShowEventTypeSelector(!showEventTypeSelector)}
              className={`w-full flex items-center justify-between bg-white border ${!eventType ? 'border-red-300' : 'border-pink-200 hover:border-pink-400'} px-4 py-3 rounded-xl text-left text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all shadow-sm`}
            >
              <span className={`text-lg ${!eventType ? 'text-gray-400' : ''}`}>
                {eventType || 'Selecciona un tipo de evento...'}
              </span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>
            
            {showEventTypeSelector && (
              <div className="absolute top-full left-0 mt-2 w-full max-h-72 overflow-y-auto bg-white border border-pink-200 rounded-2xl shadow-2xl z-[100] p-2 custom-scrollbar">
                {EVENT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setEventType(type);
                      setShowEventTypeSelector(false);
                      setError(null);
                      const defaults = EVENT_DEFAULT_COLORS[type];
                      if (defaults) {
                        setPrimaryColor(defaults.primary);
                        setSecondaryColor(defaults.secondary);
                      }
                      const suggestions = EVENT_STYLE_SUGGESTIONS[type] || EVENT_STYLE_SUGGESTIONS['Otro'];
                      const suggestedStyles = suggestions.styles;
                      const suggestedMoods = suggestions.moods;
                      setVisualStyle(suggestedStyles[Math.floor(Math.random() * suggestedStyles.length)]);
                      setMood(suggestedMoods[Math.floor(Math.random() * suggestedMoods.length)]);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center ${eventType === type ? 'bg-pink-50 text-pink-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                Fecha del Evento
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-white border border-pink-200 hover:border-pink-400 px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all shadow-sm text-lg"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-500" />
                Hora del Evento
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full bg-white border border-pink-200 hover:border-pink-400 px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all shadow-sm text-lg"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 relative" ref={visualStyleRef}>
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-pink-500" />
                Estilo Visual
              </label>
              <button
                type="button"
                onClick={() => { setShowVisualStyleSelector(!showVisualStyleSelector); setShowMoodSelector(false); }}
                className="w-full flex items-center justify-between bg-white border border-pink-200 hover:border-pink-400 px-4 py-3 rounded-xl text-left text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all shadow-sm"
              >
                <span className={`text-base ${!visualStyle ? 'text-gray-400' : ''}`}>
                  {visualStyle || 'Aleatorio'}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>
              {showVisualStyleSelector && (
                <div className="absolute top-full left-0 mt-2 w-full max-h-56 overflow-y-auto bg-white border border-pink-200 rounded-2xl shadow-2xl z-[100] p-2 custom-scrollbar">
                  <button
                    onClick={() => { setVisualStyle(''); setShowVisualStyleSelector(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors text-sm ${!visualStyle ? 'bg-pink-50 text-pink-600 font-medium' : 'hover:bg-gray-50 text-gray-500'}`}
                  >
                    Aleatorio
                  </button>
                  {VISUAL_STYLES.filter(s => s !== '').map(style => (
                    <button
                      key={style}
                      onClick={() => { setVisualStyle(style); setShowVisualStyleSelector(false); }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors text-sm ${visualStyle === style ? 'bg-pink-50 text-pink-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 relative" ref={moodRef}>
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                Tono / Ambiente
              </label>
              <button
                type="button"
                onClick={() => { setShowMoodSelector(!showMoodSelector); setShowVisualStyleSelector(false); }}
                className="w-full flex items-center justify-between bg-white border border-pink-200 hover:border-pink-400 px-4 py-3 rounded-xl text-left text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all shadow-sm"
              >
                <span className={`text-base ${!mood ? 'text-gray-400' : ''}`}>
                  {mood || 'Aleatorio'}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>
              {showMoodSelector && (
                <div className="absolute top-full left-0 mt-2 w-full max-h-56 overflow-y-auto bg-white border border-pink-200 rounded-2xl shadow-2xl z-[100] p-2 custom-scrollbar">
                  <button
                    onClick={() => { setMood(''); setShowMoodSelector(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors text-sm ${!mood ? 'bg-pink-50 text-pink-600 font-medium' : 'hover:bg-gray-50 text-gray-500'}`}
                  >
                    Aleatorio
                  </button>
                  {MOODS.filter(m => m !== '').map(m => (
                    <button
                      key={m}
                      onClick={() => { setMood(m); setShowMoodSelector(false); }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors text-sm ${mood === m ? 'bg-pink-50 text-pink-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-pink-500" />
              Detalles del Evento <span className="text-red-400">*</span>
            </label>
            <textarea
              value={eventDetails}
              onChange={(e) => setEventDetails(e.target.value)}
              placeholder="Ej: El evento será en un jardín al aire libre, habrá mariachi, la festejada se llama María, es una celebración íntima con familia cercana..."
              rows={3}
              className={`w-full bg-white border ${!eventDetails || eventDetails.trim().length < 10 ? 'border-red-300' : 'border-pink-200 hover:border-pink-400'} px-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all shadow-sm text-base placeholder:text-gray-400 resize-none`}
            />
            <span className="text-xs text-gray-400">
              Mínimo 10 caracteres. Incluye nombres, lugar, tipo de celebración, etc.
            </span>
          </div>

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

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-pink-500" />
              Imagen de Inspiración (Opcional)
            </label>
            <div className="flex flex-col gap-3">
              <div
                className={`w-full flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-pink-500 bg-pink-100'
                    : isCompressing
                    ? 'border-pink-400 bg-pink-50'
                    : 'border-pink-300 hover:border-pink-500 hover:bg-pink-50'
                }`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isCompressing && document.getElementById('initial-file-input')?.click()}
              >
                {isCompressing ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-2" />
                    <p className="text-sm text-pink-600 font-medium">Procesando imagen...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 text-pink-400 mb-2" />
                    <p className="text-sm text-gray-500"><span className="font-semibold text-pink-600">Haz clic para subir</span> o arrastra una imagen</p>
                    <p className="text-xs text-gray-400 mt-1">{SUPPORTED_FORMATS_LABEL}</p>
                  </div>
                )}
                <input id="initial-file-input" type="file" className="hidden" accept={SUPPORTED_IMAGE_TYPES} multiple onChange={handleFileUpload} />
              </div>
              
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

          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-2">
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
