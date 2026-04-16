import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync, readFileSync, unlinkSync, appendFileSync } from 'fs';
import { createHash } from 'crypto';
import https from 'https';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger to file
const logFile = path.join(__dirname, 'debug.log');
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  appendFileSync(logFile, logMsg);
  console.log(msg);
};

const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC_URL = process.env.VITE_PUBLIC_URL || `http://localhost:${PORT}`;
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.invitacionesmodernas.com/api';

app.use(cors({ 
  origin: ['https://generador.invitacionesmodernas.com', 'http://localhost:3002', 'http://localhost:3001'],
  credentials: true,
  exposedHeaders: ['Set-Cookie']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

const imgPath = join(__dirname, '..', 'img');
app.use('/img', express.static(imgPath));

const storagePath = join(__dirname, 'storage', 'users');
const historicoPath = join(__dirname, 'storage', 'historico');
app.use('/storage', express.static(storagePath));
app.use('/storage/historico', express.static(historicoPath));

const ensureUserFolder = (userId) => {
  const userFolder = join(storagePath, userId);
  if (!existsSync(userFolder)) {
    mkdirSync(userFolder, { recursive: true });
  }
  return userFolder;
};

const generateSlug = (eventType, timestamp) => {
  const eventSlug = (eventType || 'invitacion')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const shortId = timestamp.toString(36).slice(-4);
  
  return `${eventSlug}-${shortId}`;
};

const validateToken = async (token) => {
  // Primero intentar con Laravel
  try {
    const response = await fetchNoSSL(`${API_BASE_URL}/user`, {
      headers: { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('⚠️ Laravel no disponible para validateToken');
  }
  
  // Fallback: validar token local
  return validateLocalToken(token);
};

const validateLocalToken = (token) => {
  // Formato: "id|hash"
  const tokenParts = token.split('|');
  const userId = tokenParts[0];
  
  if (!userId || !tokenParts[1]) {
    return null;
  }
  
  const stmt = db.prepare('SELECT * FROM local_users WHERE user_id = ?');
  const user = stmt.get(userId);
  
  if (!user) {
    return null;
  }
  
  return {
    id: parseInt(user.user_id),
    name: user.name,
    email: user.email,
    role_name: user.role_name
  };
};

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No autenticado', code: 'NO_TOKEN' });
  }
  
  const user = await validateToken(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Token inválido o expirado', code: 'INVALID_TOKEN' });
  }
  
  const stmt = db.prepare('SELECT user_id FROM users WHERE user_id = ?');
  const existing = stmt.get(user.id.toString());
  
  if (!existing) {
    const insertStmt = db.prepare(
      'INSERT INTO users (user_id, invitations_count, iteration_credits, max_invitations, max_iteration_credits) VALUES (?, ?, ?, ?, ?)'
    );
    insertStmt.run(user.id.toString(), 0, 10, 20, 10);
    console.log(`✅ Usuario ${user.id} creado automáticamente en DB local`);
  }
  
  req.user = user;
  req.token = token;
  next();
};

const getUserInvitations = (userId) => {
  const userFolder = join(storagePath, userId);
  
  if (!existsSync(userFolder)) {
    return [];
  }
  
  const invitationsStmt = db.prepare('SELECT * FROM invitations WHERE user_id = ?');
  const dbInvitations = invitationsStmt.all(userId);
  
  const slugMap = new Map();
  dbInvitations.forEach(inv => {
    slugMap.set(inv.filename, inv);
  });
  
  return readdirSync(userFolder)
    .filter(f => f.endsWith('.html'))
    .map(f => {
      const filePath = join(userFolder, f);
      const stats = statSync(filePath);
      const dbData = slugMap.get(f);
      
      let slug = dbData?.slug;
      if (!slug) {
        slug = generateSlug(dbData?.event_type || 'invitacion', Date.now());
        const insertStmt = db.prepare(
          'INSERT INTO invitations (user_id, filename, slug, event_type, event_domain, event_date, event_time) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        insertStmt.run(userId, f, slug, dbData?.event_type || 'Invitacion', dbData?.event_domain || null, dbData?.event_date || null, dbData?.event_time || null);
      }
      
      return {
        filename: f,
        slug,
        publicUrl: `${PUBLIC_URL}/i/${slug}`,
        event_type: dbData?.event_type || 'Invitacion',
        event_domain: dbData?.event_domain || null,
        event_date: dbData?.event_date || null,
        event_time: dbData?.event_time || null,
        created_at: stats.birthtime.toISOString(),
        size: stats.size
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

const syncUserInvitationsCount = (userId) => {
  const userFolder = join(storagePath, userId);
  let actualCount = 0;
  
  if (existsSync(userFolder)) {
    actualCount = readdirSync(userFolder).filter(f => f.endsWith('.html')).length;
  }
  
  const stmt = db.prepare('SELECT invitations_count FROM users WHERE user_id = ?');
  const user = stmt.get(userId);
  
  if (user && user.invitations_count !== actualCount) {
    const updateStmt = db.prepare('UPDATE users SET invitations_count = ? WHERE user_id = ?');
    updateStmt.run(actualCount, userId);
  }
  
  return actualCount;
};

const ensureUserInDB = (user) => {
  const stmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const existing = stmt.get(user.id.toString());
  
  if (!existing) {
    const insertStmt = db.prepare(
      'INSERT INTO users (user_id, invitations_count, iteration_credits) VALUES (?, ?, ?)'
    );
    insertStmt.run(user.id.toString(), 0, 10);
  }
  
  return user.id.toString();
};

// ==================== PROXY ENDPOINTS (evitan CORS) ====================

// POST /api/auth/login - Proxy para login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const response = await fetchNoSSL(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (response.ok) {
      const data = await response.json();
      res.cookie('auth_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      return res.json(data);
    }
    
    // Fallback local
    return handleLocalLogin(req, res, email, password);
    
  } catch (error) {
    return handleLocalLogin(req, res, email, password);
  }
});

// Función para login local (fallback)
function handleLocalLogin(req, res, email, password) {
  const passwordHash = createHash('sha256').update(password).digest('hex');
  
  const stmt = db.prepare('SELECT * FROM local_users WHERE email = ? AND password_hash = ?');
  const user = stmt.get(email, passwordHash);
  
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas', email: 'Email o contraseña incorrectos' });
  }
  
  // Generar token estilo Laravel Sanctum
  const token = `${user.id}|${createHash('sha256').update(`${user.id}-${Date.now()}`).digest('hex')}`;
  
  // Guardar token en cookie
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  res.json({
    token,
    user: {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role_name: user.role_name
    }
  });
}

// Función para fetch sin verificación SSL (para Laravel HTTPS)
const fetchNoSSL = async (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    resolve(fetch(url, { ...options, agent }));
  });
};

// POST /api/auth/issue - Proxy para emitir código SSO
app.post('/api/auth/issue', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  try {
    const response = await fetchNoSSL(`${API_BASE_URL}/issue`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      return res.json(await response.json());
    }
    
    // Fallback local
    return handleLocalIssue(req, res, token);
    
  } catch (error) {
    return handleLocalIssue(req, res, token);
  }
});

// Función para issue local
function handleLocalIssue(req, res, token) {
  // Extraer user_id del token (formato: "id|hash")
  const tokenParts = token.split('|');
  const userId = tokenParts[0];
  
  if (!userId) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  // Buscar usuario
  const userStmt = db.prepare('SELECT * FROM local_users WHERE user_id = ?');
  const user = userStmt.get(userId);
  
  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }
  
  // Generar código SSO
  const code = createHash('sha256').update(`${userId}-${Date.now()}-${Math.random()}`).digest('hex').substring(0, 32);
  const codeHash = createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 60 segundos
  
  // Guardar código
  const insertStmt = db.prepare(
    'INSERT INTO local_sso_codes (user_id, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?)'
  );
  insertStmt.run(userId, codeHash, 'editor', expiresAt);
  
  res.json({
    code,
    expires_in: 60
  });
}

// POST /api/auth/consume-token - Proxy para consumir código SSO
app.post('/api/auth/consume-token', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Código requerido' });
  }
  
  try {
    const response = await fetchNoSSL(`${API_BASE_URL}/consume-token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (response.ok) {
      return res.json(await response.json());
    }
    
    const errorData = await response.json();
    // Si el código ya fue usado o expiró, no hacer fallback (ya fue procesado)
    if (errorData.message?.includes('inválido') || errorData.message?.includes('expirado')) {
      return res.status(401).json(errorData);
    }
    
    // Fallback local solo si Laravel no responde
    return handleLocalConsumeToken(req, res, code);
    
  } catch (error) {
    return handleLocalConsumeToken(req, res, code);
  }
});

// Función para consume-token local
function handleLocalConsumeToken(req, res, code) {
  const codeHash = createHash('sha256').update(code).digest('hex');
  const now = new Date().toISOString();
  
  // Buscar código válido
  const stmt = db.prepare(
    'SELECT * FROM local_sso_codes WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?'
  );
  const codeRecord = stmt.get(codeHash, now);
  
  if (!codeRecord) {
    return res.status(401).json({ message: 'Código inválido o expirado' });
  }
  
  // Marcar como usado (de manera atómica)
  const updateStmt = db.prepare('UPDATE local_sso_codes SET used_at = ? WHERE id = ?');
  updateStmt.run(now, codeRecord.id);
  
  // Buscar usuario
  const userStmt = db.prepare('SELECT * FROM local_users WHERE user_id = ?');
  const user = userStmt.get(codeRecord.user_id);
  
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }
  
  // Generar nuevo token para el editor
  const newToken = `${user.user_id}|${createHash('sha256').update(`${user.user_id}-${Date.now()}-editor`).digest('hex')}`;
  
  // Guardar token en cookie
  res.cookie('auth_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  res.json({
    token: newToken,
    user: {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role_name: user.role_name
    }
  });
}

// GET /api/auth/user - Proxy para obtener usuario (con fallback local)
app.get('/api/auth/user', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  try {
    const response = await fetchNoSSL(`${API_BASE_URL}/user`, {
      headers: { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }
    
    // Fallback local
    console.log('⚠️ Laravel no disponible, usando user local...');
    return handleLocalUser(req, res, token);
    
  } catch (error) {
    console.log('⚠️ Error conectando a Laravel:', error.message);
    return handleLocalUser(req, res, token);
  }
});

function handleLocalUser(req, res, token) {
  const user = validateLocalToken(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  res.json(user);
}

// POST /api/auth/logout - Proxy para logout (con fallback local)
app.post('/api/auth/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    const response = await fetchNoSSL(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: { 
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }
    
    // Fallback local
    console.log('⚠️ Laravel no disponible, usando logout local...');
    return handleLocalLogout(req, res);
    
  } catch (error) {
    console.log('⚠️ Error conectando a Laravel:', error.message);
    return handleLocalLogout(req, res);
  }
});

function handleLocalLogout(req, res) {
  res.clearCookie('auth_token');
  res.json({ message: 'Sesión cerrada' });
}

// ==================== FIN PROXY ENDPOINTS ====================

// ==================== LOCAL IMAGE ENDPOINTS ====================

// GET /api/images/:folder/list - Lista imágenes de una carpeta
app.get('/api/images/:folder/list', (req, res) => {
  const { folder } = req.params;
  const folderPath = join(imgPath, folder);
  
  if (!existsSync(folderPath)) {
    return res.json({ images: [], error: 'Carpeta no encontrada' });
  }
  
  try {
    const files = readdirSync(folderPath)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
    
    res.json({ images: files, total: files.length });
  } catch (error) {
    res.json({ images: [], error: 'Error al leer carpeta' });
  }
});

// GET /api/images/:folder/random - Obtiene imagen aleatoria
app.get('/api/images/:folder/random', (req, res) => {
  const { folder } = req.params;
  const folderPath = join(imgPath, folder);
  
  if (!existsSync(folderPath)) {
    return res.status(404).json({ error: 'Carpeta no encontrada' });
  }
  
  try {
    const files = readdirSync(folderPath)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'No hay imágenes en la carpeta' });
    }
    
    const randomFile = files[Math.floor(Math.random() * files.length)];
    res.redirect(`/img/${folder}/${randomFile}`);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener imagen' });
  }
});

// GET /api/images/list-all - Lista todas las carpetas con imágenes
app.get('/api/images/list-all', (req, res) => {
  try {
    if (!existsSync(imgPath)) {
      return res.json({ folders: [] });
    }
    
    const folders = readdirSync(imgPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const folderPath = join(imgPath, d.name);
        const images = readdirSync(folderPath)
          .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
        return {
          name: d.name,
          count: images.length
        };
      })
      .filter(f => f.count > 0);
    
    res.json({ folders });
  } catch (error) {
    res.json({ folders: [], error: 'Error al listar carpetas' });
  }
});

// ==================== FIN LOCAL IMAGE ENDPOINTS ====================

// GET /i/:slug - Público - Sirve la invitación HTML
app.get('/i/:slug', (req, res) => {
  const { slug } = req.params;
  
  const stmt = db.prepare('SELECT * FROM invitations WHERE slug = ?');
  const invitation = stmt.get(slug);
  
  if (!invitation) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Invitación no encontrada</title></head>
      <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fdf2f8;">
        <div style="text-align:center;padding:2rem;">
          <h1 style="color:#be185d;">Invitación no encontrada</h1>
          <p style="color:#6b7280;">Esta invitación no existe o ha sido eliminada.</p>
        </div>
      </body>
      </html>
    `);
  }
  
  const filePath = join(storagePath, invitation.user_id, invitation.filename);
  
  if (!existsSync(filePath)) {
    return res.status(404).send('Archivo no encontrado');
  }
  
  const content = readFileSync(filePath, 'utf-8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(content);
});

