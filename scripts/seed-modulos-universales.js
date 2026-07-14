/**
 * Seed: inserta 6 módulos universales/agnósticos en knowledge_base_modules.
 * Estilo consistente con portada-nombre existente (CSS variables + scoped + grid).
 * Idempotente: si el module_id ya existe, lo saltea.
 *
 * Uso: node scripts/seed-modulos-universales.js
 */
import db from '../server/database.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const MODULES_TO_SEED = [
  {
    module_id: 'padres-universal',
    module_type: 'padres',
    style_name: 'Padres Wireframe Universal',
    description: 'Wireframe universal de padres con retratos placeholder.',
    tags: ['padres', 'wireframe', 'responsive', 'universal'],
    memory_source: 'library',
    asset_type_hint: 'retrato',
    body_html: `
  <style>
    .module-padres-universal {
      --primary-color: #1f1f1f;
      --text-color: #2f2f2f;
      --muted-color: rgba(47, 47, 47, 0.68);
      --accent-color: #b89a63;
      --soft-shadow: 0 18px 42px rgba(0, 0, 0, 0.16);
      position: relative;
      width: 100%;
      padding: clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 4rem);
      box-sizing: border-box;
      background: #faf8f3;
      color: var(--text-color);
    }
    .padres-universal__title {
      text-align: center;
      font-family: "Georgia", serif;
      font-size: clamp(2rem, 4vw, 3rem);
      margin: 0 0 2rem;
      color: var(--primary-color);
    }
    .padres-universal__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 2rem;
      max-width: 1100px;
      margin: 0 auto;
    }
    .padres-universal__card {
      text-align: center;
      padding: 1.5rem;
      background: #fff;
      border-radius: 12px;
      box-shadow: var(--soft-shadow);
    }
    .padres-universal__photo {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: url("https://loremflickr.com/280/280/portrait,face") center/cover;
      margin: 0 auto 1rem;
      filter: grayscale(20%);
    }
    .padres-universal__name {
      font-family: "Georgia", serif;
      font-size: 1.25rem;
      margin: 0 0 0.25rem;
      color: var(--primary-color);
    }
    .padres-universal__role {
      font-size: 0.9rem;
      color: var(--muted-color);
      margin: 0;
    }
  </style>

  <h2 class="padres-universal__title">Nuestros Padres</h2>
  <div class="padres-universal__grid">
    <figure class="padres-universal__card" memory_source="library" data-asset-type="retrato" path="placeholder">
      <div class="padres-universal__photo"></div>
      <figcaption>
        <p class="padres-universal__name">Nombre del Padre</p>
        <p class="padres-universal__role">Padre de la Novia</p>
      </figcaption>
    </figure>
    <figure class="padres-universal__card" memory_source="library" data-asset-type="retrato" path="placeholder">
      <div class="padres-universal__photo"></div>
      <figcaption>
        <p class="padres-universal__name">Nombre de la Madre</p>
        <p class="padres-universal__role">Madre de la Novia</p>
      </figcaption>
    </figure>
    <figure class="padres-universal__card" memory_source="library" data-asset-type="retrato" path="placeholder">
      <div class="padres-universal__photo"></div>
      <figcaption>
        <p class="padres-universal__name">Nombre del Padre</p>
        <p class="padres-universal__role">Padre del Novio</p>
      </figcaption>
    </figure>
    <figure class="padres-universal__card" memory_source="library" data-asset-type="retrato" path="placeholder">
      <div class="padres-universal__photo"></div>
      <figcaption>
        <p class="padres-universal__name">Nombre de la Madre</p>
        <p class="padres-universal__role">Madre del Novio</p>
      </figcaption>
    </figure>
  </div>

  <script>
    const moduleMetadata = {
      tags: ["padres", "wireframe", "responsive", "universal"],
      descripcion: "Wireframe universal de padres con retratos placeholder."
    };
  </script>
`,
  },
  {
    module_id: 'ubicacion-universal',
    module_type: 'ubicacion',
    style_name: 'Ubicacion Wireframe Universal',
    description: 'Wireframe universal de ubicacion con mapa placeholder.',
    tags: ['ubicacion', 'wireframe', 'responsive', 'universal', 'mapa'],
    memory_source: 'library',
    asset_type_hint: 'mapa',
    body_html: `
  <style>
    .module-ubicacion-universal {
      --primary-color: #1f1f1f;
      --text-color: #2f2f2f;
      --muted-color: rgba(47, 47, 47, 0.68);
      --accent-color: #b89a63;
      position: relative;
      width: 100%;
      padding: clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 4rem);
      box-sizing: border-box;
      background: #faf8f3;
      color: var(--text-color);
    }
    .ubicacion-universal__title {
      text-align: center;
      font-family: "Georgia", serif;
      font-size: clamp(2rem, 4vw, 3rem);
      margin: 0 0 1.5rem;
      color: var(--primary-color);
    }
    .ubicacion-universal__layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      max-width: 1100px;
      margin: 0 auto;
      align-items: center;
    }
    @media (max-width: 768px) {
      .ubicacion-universal__layout { grid-template-columns: 1fr; }
    }
    .ubicacion-universal__info { padding: 1.5rem; }
    .ubicacion-universal__venue {
      font-family: "Georgia", serif;
      font-size: 1.5rem;
      color: var(--primary-color);
      margin: 0 0 0.5rem;
    }
    .ubicacion-universal__address {
      font-size: 1rem;
      color: var(--muted-color);
      margin: 0 0 1rem;
      line-height: 1.5;
    }
    .ubicacion-universal__time {
      font-size: 0.9rem;
      color: var(--accent-color);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .ubicacion-universal__map {
      width: 100%;
      height: 280px;
      border-radius: 12px;
      background: url("https://loremflickr.com/640/480/map,venue") center/cover;
      box-shadow: 0 18px 42px rgba(0,0,0,0.16);
    }
  </style>

  <h2 class="ubicacion-universal__title">Ubicacion del Evento</h2>
  <div class="ubicacion-universal__layout">
    <div class="ubicacion-universal__info">
      <h3 class="ubicacion-universal__venue">Nombre del Salón</h3>
      <p class="ubicacion-universal__address">
        Direccion completa del lugar<br>
        Ciudad, Código Postal
      </p>
      <p class="ubicacion-universal__time">Ceremonia · 17:00 hrs</p>
    </div>
    <div class="ubicacion-universal__map" memory_source="library" data-asset-type="mapa" path="placeholder"></div>
  </div>

  <script>
    const moduleMetadata = {
      tags: ["ubicacion", "wireframe", "responsive", "universal", "mapa"],
      descripcion: "Wireframe universal de ubicacion con mapa placeholder."
    };
  </script>
`,
  },
  {
    module_id: 'itinerario-universal',
    module_type: 'itinerario',
    style_name: 'Itinerario Wireframe Universal',
    description: 'Wireframe universal de itinerario con timeline placeholder.',
    tags: ['itinerario', 'wireframe', 'responsive', 'universal', 'timeline'],
    memory_source: 'generated',
    asset_type_hint: '',
    body_html: `
  <style>
    .module-itinerario-universal {
      --primary-color: #1f1f1f;
      --text-color: #2f2f2f;
      --muted-color: rgba(47, 47, 47, 0.68);
      --accent-color: #b89a63;
      position: relative;
      width: 100%;
      padding: clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 4rem);
      box-sizing: border-box;
      background: #faf8f3;
      color: var(--text-color);
    }
    .itinerario-universal__title {
      text-align: center;
      font-family: "Georgia", serif;
      font-size: clamp(2rem, 4vw, 3rem);
      margin: 0 0 2rem;
      color: var(--primary-color);
    }
    .itinerario-universal__timeline {
      max-width: 720px;
      margin: 0 auto;
      position: relative;
      padding-left: 2rem;
    }
    .itinerario-universal__timeline::before {
      content: "";
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--accent-color);
      opacity: 0.4;
    }
    .itinerario-universal__item {
      position: relative;
      padding: 0 0 2rem 1rem;
    }
    .itinerario-universal__item::before {
      content: "";
      position: absolute;
      left: -2rem;
      top: 6px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--accent-color);
      border: 3px solid #faf8f3;
    }
    .itinerario-universal__time {
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent-color);
      margin: 0 0 0.25rem;
    }
    .itinerario-universal__label {
      font-family: "Georgia", serif;
      font-size: 1.15rem;
      margin: 0 0 0.25rem;
      color: var(--primary-color);
    }
    .itinerario-universal__desc {
      font-size: 0.9rem;
      color: var(--muted-color);
      margin: 0;
    }
  </style>

  <h2 class="itinerario-universal__title">Itinerario</h2>
  <div class="itinerario-universal__timeline">
    <div class="itinerario-universal__item">
      <p class="itinerario-universal__time">17:00</p>
      <p class="itinerario-universal__label">Ceremonia</p>
      <p class="itinerario-universal__desc">Inicio de la ceremonia civil.</p>
    </div>
    <div class="itinerario-universal__item">
      <p class="itinerario-universal__time">18:30</p>
      <p class="itinerario-universal__label">Recepción</p>
      <p class="itinerario-universal__desc">Bienvenida a los invitados.</p>
    </div>
    <div class="itinerario-universal__item">
      <p class="itinerario-universal__time">20:00</p>
      <p class="itinerario-universal__label">Cena</p>
      <p class="itinerario-universal__desc">Banquete y brindis.</p>
    </div>
    <div class="itinerario-universal__item">
      <p class="itinerario-universal__time">22:00</p>
      <p class="itinerario-universal__label">Fiesta</p>
      <p class="itinerario-universal__desc">Baile y celebración.</p>
    </div>
  </div>

  <script>
    const moduleMetadata = {
      tags: ["itinerario", "wireframe", "responsive", "universal", "timeline"],
      descripcion: "Wireframe universal de itinerario con timeline placeholder."
    };
  </script>
`,
  },
  {
    module_id: 'confirmacion-universal',
    module_type: 'confirmacion',
    style_name: 'Confirmacion Wireframe Universal',
    description: 'Wireframe universal de confirmacion RSVP.',
    tags: ['confirmacion', 'wireframe', 'responsive', 'universal', 'rsvp'],
    memory_source: 'generated',
    asset_type_hint: '',
    body_html: `
  <style>
    .module-confirmacion-universal {
      --primary-color: #1f1f1f;
      --text-color: #2f2f2f;
      --muted-color: rgba(47, 47, 47, 0.68);
      --accent-color: #b89a63;
      position: relative;
      width: 100%;
      padding: clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 4rem);
      box-sizing: border-box;
      background: #faf8f3;
      color: var(--text-color);
      text-align: center;
    }
    .confirmacion-universal__title {
      font-family: "Georgia", serif;
      font-size: clamp(2rem, 4vw, 3rem);
      margin: 0 0 1rem;
      color: var(--primary-color);
    }
    .confirmacion-universal__lead {
      max-width: 620px;
      margin: 0 auto 2rem;
      font-size: 1.05rem;
      line-height: 1.6;
      color: var(--muted-color);
    }
    .confirmacion-universal__btn {
      display: inline-block;
      padding: 0.9rem 2.4rem;
      font-family: "Georgia", serif;
      font-size: 1.05rem;
      letter-spacing: 0.06em;
      color: #fff;
      background: var(--accent-color);
      border: none;
      border-radius: 999px;
      cursor: pointer;
      text-decoration: none;
      transition: transform .2s ease, box-shadow .2s ease;
      box-shadow: 0 14px 32px rgba(184, 154, 99, 0.32);
    }
    .confirmacion-universal__btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 40px rgba(184, 154, 99, 0.4);
    }
    .confirmacion-universal__deadline {
      margin-top: 1.5rem;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent-color);
    }
  </style>

  <h2 class="confirmacion-universal__title">Confirma tu Asistencia</h2>
  <p class="confirmacion-universal__lead">
    Nos encantaria que nos acompañes en este dia tan especial. Por favor confirma
    tu asistencia antes de la fecha limite.
  </p>
  <a href="#" class="confirmacion-universal__btn">Confirmar Asistencia</a>
  <p class="confirmacion-universal__deadline">Fecha limite · 30 de noviembre</p>

  <script>
    const moduleMetadata = {
      tags: ["confirmacion", "wireframe", "responsive", "universal", "rsvp"],
      descripcion: "Wireframe universal de confirmacion RSVP."
    };
  </script>
`,
  },
  {
    module_id: 'detalles-universal',
    module_type: 'detalles',
    style_name: 'Detalles Wireframe Universal',
    description: 'Wireframe universal de detalles (vestimenta y regalos).',
    tags: ['detalles', 'wireframe', 'responsive', 'universal', 'vestimenta', 'regalos'],
    memory_source: 'generated',
    asset_type_hint: '',
    body_html: `
  <style>
    .module-detalles-universal {
      --primary-color: #1f1f1f;
      --text-color: #2f2f2f;
      --muted-color: rgba(47, 47, 47, 0.68);
      --accent-color: #b89a63;
      position: relative;
      width: 100%;
      padding: clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 4rem);
      box-sizing: border-box;
      background: #faf8f3;
      color: var(--text-color);
    }
    .detalles-universal__title {
      text-align: center;
      font-family: "Georgia", serif;
      font-size: clamp(2rem, 4vw, 3rem);
      margin: 0 0 2rem;
      color: var(--primary-color);
    }
    .detalles-universal__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }
    @media (max-width: 768px) {
      .detalles-universal__grid { grid-template-columns: 1fr; }
    }
    .detalles-universal__card {
      padding: 2rem;
      text-align: center;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 18px 42px rgba(0,0,0,0.16);
    }
    .detalles-universal__card h3 {
      font-family: "Georgia", serif;
      font-size: 1.3rem;
      color: var(--primary-color);
      margin: 0 0 0.75rem;
    }
    .detalles-universal__card p {
      font-size: 0.95rem;
      color: var(--muted-color);
      line-height: 1.5;
      margin: 0;
    }
    .detalles-universal__card .detalles-universal__hint {
      margin-top: 0.75rem;
      font-size: 0.85rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--accent-color);
    }
  </style>

  <h2 class="detalles-universal__title">Detalles del Evento</h2>
  <div class="detalles-universal__grid">
    <div class="detalles-universal__card">
      <h3>Codigo de Vestimenta</h3>
      <p>Elegante. Te sugerimos tonos pasteles y evitar blanco.</p>
      <p class="detalles-universal__hint">Formal</p>
    </div>
    <div class="detalles-universal__card">
      <h3>Mesa de Regalos</h3>
      <p>Tu presencia es el mejor regalo. Si deseas obsequiar, agradecemos contribuciones.</p>
      <p class="detalles-universal__hint">Lluvia de Sobres</p>
    </div>
  </div>

  <script>
    const moduleMetadata = {
      tags: ["detalles", "wireframe", "responsive", "universal", "vestimenta", "regalos"],
      descripcion: "Wireframe universal de detalles (vestimenta y regalos)."
    };
  </script>
`,
  },
  {
    module_id: 'countdown-universal',
    module_type: 'countdown',
    style_name: 'Countdown Wireframe Universal',
    description: 'Wireframe universal de countdown con memoria generada.',
    tags: ['countdown', 'wireframe', 'responsive', 'universal', 'timer'],
    memory_source: 'generated',
    asset_type_hint: '',
    body_html: `
  <style>
    .module-countdown-universal {
      --primary-color: #1f1f1f;
      --text-color: #2f2f2f;
      --muted-color: rgba(47, 47, 47, 0.68);
      --accent-color: #b89a63;
      --background-overlay: rgba(246, 241, 225, 0.34);
      position: relative;
      width: 100%;
      padding: clamp(4rem, 8vw, 6rem) clamp(1rem, 4vw, 4rem);
      box-sizing: border-box;
      color: var(--text-color);
      background-image:
        linear-gradient(to bottom, rgba(255,255,255,0.16), rgba(255,255,255,0.08)),
        url("https://loremflickr.com/1920/1080/celebration,elegant");
      background-size: cover;
      background-position: center;
      isolation: isolate;
    }
    .module-countdown-universal::after {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--background-overlay);
      z-index: -1;
    }
    .countdown-universal__title {
      position: relative;
      text-align: center;
      font-family: "Georgia", serif;
      font-size: clamp(1.8rem, 3.5vw, 2.5rem);
      margin: 0 0 2rem;
      color: var(--primary-color);
    }
    .countdown-universal__grid {
      position: relative;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      max-width: 720px;
      margin: 0 auto;
    }
    @media (max-width: 540px) {
      .countdown-universal__grid { grid-template-columns: repeat(2, 1fr); }
    }
    .countdown-universal__cell {
      text-align: center;
      padding: 1.5rem 0.5rem;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(8px);
      border-radius: 12px;
    }
    .countdown-universal__num {
      font-family: "Georgia", serif;
      font-size: clamp(2rem, 5vw, 3.5rem);
      line-height: 1;
      color: var(--primary-color);
      margin: 0 0 0.25rem;
    }
    .countdown-universal__label {
      font-size: 0.78rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted-color);
      margin: 0;
    }
  </style>

  <h2 class="countdown-universal__title">Faltan pocos días</h2>
  <div class="countdown-universal__grid">
    <div class="countdown-universal__cell">
      <p class="countdown-universal__num" data-countdown="days">--</p>
      <p class="countdown-universal__label">Días</p>
    </div>
    <div class="countdown-universal__cell">
      <p class="countdown-universal__num" data-countdown="hours">--</p>
      <p class="countdown-universal__label">Horas</p>
    </div>
    <div class="countdown-universal__cell">
      <p class="countdown-universal__num" data-countdown="minutes">--</p>
      <p class="countdown-universal__label">Minutos</p>
    </div>
    <div class="countdown-universal__cell">
      <p class="countdown-universal__num" data-countdown="seconds">--</p>
      <p class="countdown-universal__label">Segundos</p>
    </div>
  </div>

  <script data-gemini-id="countdown-universal">
    (function() {
      const target = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const cells = document.querySelectorAll('[data-countdown]');
      function tick() {
        const now = new Date();
        const diff = Math.max(0, target - now);
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        cells.forEach(cell => {
          const key = cell.getAttribute('data-countdown');
          const value = { days, hours, minutes, seconds }[key];
          cell.textContent = String(value).padStart(2, '0');
        });
      }
      tick();
      setInterval(tick, 1000);
    })();

    const moduleMetadata = {
      tags: ["countdown", "wireframe", "responsive", "universal", "timer"],
      descripcion: "Wireframe universal de countdown con memoria generada."
    };
  </script>
`,
  },
];

