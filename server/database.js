import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    invitations_count INTEGER DEFAULT 0,
    iteration_credits INTEGER DEFAULT 10,
    max_invitations INTEGER DEFAULT 20,
    max_iteration_credits INTEGER DEFAULT 10,
    generation_credits INTEGER DEFAULT 10,
    max_generation_credits INTEGER DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    event_type TEXT,
    starred INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    html_provider TEXT DEFAULT 'openai',
    html_base_url TEXT DEFAULT 'https://api.openai.com/v1',
    html_api_key TEXT DEFAULT '',
    html_model TEXT DEFAULT 'gpt-4o',
    html_google_api_key TEXT DEFAULT '',
    html_google_model TEXT DEFAULT 'gemini-3.1-flash-preview',
    image_provider TEXT DEFAULT 'gemini',
    image_model TEXT DEFAULT 'gemini-3.1-flash-image-preview',
    image_api_key TEXT DEFAULT '',
    login_page_url TEXT DEFAULT '/admin-login',
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS catalogo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    title TEXT,
    event_type TEXT,
    theme TEXT,
    colors TEXT,
    tags TEXT,
    starred INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

try {
  db.exec(`ALTER TABLE catalogo ADD COLUMN starred INTEGER DEFAULT 0`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE catalogo ADD COLUMN primary_color TEXT`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE catalogo ADD COLUMN secondary_color TEXT`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE catalogo ADD COLUMN event_domain TEXT`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE catalogo ADD COLUMN event_date TEXT`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE catalogo ADD COLUMN event_time TEXT`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE users ADD COLUMN generation_credits INTEGER DEFAULT 10`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE users ADD COLUMN max_generation_credits INTEGER DEFAULT 10`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE invitations ADD COLUMN event_domain TEXT`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE invitations ADD COLUMN event_date TEXT`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE invitations ADD COLUMN event_time TEXT`);
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT DEFAULT (datetime('now', '+24 hours'))
  )
`);

// Tabla para usuarios locales (fallback cuando Laravel no está disponible)
db.exec(`
  CREATE TABLE IF NOT EXISTS local_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role_name TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Tabla para códigos SSO locales