// POST /api/auth/set-token - Guarda token en cookie httpOnly
app.post('/api/auth/set-token', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token requerido' });
  }
  
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  res.json({ success: true });
});

// POST /api/auth/set-token - Guarda token en cookie httpOnly
app.post('/api/auth/set-token', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token requerido' });
  }
  
  console.log('=== SET TOKEN DEBUG ===');
  console.log('Setting cookie for token:', token.substring(0, 20) + '...');
  console.log('========================');
  
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: 'localhost'
  });
  
  res.json({ success: true });
});

// POST /api/auth/logout - Elimina cookie de autenticación
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// GET /api/auth/me - Obtiene usuario actual
app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies?.auth_token;
  
  if (!token) {
    return res.json({ user: null, authenticated: false });
  }
  
  const user = await validateToken(token);
  
  if (!user) {
    res.clearCookie('auth_token');
    return res.json({ user: null, authenticated: false });
  }
  
  res.json({ user, authenticated: true });
});

// GET /api/users - Devuelve todos los usuarios con sus invitaciones (protegido)
app.get('/api/users', authMiddleware, (req, res) => {
  const usersStmt = db.prepare('SELECT * FROM users');
  const users = usersStmt.all();
  
  const usersWithInvitations = users.map(user => {
    const actualInvitationsCount = syncUserInvitationsCount(user.user_id);
    const invitations = getUserInvitations(user.user_id);
    
    return {
      user_id: user.user_id,
      invitations_count: actualInvitationsCount,
      iteration_credits: user.iteration_credits,
      invitations_remaining: user.max_invitations - actualInvitationsCount,
      max_invitations: user.max_invitations,
      max_iteration_credits: user.max_iteration_credits,
      generation_credits: user.generation_credits,
      max_generation_credits: user.max_generation_credits,
      created_at: user.created_at,
      invitations
    };
  });
  
  res.json({
    users: usersWithInvitations,
    total: usersWithInvitations.length
  });
});