console.log(`\n🌱 Seed: ${MODULES_TO_SEED.length} módulos universales a insertar...\n`);

const stmt = db.prepare(`
  INSERT INTO knowledge_base_modules (
    module_id, module_type, style_name, description,
    tags, descripcion_larga, theme_tags, color_palette,
    css_variables, has_memory_attributes, memory_sources,
    html_content, category, is_active, filename, html_size
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);

const checkStmt = db.prepare('SELECT 1 FROM knowledge_base_modules WHERE module_id = ?');

let inserted = 0;
let skipped = 0;

for (const mod of MODULES_TO_SEED) {
  if (checkStmt.get(mod.module_id)) {
    console.log(`⏭️  ${mod.module_id} ya existe, saltando`);
    skipped++;
    continue;
  }

  const htmlContent = `<section
  class="module-${mod.module_id}"
  data-gemini-id="${mod.module_id}"
  memory_type="${mod.memory_source === 'library' ? 'image' : 'background'}"
  memory_usage="protected"
  memory_source="${mod.memory_source}"
  path="placeholder"
>${mod.body_html}
</section>`;

  const metadata = {
    tags: mod.tags,
    descripcion: mod.description,
  };

  const colorPalette = {
    '--primary-color': '#1f1f1f',
    '--text-color': '#2f2f2f',
    '--accent-color': '#b89a63',
    '--muted-color': 'rgba(47, 47, 47, 0.68)',
  };

  const cssVariables = {
    '--primary-color': '#1f1f1f',
    '--text-color': '#2f2f2f',
    '--accent-color': '#b89a63',
    '--muted-color': 'rgba(47, 47, 47, 0.68)',
    '--background-overlay': 'rgba(246, 241, 225, 0.34)',
    '--soft-shadow': '0 18px 42px rgba(0, 0, 0, 0.16)',
  };

  const memorySources = mod.memory_source === 'library'
    ? { library: 1, generated: 0 }
    : { library: 0, generated: 1 };

  try {
    const result = stmt.run(
      mod.module_id,
      mod.module_type,
      mod.style_name,
      mod.description,
      JSON.stringify(mod.tags),
      JSON.stringify(mod.description),
      JSON.stringify(['wireframe', 'responsive', 'universal']),
      JSON.stringify(colorPalette),
      JSON.stringify(cssVariables),
      1,
      JSON.stringify(memorySources),
      htmlContent,
      'general',
      `seed-${mod.module_id}.html`,
      Buffer.byteLength(htmlContent, 'utf8')
    );
    console.log(`✅ ${mod.module_id} insertado (row id=${result.lastInsertRowid})`);
    inserted++;
  } catch (err) {
    console.error(`❌ ${mod.module_id} error:`, err.message);
  }
}

console.log(`\n📊 Resumen: ${inserted} insertados, ${skipped} saltados (ya existían).`);

const rows = db.prepare(`
  SELECT module_type, COUNT(*) as n
  FROM knowledge_base_modules
  WHERE is_active = 1
  GROUP BY module_type
  ORDER BY module_type
`).all();

console.log('\n📚 Estado actual de la KB:');
rows.forEach(r => console.log(`  ${r.module_type}: ${r.n} módulo(s)`));
