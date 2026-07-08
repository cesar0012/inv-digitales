// Script de prueba para subir Hero-01.html al nuevo RAG modular
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = 'http://localhost:3001';
const ADMIN_TOKEN = 'test-admin-token'; // Necesitarás un token real de admin

// Leer Hero-01.html
const heroHtml = readFileSync(join(__dirname, '..', 'Hero-01.html'), 'utf8');

console.log('=== TEST: Subir Hero-01.html a RAG Modular ===\n');

// Crear FormData
const formData = new FormData();
const blob = new Blob([heroHtml], { type: 'text/html' });
formData.append('htmlFile', blob, 'Hero-01.html');

try {
  // Obtener token de admin primero (login)
  console.log('1. Login de admin...');
  const loginRes = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@linksocially.com',
      password: 'admin123'
    })
  });
  
  if (!loginRes.ok) {
    console.log('⚠️  Login falló (quizás el server no corre o credenciales incorrectas)');
    console.log('    Usando token hardcoded (puede no funcionar)');
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token || ADMIN_TOKEN;
  console.log('   Token:', token.substring(0, 20) + '...\n');
  
  // Subir módulo
  console.log('2. Subiendo Hero-01.html...');
  const uploadRes = await fetch(`${API_BASE}/api/admin/rag-modules/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const result = await uploadRes.json();
  
  if (uploadRes.ok) {
    console.log('✅ Subida exitosa!');
    console.log('   ID:', result.id);
    console.log('   module_id:', result.module_id);
    console.log('   module_type:', result.module_type);
    console.log('   html_size KB:', (result.analysis.metadata.memory_counts.text + result.analysis.metadata.memory_counts.background + result.analysis.metadata.memory_counts.image), 'elementos memory_*');
    console.log('   tags:', result.analysis.metadata.module_metadata.tags.length, 'tags');
    console.log('   descripcion:', result.analysis.metadata.module_metadata.descripcion.substring(0, 80) + '...');
    console.log('   placeholders:', result.analysis.metadata.placeholder_count);
  } else {
    console.log('❌ Error en subida:', result.error);
    if (result.validation) {
      console.log('   Errors:', result.validation.errors);
      console.log('   Warnings:', result.validation.warnings);
    }
  }
  
  // Listar módulos
  console.log('\n3. Listando módulos...');
  const listRes = await fetch(`${API_BASE}/api/admin/rag-modules`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const listData = await listRes.json();
  console.log('   Módulos en RAG:', listData.modules?.length || 0);
  if (listData.modules && listData.modules.length > 0) {
    const uploaded = listData.modules.find(m => m.module_id === 'portada-nombre');
    if (uploaded) {
      console.log('   ✅ Módulo encontrado en lista:', uploaded.style_name);
    }
  }
  
  // Query público
  console.log('\n4. Query público para module_type=portada...');
  const queryRes = await fetch(`${API_BASE}/api/rag/modules/query?module_type=portada&limit=1`);
  const queryData = await queryRes.json();
  console.log('   Resultados:', queryData.modules?.length || 0);
  if (queryData.modules && queryData.modules.length > 0) {
    const m = queryData.modules[0];
    console.log('   -', m.module_id, '|', m.style_name);
    console.log('     tags:', m.tags.slice(0, 5).join(', ') + '...');
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  console.log('\n¿El servidor está corriendo? Ejecuta: npm run dev');
  process.exit(1);
}

console.log('\n=== TEST COMPLETADO ===');