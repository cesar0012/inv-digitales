/**
 * ============================================================================
 * PLANES PÚBLICOS — fuente de verdad única (F5/F6 del fix-list)
 * ============================================================================
 * Solo los 3 planes reales de digital.invitacionesmodernas.com, con precios
 * y características exactas. La página de producto, el schema y las claims
 * leen de aquí. El plan_config del admin sigue siendo interno de la app
 * (créditos/compras) y NO se muestra en el sitio público.
 *
 * Regla F6: cualquier frase que nombre una función debe indicar el plan que
 * la incluye (RSVP: Creativo y Premium; cambios con IA: Creativo 10,
 * Premium 20; rediseños: Creativo 2, Premium 10).
 * ============================================================================
 */
export const PLANES_PUBLICOS = [
  {
    key: 'basico',
    name: 'Plan Básico',
    price: 30,
    currency: 'USD',
    notaPrecio: 'Pago único por evento',
    featured: false,
    url: 'https://app.invitacionesmodernas.com/app/planes',
    bullets: [
      'Elige este diseño del catálogo',
      'Edita todos los textos de tu invitación',
      'Mapa interactivo',
      'Seguimiento de tu invitación y reportes',
      'Incluye la marca Invitaciones Modernas'
    ]
  },
  {
    key: 'creativo',
    name: 'Plan Creativo',
    price: 55,
    currency: 'USD',
    notaPrecio: 'Hasta 100 invitados (+2 USD por cada 25 adicionales)',
    featured: false,
    url: 'https://app.invitacionesmodernas.com/app/planes',
    bullets: [
      'Todo lo del Plan Básico',
      'Personaliza colores y estilo del diseño',
      '2 rediseños completos con IA',
      '10 cambios de diseño con IA',
      'Sube imágenes de inspiración',
      'Confirmación de asistencia y lista de invitados',
      'Envío automático por SMS'
    ]
  },
  {
    key: 'premium',
    name: 'Plan Premium',
    price: 100,
    currency: 'USD',
    notaPrecio: 'Hasta 200 invitados (+2 USD por cada 25 adicionales)',
    featured: true, // "Popular" según el sitio de precios
    badge: 'Popular',
    url: 'https://app.invitacionesmodernas.com/app/planes',
    bullets: [
      'Todo lo del Plan Creativo',
      '10 rediseños completos con IA',
      '20 cambios de diseño con IA',
      'Diseño con IA nivel Premium',
      'Envío automático por SMS y WhatsApp',
      'Notificaciones y recordatorios para tus invitados'
    ]
  }
];
