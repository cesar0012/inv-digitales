/**
 * ============================================================================
 * I18N — soporte bilingüe ES/EN para la APP DEL USUARIO
 * ============================================================================
 * Alcance (decisión de producto):
 *   - SÍ se traduce: Dashboard, Wizard de creación (conceptos, pasos,
 *     etiquetas del formulario), y la INVITACIÓN FINAL del usuario
 *     (traducción server-side con Gemini al generar con language=en).
 *   - NO se traduce: sitio público de SEO/catálogo (queda en español),
 *     historial (guarda la versión en español), panel de admin.
 *
 * La preferencia se guarda en localStorage ('im_lang') y se selecciona
 * desde el Dashboard. El idioma viaja al servidor en los payloads de
 * generación (editorConfig.language / body.language).
 * ============================================================================
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

export type Lang = 'es' | 'en';

const STORAGE_KEY = 'im_lang';

export const getStoredLang = (): Lang => {
  try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es'; } catch { return 'es'; }
};
export const setStoredLang = (l: Lang) => {
  try { localStorage.setItem(STORAGE_KEY, l); } catch { /* privado */ }
};

// ---------------------------------------------------------------------------
// Diccionario — solo las cadenas de la app de usuario que se muestran al
// elegir inglés. Claves por contexto para legibilidad.
// ---------------------------------------------------------------------------
type Dict = Record<string, string>;
const ES: Dict = {
  'dash.title': 'Mis Invitaciones',
  'dash.welcome': 'Hola',
  'dash.logout': 'Salir',
  'dash.myPlans': 'Mis planes',
  'dash.myPlan': 'Mi plan',
  'dash.tapToSwitch': '— toca para cambiar',
  'dash.active': 'Activo',
  'dash.generation': 'Generación',
  'dash.aiChanges': 'Cambios IA',
  'dash.invitations': 'Invitaciones',
  'dash.create': 'Crear nueva invitación',
  'dash.noGeneration': 'Sin créditos de generación',
  'dash.noInvites': 'Sin invitaciones disponibles',
  'dash.featured': 'Invitación destacada',
  'dash.public': 'Pública',
  'dash.view': 'Ver',
  'dash.share': 'Compartir',
  'dash.edit': 'Editar',
  'dash.noFeatured': 'Sin invitación destacada',
  'dash.noFeaturedHint': 'Genera tu primera invitación y destácala aquí para compartir el enlace público.',
  'dash.history': 'Historial',
  'dash.loading': 'Cargando tu panel...',
  'dash.connError': 'Error de conexión',
  'dash.retry': 'Reintentar',
  'dash.noPlans': 'Sin planes activos',
  'dash.noPlansHint': 'Adquiere un plan para comenzar a crear invitaciones.',
  'dash.deleteConfirm': '¿Eliminar?',
  'dash.yes': 'Sí',
  'dash.no': 'No',
  'dash.language': 'Idioma',
  'dash.featuredStar': 'Destacar',
  'dash.isPublicStar': 'Invitación pública actual',

  'wiz.step1': 'Evento',
  'wiz.step2': 'Tu estilo',
  'wiz.step3': 'Datos y vista previa',
  'wiz.next': 'Continuar',
  'wiz.back': 'Atrás',
  'wiz.createBase': 'Generar diseño base',
  'wiz.generatingBase': 'Generando tu diseño base...',
  'wiz.finish': 'Terminar y abrir en el editor',
  'wiz.openEditor': 'Abrir en el editor',
  'wiz.waitingGeneration': 'Esperando la generación...',
  'wiz.chooseEvent': '¿Qué tipo de evento celebras?',
  'wiz.describeParty': 'Describe tu fiesta',
  'wiz.describeHint': 'Tema, ambiente, detalles que sueñas... ej. mariposas volando en un campo dorado al atardecer',
  'wiz.colors': 'Colores',
  'wiz.primaryColor': 'Color principal',
  'wiz.secondaryColor': 'Color secundario',
  'wiz.yourData': 'Tus datos',
  'wiz.addAnother': 'Agregar otra…',
  'wiz.required': 'Obligatorio',

  'event.boda-tradicional': 'Traditional Wedding',
  'event.boda-americana': 'American Wedding',
  'event.boda-gay-h': 'Gay Wedding (Grooms)',
  'event.boda-gay-m': 'Gay Wedding (Brides)',
  'event.xv-anos': 'Sweet Fifteen',
  'event.bautizo': 'Baptism',
  'event.comunion': 'First Communion',
  'event.confirmacion': 'Confirmation',
  'event.cumpleanos-nino': "Boy's Birthday",
  'event.cumpleanos-nina': "Girl's Birthday",
  'event.baby-shower': 'Baby Shower',
  'event.otro': 'Other',
  'event.boda': 'Wedding',
  'event.cumpleanos': 'Birthday'
};

const EN: Dict = { ...ES }; // EN ES la fuente; el diccionario ES sobrescribe
const DICTS: Record<Lang, Dict> = { es: ES, en: EN };