db.exec(`
  CREATE TABLE IF NOT EXISTS local_sso_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT,
    access_token TEXT,
    code_hash TEXT NOT NULL,
    purpose TEXT DEFAULT 'editor',
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

try {
  db.exec(`ALTER TABLE local_sso_codes ADD COLUMN access_token TEXT`);
  console.log('✅ Columna access_token agregada a local_sso_codes');
} catch (e) {}

// 🆕 Tabla de configuración de planes (maestra)
db.exec(`
  CREATE TABLE IF NOT EXISTS plan_config (
    plan_slug TEXT PRIMARY KEY,
    plan_name TEXT NOT NULL,
    invites_included INTEGER DEFAULT 10,
    generation_credits INTEGER DEFAULT 10,
    iteration_credits INTEGER DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

const PLAN_DEFAULTS = [
  { slug: 'premium', name: 'Plan Premium', invites: 1, gen: 10, iter: 20 },
  { slug: 'catalogo', name: 'Plan Catálogo', invites: 1, gen: 5, iter: 10 },
  { slug: 'creativa', name: 'Plan Creativa', invites: 1, gen: 7, iter: 14 },
  { slug: 'basic', name: 'Plan Básico', invites: 1, gen: 3, iter: 6 },
  { slug: 'standard', name: 'Plan Estándar', invites: 1, gen: 5, iter: 10 },
];

try {
  const upsertPlan = db.prepare(`
    INSERT INTO plan_config (plan_slug, plan_name, invites_included, generation_credits, iteration_credits)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(plan_slug) DO UPDATE SET
      plan_name = excluded.plan_name,
      invites_included = excluded.invites_included,
      generation_credits = excluded.generation_credits,
      iteration_credits = excluded.iteration_credits
  `);
  for (const p of PLAN_DEFAULTS) {
    upsertPlan.run(p.slug, p.name, p.invites, p.gen, p.iter);
  }
  console.log('✅ Configuración de planes inicializada/actualizada');
} catch (e) { console.log('⚠️ Error inicializando planes:', e.message); }

// Migración: sincronizar user_plans existentes con los nuevos valores de plan_config
try {
  const syncUserPlans = db.prepare(`
    UPDATE user_plans SET
      invites_included = (SELECT pc.invites_included FROM plan_config pc WHERE pc.plan_slug = user_plans.plan_slug),
      generation_credits = (SELECT pc.generation_credits FROM plan_config pc WHERE pc.plan_slug = user_plans.plan_slug),
      iteration_credits = (SELECT pc.iteration_credits FROM plan_config pc WHERE pc.plan_slug = user_plans.plan_slug)
    WHERE plan_slug IN (SELECT plan_slug FROM plan_config)
  `);
  const result = syncUserPlans.run();
  if (result.changes > 0) {
    console.log(`✅ Migración: ${result.changes} user_plans actualizados con nuevos valores de plan_config`);
  }
} catch (e) { console.log('⚠️ Error migrando user_plans:', e.message); }

// 🆕 Tabla de planes de usuario
db.exec(`
  CREATE TABLE IF NOT EXISTS user_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    purchase_id INTEGER NOT NULL,
    plan_slug TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    invites_included INTEGER NOT NULL,
    invites_used INTEGER DEFAULT 0,
    generation_credits INTEGER NOT NULL,
    generation_used INTEGER DEFAULT 0,
    iteration_credits INTEGER NOT NULL,
    iteration_used INTEGER DEFAULT 0,
    last_synced_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, purchase_id)
  )
`);

// 🆕 Columnas nuevas en invitations
try {
  db.exec(`ALTER TABLE invitations ADD COLUMN purchase_id INTEGER`);
  console.log('✅ Columna purchase_id agregada');
} catch (e) {}

try {
  db.exec(`ALTER TABLE invitations ADD COLUMN plan_slug TEXT`);
  console.log('✅ Columna plan_slug agregada');
} catch (e) {}

// Crear usuario de prueba si no existe
const testUserEmail = 'arj1931126@gmail.com';
const testUserPasswordHash = createHash('sha256').update('Jar123456').digest('hex');
const testUserId = '135';

const checkTestUser = db.prepare('SELECT id FROM local_users WHERE email = ?');
const existingTestUser = checkTestUser.get(testUserEmail);

if (!existingTestUser) {
  const insertTestUser = db.prepare(
    'INSERT INTO local_users (user_id, email, password_hash, name, role_name) VALUES (?, ?, ?, ?, ?)'
  );
  insertTestUser.run(testUserId, testUserEmail, testUserPasswordHash, 'Josué Alvarez Rodriguez', 'user');
  console.log('✅ Usuario de prueba creado: arj1931126@gmail.com / Jar123456');
}

// Usuario de prueba fijo
const fixedTestEmail = 'test@invitacionesmodernas.com';
const fixedTestPasswordHash = createHash('sha256').update('invD2026!').digest('hex');
const fixedTestUserId = 'test_user';

const checkFixedTestUser = db.prepare('SELECT id FROM local_users WHERE email = ?');
const existingFixedTestUser = checkFixedTestUser.get(fixedTestEmail);

if (!existingFixedTestUser) {
  const insertFixedTestUser = db.prepare(
    'INSERT INTO local_users (user_id, email, password_hash, name, role_name) VALUES (?, ?, ?, ?, ?)'
  );
  insertFixedTestUser.run(fixedTestUserId, fixedTestEmail, fixedTestPasswordHash, 'Usuario Prueba', 'user');
  console.log('✅ Usuario de prueba fijo creado: test@invitacionesmodernas.com / invD2026!');
}

const adminEmail = 'admin@linksocially.com';
const adminPasswordHash = createHash('sha256').update('admin123').digest('hex');

const checkAdmin = db.prepare('SELECT id FROM admins WHERE email = ?');
const existingAdmin = checkAdmin.get(adminEmail);

if (!existingAdmin) {
  const insertAdmin = db.prepare('INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)');
  insertAdmin.run(adminEmail, adminPasswordHash, 'Administrador');
  console.log('✅ Admin por defecto creado: admin@linksocially.com / admin123');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_invitations_user ON invitations(user_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_invitations_starred ON invitations(starred)
`);

const ensureUserExists = db.transaction((userId) => {
  const stmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const user = stmt.get(userId);
  
  if (!user) {
    const insertStmt = db.prepare(
      'INSERT INTO users (user_id, invitations_count, iteration_credits, generation_credits) VALUES (?, ?, ?, ?)'
    );
    insertStmt.run(userId, 0, 10, 10);
    console.log(`✅ Usuario ${userId} creado con valores por defecto`);
    return true;
  }
  
  const updates = [];
  const values = [];
  
  if (user.invitations_count === null || user.invitations_count === undefined) {
    updates.push('invitations_count = ?');
    values.push(0);
  }
  
  if (user.iteration_credits === null || user.iteration_credits === undefined) {
    updates.push('iteration_credits = ?');
    values.push(10);
  }
  
  if (user.generation_credits === null || user.generation_credits === undefined) {
    updates.push('generation_credits = ?');
    values.push(10);
  }
  
  if (user.max_generation_credits === null || user.max_generation_credits === undefined) {
    updates.push('max_generation_credits = ?');
    values.push(10);
  }
  
  if (updates.length > 0) {
    values.push(userId);
    const updateStmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`);
    updateStmt.run(...values);
    console.log(`✅ Usuario ${userId} actualizado con campos faltantes`);
  }
  
  return false;
});

const ensureAllUsersHaveData = () => {
  const usersStmt = db.prepare('SELECT user_id FROM users');
  const users = usersStmt.all();
  
  users.forEach(user => {
    ensureUserExists(user.user_id);
  });
  
  console.log(`📊 Total usuarios verificados: ${users.length}`);
};

ensureUserExists('test_user_001');
ensureAllUsersHaveData();

export default db;
