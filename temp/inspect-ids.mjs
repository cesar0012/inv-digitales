import fs from 'fs';
import { parseHTML } from 'linkedom';

const files = fs.readdirSync('invitaciones_generadas').filter(f => f.endsWith('.html'));

for (const file of files) {
  const html = fs.readFileSync(`invitaciones_generadas/${file}`, 'utf8');
  const { document } = parseHTML(html);
  
  console.log(`\n=== ${file} ===`);
  
  // Find all elements with id
  const allWithId = document.querySelectorAll('[id]');
  console.log('IDs found:');
  for (const el of allWithId) {
    const tag = el.tagName.toLowerCase();
    const id = el.getAttribute('id');
    const cls = el.getAttribute('class') || '';
    const txt = (el.textContent || '').trim().substring(0, 40);
    console.log(`  <${tag} id="${id}" class="${cls}"> ${txt}`);
  }
  
  // Find sections
  const sections = document.querySelectorAll('section');
  console.log(`Sections: ${sections.length}`);
  for (const s of sections) {
    console.log(`  <section id="${s.getAttribute('id') || ''}" class="${(s.getAttribute('class')||'').substring(0,50)}">`);
  }
}