// GET /api/get-user/:id - Devuelve datos del usuario con invitaciones (protegido)
app.get('/api/get-user/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  const stmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const user = stmt.get(id);
  
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  
  const actualInvitationsCount = syncUserInvitationsCount(id);
  const invitations = getUserInvitations(id);
  
  res.json({
    user_id: user.user_id,
    invitations_count: actualInvitationsCount,
    iteration_credits: user.iteration_credits,
    invitations_remaining: user.max_invitations - actualInvitationsCount,
    max_invitations: user.max_invitations,
    max_iteration_credits: user.max_iteration_credits,
    generation_credits: user.generation_credits,
    max_generation_credits: user.max_generation_credits,
    created_at: user.created_at,
    invitations
  });
});

// POST /api/user/:id/consume-credit - Resta 1 crédito (protegido)
app.post('/api/user/:id/consume-credit', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  const stmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const user = stmt.get(id);
  
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  
  if (user.iteration_credits <= 0) {
    return res.status(400).json({ error: 'No tienes créditos de iteración disponibles' });
  }
  
  const updateStmt = db.prepare('UPDATE users SET iteration_credits = iteration_credits - 1 WHERE user_id = ?');
  updateStmt.run(id);
  
  const updatedUser = db.prepare('SELECT * FROM users WHERE user_id = ?').get(id);
  
  res.json({
    success: true,
    iteration_credits: updatedUser.iteration_credits
  });
});

// POST /api/user/:id/consume-generation-credit - Resta 1 crédito de generación (protegido)
app.post('/api/user/:id/consume-generation-credit', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  const stmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const user = stmt.get(id);
  
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  
  if (user.generation_credits <= 0) {
    return res.status(400).json({ error: 'No tienes créditos de generación disponibles' });
  }
  
  const updateStmt = db.prepare('UPDATE users SET generation_credits = generation_credits - 1 WHERE user_id = ?');
  updateStmt.run(id);
  
  const updatedUser = db.prepare('SELECT * FROM users WHERE user_id = ?').get(id);
  
  res.json({
    success: true,
    generation_credits: updatedUser.generation_credits
  });
});

