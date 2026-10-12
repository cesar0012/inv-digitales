#!/usr/bin/env node
/* Descarga las fuentes de imágenes de invitaciones para el RAG Visual. */
const { mkdirSync, writeFileSync, existsSync, unlinkSync } = require('fs');
const { join } = require('path');
const { execFileSync } = require('child_process');

const BASE = 'https://image-search-mcp-cn-beijing.oss-cn-beijing.aliyuncs.com/image-search-mcp/images-ppt/';
const OUT = join(__dirname, '..', 'rag-visual-fuentes');

const LIST = [
  // ===== XV AÑOS =====
  ['xv', '01-arco-dorado-tiara-morado.jpg', '5577a3ff8fd9.jpg', 'XV: arco dorado, tiara, flores moradas y vestido (Affordable Wedding Invitations)'],
  ['xv', '02-morada-mariposas-princesa.jpg', '4142b20ed8e3.jpg', 'XV: morada con mariposas, florales y princesa en mano (Etsy)'],
  ['xv', '03-glitter-laser-mariposa.png', 'f9ebb655e371.png', 'XV: purple glitter laser-cut con mariposa y vestido (Temu)'],
  ['xv', '04-mono-lavanda-marmol.png', '3b32094b0d31.png', 'XV: moño satinado lavanda sobre mármol con flores (Walmart)'],
  // ===== BODAS =====
  ['boda', '01-arco-floral-acuarela.jpg', '796c31e90e3e.jpg', 'Boda: arco floral acuarela enmarcando (Paper Source)'],
  ['boda', '02-azul-floral-limpio.jpg', '9c1da0f57c42.jpg', 'Boda: azul floral, diseño limpio sin marcas (Canva)'],
  ['boda', '03-rosa-floral-beige.jpg', 'c962afee7cca.jpg', 'Boda: rosa floral sobre beige con hojas (MasterBundles)'],
  ['boda', '04-tela-flor-blanca.jpg', '783498325908.jpg', 'Boda: tarjeta sobre tela suave con flor blanca (Pretty Peonies)'],
  ['boda', '05-hortensia-azul-acuarela.jpg', '7ce0bfe7a9d8.jpg', 'Boda: hortensias azul acuarela con sobre kraft (Modern Pink Paper)'],
  ['boda', '06-navy-laser-corte.jpg', 'ef7393d7268b.jpg', 'Boda: navy laser-cut con corona floral y mariposas (Picky Bride)'],
  ['boda', '07-oro-blanco-botanico.jpg', 'c3fb49002e41.jpg', 'Boda: oro y blanco botánico (Canva)'],
  ['boda', '08-glicina-morada-madera.jpg', '0d371872fad1.jpg', 'Boda: glicina morada sobre madera blanca (Go Print Plus)'],
  // ===== BABY SHOWER =====
  ['baby-shower', '01-tarjetas-florales-apiladas.jpeg', 'b0dbaf7fb107.jpeg', 'Baby shower: tres tarjetas florales apiladas (Walmart Business)'],
  ['baby-shower', '02-peonias-rojas-rosa.jpeg', '47073a97c265.jpeg', 'Baby shower: peonías rojas sobre fondo rosa acuarela (Walmart)'],
  ['baby-shower', '03-otono-mono.jpg', 'f35728fb6078.jpg', 'Baby shower: tema otoñal con moño café y flores secas (Etsy)'],
  // ===== BAUTIZO =====
  ['bautizo', '01-navy-floral.jpg', '6d289225f5ae.jpg', 'Bautizo: navy con borde floral (Utterly Printable)'],
  ['bautizo', '02-griega-azul-oro.jpg', '42a436ecded2.jpg', 'Bautizo: griega azul acuarela con caligrafía dorada'],
  ['bautizo', '03-corona-floral-encaje.jpg', 'bfb3fba62933.jpg', 'Bautizo: corona floral acuarela sobre encaje (Oh So Beautiful Paper)'],
  // ===== COMUNIÓN / CONFIRMACIÓN =====
  ['comunion', '01-caliz-oro.jpg', 'baaf6a2f455f.jpg', 'Comunión: cáliz dorado save the date (logo Canva pequeño)'],
  ['comunion', '02-espejadas-oro-plata.jpg', '562cc21a7ace.jpg', 'Comunión: tarjetas espejadas oro/plata con cruz (logo pequeño)'],
  // ===== CUMPLEAÑOS =====
  ['cumpleanos', '01-50-fabulosos-oro.png', '624eaaef1ad3.png', 'Cumple 50: "50 and Fabulous" en mesa dorada (Paperless Post)'],
  ['cumpleanos', '02-18-floral-rosa.png', '3374d18af563.png', 'Cumple 18: floral rosa con dress code (Template.net)'],
  ['cumpleanos', '03-negro-oro-60.png', '408234d7b9a2.png', 'Cumple 60: negro y oro elegante (Template.net)'],
  ['cumpleanos', '04-confetti-dorado-25.jpg', 'eff4990745d7.jpg', 'Cumple 25: confeti dorado (Paperlust)']
];

const isImage = (buf) =>
  (buf[0] === 0xff && buf[1] === 0xd8) || // JPEG
  (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47); // PNG

let ok = 0, fail = 0;
const manifest = [];
for (const [cat, name, remote, desc] of LIST) {
  const dir = join(OUT, cat);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, name);
  try {
    execFileSync('curl', ['-s', '-L', '--max-time', '60', '-o', dest, BASE + remote], { stdio: 'pipe' });
    const buf = require('fs').readFileSync(dest);
    if (!isImage(buf)) throw new Error('no es JPEG/PNG válido');
    if (buf.length < 20 * 1024) throw new Error(`demasiado pequeña (${buf.length} B)`);
    ok++;
    manifest.push({ categoria: cat, archivo: `${cat}/${name}`, kb: Math.round(buf.length / 1024), descripcion: desc });
    console.log(`✓ ${cat}/${name} (${Math.round(buf.length / 1024)} KB)`);
  } catch (e) {
    fail++;
    if (existsSync(dest)) unlinkSync(dest);
    console.error(`✗ ${cat}/${name}: ${e.message}`);
  }
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`\nTotal: ${ok} descargadas, ${fail} fallidas`);
