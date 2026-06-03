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
  Palette,
  Type,
  Music,
  Image,
  MapPin,
  Calendar,
  Clock,
  Gift,
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

interface SEOSections {
  section_1: string;
  section_2: Record<string, string>;
  section_3: string;
  section_4: string;
  section_5: string;
  section_6: string;
  section_7: { text: string; example_prompts: string[] };
  section_8: string;
  section_9: { text: string; suggestions: Suggestion[] };
  section_10: { text: string; categories: Category[] };
  section_11: FAQItem[];
  section_12: string;
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
  seo_title: string | null;
  seo_meta_description: string | null;
  seo_content_json: SEOSections | null;
  structured_data: StructuredData | null;
}

const API_BASE = import.meta.env.VITE_PUBLIC_URL
  ? `${import.meta.env.VITE_PUBLIC_URL}/api`
  : 'http://localhost:3001/api';

const PREVIEW_BASE = import.meta.env.VITE_PUBLIC_URL
  ? `${import.meta.env.VITE_PUBLIC_URL}/preview`
  : 'http://localhost:3001/preview';

const PLANS_URL = 'https://app.invitacionesmodernas.com/app/planes';

const CUSTOMIZATION_ICONS = [
  <Palette className="w-6 h-6" />,
  <Type className="w-6 h-6" />,
  <Music className="w-6 h-6" />,
  <Image className="w-6 h-6" />,
  <MapPin className="w-6 h-6" />,
  <Calendar className="w-6 h-6" />,
  <Clock className="w-6 h-6" />,
  <Gift className="w-6 h-6" />
];