// POST /api/invitations - Guarda una nueva invitación (protegido)
app.post('/api/invitations', authMiddleware, (req, res) => {
  const { htmlContent, eventType, replaceFilename, eventDomain, eventDate, eventTime } = req.body;
  
  const userId = ensureUserInDB(req.user);
  
  if (!htmlContent) {
    return res.status(400).json({ error: 'htmlContent es requerido' });
  }
  
  const stmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const user = stmt.get(userId);
  const maxInvitations = user?.max_invitations || 3;
  const currentCount = syncUserInvitationsCount(userId);
  
  if (currentCount >= maxInvitations && !replaceFilename) {
    const invitations = getUserInvitations(userId);
    return res.status(409).json({ 
      error: 'Has alcanzado el límite de invitaciones almacenadas',
      code: 'LIMIT_REACHED',
      max_invitations: maxInvitations,
      invitations
    });
  }

  if (replaceFilename) {
    const replaceFilePath = join(storagePath, userId, replaceFilename);
    if (existsSync(replaceFilePath)) {
      unlinkSync(replaceFilePath);
      console.log('🗑️ Archivo reemplazado:', replaceFilename);
    }
    const deleteStmt = db.prepare('DELETE FROM invitations WHERE user_id = ? AND filename = ?');
    deleteStmt.run(userId, replaceFilename);
    console.log('🗑️ Registro DB eliminado:', replaceFilename);
  }
  
  const userFolder = ensureUserFolder(userId);
  const timestamp = Date.now();
  const filename = `invitation_${timestamp}.html`;
  const filePath = join(userFolder, filename);
  
  const slug = generateSlug(eventType || 'Invitacion', timestamp);
  
  writeFileSync(filePath, htmlContent, 'utf-8');
  
  const insertInvitation = db.prepare(
    'INSERT INTO invitations (user_id, filename, slug, event_type, event_domain, event_date, event_time) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertInvitation.run(userId, filename, slug, eventType || 'Invitacion', eventDomain || null, eventDate || null, eventTime || null);
  
  syncUserInvitationsCount(userId);
  
  const updatedUser = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  
  res.json({
    success: true,
    filename,
    slug,
    publicUrl: `${PUBLIC_URL}/i/${slug}`,
    invitations_count: updatedUser?.invitations_count || 1,
    invitations_remaining: maxInvitations - (updatedUser?.invitations_count || 1)
  });
});

// PUT /api/invitations/:userId/:filename - Actualiza datos del evento (protegido)
app.put('/api/invitations/:userId/:filename', authMiddleware, (req, res) => {
  const { userId, filename } = req.params;
  const { eventType, eventDomain, eventDate, eventTime } = req.body;
  
  if (req.user.id.toString() !== userId) {
    return res.status(403).json({ error: 'No autorizado para modificar esta invitación' });
  }
  
  const filePath = join(storagePath, userId, filename);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  
  const updateStmt = db.prepare(`
    UPDATE invitations 
    SET event_type = COALESCE(?, event_type),
        event_domain = COALESCE(?, event_domain),
        event_date = COALESCE(?, event_date),
        event_time = COALESCE(?, event_time)
    WHERE user_id = ? AND filename = ?
  `);
  updateStmt.run(eventType, eventDomain, eventDate, eventTime, userId, filename);
  
  res.json({ success: true });
});

// GET /api/invitations/:userId - Lista archivos del usuario (protegido)
app.get('/api/invitations/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.id.toString() !== userId) {
    return res.status(403).json({ error: 'No autorizado para ver estas invitaciones' });
  }
  
  const invitations = getUserInvitations(userId);
  
  res.json({ invitations });
});

// GET /api/invitations/:userId/:filename - Devuelve contenido del archivo (protegido)
app.get('/api/invitations/:userId/:filename', authMiddleware, (req, res) => {
  const { userId, filename } = req.params;
  
  if (req.user.id.toString() !== userId) {
    return res.status(403).json({ error: 'No autorizado para ver esta invitación' });
  }
  
  const filePath = join(storagePath, userId, filename);
  
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  
  const content = readFileSync(filePath, 'utf-8');
  
  res.setHeader('Content-Type', 'text/html');
  res.send(content);
});

function extractMetadataFromHTML(htmlContent) {
  let title = '';
  let eventType = '';
  let theme = '';
  let colors = [];
  let tags = [];
  let primaryColor = '';
  let secondaryColor = '';

  const invitationDataMatch = htmlContent.match(/<!-- INVITATION_DATA:({.*?})-->/);
  if (invitationDataMatch) {
    try {
      const metadata = JSON.parse(invitationDataMatch[1]);
      title = metadata.title || '';
      eventType = metadata.eventType || '';
      theme = metadata.theme || '';
      colors = metadata.colors || [];
      tags = metadata.tags || [];
    } catch (e) {
      console.error('Error parsing INVITATION_DATA:', e);
    }
  }

  const editorMetaMatch = htmlContent.match(/<script type="application\/json" id="invitation-editor-metadata">([\s\S]*?)<\/script>/);
  if (editorMetaMatch) {
    try {
      const editorMeta = JSON.parse(editorMetaMatch[1]);
      if (!title && editorMeta.title) title = editorMeta.title;
      if (!eventType && editorMeta.eventType) eventType = editorMeta.eventType;
      if (!theme && editorMeta.theme) theme = editorMeta.theme;
      if (editorMeta.primaryColor) primaryColor = editorMeta.primaryColor;
      if (editorMeta.secondaryColor) secondaryColor = editorMeta.secondaryColor;
    } catch (e) {
      console.error('Error parsing invitation-editor-metadata:', e);
    }
  }

  if (!title) {
    const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].trim();
    }
  }

  return { title, eventType, theme, colors, tags, primaryColor, secondaryColor };
}

function colorNameFromHex(hex) {
  if (!hex) return '';
  const h = hex.toLowerCase();
  const map = {
    '#ff0000': 'Rojo', '#e74c3c': 'Rojo', '#c0392b': 'Rojo oscuro',
    '#f44336': 'Rojo', '#ff5252': 'Rojo claro',
    '#ff9800': 'Naranja', '#f57c00': 'Naranja oscuro', '#ff6d00': 'Naranja intenso',
    '#ffc107': 'Ámbar', '#ffb300': 'Ámbar dorado',
    '#ffeb3b': 'Amarillo', '#fdd835': 'Amarillo', '#f9a825': 'Amarillo oscuro',
    '#4caf50': 'Verde', '#66bb6a': 'Verde claro', '#2e7d32': 'Verde oscuro',
    '#8bc34a': 'Verde lima', '#7cb342': 'Verde oliva',
    '#009688': 'Teal', '#00bcd4': 'Cian', '#00acc1': 'Cian oscuro',
    '#00bcd4': 'Cian',
    '#2196f3': 'Azul', '#1976d2': 'Azul oscuro', '#0d47a1': 'Azul marino',
    '#71aaf4': 'Azul cielo', '#64b5f6': 'Azul cielo', '#90caf9': 'Azul claro',
    '#42a5f5': 'Azul', '#1e88e5': 'Azul',
    '#3f51b5': 'Índigo', '#5c6bc0': 'Índigo claro',
    '#9c27b0': 'Púrpura', '#8e24aa': 'Púrpura', '#7b1fa2': 'Púrpura oscuro',
    '#673ab7': 'Violeta oscuro', '#7e57c2': 'Lavanda',
    '#e91e63': 'Rosa', '#f06292': 'Rosa claro', '#ec407a': 'Rosa',
    '#f472b6': 'Rosa', '#fb7185': 'Rosa coral',
    '#9f1239': 'Rosa oscuro', '#be185d': 'Rosa intenso',
    '#ffffff': 'Blanco', '#fafafa': 'Blanco humo',
    '#000000': 'Negro', '#121212': 'Negro', '#212121': 'Negro',
    '#1a1a2e': 'Negro azulado',
    '#607d8b': 'Gris azulado', '#78909c': 'Gris azulado claro',
    '#9e9e9e': 'Gris', '#bdbdbd': 'Gris claro', '#757575': 'Gris oscuro',
    '#795548': 'Marrón', '#8d6e63': 'Marrón claro', '#5d4037': 'Marrón oscuro',
    '#ffd700': 'Dorado', '#daa520': 'Dorado oscuro', '#f0c040': 'Dorado claro',
    '#c0c0c0': 'Plateado', '#e0e0e0': 'Plateado claro',
    '#a31545': 'Burgundy', '#800020': 'Burgundy',
  };
  if (map[h]) return map[h];

  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return h;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const d = max - min;
  if (d === 0) return l < 0.15 ? 'Negro' : l > 0.85 ? 'Blanco' : 'Gris';
  const s = l > 0.5 ? d / (510 - max - min) : d / (max + min);
  let h2;
  if (max === r) h2 = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h2 = ((b - r) / d + 2) * 60;
  else h2 = ((r - g) / d + 4) * 60;

  let name = '';
  if (s < 0.1) name = l < 0.15 ? 'Negro' : l > 0.85 ? 'Blanco' : 'Gris';
  else if (h2 < 15) name = 'Rojo';
  else if (h2 < 45) name = 'Naranja';
  else if (h2 < 65) name = 'Amarillo';
  else if (h2 < 80) name = 'Lima';
  else if (h2 < 160) name = 'Verde';
  else if (h2 < 200) name = 'Teal';
  else if (h2 < 260) name = 'Azul';
  else if (h2 < 290) name = 'Índigo';
  else if (h2 < 330) name = 'Púrpura';
  else name = 'Rojo';

  if (s < 0.3) name = l < 0.4 ? name + ' oscuro' : l > 0.7 ? name + ' claro' : name;
  return name;
}