// Traducciones ES para las claves que EN define en inglés
const ES_TRANSLATIONS: Dict = {
  'dash.title': 'Mis Invitaciones',
  'dash.welcome': 'Hola',
  'dash.logout': 'Salir',
  'dash.myPlans': 'Mis planes',
  'dash.myPlan': 'Mi plan',
  'dash.tapToSwitch': '— toca para cambiar',
  'dash.active': 'Activo',
  'dash.generation': 'Generación',
  'dash.aiChanges': 'Cambios IA',
  'dash.invitations': 'Invitaciones',
  'dash.create': 'Crear nueva invitación',
  'dash.noGeneration': 'Sin créditos de generación',
  'dash.noInvites': 'Sin invitaciones disponibles',
  'dash.featured': 'Invitación destacada',
  'dash.public': 'Pública',
  'dash.view': 'Ver',
  'dash.share': 'Compartir',
  'dash.edit': 'Editar',
  'dash.noFeatured': 'Sin invitación destacada',
  'dash.noFeaturedHint': 'Genera tu primera invitación y destácala aquí para compartir el enlace público.',
  'dash.history': 'Historial',
  'dash.loading': 'Cargando tu panel...',
  'dash.connError': 'Error de conexión',
  'dash.retry': 'Reintentar',
  'dash.noPlans': 'Sin planes activos',
  'dash.noPlansHint': 'Adquiere un plan para comenzar a crear invitaciones.',
  'dash.deleteConfirm': '¿Eliminar?',
  'dash.yes': 'Sí',
  'dash.no': 'No',
  'dash.language': 'Idioma',
  'dash.featuredStar': 'Destacar',
  'dash.isPublicStar': 'Invitación pública actual',
  'wiz.step1': 'Evento',
  'wiz.step2': 'Tu estilo',
  'wiz.step3': 'Datos y vista previa',
  'wiz.next': 'Continuar',
  'wiz.back': 'Atrás',
  'wiz.createBase': 'Generar diseño base',
  'wiz.generatingBase': 'Generando tu diseño base...',
  'wiz.finish': 'Terminar y abrir en el editor',
  'wiz.openEditor': 'Abrir en el editor',
  'wiz.waitingGeneration': 'Esperando la generación...',
  'wiz.chooseEvent': '¿Qué tipo de evento celebras?',
  'wiz.describeParty': 'Describe tu fiesta',
  'wiz.describeHint': 'Tema, ambiente, detalles que sueñas... ej. mariposas volando en un campo dorado al atardecer',
  'wiz.colors': 'Colores',
  'wiz.primaryColor': 'Color principal',
  'wiz.secondaryColor': 'Color secundario',
  'wiz.yourData': 'Tus datos',
  'wiz.addAnother': 'Agregar otra…',
  'wiz.required': 'Obligatorio'
};
DICTS.es = { ...ES_TRANSLATIONS };

/** Etiqueta de evento en el idioma dado. Los ids del wizard son los del pack. */
export const eventLabel = (idOrName: string, lang: Lang): string => {
  if (lang === 'es') return idOrName;
  const k = idOrName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const direct = DICTS.en[`event.${k}`];
  if (direct) return direct;
  // fallback por coincidencia de nombre español → clave
  const mapa: Record<string, string> = {
    'boda tradicional': 'event.boda-tradicional', 'boda americana': 'event.boda-americana',
    'boda gay (hombres)': 'event.boda-gay-h', 'boda gay (mujeres)': 'event.boda-gay-m',
    'xv años': 'event.xv-anos', 'bautizo': 'event.bautizo',
    'primera comunión': 'event.comunion', 'confirmación': 'event.confirmacion',
    'cumpleaños niño': 'event.cumpleanos-nino', 'cumpleaños niña': 'event.cumpleanos-nina',
    'baby shower': 'event.baby-shower', 'otro': 'event.otro', 'boda': 'event.boda', 'cumpleaños': 'event.cumpleanos'
  };
  const clave = mapa[idOrName.toLowerCase().trim()];
  return clave ? DICTS.en[clave] : idOrName;
};

/** Descripciones EN de los tipos de evento (por id del wizard). */
export const EVENT_DESC_EN: Record<string, string> = {
  'boda-tradicional': 'Elegant wedding with all the tradition',
  'boda-americana': 'Modern wedding, American style',
  'boda-gay-h': 'Wedding celebration for two grooms',
  'boda-gay-m': 'Wedding celebration for two brides',
  'xv-anos': 'A party as unique as the quinceañera',
  'bautizo': 'A tender keepsake for a special day',
  'comunion': 'Solemn and sweet for their first communion',
  'confirmacion': 'Faith and celebration in one invitation',
  'cumpleanos-nino': 'Fun and colorful for his day',
  'cumpleanos-nina': 'Magical and pink for her day',
  'baby-shower': 'Sweet welcome for the little one',
  'otro': 'Any celebration, your own style'
};

/** Títulos de sección del formulario (eventKnowledge) en inglés. */
export const SECTION_TITLE_EN: Record<string, string> = {
  'Anfitriones': 'Hosts',
  'Confirmación de asistencia': 'RSVP',
  'Corte de honor': 'Court of honor',
  'Cortejo': 'Court',
  'Código de vestimenta': 'Dress code',
  'Familias': 'Families',
  'Fecha y hora': 'Date & time',
  'Festejado(a)': 'Honoree',
  'La pareja': 'The couple',
  'La quinceañera': 'The quinceañera',
  'Mensaje y extras': 'Message & extras',
  'Mis papás y familia': 'My parents & family',
  'Padrinos': 'Godparents',
  'Papás y familia': 'Parents & family',
  'Programa del evento': 'Event program',
  'Regalos': 'Gifts',
  '¿Dónde será?': 'Where will it be?'
};

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}
const Ctx = createContext<LanguageCtx>({ lang: 'es', setLang: () => {}, t: (k) => k });

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(getStoredLang());
  const setLang = useCallback((l: Lang) => { setStoredLang(l); setLangState(l); }, []);
  const t = useCallback((key: string, vars?: Record<string, string>) => {
    let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  }, [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
};

export const useLanguage = () => useContext(Ctx);
