// Prueba: al ENTRAR desde Laravel, los planes comprados se asignan; y el admin
// puede borrar usuarios. Usa un "Laravel" falso en local (no sale a internet) y
// el servidor real con una copia temporal de la base de datos.
//
//   node scripts/_test-login-planes.mjs
import { createServer } from 'http';
import { existsSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { iniciarServidorDePrueba } from './_test-helpers/servidor-de-prueba.mjs';

let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };

// Laravel falso: el usuario 7777 tiene tres compras (una no pagada y una con
// reembolso, que NO deben asignarse).
const compras = [
  { id: 11, payment_status: 'paid', refund_request_status: null, items: [{ metadata: { plan_slug: 'catalogo' } }] },
  { id: 12, payment_status: 'pending', refund_request_status: null, items: [{ metadata: { plan_slug: 'premium' } }] },
  { id: 13, payment_status: 'paid', refund_request_status: 'processed', items: [{ metadata: { plan_slug: 'basic' } }] },
  { id: 14, payment_status: 'paid', refund_request_status: null, items: [{ metadata: { plan_slug: 'premium' } }] },
];
let peticiones = 0;
const laravel = createServer((req, res) => {
  peticiones++;
  res.setHeader('Content-Type', 'application/json');
  if (req.url.endsWith('/consume-token')) return res.end(JSON.stringify({ token: 'token-de-laravel' }));
  if (req.url.endsWith('/user')) return res.end(JSON.stringify({ id: 7777, name: 'Cliente de prueba', email: 'c@x.com' }));
  if (req.url.startsWith('/billing/history')) return res.end(JSON.stringify({ data: compras }));
  res.statusCode = 404; res.end('{}');
});
await new Promise((r) => laravel.listen(0, r));
process.env.VITE_API_BASE_URL = `http://127.0.0.1:${laravel.address().port}`;

const servidor = await iniciarServidorDePrueba();
try {
  const U = '7777';
  const leer = (sql, ...p) => { const d = new Database(servidor.dbFile, { readonly: true }); try { return d.prepare(sql).all(...p); } finally { d.close(); } };
  const ejecutar = (sql, ...p) => { const d = new Database(servidor.dbFile); try { d.prepare(sql).run(...p); } finally { d.close(); } };
  const planes = async () => (leer('SELECT purchase_id, plan_slug, generation_credits, iteration_credits FROM user_plans WHERE user_id = ? ORDER BY purchase_id', U));

  console.log('Un usuario que ya existía sin planes entra desde Laravel:');
  // Como un usuario viejo que se quedó sin planes.
  ejecutar("INSERT OR REPLACE INTO users (user_id, name) VALUES ('7777', 'Viejo')");
  check((await planes()).length === 0, 'antes de entrar: no tiene planes');

  // El flujo real de entrada: /sso/consume?code=… (sin seguir la redirección final).
  const r = await fetch(`${servidor.baseUrl}/sso/consume?code=abc`, { redirect: 'manual' });
  check(r.status === 302 && peticiones >= 3, 'el generador pregunta a Laravel y deja entrar');

  let p = await planes();
  check(p.length === 2 && p.some((x) => x.plan_slug === 'catalogo') && p.some((x) => x.plan_slug === 'premium'), `se le asignan sus compras pagadas y sin reembolso (${p.map((x) => x.plan_slug).join(', ') || 'ninguna'})`);
  check(!p.some((x) => String(x.purchase_id) === '12' || String(x.purchase_id) === '13'), 'la no pagada y la reembolsada NO se asignan');
  const premium = p.find((x) => x.plan_slug === 'premium');
  check(premium && premium.generation_credits === 10 && premium.iteration_credits === 20, 'con los créditos configurados en el admin');

  // El que el panel toma por defecto es el plan más reciente.
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const me = await (await fetch(`${servidor.baseUrl}/api/auth/me`, { headers: { Cookie: cookie } })).json();
  check(me.authenticated && me.user.plans[0]?.plan_slug === 'premium', `su plan principal es el más reciente (${me.user?.plans?.[0]?.plan_slug})`);

  console.log('Vuelve a entrar (no se duplican ni se reinician sus créditos):');
  ejecutar("UPDATE user_plans SET generation_used = 3 WHERE user_id = '7777' AND plan_slug = 'premium'");
  await fetch(`${servidor.baseUrl}/sso/consume?code=abc`, { redirect: 'manual' });
  p = await planes();
  check(p.length === 2, `sigue teniendo 2 planes (${p.length})`);

  console.log('El administrador borra un usuario:');
  const H = { Authorization: `Bearer ${servidor.tokenAdmin}` };
    const conFichero = join(servidor.dataDir, 'storage', 'users', servidor.usuarioId, 'editor_test.html');
  const b = await fetch(`${servidor.baseUrl}/api/admin/users/${servidor.usuarioId}`, { method: 'DELETE', headers: H });
  const cuerpo = await b.json();
  const despues = await fetch(`${servidor.baseUrl}/api/admin/users`, { headers: H }).then((x) => x.json());
  check(b.ok && cuerpo.usuario === 1 && cuerpo.planes >= 1, `se borra el usuario y sus planes (${JSON.stringify(cuerpo)})`);
  check(!despues.users.some((u) => String(u.user_id) === servidor.usuarioId), 'ya no aparece en la lista del admin');
  check((leer('SELECT 1 FROM user_plans WHERE user_id = ?', servidor.usuarioId)).length === 0, 'no quedan planes sueltos');
  check(existsSync(conFichero) === false, 'y su carpeta de invitaciones');
  const mala = await fetch(`${servidor.baseUrl}/api/admin/users/abc..%2F..`, { method: 'DELETE', headers: H });
  check(mala.status === 400, 'rechaza un identificador que no es un número');
  const sinSesion = await fetch(`${servidor.baseUrl}/api/admin/users/${servidor.usuarioId}`, { method: 'DELETE' });
  check(sinSesion.status === 401 || sinSesion.status === 403, 'y sin sesión de administrador no se puede borrar');
} finally {
  await servidor.detener();
  laravel.close();
}
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