function syncHistoricoWithDB() {
  if (!existsSync(historicoPath)) return;
  const files = readdirSync(historicoPath).filter(f => f.endsWith('.html'));
  const existingRows = db.prepare('SELECT filename FROM catalogo').all();
  const existingFiles = new Set(existingRows.map(r => r.filename));

  const insertStmt = db.prepare(`
    INSERT INTO catalogo (filename, title, event_type, theme, colors, tags, primary_color, secondary_color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  for (const file of files) {
    if (existingFiles.has(file)) continue;
    try {
      const filePath = join(historicoPath, file);
      const content = readFileSync(filePath, 'utf-8');
      const meta = extractMetadataFromHTML(content);
      insertStmt.run(
        file,
        meta.title || file.replace('.html', ''),
        meta.eventType || '',
        meta.theme || '',
        JSON.stringify(meta.colors),
        JSON.stringify(meta.tags),
        meta.primaryColor || '',
        meta.secondaryColor || ''
      );
      console.log('📊 Sincronizado archivo huérfano en catalogo:', file);
    } catch (e) {
      console.error('Error sincronizando archivo', file, ':', e);
    }
  }
}

// GET /api/catalogo - Obtener todas las invitaciones del catálogo (público)
app.get('/api/catalogo', (req, res) => {
  try {
    syncHistoricoWithDB();
    const { starred } = req.query;
    let query = 'SELECT * FROM catalogo';
    if (starred === 'true') {
      query += ' WHERE starred = 1';
    }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const stmt = db.prepare(query);
    const invitaciones = stmt.all().map(inv => ({
      ...inv,
      starred: inv.starred === 1,
      primary_color: inv.primary_color || '',
      secondary_color: inv.secondary_color || '',
      event_domain: inv.event_domain || null,
      event_date: inv.event_date || null,
      event_time: inv.event_time || null
    }));
    res.json({ invitaciones });
  } catch (error) {
    console.error('Error obteniendo catálogo:', error);
    res.status(500).json({ error: 'Error al obtener catálogo' });
  }
});

// GET /api/catalogo/:filename - Obtener una invitación del catálogo (público)
app.get('/api/catalogo/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = join(__dirname, 'storage', 'historico', filename);
  
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  
  const content = readFileSync(filePath, 'utf-8');
  res.send(content);
});

// GET /preview/:filename - Vista completa de invitación del catálogo (página web)
app.get('/preview/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = join(__dirname, 'storage', 'historico', filename);
  
  if (!existsSync(filePath)) {
    return res.status(404).send('Archivo no encontrado');
  }
  
  const content = readFileSync(filePath, 'utf-8');
  res.send(content);
});

// ==================== ADMIN ENDPOINTS ====================

const adminMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  // Verificar token en la tabla de sesiones de admin
  const stmt = db.prepare('SELECT admin_id FROM admin_sessions WHERE token = ? AND expires_at > ?');
  const session = stmt.get(token, new Date().toISOString());
  
  if (!session) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  req.adminId = session.admin_id;
  next();
};

// POST /api/catalogo/:id/star - Marcar invitación del catálogo como seleccionada
app.post('/api/catalogo/:id/star', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('UPDATE catalogo SET starred = 1 WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// DELETE /api/catalogo/:id/star - Quitar selección de invitación del catálogo
app.delete('/api/catalogo/:id/star', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('UPDATE catalogo SET starred = 0 WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// DELETE /api/admin/catalogo/:id - Eliminar invitación del catálogo
app.delete('/api/admin/catalogo/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('SELECT * FROM catalogo WHERE id = ?');
  const item = stmt.get(id);
  if (!item) {
    return res.status(404).json({ error: 'Invitación no encontrada en catálogo' });
  }
  const filePath = join(historicoPath, item.filename);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
  const deleteStmt = db.prepare('DELETE FROM catalogo WHERE id = ?');
  deleteStmt.run(id);
  res.json({ success: true });
});

// GET /api/admin/config - Obtener configuración
app.get('/api/admin/config', adminMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT * FROM admin_config WHERE id = 1');
  const config = stmt.get();
  
  if (!config) {
    const insertStmt = db.prepare('INSERT INTO admin_config (id) VALUES (1)');
    insertStmt.run();
    return res.json({
      html_provider: 'openai',
      html_base_url: 'https://api.openai.com/v1',
      html_api_key: '',
      html_model: 'gpt-4o',
      html_google_api_key: '',
      html_google_model: 'gemini-3.1-flash-preview',
      image_provider: 'gemini',
      image_model: 'gemini-3.1-flash-image-preview',
      image_api_key: '',
      login_page_url: '/admin-login',
      updated_at: null
    });
  }
  
  // No exponer las API keys al frontend (solo retornar valores vacíos)
  res.json({
    html_provider: config.html_provider || 'openai',
    html_base_url: config.html_base_url || 'https://api.openai.com/v1',
    html_api_key: '', // No exponer
    html_model: config.html_model || 'gpt-4o',
    html_google_api_key: '', // No exponer
    html_google_model: config.html_google_model || 'gemini-3.1-flash-preview',
    image_provider: config.image_provider || 'gemini',
    image_model: config.image_model || 'gemini-3.1-flash-image-preview',
    image_api_key: '', // No exponer
    login_page_url: config.login_page_url || '/admin-login',
    updated_at: config.updated_at
  });
});

// GET /api/config/public - Obtener configuración pública (sin API keys)
app.get('/api/config/public', (req, res) => {
  const stmt = db.prepare('SELECT login_page_url FROM admin_config WHERE id = 1');
  const config = stmt.get();
  
  res.json({
    login_page_url: config?.login_page_url || '/admin-login'
  });
});

// POST /api/admin/config - Guardar configuración
app.post('/api/admin/config', adminMiddleware, (req, res) => {
  const body = req.body;
  
  console.log('=== BACKEND RECIBE REQUEST ===');
  console.log('Body completo:', JSON.stringify(body));
  console.log('===============================');
  
  // Obtener config actual de la DB
  const currentConfig = db.prepare('SELECT * FROM admin_config WHERE id = 1').get();
  
  // Solo actualizar campos que tienen valores NO VACÍOS en el request
  // Los campos que no vengan o vengan vacíos mantienen el valor actual
  const updatedConfig = {
    html_provider: body.html_provider && body.html_provider.trim() !== '' ? body.html_provider : currentConfig.html_provider,
    html_base_url: body.html_base_url && body.html_base_url.trim() !== '' ? body.html_base_url : currentConfig.html_base_url,
    html_api_key: body.html_api_key && body.html_api_key.trim() !== '' ? body.html_api_key : currentConfig.html_api_key,
    html_model: body.html_model && body.html_model.trim() !== '' ? body.html_model : currentConfig.html_model,
    html_google_api_key: body.html_google_api_key && body.html_google_api_key.trim() !== '' ? body.html_google_api_key : currentConfig.html_google_api_key,
    html_google_model: body.html_google_model && body.html_google_model.trim() !== '' ? body.html_google_model : currentConfig.html_google_model,
    image_model: body.image_model && body.image_model.trim() !== '' ? body.image_model : currentConfig.image_model,
    image_api_key: body.image_api_key && body.image_api_key.trim() !== '' ? body.image_api_key : currentConfig.image_api_key,
    login_page_url: body.login_page_url !== undefined ? body.login_page_url : currentConfig.login_page_url,
  };
  
  console.log('=== CONFIG A GUARDAR ===');
  console.log('html_google_api_key:', updatedConfig.html_google_api_key ? 'MANTIENE VALOR' : 'USA ACTUAL');
  console.log('login_page_url:', updatedConfig.login_page_url);
  console.log('=========================');
  
  const stmt = db.prepare(`
    UPDATE admin_config SET 
      html_provider = ?,
      html_base_url = ?,
      html_api_key = ?,
      html_model = ?,
      html_google_api_key = ?,
      html_google_model = ?,
      image_model = ?,
      image_api_key = ?,
      login_page_url = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `);
  
  stmt.run(
    updatedConfig.html_provider,
    updatedConfig.html_base_url,
    updatedConfig.html_api_key,
    updatedConfig.html_model,
    updatedConfig.html_google_api_key,
    updatedConfig.html_google_model,
    updatedConfig.image_model,
    updatedConfig.image_api_key,
    updatedConfig.login_page_url
  );
  
  // Verificar que se guardó
  const verify = db.prepare('SELECT html_google_api_key FROM admin_config WHERE id = 1').get();
  console.log('=== VERIFICACION EN DB ===');
  console.log('html_google_api_key en DB:', verify.html_google_api_key ? 'GUARDADA' : 'NO GUARDADA');
  console.log('===========================');
  
  res.json({ success: true, message: 'Configuración guardada' });
});

// GET /api/admin/users - Listar todos los usuarios
app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const stmt = db.prepare(`
    SELECT 
      user_id,
      invitations_count,
      iteration_credits,
      max_invitations,
      max_iteration_credits,
      generation_credits,
      max_generation_credits,
      created_at,
      (SELECT COUNT(*) FROM invitations WHERE user_id = users.user_id) as db_invitations_count
    FROM users
    ORDER BY created_at DESC
  `);
  
  const users = stmt.all().map(user => ({
    ...user,
    invitations_remaining: user.max_invitations - user.db_invitations_count
  }));
  
  res.json({ users, total: users.length });
});

// PUT /api/admin/users/:id - Actualizar usuario
app.put('/api/admin/users/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { iteration_credits, max_invitations, generation_credits, max_generation_credits } = req.body;
  
  const updates = [];
  const values = [];
  
  if (iteration_credits !== undefined) {
    updates.push('iteration_credits = ?');
    values.push(iteration_credits);
  }
  
  if (max_invitations !== undefined) {
    updates.push('max_invitations = ?');
    values.push(max_invitations);
  }
  
  if (generation_credits !== undefined) {
    updates.push('generation_credits = ?');
    values.push(generation_credits);
  }
  
  if (max_generation_credits !== undefined) {
    updates.push('max_generation_credits = ?');
    values.push(max_generation_credits);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }
  
  values.push(id);
  
  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`);
  stmt.run(...values);
  
  const updatedUser = db.prepare('SELECT * FROM users WHERE user_id = ?').get(id);
  
  res.json({ success: true, user: updatedUser });
});

