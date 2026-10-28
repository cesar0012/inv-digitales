import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  ArrowRight,
  Sparkles,
  Heart,
  Star,
  Check,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  Search,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Suggestion {
  label: string;
  slug: string;
  reason: string;
}

interface Category {
  label: string;
  slug: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface SectionObj {
  title?: string;
  html?: string;
  text?: string;
  example_prompts?: string[];
  suggestions?: Suggestion[];
  categories?: Category[];
  faqs?: FAQItem[];
  [key: string]: any;
}

type SectionValue = string | SectionObj | any;

interface SEOSections {
  section_1: SectionValue;
  section_2: SectionValue;
  section_3: SectionValue;
  section_4: SectionValue;
  section_5: SectionValue;
  section_6: SectionValue;
  section_7: SectionValue;
  section_8: SectionValue;
  section_9: SectionValue;
  section_10: SectionValue;
  section_11: SectionValue;
  section_12: SectionValue;
  [key: string]: SectionValue;
}

interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

interface CatalogoLandingData {
  id: number;
  filename: string;
  title: string;
  event_type: string;
  theme: string;
  colors: string;
  tags: string;
  primary_color: string;
  secondary_color: string;
  starred: boolean;
  slug: string;
  h1?: string;
  seo_title: string | null;
  seo_meta_description: string | null;
  seo_content_json: SEOSections | null;
  structured_data: StructuredData | null;
}

interface PlanItem {
  plan_slug: string;
  plan_name: string;
  invites_included: number;
  generation_credits: number;
  iteration_credits: number;
  has_rsvp: number;
}

const API_BASE = import.meta.env.VITE_PUBLIC_URL
  ? `${import.meta.env.VITE_PUBLIC_URL}/api`
  : 'http://localhost:3001/api';

const PREVIEW_BASE = import.meta.env.VITE_PUBLIC_URL
  ? `${import.meta.env.VITE_PUBLIC_URL}/preview`
  : 'http://localhost:3001/preview';

const PLANS_URL = 'https://app.invitacionesmodernas.com/app/planes';

function isObject(val: any): val is SectionObj {
  return val != null && typeof val === 'object' && !Array.isArray(val);
}

function sanitizeHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

export const ProductLandingView: React.FC = () => {
  const { eventType, slug } = useParams<{ eventType: string; slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState<CatalogoLandingData | null>(null);
  const [plansData, setPlansData] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [iframeExpanded, setIframeExpanded] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [ctaLoading, setCtaLoading] = useState(false);

  useEffect(() => {
    loadLandingData();
    loadPlans();
  }, [eventType, slug]);

  const loadPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/plans`);
      if (!res.ok) return;
      const json = await res.json();
      setPlansData(Array.isArray(json.plans) ? json.plans : []);
      console.log('[PRODUCT] plans cargados:', json.plans?.length || 0);
    } catch (e) {
      console.error('Error cargando planes:', e);
      setPlansData([]);
    }
  };

  const loadLandingData = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`${API_BASE}/catalogo/slug/${eventType}/${slug}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      setData(json);
      const seo = json?.seo_content_json;
      console.log('[PRODUCT] loaded:', {
        filename: json?.filename,
        slug,
        sections: Object.keys(seo || {}).length
      });
      const editorUrl = `/editor?filename=${encodeURIComponent(json?.filename || '')}`;
      console.log('[PRODUCT] editorUrl=', editorUrl);
      console.log('[PRODUCT] schema checks:', {
        s5: typeof seo?.section_5,
        s6: typeof seo?.section_6,
        s11: Array.isArray(seo?.section_11?.faqs)
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCTA = async () => {
    if (!data) return;

    if (!isAuthenticated) {
      window.location.href = PLANS_URL;
      return;
    }

    if (data.filename) {
      window.location.href = `/editor?filename=${encodeURIComponent(data.filename)}`;
      return;
    }

    setCtaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/catalogo/${data.filename}`);
      const html = await res.text();
      localStorage.setItem('catalogo_html', html);
      localStorage.setItem('catalogo_filename', data.filename);
      navigate('/editor?fromCatalogo=true');
    } catch (error) {
      console.error('Error loading HTML for editor:', error);
    } finally {
      setCtaLoading(false);
    }
  };

  const editorUrl = `/editor?filename=${encodeURIComponent(data?.filename || '')}`;

  const replaceEditorLinks = (html: string): string => {
    return sanitizeHtml(html.replace(/#EDITOR_LINK#/g, editorUrl));
  };

  const parseColors = (colorsStr: string): string[] => {
    try {
      const parsed = JSON.parse(colorsStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  };

  const parseTags = (tagsStr: string): string[] => {
    try {
      const parsed = JSON.parse(tagsStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  };

  const getSectionTitle = (s: SectionValue): string => {
    if (isObject(s) && s.title) return s.title;
    return '';
  };

  const getSectionHtml = (s: SectionValue): string => {
    if (isObject(s) && s.html) return replaceEditorLinks(s.html);
    if (typeof s === 'string') return replaceEditorLinks(s);
    return '';
  };

  const renderSectionHtml = (s: SectionValue, className: string = '', center: boolean = true): React.ReactNode => {
    const html = getSectionHtml(s);
    if (!html) return null;
    return (
      <div
        className={`landing-prose ${center ? 'landing-prose--center' : ''} ${className}`}
        style={{ '--lp-accent': primaryColor } as React.CSSProperties}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-gray-500 font-light tracking-wide">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-rose-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Invitación no encontrada</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Lo sentimos, la invitación que buscas no existe o ha sido removida del catálogo.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-rose-200"
          >
            Ver todo el catálogo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!data.seo_content_json) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            {data.starred ? 'Página en construcción' : 'Invitación no encontrada'}
          </h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            {data.starred
              ? 'Esta invitación está en el catálogo pero su página de producto aún no ha sido generada por el administrador.'
              : 'Lo sentimos, la invitación que buscas no existe o ha sido removida del catálogo.'}
          </p>
          {data.starred && (
            <p className="text-sm text-gray-400 mb-4">
              Por favor contacta al administrador para generar la página SEO de esta invitación.
            </p>
          )}
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-rose-200"
          >
            Ver todo el catálogo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const seo = data.seo_content_json;
  const primaryColor = data.primary_color || '#e11d48';
  const secondaryColor = data.secondary_color || '#f43f5e';
  const colors = parseColors(data.colors);
  const tags = parseTags(data.tags);
  // Acento para .landing-prose (checks de listas y enlaces del contenido IA)
  const accentStyle = { '--lp-accent': primaryColor } as React.CSSProperties;

  // Section 7: example_prompts from {title, html, example_prompts} or legacy {text, example_prompts}
  const section7 = seo.section_7;
  const section7Title = getSectionTitle(section7);
  const section7Html = isObject(section7) ? (section7 as SectionObj).html || (section7 as SectionObj).text || '' : '';
  const section7Prompts: string[] = isObject(section7)
    ? (Array.isArray((section7 as SectionObj).example_prompts) ? (section7 as SectionObj).example_prompts : [])
    : [];

  // Section 9: suggestions
  const section9 = seo.section_9;
  const section9Title = getSectionTitle(section9);
  const section9Html = isObject(section9) ? (section9 as SectionObj).html || (section9 as SectionObj).text || '' : '';
  const section9Suggestions: Suggestion[] = isObject(section9) && Array.isArray((section9 as SectionObj).suggestions)
    ? (section9 as SectionObj).suggestions
    : [];

  // Section 10: categories
  const section10 = seo.section_10;
  const section10Title = getSectionTitle(section10);
  const section10Html = isObject(section10) ? (section10 as SectionObj).html || (section10 as SectionObj).text || '' : '';
  const section10Categories: Category[] = isObject(section10) && Array.isArray((section10 as SectionObj).categories)
    ? (section10 as SectionObj).categories
    : [];

  // Section 11: FAQs - could be array of {question,answer} or {title,html,faqs:[...]}
  const section11 = seo.section_11;
  let faqs: FAQItem[] = [];
  let section11Title = '';
  let section11Html = '';
  if (Array.isArray(section11)) {
    // Legacy: array of {question, answer}
    faqs = section11;
  } else if (isObject(section11)) {
    section11Title = (section11 as SectionObj).title || '';
    section11Html = (section11 as SectionObj).html || '';
    if (Array.isArray((section11 as SectionObj).faqs)) {
      faqs = (section11 as SectionObj).faqs;
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Section 1: Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: primaryColor }}
          />
          <div
            className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl"
            style={{ backgroundColor: secondaryColor }}
          />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
              {data.event_type}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
              {data.h1 || data.seo_title || data.title}
            </h1>
            <div className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed mb-10 font-light">
              {renderSectionHtml(seo.section_1)}
            </div>
            <button
              onClick={handleCTA}
              disabled={ctaLoading}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg shadow-2xl transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: `0 20px 40px -10px ${primaryColor}66`
              }}
            >
              {ctaLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Heart className="w-5 h-5" />
              )}
              Personalizar esta invitación
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-6 mt-8 text-white/50 text-sm">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4" style={{ color: primaryColor }} />
                Sin descargas
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4" style={{ color: primaryColor }} />
                Comparte por WhatsApp
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4" style={{ color: primaryColor }} />
                100% digital
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Quick Details — REMOVIDA por decisión de producto ── */}

      {/* ── Section 3: DEPRECATED — no se renderiza ── */}

      {/* ── Section 4: Demo Preview ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {getSectionTitle(seo.section_4) || 'Vista previa en vivo'}
            </h2>
            {getSectionHtml(seo.section_4) ? (
              <div className="landing-prose landing-prose--center text-gray-500 max-w-2xl mx-auto font-light" style={accentStyle} dangerouslySetInnerHTML={{ __html: getSectionHtml(seo.section_4) }} />
            ) : (
              <p className="text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
                Explora cómo se ve esta invitación en acción. Abre el demo interactivo.
              </p>
            )}
          </div>
          <div className={`relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 transition-all duration-500 ${iframeExpanded ? 'fixed inset-4 z-50' : ''}`}>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <button
                onClick={() => setIframeExpanded(!iframeExpanded)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {iframeExpanded ? <Minimize2 className="w-4 h-4 text-gray-500" /> : <Maximize2 className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
            <div className={iframeExpanded ? 'h-[calc(100vh-120px)]' : 'h-[500px] md:h-[600px]'}>
              <iframe
                src={`${PREVIEW_BASE}/${data.filename}`}
                className="w-full h-full border-0"
                title={`Demo ${data.title}`}
              />
            </div>
          </div>
          {iframeExpanded && (
            <button
              onClick={() => setIframeExpanded(false)}
              className="fixed bottom-6 right-6 z-[60] p-3 bg-gray-800 text-white rounded-full shadow-xl hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </section>

      {/* ── Section 5: Customization ── */}
      {seo.section_5 && (() => {
        const s5Title = getSectionTitle(seo.section_5);
        const s5Html = getSectionHtml(seo.section_5);
        return (
          <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-6 text-center">
              {s5Title && (
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{s5Title}</h2>
              )}
              {s5Html ? (
                <div className="landing-prose landing-prose--center text-gray-600 font-light" style={accentStyle} dangerouslySetInnerHTML={{ __html: replaceEditorLinks(s5Html) }} />
              ) : null}
            </div>
          </section>
        );
      })()}

      {/* ── Section 6: Why Choose ── */}
      {seo.section_6 && (
        <section className="py-20 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              {getSectionTitle(seo.section_6) || '¿Por qué elegir esta invitación?'}
            </h2>
            {renderSectionHtml(seo.section_6, 'text-white/70')}
            <button
              onClick={handleCTA}
              disabled={ctaLoading}
              className="mt-10 inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold shadow-2xl transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: `0 20px 40px -10px ${primaryColor}66`
              }}
            >
              {ctaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
              Personalizar esta invitación
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      )}

      {/* ── Section 7: Example Prompts ── */}
      {seo.section_7 && (
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 mb-4">
                <MessageSquare className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                {section7Title || 'Ejemplos de personalización'}
              </h2>
              {section7Html && (
                <div className="landing-prose landing-prose--center text-gray-500 max-w-2xl mx-auto font-light" style={accentStyle} dangerouslySetInnerHTML={{ __html: replaceEditorLinks(section7Html) }} />
              )}
            </div>
            {section7Prompts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section7Prompts.map((prompt, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5 hover:bg-amber-50/50 transition-colors border border-gray-100"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{prompt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section 8: Planes (render dinámico desde /api/plans) ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-4">
            Planes y precios
          </h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto font-light leading-relaxed mb-12">
            Elige el plan que mejor se adapte a tu evento. Todos incluyen invitación digital personalizable.
          </p>
          {plansData.length === 0 ? (
            <p className="text-center text-gray-400 font-light">Planes no disponibles</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {plansData.map((plan, i) => {
                const isFeatured = i === 1;
                return (
                  <div
                    key={plan.plan_slug}
                    className={`relative rounded-3xl p-7 transition-all ${
                      isFeatured
                        ? 'bg-white shadow-2xl border-2'
                        : 'bg-white shadow-md border border-gray-100'
                    }`}
                    style={isFeatured ? { borderColor: primaryColor } : undefined}
                  >
                    {isFeatured && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                      >
                        POPULAR
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-gray-800 mb-4">{plan.plan_name}</h3>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                        {plan.invites_included} invitación{plan.invites_included === 1 ? '' : 'es'}
                      </li>
                      <li className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                        {plan.generation_credits} créditos de generación
                      </li>
                      <li className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                        {plan.iteration_credits} créditos de iteración
                      </li>
                      {plan.has_rsvp === 1 && (
                        <li className="flex items-center gap-2.5 text-sm text-gray-600">
                          <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                          RSVP incluido
                        </li>
                      )}
                    </ul>
                    <a
                      href={PLANS_URL}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-center inline-block bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Ver plan
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 9: Related Suggestions ── */}
      {seo.section_9 && section9Suggestions.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 mb-4">
                <Search className="w-7 h-7 text-rose-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                {section9Title || 'Otras invitaciones que te pueden gustar'}
              </h2>
              {section9Html && (
                <div className="landing-prose landing-prose--center text-gray-500 max-w-2xl mx-auto font-light" style={accentStyle} dangerouslySetInnerHTML={{ __html: replaceEditorLinks(section9Html) }} />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {section9Suggestions.map((s, i) => {
                const slugParts = s.slug.split('/');
                const sEventType = slugParts.length > 1 ? slugParts[0] : eventType || '';
                const sSlug = slugParts.length > 1 ? slugParts[1] : s.slug;
                return (
                  <Link
                    key={i}
                    to={`/catalogo/${sEventType}/${sSlug}`}
                    className="group bg-gray-50 rounded-2xl p-6 hover:bg-white hover:shadow-lg border border-transparent hover:border-gray-100 transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                      >
                        <Star className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 group-hover:text-rose-600 transition-colors">
                          {s.label}
                        </h3>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed">{s.reason}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 10: Categories ── */}
      {seo.section_10 && section10Categories.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6 text-center">
            {section10Title && (
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{section10Title}</h2>
            )}
            {section10Html && (
              <div className="text-gray-500 mb-8 font-light" dangerouslySetInnerHTML={{ __html: replaceEditorLinks(section10Html) }} />
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {section10Categories.map((cat, i) => {
                const slugParts = cat.slug.split('/');
                const cEventType = slugParts.length > 1 ? slugParts[0] : eventType || '';
                const cSlug = slugParts.length > 1 ? slugParts[1] : cat.slug;
                return (
                  <Link
                    key={i}
                    to={`/catalogo/${cEventType}/${cSlug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full text-sm font-medium text-gray-700 hover:text-rose-600 hover:shadow-md border border-gray-100 hover:border-rose-200 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 11: FAQ ── */}
      {seo.section_11 && (faqs.length > 0 || section11Html) && (
        <section className="py-24 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 mb-5 shadow-lg shadow-indigo-200">
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                {section11Title || 'Preguntas frecuentes'}
              </h2>
            </div>
            {faqs.length > 0 ? (
              <div className="divide-y divide-gray-200 rounded-3xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {faqs.map((faq, i) => {
                  const isOpen = openFAQ === i;
                  return (
                    <div key={i} className={isOpen ? 'bg-gradient-to-r from-indigo-50/40 to-purple-50/40' : ''}>
                      <button
                        onClick={() => setOpenFAQ(isOpen ? null : i)}
                        className="w-full flex items-start gap-4 px-6 py-5 text-left group"
                      >
                        <span className={`flex-shrink-0 mt-0.5 font-bold text-sm transition-colors ${
                          isOpen ? 'text-indigo-600' : 'text-gray-300 group-hover:text-indigo-400'
                        }`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className={`flex-1 text-base md:text-lg font-semibold transition-colors duration-200 ${
                          isOpen ? 'text-indigo-900' : 'text-gray-800 group-hover:text-gray-900'
                        }`}>{faq.question}</span>
                        <div className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isOpen ? 'bg-indigo-600 rotate-180' : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}>
                          <ChevronDown className={`w-4 h-4 transition-colors ${isOpen ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                      </button>
                      <div
                        className={`grid transition-all duration-500 ease-in-out ${
                          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="px-6 pb-6">
                            <div className="pl-11 pr-2">
                              <div className="border-l-2 border-indigo-300 pl-6 py-1">
                                <p className="text-gray-600 leading-relaxed text-[15px]">{faq.answer}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : section11Html ? (
              <div className="landing-prose landing-prose--flat" style={accentStyle} dangerouslySetInnerHTML={{ __html: section11Html }} />
            ) : null}
          </div>
        </section>
      )}

      {/* ── Section 12: Final CTA ── */}
      {seo.section_12 && (
        <section className="py-20 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
              style={{ backgroundColor: primaryColor }}
            />
            <div
              className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl"
              style={{ backgroundColor: secondaryColor }}
            />
          </div>
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
              {getSectionTitle(seo.section_12) || 'Crea tu invitación perfecta hoy'}
            </h2>
            {renderSectionHtml(seo.section_12, 'text-white/70')}
            <button
              onClick={handleCTA}
              disabled={ctaLoading}
              className="mt-8 group inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-semibold text-lg shadow-2xl transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: `0 20px 40px -10px ${primaryColor}66`
              }}
            >
              {ctaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
              Personalizar esta invitación
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-white/40 text-sm mt-6">
              Sin compromisos · Comienza en segundos · 100% digital
            </p>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="bg-gray-950 text-white/40 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Invitaciones Modernas — Todas las invitaciones son digitales.
          </p>
          <Link to="/catalogo" className="text-sm hover:text-white/70 transition-colors">
            Ver todo el catálogo
          </Link>
        </div>
      </footer>
    </div>
  );
};