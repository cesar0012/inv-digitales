import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RAGModule } from '../../services/adminService';

interface RAGModuleModalProps {
  module: Partial<RAGModule>;
  onSave: (module: Partial<RAGModule>) => void;
  onClose: () => void;
}

const MODULE_TYPES = [
  'portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'vestimenta', 'regalos', 'galeria',
  'hospedaje', 'transporte', 'music', 'quotes', 'mensaje', 'pascar', 'mensaje_padres', 'gracias'
];

export const RAGModuleModal: React.FC<RAGModuleModalProps> = ({ module, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<RAGModule>>({
    module_id: '',
    module_type: 'portada',
    style_name: '',
    description: '',
    tags: [],
    descripcion_larga: '',
    theme_tags: [],
    color_palette: {},
    css_variables: {},
    is_active: 1,
    category: 'general',
    html_content: ''
  });

  useEffect(() => {
    if (module) {
      setFormData(module);
    }
  }, [module]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof RAGModule, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold">{module.id ? 'Editar Módulo' : 'Nuevo Módulo'}</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Module ID *</label>
              <input
                type="text"
                value={formData.module_id || ''}
                onChange={(e) => handleChange('module_id', e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="ej: portada-nombre"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Module Type *</label>
              <select
                value={formData.module_type}
                onChange={(e) => handleChange('module_type', e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                {MODULE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Style Name *</label>
              <input
                type="text"
                value={formData.style_name || ''}
                onChange={(e) => handleChange('style_name', e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="ej: Portada Castillo con Fotos"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={2}
                placeholder="Descripción breve del módulo"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Descripción Larga (para RAG)</label>
              <textarea
                value={formData.descripcion_larga || ''}
                onChange={(e) => handleChange('descripcion_larga', e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Descripción detallada del propósito del módulo (máx 250 chars)"
                maxLength={250}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Tags (separados por coma)</label>
              <input
                type="text"
                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                onChange={(e) => handleChange('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                className="w-full border rounded px-3 py-2"
                placeholder="ej: portada, boda, castillo, hero, elegante"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <select
                value={formData.category || 'general'}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="general">General (agnóstico)</option>
                <option value="boda">Boda</option>
                <option value="xv-anos">XV Años</option>
                <option value="cumpleanos">Cumpleaños</option>
                <option value="bautizo">Bautizo</option>
                <option value="primera-comunion">Primera Comunión</option>
                <option value="confirmacion">Confirmación</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Activo</label>
              <select
                value={formData.is_active}
                onChange={(e) => handleChange('is_active', parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                <option value={1}>Sí</option>
                <option value={0}>No</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">HTML Content</label>
              <textarea
                value={formData.html_content || ''}
                onChange={(e) => handleChange('html_content', e.target.value)}
                className="w-full border rounded px-3 py-2 font-mono text-xs"
                rows={10}
                placeholder="Pega el HTML del módulo aquí..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              {module.id ? 'Actualizar' : 'Crear'} Módulo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};