// GET /api/admin/invitations - Listar todas las invitaciones
app.get('/api/admin/invitations', adminMiddleware, (req, res) => {
  const { starred } = req.query;
  
  let query = `
    SELECT 
      i.id,
      i.user_id,
      i.filename,
      i.slug,
      i.event_type,
      i.starred,
      i.created_at,
      u.user_id as owner_id
    FROM invitations i
    LEFT JOIN users u ON i.user_id = u.user_id
  `;
  
  if (starred === 'true') {
    query += ' WHERE i.starred = 1';
  }
  
  query += ' ORDER BY i.created_at DESC';
  
  const stmt = db.prepare(query);
  const invitations = stmt.all().map(inv => ({
    id: inv.id.toString(),
    user_id: inv.user_id,
    filename: inv.filename,
    slug: inv.slug,
    publicUrl: `${PUBLIC_URL}/i/${inv.slug}`,
    event_type: inv.event_type,
    starred: inv.starred === 1,
    created_at: inv.created_at,
    size: 0
  }));
  
  res.json({ invitations, total: invitations.length });
});

// POST /api/admin/invitations/:userId/:filename/star - Marcar invitación
app.post('/api/admin/invitations/:userId/:filename/star', adminMiddleware, (req, res) => {
  const { userId, filename } = req.params;
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO invitations (user_id, filename, slug, event_type, starred, created_at)
    SELECT user_id, filename, slug, event_type, 1, created_at
    FROM invitations 
    WHERE user_id = ? AND filename = ?
  `);
  
  stmt.run(userId, filename);
  
  res.json({ success: true });
});

// DELETE /api/admin/invitations/:userId/:filename/star - Quitar marca
app.delete('/api/admin/invitations/:userId/:filename/star', adminMiddleware, (req, res) => {
  const { userId, filename } = req.params;
  
  const stmt = db.prepare(`
    UPDATE invitations SET starred = 0 WHERE user_id = ? AND filename = ?
  `);
  
  stmt.run(userId, filename);
  
  res.json({ success: true });
});

// DELETE /api/admin/invitations/:userId/:filename - Eliminar invitación
app.delete('/api/admin/invitations/:userId/:filename', adminMiddleware, (req, res) => {
  const { userId, filename } = req.params;
  
  // Eliminar archivo
  const filePath = join(storagePath, userId, filename);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
  
  // Eliminar de DB
  const stmt = db.prepare('DELETE FROM invitations WHERE user_id = ? AND filename = ?');
  stmt.run(userId, filename);
  
  res.json({ success: true });
});

// ==================== FIN ADMIN ENDPOINTS ====================

// ==================== ADMIN AUTH ENDPOINTS ====================

// POST /api/admin/login - Login de administrador
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  
  const passwordHash = createHash('sha256').update(password).digest('hex');
  
  const stmt = db.prepare('SELECT * FROM admins WHERE email = ? AND password_hash = ?');
  const admin = stmt.get(email, passwordHash);
  
  if (!admin) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  // Generar token para admin
  const token = createHash('sha256').update(`${admin.id}-${Date.now()}-admin`).digest('hex');
  
  // Guardar sesión en la tabla (calcular fecha de expiración en JavaScript)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const insertSession = db.prepare('INSERT INTO admin_sessions (admin_id, token, expires_at) VALUES (?, ?, ?)');
  insertSession.run(admin.id, token, expiresAt);
  
  res.json({
    success: true,
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name
    }
  });
});

// GET /api/admin/me - Verificar sesión de admin
app.get('/api/admin/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // Verificar token en sesiones
  const sessionStmt = db.prepare('SELECT admin_id FROM admin_sessions WHERE token = ? AND expires_at > ?');
  const session = sessionStmt.get(token, new Date().toISOString());
  
  if (!session) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  // Obtener datos del admin
  const adminStmt = db.prepare('SELECT id, email, name FROM admins WHERE id = ?');
  const admin = adminStmt.get(session.admin_id);
  
  if (!admin) {
    return res.status(401).json({ error: 'Admin no encontrado' });
  }
  
  res.json({
    id: admin.id,
    email: admin.email,
    name: admin.name
  });
});

// ==================== FIN ADMIN AUTH ENDPOINTS ====================

// POST /api/admin/sync-users - Sincronizar usuarios desde API Laravel
app.post('/api/admin/sync-users', adminMiddleware, async (req, res) => {
  try {
    // Intentar obtener usuarios de la API Laravel usando el token del usuario logueado
    let users = [];
    let syncedCount = 0;
    
    if (req.token) {
      try {
        const response = await fetchNoSSL(`${API_BASE_URL}/users`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${req.token}`
          }
        });
        
        if (response.ok) {
          const apiUsers = await response.json();
          users = Array.isArray(apiUsers) ? apiUsers : (apiUsers.data || []);
          
          // Sincronizar usuarios con nombres
          for (const apiUser of users) {
            const userId = apiUser.id.toString();
            const existingStmt = db.prepare('SELECT user_id FROM users WHERE user_id = ?');
            const existing = existingStmt.get(userId);
            
            if (existing) {
              // Actualizar nombre si existe
              if (apiUser.name) {
                const updateStmt = db.prepare('UPDATE users SET name = ? WHERE user_id = ?');
                updateStmt.run(apiUser.name, userId);
              }
            } else {
              // Crear usuario con valores por defecto
              const insertStmt = db.prepare(
                'INSERT INTO users (user_id, name, invitations_count, iteration_credits, max_invitations, max_iteration_credits) VALUES (?, ?, ?, ?, ?, ?)'
              );
              insertStmt.run(userId, apiUser.name || null, 0, 10, 20, 10);
              syncedCount++;
            }
          }
        }
      } catch (e) {
        console.log('No se pudo obtener usuarios de API Laravel:', e.message);
      }
    }
    
    // Devolver usuarios de la DB local
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    const dbUsers = stmt.all();
    
    res.json({ 
      success: true, 
      message: syncedCount > 0 ? `${syncedCount} usuarios sincronizados desde Laravel` : `${dbUsers.length} usuarios en base local`,
      total: dbUsers.length,
      source: 'local'
    });
  } catch (error) {
    console.error('Error sincronizando usuarios:', error);
    res.status(500).json({ error: 'Error al sincronizar usuarios' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
  });
  console.log('🎉 MODO PRODUCCIÓN: Sirviendo frontend desde /dist');
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express corriendo en http://localhost:${PORT}`);
  console.log(`📁 Storage path: ${storagePath}`);
  console.log(`🌐 Public URL: ${PUBLIC_URL}`);
  console.log(`🔐 API Base URL: ${API_BASE_URL}`);
});

