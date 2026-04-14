import React, { useState, useEffect } from 'react';
import { Save, Key, Cpu, MessageSquare, Image, Loader2, Bot, Settings } from 'lucide-react';
import { AI_MODELS } from '../../constants';
import { AIModel } from '../../types';
import { getAdminConfig, saveAdminConfig } from '../../services/adminService';

type Section = 'html' | 'images' | 'general';

const GEMINI_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'Google' },
];

export const AdminModels: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('html');
  const [loading, setLoading] = useState(true);
  
  // HTML Config - solo Gemini
  const [htmlGoogleApiKey, setHtmlGoogleApiKey] = useState('');
  const [htmlGoogleModel, setHtmlGoogleModel] = useState('gemini-3.1-pro-preview');
  
  // Image Config
  const [imageModel, setImageModel] = useState<AIModel['id']>('gemini-3.1-flash-image-preview');
  const [imageApiKey, setImageApiKey] = useState('');
  
  // General Config
  const [loginPageUrl, setLoginPageUrl] = useState('/admin-login');
  
  // Save states
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAdminConfig({
        login_page_url: loginPageUrl
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await getAdminConfig();
      setHtmlGoogleApiKey(config.html_google_api_key || '');
      setHtmlGoogleModel(config.html_google_model || 'gemini-3.1-pro-preview');
      setImageModel(config.image_model);
      setImageApiKey(config.image_api_key);
      setLoginPageUrl(config.login_page_url || '/admin-login');
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
          <Cpu className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Configuración de Modelos AI</h2>
          <p className="text-sm text-gray-500">Configura las APIs para generación de invitaciones e imágenes</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
          <span className="ml-2 text-gray-500">Cargando configuración...</span>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveSection('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeSection === 'general'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setActiveSection('html')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeSection === 'html'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Generador HTML
            </button>
            <button
              onClick={() => setActiveSection('images')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeSection === 'images'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Image className="w-4 h-4" />
              Imágenes IA
            </button>
          </div>

          {activeSection === 'general' && (
            <GeneralConfig
              loginPageUrl={loginPageUrl}
              onLoginPageUrlChange={setLoginPageUrl}
              onSave={handleSave}
              saving={saving}
              saved={saved}
            />
          )}

          {activeSection === 'html' && <HTMLGeneratorConfig 
            googleApiKey={htmlGoogleApiKey}
            setGoogleApiKey={setHtmlGoogleApiKey}
            googleModel={htmlGoogleModel}
            setGoogleModel={setHtmlGoogleModel}
          />}
          {activeSection === 'images' && <ImageGeneratorConfig 
            selectedModel={imageModel}
            setSelectedModel={setImageModel}
            apiKey={imageApiKey}
            setApiKey={setImageApiKey}
            loginPageUrl={loginPageUrl}
          />}
        </>
      )}
    </div>
  );
};

interface HTMLGeneratorProps {
  googleApiKey: string;
  setGoogleApiKey: (value: string) => void;
  googleModel: string;
  setGoogleModel: (value: string) => void;
}

const HTMLGeneratorConfig: React.FC<HTMLGeneratorProps> = ({ 
  googleApiKey, setGoogleApiKey,
  googleModel, setGoogleModel
}) => {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalModel = googleModel;
      if (showCustomInput && customModel) {
        finalModel = customModel;
      }

      const configData = {
        html_provider: 'gemini',
        html_base_url: 'https://generativelanguage.googleapis.com',
        html_api_key: '',
        html_model: 'gemini-3.1-pro-preview',
        html_google_api_key: googleApiKey,
        html_google_model: finalModel,
      };

      console.log('=== GUARDANDO DESDE FRONTEND ===');
      console.log('googleApiKey input:', googleApiKey ? 'TIENE VALOR' : 'VACÍO');
      console.log('configData a enviar:', JSON.stringify(configData));
      console.log('=================================');

      await saveAdminConfig(configData);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <p className="text-sm text-purple-700 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Proveedor activo: <strong>Google Gemini</strong>
        </p>
      </div>

      <div className="space-y-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
        <p className="text-sm text-purple-700">
          Configura Google AI Platform para usar modelos Gemini
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-pink-500" />
            Google AI Platform API Key
          </label>
          <input
            type="password"
            value={googleApiKey}
            onChange={(e) => setGoogleApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-pink-500" />
            Modelo Gemini
          </label>
          <select
            value={showCustomInput ? 'custom' : googleModel}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setShowCustomInput(true);
              } else {
                setShowCustomInput(false);
                setGoogleModel(e.target.value);
              }
            }}
            className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800"
          >
            <optgroup label="Modelos Gemini">
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </optgroup>
            <option value="custom">Otro modelo (escribir nombre)</option>
          </select>
          
          {showCustomInput && (
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="Escribe el nombre del modelo"
              className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800 font-mono text-sm mt-2"
            />
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !googleApiKey}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/25'
        }`}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '¡Configuración guardada!' : 'Guardar Configuración'}
      </button>
    </div>
  );
};

interface ImageGeneratorProps {
  selectedModel: AIModel['id'];
  setSelectedModel: (value: AIModel['id']) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  loginPageUrl: string;
}

const ImageGeneratorConfig: React.FC<ImageGeneratorProps> = ({ 
  selectedModel, setSelectedModel, 
  apiKey, setApiKey,
  loginPageUrl
}) => {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAdminConfig({
        html_google_api_key: '', // Mantener actual
        image_model: selectedModel,
        image_api_key: apiKey,
        login_page_url: loginPageUrl
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <p className="text-sm text-purple-700">
          Google AI Platform (NanoBanana) se usa para generar imágenes temáticas para las invitaciones.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Key className="w-4 h-4 text-pink-500" />
          Google AI Platform API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Ingresa tu API Key de Google AI Platform"
          className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800 font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Modelo de Generación de Imágenes</label>
        <div className="space-y-2">
          {AI_MODELS.map((model) => (
            <label
              key={model.id}
              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                selectedModel === model.id
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
              }`}
            >
              <input
                type="radio"
                name="imageModel"
                value={model.id}
                checked={selectedModel === model.id}
                onChange={() => setSelectedModel(model.id)}
                className="w-4 h-4 text-pink-500 focus:ring-pink-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-800">{model.name}</p>
                <p className="text-xs text-gray-500">{model.provider}</p>
              </div>
              {selectedModel === model.id && (
                <span className="px-3 py-1 bg-pink-500 text-white text-xs font-medium rounded-full">
                  Activo
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/25'
        }`}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '¡Configuración guardada!' : 'Guardar Configuración'}
      </button>
    </div>
  );
};

interface GeneralConfigProps {
  loginPageUrl: string;
  onLoginPageUrlChange: (url: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

const GeneralConfig: React.FC<GeneralConfigProps> = ({ loginPageUrl, onLoginPageUrlChange, onSave, saving, saved }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Configuración General</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Página de Login
          </label>
          <input
            type="text"
            value={loginPageUrl}
            onChange={(e) => onLoginPageUrlChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            placeholder="/admin-login"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL a la que se redireccionará cuando el usuario no esté autenticado
          </p>
        </div>
      </div>
      
      <button
        onClick={onSave}
        disabled={saving}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/25'
        }`}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '¡Configuración guardada!' : 'Guardar Configuración'}
      </button>
    </div>
  );
};