export const ProductLandingView: React.FC = () => {
  const { eventType, slug } = useParams<{ eventType: string; slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState<CatalogoLandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [iframeExpanded, setIframeExpanded] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [ctaLoading, setCtaLoading] = useState(false);

  useEffect(() => {
    loadLandingData();
  }, [eventType, slug]);

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

  const parseCustomizationList = (text: string): string[] => {
    const lines = text.split('\n').map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean);
    return lines;
  };

  const splitParagraphs = (text: string): string[] => {
    return text.split(/\n{2,}/).filter(p => p.trim());
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

  if (notFound || !data || !data.seo_content_json) {
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

  const seo = data.seo_content_json;
  const primaryColor = data.primary_color || '#e11d48';
  const secondaryColor = data.secondary_color || '#f43f5e';
  const colors = parseColors(data.colors);
  const tags = parseTags(data.tags);
  const customizationItems = seo.section_5 ? parseCustomizationList(seo.section_5) : [];

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
              {data.seo_title || data.title}
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed mb-10 font-light">
              {seo.section_1}
            </p>
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

      {/* ── Section 2: Quick Details ── */}
      {seo.section_2 && Object.keys(seo.section_2).length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-10">
              Detalles rápidos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(seo.section_2).map(([key, value], i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1.5 font-semibold">{key}</p>
                  <p className="text-gray-800 font-medium text-sm">{value}</p>
                </div>
              ))}
            </div>
            {(colors.length > 0 || tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-3 mt-8 justify-center">
                {colors.map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-100">
                    <span className="w-3 h-3 rounded-full inline-block border border-gray-200" style={{ backgroundColor: c }} />
                    {c}
                  </span>
                ))}
                {tags.slice(0, 6).map((t, i) => (
                  <span key={i} className="text-sm bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section 3: Description ── */}
      {seo.section_3 && (
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-8">
              Sobre esta invitación
            </h2>
            <div className="prose prose-lg prose-rose max-w-none">
              {splitParagraphs(seo.section_3).map((p, i) => (
                <p key={i} className="text-gray-600 leading-relaxed mb-4 text-base md:text-lg font-light">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 4: Demo Preview ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              Vista previa en vivo
            </h2>
            {seo.section_4 && (
              <p className="text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
                {seo.section_4}
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
      {seo.section_5 && (
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-4">
              Personaliza cada detalle
            </h2>
            <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto font-light">
              Haz que esta invitación sea verdaderamente tuya. Cada elemento se adapta a tu estilo y necesidades.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {customizationItems.map((item, i) => (
                <div
                  key={i}
                  className="group relative bg-gray-50 rounded-2xl p-6 hover:bg-white hover:shadow-lg border border-transparent hover:border-gray-100 transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  >
                    {CUSTOMIZATION_ICONS[i % CUSTOMIZATION_ICONS.length]}
                  </div>
                  <p className="text-gray-700 font-medium text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
              ¿Por qué elegir esta invitación?
            </h2>
            {splitParagraphs(seo.section_6).map((p, i) => (
              <p key={i} className="text-white/70 leading-relaxed mb-4 text-base md:text-lg font-light">
                {p}
              </p>
            ))}
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
                Ejemplos de personalización
              </h2>
              {seo.section_7.text && (
                <p className="text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
                  {seo.section_7.text}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seo.section_7.example_prompts.map((prompt, i) => (
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
          </div>
        </section>
      )}

      {/* ── Section 8: Plans & Pricing ── */}
      {seo.section_8 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-4">
              Planes y precios
            </h2>
            {splitParagraphs(seo.section_8).map((p, i) => (
              <p key={i} className="text-gray-500 text-center max-w-2xl mx-auto font-light leading-relaxed mb-2">
                {p}
              </p>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                { name: 'Catálogo', price: '$9.99', features: ['1 invitación', 'Diseño del catálogo', 'Comparte por link', 'RSVP incluido'] },
                { name: 'Creativa', price: '$19.99', features: ['1 invitación', 'Diseño personalizado con IA', 'Música de fondo', 'RSVP + confirmación', 'Soporte prioritario'], popular: true },
                { name: 'Premium', price: '$29.99', features: ['Hasta 5 invitaciones', 'Todo de Creativa', 'Diseño premium', 'Mapa interactivo', 'Galería de fotos', 'Asesoría de diseño'] }
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl p-7 transition-all ${
                    plan.popular
                      ? 'bg-white shadow-2xl border-2 scale-105'
                      : 'bg-white shadow-md border border-gray-100'
                  }`}
                  style={plan.popular ? { borderColor: primaryColor } : undefined}
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                    >
                      MÁS POPULAR
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-gray-400 text-sm">USD</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleCTA}
                    disabled={ctaLoading}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                      plan.popular
                        ? 'text-white shadow-lg hover:scale-105 disabled:hover:scale-100'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={plan.popular ? {
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      boxShadow: `0 10px 25px -5px ${primaryColor}44`
                    } : undefined}
                  >
                    {ctaLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Comenzar ahora'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 9: Related Suggestions ── */}
      {seo.section_9 && seo.section_9.suggestions && seo.section_9.suggestions.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 mb-4">
                <Search className="w-7 h-7 text-rose-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                Otras invitaciones que te pueden gustar
              </h2>
              {seo.section_9.text && (
                <p className="text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
                  {seo.section_9.text}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {seo.section_9.suggestions.map((s, i) => {
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
      {seo.section_10 && seo.section_10.categories && seo.section_10.categories.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6 text-center">
            {seo.section_10.text && (
              <p className="text-gray-500 mb-8 font-light">{seo.section_10.text}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {seo.section_10.categories.map((cat, i) => {
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
      {seo.section_11 && seo.section_11.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 mb-4">
                <HelpCircle className="w-7 h-7 text-indigo-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                Preguntas frecuentes
              </h2>
            </div>
            <div className="space-y-3">
              {seo.section_11.map((faq, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 transition-colors"
                >
                  <button
                    onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-100/50 transition-colors"
                  >
                    <span className="font-semibold text-gray-800 pr-4">{faq.question}</span>
                    {openFAQ === i ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openFAQ === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 leading-relaxed text-sm font-light">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              Crea tu invitación perfecta hoy
            </h2>
            {splitParagraphs(seo.section_12).map((p, i) => (
              <p key={i} className="text-white/70 leading-relaxed mb-4 text-base md:text-lg font-light">
                {p}
              </p>
            ))}
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