// ==================== GENERATE HTML ENDPOINT (PROXY SEGURO) ====================

// Función auxiliar para procesar imágenes GEMINI_GENERATE en el HTML
const processGeminiImages = async (html, imageApiKey, imageModel) => {
  const srcRegex = /src=["'](GEMINI_GENERATE:([^"']+))["']/g;
  const bgRegex = /url\(["']?(GEMINI_GENERATE:([^"')]+))["']?\)/g;
  
  const srcMatches = [...html.matchAll(srcRegex)];
  const bgMatches = [...html.matchAll(bgRegex)];
  
  const allMatches = [
    ...srcMatches.map(m => m[1]),
    ...bgMatches.map(m => m[1])
  ];
  
  if (allMatches.length === 0) return html;
  
  const urls = Array.from(new Set(allMatches));
  console.log(`=== PROCESANDO ${urls.length} IMÁGENES (${srcMatches.length} src + ${bgMatches.length} background-image) ===`);
  
  const { generateImageWithNanoBanana } = await import('./nanoBananaService.js');
  
  const results = await Promise.all(urls.map(async (url) => {
    const promptText = url.replace('GEMINI_GENERATE:', '').trim();
    
    const prompt = `IMPORTANT: Create a beautiful photograph with a COMPLETE BACKGROUND (no transparent backgrounds, no floating elements, no stickers, no isolated objects). The image must have a full scene that can be used as-is. Description: ${promptText}`;
    console.log('Generando imagen:', prompt.substring(0, 60) + '...');
    
    const effectiveModel = imageModel && imageModel.includes('flash') ? imageModel : 'gemini-3.1-flash-image-preview';
    const result = await generateImageWithNanoBanana(
      prompt,
      imageApiKey,
      effectiveModel
    );
    
    if (result.success && result.image) {
      return { url, base64: `data:image/png;base64,${result.image}` };
    }
    console.error('Error generando imagen:', result.error);
    return { url, base64: null };
  }));
  
  let newHtml = html;
  results.forEach(({ url, base64 }) => {
    if (base64) {
      newHtml = newHtml.split(url).join(base64);
    }
  });
  
  return newHtml;
};

app.post('/api/generate-html', authMiddleware, async (req, res) => {
  try {
    const { prompt, attachments, editorConfig, imageFiles, promptInstruction } = req.body;
    const userId = ensureUserInDB(req.user);
    
    // 1. Verificar créditos de generación disponibles
    const userStmt = db.prepare('SELECT generation_credits, max_generation_credits FROM users WHERE user_id = ?');
    const user = userStmt.get(userId);
    
    if (!user || user.generation_credits < 1) {
      return res.status(400).json({ error: 'No tienes créditos de generación disponibles. Necesitas al menos 1 crédito para generar.' });
    }
    
    // 2. Descontar crédito de generación ANTES de generar
    const updateStmt = db.prepare('UPDATE users SET generation_credits = generation_credits - 1 WHERE user_id = ?');
    updateStmt.run(userId);
    console.log('💳 Crédito de generación descontado. Credits restantes:', user.generation_credits - 1);
    
    // Obtener configuración actual
    const configStmt = db.prepare('SELECT * FROM admin_config WHERE id = 1');
    const config = configStmt.get();
    
    if (!config) {
      // Restaurar crédito de generación si no hay config
      db.prepare('UPDATE users SET generation_credits = generation_credits + 1 WHERE user_id = ?').run(userId);
      return res.status(500).json({ error: 'Configuración no encontrada' });
    }
    
    console.log('=== GENERATE HTML DEBUG ===');
    console.log('Provider:', config.html_provider);
    console.log('html_api_key exists:', !!config.html_api_key);
    console.log('html_google_api_key exists:', !!config.html_google_api_key);
    console.log('html_google_model:', config.html_google_model);
    console.log('==========================');
    
    let htmlResult = '';
    
    // Siempre usar Gemini (forzado)
    if (config.html_google_api_key) {
      // Usar Google Gemini para generar HTML
      const { generateWithGemini } = await import('./geminiService.js');
      const geminiOptions = {
        eventType: editorConfig?.eventType,
        theme: editorConfig?.theme,
        primaryColor: editorConfig?.primaryColor,
        secondaryColor: editorConfig?.secondaryColor,
        imageFiles: imageFiles || [],
        promptInstruction: promptInstruction || ''
      };
      htmlResult = await generateWithGemini(
        prompt,
        config.html_google_api_key,
        config.html_google_model || 'gemini-3.1-pro-preview',
        geminiOptions
      );
    } else {
      // Restaurar crédito de generación si no hay API key
      db.prepare('UPDATE users SET generation_credits = generation_credits + 1 WHERE user_id = ?').run(userId);
      res.status(500).json({ error: 'No hay API key de Google configurada. Configúrala en el panel de admin.' });
      return;
    }
    
    // Procesar imágenes GEMINI_GENERATE si hay API key de imagen configurada
    if (config.image_api_key && config.image_api_key.trim() !== '') {
      console.log('=== PROCESANDO IMÁGENES ===');
      htmlResult = await processGeminiImages(htmlResult, config.image_api_key.trim(), config.image_model);
    } else {
      console.log('=== NO HAY API KEY DE IMAGEN CONFIGURADA - OMITIENDO IMÁGENES ===');
    }
    
    const historicoPath = join(__dirname, 'storage', 'historico');
    if (!existsSync(historicoPath)) {
      mkdirSync(historicoPath, { recursive: true });
    }
    const historicoFilename = `invitacion_${Date.now()}.html`;
    const historicoFilePath = join(historicoPath, historicoFilename);
    writeFileSync(historicoFilePath, htmlResult, 'utf-8');
    console.log('📁 Invitación (generación IA) guardada en historico:', historicoFilename);
    
    const meta = extractMetadataFromHTML(htmlResult);
    try {
      const insertMetaStmt = db.prepare(`
        INSERT INTO catalogo (filename, title, event_type, theme, colors, tags, primary_color, secondary_color, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      insertMetaStmt.run(
        historicoFilename,
        meta.title || '',
        meta.eventType || '',
        meta.theme || '',
        JSON.stringify(meta.colors || []),
        JSON.stringify(meta.tags || []),
        meta.primaryColor || '',
        meta.secondaryColor || ''
      );
      console.log('📊 Metadata guardada en tabla catalogo:', meta.title);
    } catch (metaError) {
      console.error('Error guardando metadata:', metaError);
    }
    
    res.json({ html: htmlResult });
  } catch (error) {
    console.error('Error generando HTML:', error);
    
    // 3. Restaurar crédito de generación si hay error
    try {
      const userId = req.user?.id ? req.user.id.toString() : null;
      if (userId) {
        db.prepare('UPDATE users SET generation_credits = generation_credits + 1 WHERE user_id = ?').run(userId);
        console.log('💳 Crédito de generación restaurado por error');
      }
    } catch (restoreError) {
      console.error('Error restoring credit:', restoreError);
    }
    
    res.status(500).json({ error: error.message || 'Error al generar HTML' });
  }
});
