import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync, readFileSync, unlinkSync, appendFileSync } from 'fs';
import { createHash, createHmac } from 'crypto';
import https from 'https';
import multer from 'multer';
import db from './database.js';
import { analyzeTemplate, validateTemplate, REQUIRED_TAGS } from './ragValidator.js';
import {
  analyzeModule,
  validateModule,
  extractModuleMetadata,
  generateModuleIdFromFilename,
  generateStyleName
} from './ragModuleValidator.js';
import { normalizeCategory } from './geminiService.js';

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
const HMAC_SECRET = process.env.EDITOR_HMAC_SECRET || 'invitaciones-digitales-hmac-secret-2026';
const TOKEN_TTL_DAYS = parseInt(process.env.TOKEN_TTL_DAYS || '7', 10);

const ragUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/html' && file.originalname.toLowerCase().endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .html'));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

const generateInternalToken = (userId) => {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', HMAC_SECRET).update(`${userId}|${issuedAt}`).digest('hex');
  return `${userId}|${issuedAt}|${signature}`;
};

const getPlanWithInvitation = (plan, userId) => {
  const invitation = db.prepare(
    'SELECT * FROM invitations WHERE user_id = ? AND purchase_id = ? AND is_active = 1 LIMIT 1'
  ).get(userId, plan.purchase_id);

  const fallback = !invitation ? db.prepare(
    'SELECT * FROM invitations WHERE user_id = ? AND purchase_id = ? LIMIT 1'
  ).get(userId, plan.purchase_id) : null;

  const active = invitation || fallback;

  return {
    id: plan.id,
    purchase_id: plan.purchase_id,
    plan_slug: plan.plan_slug,
    plan_name: plan.plan_name,
    invites_included: plan.invites_included,
    invites_used: plan.invites_used,
    generation_credits: plan.generation_credits,
    generation_used: plan.generation_used,
    iteration_credits: plan.iteration_credits,
    iteration_used: plan.iteration_used,
    generation_available: Math.max(0, plan.generation_credits - plan.generation_used),
    iteration_available: Math.max(0, plan.iteration_credits - plan.iteration_used),
    invites_available: Math.max(0, plan.invites_included - plan.invites_used),
    has_invitation: !!active,
    active_invitation: active ? {
      filename: active.filename,
      slug: active.slug,
      public_url: `${PUBLIC_URL}/i/${active.slug}`,
      event_type: active.event_type,
      event_domain: active.event_domain || null,
      event_date: active.event_date || null,
      event_time: active.event_time || null
    } : null
  };
};

const activateInvitation = (userId, purchaseId, invitationId) => {
  db.prepare('UPDATE invitations SET is_active = 0 WHERE user_id = ? AND purchase_id = ?').run(userId, purchaseId);
  db.prepare('UPDATE invitations SET is_active = 1 WHERE id = ?').run(invitationId);
};

const validateInternalToken = (token) => {
  const parts = token.split('|');
  if (parts.length !== 3) return null;

  const [userId, issuedAt, signature] = parts;
  if (!userId || !issuedAt || !signature) return null;

  const expected = createHmac('sha256', HMAC_SECRET).update(`${userId}|${issuedAt}`).digest('hex');
  if (signature !== expected) return null;

  const issuedAtNum = parseInt(issuedAt, 10);
  const expiresAt = issuedAtNum + TOKEN_TTL_DAYS * 24 * 60 * 60;
  if (Math.floor(Date.now() / 1000) > expiresAt) return null;

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) return null;

  const rawPlans = db.prepare('SELECT * FROM user_plans WHERE user_id = ?').all(userId);
  const plans = rawPlans.map(p => getPlanWithInvitation(p, userId));

return {
    id: parseInt(user.user_id) || user.user_id,
    name: user.name,
    email: user.email || null,
    role_name: user.role_name || 'user',
    plans
  };
};

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

app.get('/api/images/:folder/list', (req, res) => {
  const folder = req.params.folder;
  const folderPath = join(imgPath, folder);

  if (!existsSync(folderPath)) {
    return res.json({ images: [] });
  }

  try {
    const files = readdirSync(folderPath)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
    res.json({ images: files });
  } catch (err) {
    res.json({ images: [] });
  }
});

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
  console.log('\n========================================');
  console.log('🔍 VALIDANDO TOKEN DE LARAVEL');
  console.log(`Token: ${token.substring(0, 40)}...`);
  console.log('========================================');
  
  if (token.includes('|')) {
    console.log('❌ TOKEN LOCAL DETECTADO. ESTOS YA NO SON VÁLIDOS.');
    return null;
  }
  
  // SOLO TOKENS DE LARAVEL SON ACEPTADOS
  try {
    const response = await fetchNoSSL(`${API_BASE_URL}/user`, {
      headers: { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📡 Respuesta Laravel: ${response.status}`);

    if (!response.ok) {
      console.log('❌ Token de Laravel inválido');
      return null;
    }

    const user = await response.json();
    console.log(`✅ TOKEN VÁLIDO: ${user.id} - ${user.name}`);

    ensureUserInDB({
      id: user.id.toString(),
      name: user.name
    });

    console.log(`✅ Usuario ${user.id} creado/actualizado`);
    console.log('========================================\n');
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role_name: user.role || 'user'
    };

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.log('========================================\n');
    return null;
  }
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
  const cookieToken = req.cookies?.auth_token;
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const token = cookieToken || (headerToken && headerToken !== 'null' && headerToken !== 'undefined' ? headerToken : null);
  
  if (!token) {
    return res.status(401).json({ error: 'No autenticado', code: 'NO_TOKEN' });
  }
  
  let user = null;
  
  if (token.includes('|')) {
    user = validateInternalToken(token);
  } else {
    user = await validateToken(token);
  }
  
  if (!user) {
    return res.status(401).json({ error: 'Token inválido o expirado', code: 'INVALID_TOKEN' });
  }

  req.user = user;
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
        purchase_id: dbData?.purchase_id || null,
        plan_slug: dbData?.plan_slug || null,
        is_active: dbData?.is_active || 0,
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

/**
 * ✅ Sincroniza planes del usuario desde Laravel billing/history
 * Se ejecuta AUTOMATICAMENTE despues de CUALQUIER login
 * Cumplimiento 100% con README_BILLING_HISTORY.md
 */
const syncUserPlansFromBilling = async (userId, token) => {
  try {
    console.log(`🔄 Sincronizando planes para usuario ${userId}...`);
    
    if (!token) {
      throw new Error('Token no disponible para sincronizar planes');
    }

    // 1. Consultar historial de billing a Laravel
    const response = await fetchNoSSL(`${API_BASE_URL}/billing/history`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Laravel respondió ${response.status}`);
    }

    const billingData = await response.json();
    
    if (!billingData.data || !Array.isArray(billingData.data)) {
      throw new Error('Respuesta inválida de billing');
    }

    console.log(`📋 Recibidas ${billingData.data.length} compras para usuario ${userId}`);

    // 2. Procesar cada compra válida segun reglas del README
    for (const purchase of billingData.data) {
      console.log(`🔍 Compra ${purchase.id}: payment_status=${purchase.payment_status}, refund_request_status=${purchase.refund_request_status}, is_used=${purchase.is_used}`);

      // Solo procesar compras pagadas sin reembolso (is_used indica que fue asignada, no que deba excluirse)
      if (
        purchase.payment_status !== 'paid' ||
        purchase.refund_request_status !== null
      ) {
        console.log(`⏭️ Compra ${purchase.id} OMITIDA: payment_status=${purchase.payment_status}, refund_request_status=${purchase.refund_request_status}`);
        continue;
      }

      // 3. Obtener datos del plan
      const item = purchase.items?.[0];
      if (!item) continue;

      const planSlug = item.metadata?.plan_slug || 'basic';
      const totalInvites = item.metadata?.total_invites || item.metadata?.base_invites_included || 10;
      
      // 4. Buscar configuración del plan en nuestra tabla local
      const planConfig = db.prepare('SELECT * FROM plan_config WHERE plan_slug = ?').get(planSlug) || {
        invites_included: 1,
        generation_credits: 5,
        iteration_credits: 10
      };

      // 5. Verificar si el plan ya existe para este purchase
      const existingPlan = db.prepare(
        'SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?'
      ).get(userId, purchase.id);

      if (existingPlan) {
        // Plan ya existe: SOLO actualizar last_synced_at, NO tocar *_used
        db.prepare(
          'UPDATE user_plans SET last_synced_at = datetime(\'now\') WHERE user_id = ? AND purchase_id = ?'
        ).run(userId, purchase.id);
        console.log(`ℹ️ Plan ${planSlug} (purchase ${purchase.id}) ya existe, sync timestamp actualizado`);
      } else {
        // Plan nuevo: contar invitaciones ya usadas de este purchase
        const usedCount = db.prepare(
          'SELECT COUNT(*) as count FROM invitations WHERE user_id = ? AND purchase_id = ?'
        ).get(userId, purchase.id)?.count || 0;

        db.prepare(`
          INSERT INTO user_plans 
          (user_id, purchase_id, plan_slug, plan_name, invites_included, invites_used, generation_credits, iteration_credits, last_synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          userId,
          purchase.id,
          planSlug,
          item.item_name || planConfig.plan_name,
          planConfig.invites_included,
          usedCount,
          planConfig.generation_credits,
          planConfig.iteration_credits
        );
        console.log(`✅ NUEVO plan ${planSlug} (purchase ${purchase.id}) creado para usuario ${userId}`);
      }
    }

    console.log(`✅ Sincronización completada para usuario ${userId}`);

  } catch (error) {
    console.log(`❌ Error sincronizando planes: ${error.message}`);
    // No lanzar error para no romper el login
  }
};

const ensureUserInDB = (user) => {
  const stmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const existing = stmt.get(user.id.toString());
  
  if (!existing) {
    console.log(`✅ Creando NUEVO usuario: ${user.id} (${user.name})`);
    
    const insertStmt = db.prepare(
      'INSERT INTO users (user_id, name, invitations_count, iteration_credits, max_invitations, max_iteration_credits, generation_credits, max_generation_credits) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    
    // 🔥 TODOS LOS USUARIOS EMPIEZAN CON 0 CRÉDITOS POR DEFECTO
    insertStmt.run(user.id.toString(), user.name || 'Usuario', 0, 0, 0, 0, 0, 0);
    
    console.log(`✅ Usuario ${user.id} creado exitosamente en tabla users`);
  } else {
    console.log(`ℹ️ Usuario ${user.id} ya existe en tabla users`);
    
    // Actualizar nombre si es null
    if (!existing.name && user.name) {
      db.prepare('UPDATE users SET name = ? WHERE user_id = ?').run(user.name, user.id.toString());
      console.log(`✅ Nombre de usuario ${user.id} actualizado: ${user.name}`);
    }
  }
  
  return user.id.toString();
};

// ==================== PROXY ENDPOINTS (evitan CORS) ====================

// POST /api/auth/login - SOLO LARAVEL
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
    
    // NO MAS FALLBACK LOCAL. SI LARAVEL FALLA, FALLA.
    return res.status(response.status).json(await response.json());
    
  } catch (error) {
    return res.status(500).json({ error: 'Error de conexión' });
  }
});

// Función para fetch sin verificación SSL (para Laravel HTTPS)
const fetchNoSSL = async (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    resolve(fetch(url, { ...options, agent }));
  });
};

// POST /api/auth/issue - SOLO LARAVEL
app.post('/api/auth/issue', async (req, res) => {
  console.log('\n\n==================================================');
  console.log('📨 PETICIÓN RECIBIDA A /api/auth/issue');
  console.log(`   Authorization: ${req.headers.authorization?.substring(0, 40)}...`);
  console.log('==================================================');

  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    console.log('❌ NO HAY TOKEN EN LA PETICIÓN');
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  console.log('✅ Token de Laravel detectado');
  
  try {
    console.log('🔍 Consultando Laravel issue...');
    const response = await fetchNoSSL(`${API_BASE_URL}/issue`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(req.body)
    });
    
    console.log(`📡 Respuesta Laravel: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Laravel respondió OK con código:', data.code?.substring(0, 20), '...');
      
      try {
        console.log('\n🔍 Consultando datos del usuario a Laravel...');
        const userResponse = await fetchNoSSL(`${API_BASE_URL}/user`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (userResponse.ok) {
          const user = await userResponse.json();
          console.log('✅ USUARIO OBTENIDO DE LARAVEL');
          console.log(`   ID: ${user.id}`);
          console.log(`   Nombre: ${user.name}`);
          console.log(`   Email: ${user.email}`);
          
          // Generar código igual al de Laravel
          const codeHash = createHash('sha256').update(data.code).digest('hex');
          const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
          
          console.log('\n✅ Guardando código SSO en DB...');
          const insertStmt = db.prepare(`
            INSERT INTO local_sso_codes 
            (user_id, user_name, access_token, code_hash, purpose, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          insertStmt.run(
            user.id.toString(),
            user.name,
            token,
            codeHash,
            'editor',
            expiresAt
          );
          
          console.log('✅ Código SSO guardado exitosamente');
          
          // ✅ CREAR USUARIO AQUI MISMO, ANTES DE DEVOLVER NADA
          console.log('\n✅ CREANDO/ACTUALIZANDO USUARIO EN TABLA USERS...');
          ensureUserInDB({
            id: user.id.toString(),
            name: user.name
          });
          
          console.log('✅ USUARIO CREADO/ACTUALIZADO EXITOSAMENTE');

          // ✅ SINCRONIZAR PLANES AQUI MISMO
          console.log('\n🔄 SINCRONIZANDO PLANES DEL USUARIO...');
          await syncUserPlansFromBilling(user.id.toString(), token);
          console.log('✅ PLANES SINCRONIZADOS EXITOSAMENTE');
        }
      } catch (userError) {
        console.log('⚠️ Error procesando usuario:', userError.message);
      }
      
      console.log('\n✅ Devolviendo código SSO al cliente');
      console.log('==================================================\n');
      return res.status(response.status).json(data);
    }
    
    console.log('⚠️ Laravel respondió con error, usando fallback local');
    return handleLocalIssue(req, res, token);
    
  } catch (error) {
    console.log(`❌ ERROR conectando a Laravel: ${error.message}`);
    return handleLocalIssue(req, res, token);
  }
});

// POST /api/auth/consume-token - SOLO LARAVEL
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

// ✅ POST /api/auth/set-token - Guarda token en cookie httpOnly
app.post('/api/auth/set-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token requerido' });
  }

  if (token.includes('|')) {
    const userData = validateInternalToken(token);
    if (!userData) {
      return res.status(401).json({ error: 'Token interno inválido' });
    }
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    });
    return res.json({ success: true });
  }

  try {
    const response = await fetchNoSSL(`${API_BASE_URL}/user`, {
      headers: { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Token de Laravel inválido' });
    }

    const user = await response.json();
    const userId = user.id.toString();

    ensureUserInDB({ id: userId, name: user.name });
    await syncUserPlansFromBilling(userId, token);

    const internalToken = generateInternalToken(userId);
    res.cookie('auth_token', internalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error de conexión' });
  }
});

// ✅ Endpoint /api/auth/user que el frontend espera - Definido en README_AUTH_API.md
const handleAuthMe = async (req, res) => {
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (token.includes('|')) {
    const userData = validateInternalToken(token);
    
    if (!userData) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
    
    return res.json({ user: userData, authenticated: true });
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
      ensureUserInDB({ id: data.id.toString(), name: data.name });
      const internalToken = generateInternalToken(data.id.toString());
      res.cookie('auth_token', internalToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
      });
      await syncUserPlansFromBilling(data.id.toString(), token);
      const userData = validateInternalToken(internalToken);
      return res.json({ user: userData, authenticated: true });
    }
    
    return res.status(401).json({ message: 'No autenticado' });
  } catch (error) {
    return res.status(500).json({ message: 'Error de conexión' });
  }
};

app.get('/api/auth/me', handleAuthMe);

// Alias para compatibilidad
app.get('/api/auth/user', handleAuthMe);

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ success: true });
});

// Función para consume-token local
async function handleLocalConsumeToken(req, res, code) {
  console.log('\n\n========================================');
  console.log('🔐 INICIO FLUJO CONSUME-TOKEN');
  console.log(`📨 Código recibido: ${code.substring(0, 25)}...`);
  console.log('========================================');

  const codeHash = createHash('sha256').update(code).digest('hex');
  const now = new Date().toISOString();
  
  console.log('🔍 Buscando código SSO en DB...');
  console.log(`   Hash: ${codeHash.substring(0, 25)}...`);
  console.log(`   Fecha actual: ${now}`);

  // Buscar código válido
  const stmt = db.prepare(
    'SELECT * FROM local_sso_codes WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?'
  );
  const codeRecord = stmt.get(codeHash, now);
  
  if (!codeRecord) {
    console.log('❌ CÓDIGO NO ENCONTRADO O EXPIRADO');
    console.log('========================================\n');
    return res.status(401).json({ message: 'Código inválido o expirado' });
  }
  
  console.log('✅ CÓDIGO ENCONTRADO');
  console.log(`   ID: ${codeRecord.id}`);
  console.log(`   User ID: ${codeRecord.user_id}`);
  console.log(`   User Name: ${codeRecord.user_name}`);
  console.log(`   Access Token: ${codeRecord.access_token ? '✅ EXISTE (' + codeRecord.access_token.substring(0, 30) + '...)' : '❌ NO EXISTE'}`);
  console.log(`   Expira: ${codeRecord.expires_at}`);

  // Marcar como usado (de manera atómica)
  console.log('✅ Marcando código como usado...');
  const updateStmt = db.prepare('UPDATE local_sso_codes SET used_at = ? WHERE id = ?');
  updateStmt.run(now, codeRecord.id);
  
  let userId = codeRecord.user_id;
  let userName = codeRecord.user_name || 'Usuario';
  
  // ✅ USAR EL TOKEN REAL DE LARAVEL PARA OBTENER DATOS DEL USUARIO
  if (codeRecord.access_token) {
    console.log('\n🔍 CONSULTANDO A LARAVEL PARA OBTENER DATOS DEL USUARIO...');
    try {
      console.log(`   Consultando: ${API_BASE_URL}/user`);
      console.log(`   Token: ${codeRecord.access_token.substring(0, 40)}...`);
      
      const userResponse = await fetchNoSSL(`${API_BASE_URL}/user`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${codeRecord.access_token}`
        }
      });

      console.log(`📡 Respuesta Laravel: ${userResponse.status} ${userResponse.statusText}`);

      if (userResponse.ok) {
        const laravelUser = await userResponse.json();
        console.log('✅ USUARIO OBTENIDO DE LARAVEL');
        console.log(`   ID: ${laravelUser.id}`);
        console.log(`   Nombre: ${laravelUser.name}`);
        console.log(`   Email: ${laravelUser.email}`);
        
        userId = laravelUser.id.toString();
        userName = laravelUser.name;
        
        // ✅ CREAR USUARIO EN NUESTRA BASE DE DATOS
        console.log('\n✅ CREANDO/ACTUALIZANDO USUARIO EN TABLA USERS...');
        ensureUserInDB({
          id: userId,
          name: userName
        });

        console.log('✅ USUARIO CREADO/ACTUALIZADO EXITOSAMENTE');

        // ✅ SINCRONIZAR PLANES
        console.log('\n🔄 SINCRONIZANDO PLANES DEL USUARIO...');
        await syncUserPlansFromBilling(userId, codeRecord.access_token);
        console.log('✅ PLANES SINCRONIZADOS');
      } else {
        const errorText = await userResponse.text();
        console.log(`❌ LARAVEL DEVOLVIO ERROR: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ ERROR CONSULTANDO LARAVEL: ${error.message}`);
      console.log(error.stack);
    }
  } else {
    console.log('⚠️ NO HAY ACCESS_TOKEN, USANDO FALLBACK LOCAL');
  }
  console.log(`⚠️ Usando fallback local para usuario ${codeRecord.user_id}`);
  
  const newToken = generateInternalToken(codeRecord.user_id);
  
  res.cookie('auth_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
  
  res.json({
    token: newToken,
    user: {
      id: codeRecord.user_id,
      name: codeRecord.user_name || 'Usuario',
      role_name: 'user'
    }
  });
}

// POST /api/invitations - Guarda una nueva invitación (protegido)
app.put('/api/invitations/:userId/:filename', authMiddleware, (req, res) => {
  const { userId, filename } = req.params;
  const { eventType, eventDomain, eventDate, eventTime, htmlContent } = req.body;
  
  if (req.user.id.toString() !== userId) {
    return res.status(403).json({ error: 'No autorizado para modificar esta invitación' });
  }
  
  const filePath = join(storagePath, userId, filename);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  
  if (htmlContent) {
    writeFileSync(filePath, htmlContent, 'utf-8');
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

// POST /api/invitations - Crea una nueva invitación vinculada a un plan
app.post('/api/invitations', authMiddleware, (req, res) => {
  const { htmlContent, eventType, purchaseId } = req.body;
  const userId = req.user.id.toString();

  if (!htmlContent) {
    return res.status(400).json({ error: 'htmlContent es requerido' });
  }

  if (!purchaseId) {
    return res.status(400).json({ error: 'purchaseId es requerido' });
  }

  const plan = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(userId, purchaseId);
  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado para este usuario' });
  }

  const existingInv = db.prepare('SELECT * FROM invitations WHERE user_id = ? AND purchase_id = ?').get(userId, purchaseId);
  if (existingInv) {
    return res.status(409).json({
      error: 'Este plan ya tiene una invitación. Usa replace para reemplazarla.',
      code: 'PLAN_HAS_INVITATION',
      existing_filename: existingInv.filename
    });
  }

  const userFolder = ensureUserFolder(userId);
  const timestamp = Date.now();
  const slug = generateSlug(eventType || 'invitacion', timestamp);
  const filename = `invitation_${timestamp}.html`;

  const filePath = join(userFolder, filename);
  writeFileSync(filePath, htmlContent, 'utf-8');

  db.prepare(
    'INSERT INTO invitations (user_id, filename, slug, event_type, purchase_id, plan_slug) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, filename, slug, eventType || 'Invitacion', purchaseId, plan.plan_slug);

  const newInv = db.prepare('SELECT id FROM invitations WHERE user_id = ? AND filename = ?').get(userId, filename);
  if (newInv) {
    activateInvitation(userId, purchaseId, newInv.id);
  }

syncUserInvitationsCount(userId);

const publicUrl = `${PUBLIC_URL}/i/${slug}`;
  const updatedPlan = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(userId, purchaseId);

  res.json({
    success: true,
    filename,
    slug,
    publicUrl,
    purchase_id: purchaseId,
    plan_slug: plan.plan_slug,
    generation_available: Math.max(0, updatedPlan.generation_credits - updatedPlan.generation_used),
    invites_available: Math.max(0, updatedPlan.invites_included - updatedPlan.invites_used)
  });
});

// PUT /api/invitations/replace/:userId/:filename - Reemplaza la invitación de un plan
app.put('/api/invitations/replace/:userId/:filename', authMiddleware, (req, res) => {
  const { userId, filename } = req.params;
  const { htmlContent, eventType, purchaseId } = req.body;

  if (req.user.id.toString() !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (!htmlContent) {
    return res.status(400).json({ error: 'htmlContent es requerido' });
  }

  if (!purchaseId) {
    return res.status(400).json({ error: 'purchaseId es requerido' });
  }

  const plan = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(userId, purchaseId);
  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  const existingInv = db.prepare('SELECT * FROM invitations WHERE user_id = ? AND purchase_id = ?').get(userId, purchaseId);
  if (!existingInv) {
    return res.status(404).json({ error: 'No existe invitación para este plan' });
  }

  const oldFilePath = join(storagePath, userId, existingInv.filename);
  if (existsSync(oldFilePath)) {
    unlinkSync(oldFilePath);
  }

  const userFolder = ensureUserFolder(userId);
  const timestamp = Date.now();
  const newFilename = `invitation_${timestamp}.html`;
  const newFilePath = join(userFolder, newFilename);
  writeFileSync(newFilePath, htmlContent, 'utf-8');

  db.prepare(
    'UPDATE invitations SET filename = ?, slug = ?, event_type = ?, purchase_id = ?, plan_slug = ? WHERE id = ?'
  ).run(newFilename, generateSlug(eventType || existingInv.event_type, timestamp), eventType || existingInv.event_type, purchaseId, plan.plan_slug, existingInv.id);

  activateInvitation(userId, purchaseId, existingInv.id);

  syncUserInvitationsCount(userId);

  const publicUrl = `${PUBLIC_URL}/i/${generateSlug(eventType || existingInv.event_type, timestamp)}`;
  const updatedPlan = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(userId, purchaseId);

  res.json({
    success: true,
    filename: newFilename,
    publicUrl,
    purchase_id: purchaseId,
    plan_slug: plan.plan_slug,
    generation_available: Math.max(0, updatedPlan.generation_credits - updatedPlan.generation_used),
    invites_available: Math.max(0, updatedPlan.invites_included - updatedPlan.invites_used)
  });
});

app.patch('/api/invitations/:invitationId/activate', authMiddleware, (req, res) => {
  const { invitationId } = req.params;
  const inv = db.prepare('SELECT * FROM invitations WHERE id = ?').get(invitationId);
  if (!inv) {
    return res.status(404).json({ error: 'Invitación no encontrada' });
  }
  if (req.user.id.toString() !== inv.user_id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (!inv.purchase_id) {
    return res.status(400).json({ error: 'La invitación no tiene un plan asociado' });
  }
  activateInvitation(inv.user_id, inv.purchase_id, inv.id);
  res.json({ success: true, active_invitation: { id: inv.id, filename: inv.filename, slug: inv.slug } });
});

app.post('/api/user/:id/consume-credit', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { purchaseId } = req.body;

  if (req.user.id.toString() !== id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (!purchaseId) {
    return res.status(400).json({ error: 'purchaseId es requerido' });
  }

  const plan = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(id, purchaseId);
  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  const iterationAvailable = Math.max(0, plan.iteration_credits - plan.iteration_used);
  if (iterationAvailable < 1) {
    return res.status(400).json({ error: 'No tienes créditos de iteración disponibles en este plan' });
  }

  db.prepare('UPDATE user_plans SET iteration_used = iteration_used + 1 WHERE user_id = ? AND purchase_id = ?').run(id, purchaseId);

  const updated = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(id, purchaseId);
  res.json({
    success: true,
    iteration_credits: Math.max(0, updated.iteration_credits - updated.iteration_used),
    purchase_id: purchaseId
  });
});

app.post('/api/user/:id/consume-generation-credit', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { purchaseId } = req.body;

  if (req.user.id.toString() !== id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (!purchaseId) {
    return res.status(400).json({ error: 'purchaseId es requerido' });
  }

  const plan = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(id, purchaseId);
  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  const generationAvailable = Math.max(0, plan.generation_credits - plan.generation_used);
  if (generationAvailable < 1) {
    return res.status(400).json({ error: 'No tienes créditos de generación disponibles en este plan' });
  }

  db.prepare('UPDATE user_plans SET generation_used = generation_used + 1 WHERE user_id = ? AND purchase_id = ?').run(id, purchaseId);

  const updated = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(id, purchaseId);
  res.json({
    success: true,
    generation_credits: Math.max(0, updated.generation_credits - updated.generation_used),
    purchase_id: purchaseId
  });
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

// GET /api/get-user/:userId - Datos completos del usuario con créditos e invitaciones (protegido)
app.get('/api/get-user/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;

  if (req.user.id.toString() !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  syncUserInvitationsCount(userId);

  const rawPlans = db.prepare('SELECT * FROM user_plans WHERE user_id = ?').all(userId);
  const plans = rawPlans.map(p => getPlanWithInvitation(p, userId));

  const invitations = getUserInvitations(userId);

  res.json({
    user_id: user.user_id,
    name: user.name,
    created_at: user.created_at,
    plans,
    invitations
  });
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

app.get('/i/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const inv = db.prepare('SELECT user_id, filename FROM invitations WHERE slug = ?').get(slug);
    if (!inv) {
      return res.status(404).send('Invitación no encontrada');
    }
    const filePath = join(storagePath, inv.user_id.toString(), inv.filename);
    if (!existsSync(filePath)) {
      return res.status(404).send('Archivo no encontrado');
    }
    const content = readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch (error) {
    console.error('Error sirviendo invitación pública:', error);
    res.status(500).send('Error interno del servidor');
  }
});

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

// GET /api/catalogo/slug/:eventType/:slug - Obtener datos SEO de invitación por slug (público)
app.get('/api/catalogo/slug/:eventType/:slug', (req, res) => {
  try {
    const fullSlug = `${req.params.eventType}/${req.params.slug}`;
    const item = db.prepare('SELECT * FROM catalogo WHERE slug = ? AND starred = 1').get(fullSlug);

    if (!item) {
      return res.status(404).json({ error: 'Invitación no encontrada en el catálogo' });
    }

    let seoSections = null;
    try {
      seoSections = item.seo_content_json ? JSON.parse(item.seo_content_json) : null;
    } catch (e) {
      seoSections = null;
    }

    let structuredData = null;
    try {
      structuredData = item.structured_data ? JSON.parse(item.structured_data) : null;
    } catch (e) {
      structuredData = null;
    }

    res.json({
      ...item,
      seo_content_json: seoSections,
      structured_data: structuredData
    });
  } catch (error) {
    console.error('Error obteniendo invitación por slug:', error);
    res.status(500).json({ error: 'Error al obtener invitación' });
  }
});

// ==================== SERVICE API (consumido por Laravel) ====================

const serviceMiddleware = (req, res, next) => {
  const configuredToken = process.env.API_SERVICE_TOKEN;

  if (!configuredToken) {
    console.log('❌ SERVICE API: API_SERVICE_TOKEN no configurado en variables de entorno');
    return res.status(503).json({ error: 'API_SERVICE_TOKEN no configurado en el servidor' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('❌ SERVICE API: No se recibio Authorization header');
    return res.status(401).json({ error: 'Authorization header requerido' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (token !== configuredToken) {
    console.log(`❌ SERVICE API: Token no coincide. Recibido: "${token.substring(0, 20)}..." Esperado: "${configuredToken.substring(0, 20)}..."`);
    return res.status(401).json({ error: 'Token de servicio invalido' });
  }

  console.log('✅ SERVICE API: Token validado correctamente');
  next();
};

// GET /api/service/users - Lista todos los usuarios con sus planes y conteo de invitaciones
app.get('/api/service/users', serviceMiddleware, (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();

    const result = users.map(user => {
      syncUserInvitationsCount(user.user_id);

      const rawPlans = db.prepare('SELECT * FROM user_plans WHERE user_id = ?').all(user.user_id);
      const plans = rawPlans.map(p => {
        const active = db.prepare('SELECT * FROM invitations WHERE user_id = ? AND purchase_id = ? AND is_active = 1 LIMIT 1').get(user.user_id, p.purchase_id)
          || db.prepare('SELECT * FROM invitations WHERE user_id = ? AND purchase_id = ? LIMIT 1').get(user.user_id, p.purchase_id);

        return {
          purchase_id: p.purchase_id,
          plan_slug: p.plan_slug,
          plan_name: p.plan_name,
          invites_included: p.invites_included,
          invites_used: p.invites_used,
          invites_available: Math.max(0, p.invites_included - p.invites_used),
          generation_credits: p.generation_credits,
          generation_used: p.generation_used,
          generation_available: Math.max(0, p.generation_credits - p.generation_used),
          iteration_credits: p.iteration_credits,
          iteration_used: p.iteration_used,
          iteration_available: Math.max(0, p.iteration_credits - p.iteration_used),
          active_invitation: active ? {
            filename: active.filename,
            slug: active.slug,
            public_url: `${PUBLIC_URL}/i/${active.slug}`,
            event_type: active.event_type,
            event_domain: active.event_domain || null,
            event_date: active.event_date || null,
            event_time: active.event_time || null
          } : null
        };
      });

      const invitationCount = db.prepare('SELECT COUNT(*) as count FROM invitations WHERE user_id = ?').get(user.user_id)?.count || 0;

      return {
        user_id: user.user_id,
        name: user.name,
        created_at: user.created_at,
        invitation_count: invitationCount,
        plans
      };
    });

    res.json({ users: result, total: result.length });
  } catch (error) {
    console.error('Error en /api/service/users:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/service/users/:userId - Detalle completo de un usuario
app.get('/api/service/users/:userId', serviceMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    syncUserInvitationsCount(userId);

    const rawPlans = db.prepare('SELECT * FROM user_plans WHERE user_id = ?').all(userId);
    const plans = rawPlans.map(p => getPlanWithInvitation(p, userId));

    const invitations = getUserInvitations(userId);

    res.json({
      user_id: user.user_id,
      name: user.name,
      created_at: user.created_at,
      plans,
      invitations: invitations.map(inv => ({
        filename: inv.filename,
        slug: inv.slug,
        public_url: inv.publicUrl,
        event_type: inv.event_type,
        event_domain: inv.event_domain,
        event_date: inv.event_date,
        event_time: inv.event_time,
        purchase_id: inv.purchase_id,
        plan_slug: inv.plan_slug,
        is_active: inv.is_active || 0,
        created_at: inv.created_at
      }))
    });
  } catch (error) {
    console.error('Error en /api/service/users/:userId:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
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

// POST /api/admin/catalogo/:id/generate-seo - Generar landing page SEO para invitación del catálogo
app.post('/api/admin/catalogo/:id/generate-seo', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const catalogoStmt = db.prepare('SELECT * FROM catalogo WHERE id = ?');
    const catalogoItem = catalogoStmt.get(id);
    if (!catalogoItem) {
      return res.status(404).json({ error: 'Invitación no encontrada en catálogo' });
    }

    const configStmt = db.prepare('SELECT * FROM admin_config WHERE id = 1');
    const config = configStmt.get();
    if (!config || !config.html_google_api_key) {
      return res.status(400).json({ error: 'API Key de Google no configurada en admin_config' });
    }
    const apiKey = config.html_google_api_key;
    const model = config.html_google_model || 'gemini-2.5-flash';

    const htmlFilePath = join(historicoPath, catalogoItem.filename);
    if (!existsSync(htmlFilePath)) {
      return res.status(404).json({ error: 'Archivo HTML de la invitación no encontrado en histórico' });
    }
    const htmlContent = readFileSync(htmlFilePath, 'utf-8');
    const htmlMeta = extractMetadataFromHTML(htmlContent);

    let colors = [];
    try {
      colors = catalogoItem.colors ? JSON.parse(catalogoItem.colors) : (htmlMeta.colors || []);
    } catch (e) {
      colors = htmlMeta.colors || [];
    }

    let tags = [];
    try {
      tags = catalogoItem.tags ? JSON.parse(catalogoItem.tags) : [];
    } catch (e) {
      tags = [];
    }

    const metadata = {
      eventType: catalogoItem.event_type || htmlMeta.eventType || 'General',
      theme: catalogoItem.theme || htmlMeta.theme || 'Elegante',
      primaryColor: catalogoItem.primary_color || htmlMeta.primaryColor || '',
      secondaryColor: catalogoItem.secondary_color || htmlMeta.secondaryColor || '',
      colors: colors,
      modules: tags.length > 0 ? tags : ['RSVP', 'Countdown', 'Map', 'Event Details'],
      title: catalogoItem.title || htmlMeta.title || '',
      originalPrompt: ''
    };

    console.log(`🚀 Generando SEO para catálogo ID ${id}: eventType=${metadata.eventType}, theme=${metadata.theme}`);

    const { generateSEOPage } = await import('./geminiService.js');
    const seoData = await generateSEOPage(metadata, apiKey, model);

    const fullSlug = seoData.slug;
    const existingSlug = db.prepare('SELECT id FROM catalogo WHERE slug = ? AND id != ?').get(fullSlug, id);
    let finalSlug = fullSlug;
    if (existingSlug) {
      const suffix = Date.now().toString(36).slice(-4);
      finalSlug = `${fullSlug}-${suffix}`;
      console.log(`⚠️ Slug duplicado, aplicando sufijo: ${finalSlug}`);
    }

    db.prepare(`
      UPDATE catalogo SET
        starred = 1,
        slug = ?,
        seo_title = ?,
        meta_description = ?,
        h1 = ?,
        seo_content_json = ?,
        structured_data = ?
      WHERE id = ?
    `).run(
      finalSlug,
      seoData.seo_title || '',
      seoData.meta_description || '',
      seoData.h1 || '',
      JSON.stringify(seoData.sections || {}),
      JSON.stringify(seoData.structured_data || {}),
      id
    );

    console.log(`✅ SEO generado exitosamente para catálogo ID ${id}, slug: ${finalSlug}`);
    res.json({ success: true, slug: finalSlug });
  } catch (error) {
    console.error('❌ Error generando SEO:', error);
    res.status(500).json({ error: 'Error al generar landing page SEO', details: error.message });
  }
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
      has_google_api_key: false,
      html_google_model: 'gemini-3.1-flash-preview',
      image_provider: 'gemini',
      image_model: 'gemini-3.1-flash-image-preview',
      image_api_key: '',
      login_page_url: '/admin-login',
use_agent_orchestrator: true,
use_rag_templates: true,
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
    has_google_api_key: !!config.html_google_api_key,
    html_google_model: config.html_google_model || 'gemini-3.1-flash-preview',
    image_provider: config.image_provider || 'gemini',
    image_model: config.image_model || 'gemini-3.1-flash-image-preview',
    image_api_key: '', // No exponer
    login_page_url: config.login_page_url || '/admin-login',
    use_agent_orchestrator: config.use_agent_orchestrator === 1,
    use_rag_templates: config.use_rag_templates === 1,
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
    use_agent_orchestrator: body.use_agent_orchestrator !== undefined ? (body.use_agent_orchestrator ? 1 : 0) : (currentConfig.use_agent_orchestrator || 0),
    use_rag_templates: body.use_rag_templates !== undefined ? (body.use_rag_templates ? 1 : 0) : (currentConfig.use_rag_templates !== null ? currentConfig.use_rag_templates : 1),
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
      use_agent_orchestrator = ?,
      use_rag_templates = ?,
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
    updatedConfig.login_page_url,
    updatedConfig.use_agent_orchestrator,
    updatedConfig.use_rag_templates
  );
  
  // Verificar que se guardó
  const verify = db.prepare('SELECT html_google_api_key FROM admin_config WHERE id = 1').get();
  console.log('=== VERIFICACION EN DB ===');
  console.log('html_google_api_key en DB:', verify.html_google_api_key ? 'GUARDADA' : 'NO GUARDADA');
  console.log('===========================');
  
  res.json({ success: true, message: 'Configuración guardada' });
});

// GET /api/admin/users - Listar todos los usuarios con planes
app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const usersStmt = db.prepare(`
    SELECT 
      u.user_id,
      u.name,
      u.created_at,
      (SELECT COUNT(*) FROM invitations WHERE user_id = u.user_id) as invitations_count
    FROM users u
    ORDER BY u.created_at DESC
  `);

  const plansStmt = db.prepare(`
    SELECT 
      up.purchase_id,
      up.plan_slug,
      up.plan_name,
      up.invites_included,
      up.invites_used,
      up.generation_credits,
      up.generation_used,
      up.iteration_credits,
      up.iteration_used,
      (SELECT COUNT(*) FROM invitations WHERE user_id = up.user_id AND purchase_id = up.purchase_id) as deployed_count
    FROM user_plans up
    WHERE up.user_id = ?
    ORDER BY up.id
  `);

  const users = usersStmt.all().map(user => {
    const plans = plansStmt.all(user.user_id).map(p => {
      const active = db.prepare('SELECT * FROM invitations WHERE user_id = ? AND purchase_id = ? AND is_active = 1 LIMIT 1').get(user.user_id, p.purchase_id)
        || db.prepare('SELECT * FROM invitations WHERE user_id = ? AND purchase_id = ? LIMIT 1').get(user.user_id, p.purchase_id);

      return {
        purchase_id: p.purchase_id,
        plan_slug: p.plan_slug,
        plan_name: p.plan_name,
        invites_included: p.invites_included,
        invites_used: p.invites_used,
        generation_credits: p.generation_credits,
        generation_used: p.generation_used,
        iteration_credits: p.iteration_credits,
        iteration_used: p.iteration_used,
        invites_available: Math.max(0, p.invites_included - p.invites_used),
        generation_available: Math.max(0, p.generation_credits - p.generation_used),
        iteration_available: Math.max(0, p.iteration_credits - p.iteration_used),
        deployed_count: p.deployed_count,
        active_invitation: active ? {
          filename: active.filename,
          slug: active.slug,
          public_url: `${PUBLIC_URL}/i/${active.slug}`,
          event_type: active.event_type,
          event_domain: active.event_domain || null,
          event_date: active.event_date || null,
          event_time: active.event_time || null
        } : null
      };
    });

    return {
      user_id: user.user_id,
      name: user.name,
      invitations_count: user.invitations_count,
      created_at: user.created_at,
      plans
    };
  });

  res.json({ users, total: users.length });
});

// GET /api/admin/backup - Descargar backup completo de la base de datos
app.get('/api/admin/backup', adminMiddleware, (req, res) => {
  try {
    const tables = ['users', 'user_plans', 'invitations', 'plan_config', 'local_users', 'knowledge_base', 'knowledge_base_usage'];
    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      data: {}
    };

    for (const table of tables) {
      try {
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        backup.data[table] = rows;
      } catch (e) {
        backup.data[table] = [];
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backup);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Error al crear backup' });
  }
});

// POST /api/admin/backup - Restaurar backup (reemplaza todos los datos)
app.post('/api/admin/backup', adminMiddleware, (req, res) => {
  try {
    const backup = req.body;

    if (!backup || !backup.version || !backup.data) {
      return res.status(400).json({ error: 'Formato de backup inválido' });
    }

    const deleteOrder = ['knowledge_base_usage', 'invitations', 'user_plans', 'local_users', 'users', 'plan_config', 'knowledge_base'];
    const insertOrder = ['plan_config', 'knowledge_base', 'users', 'local_users', 'user_plans', 'invitations', 'knowledge_base_usage'];

    db.pragma('foreign_keys = OFF');

    const restore = db.transaction(() => {
      for (const table of deleteOrder) {
        const rows = backup.data[table];
        if (!Array.isArray(rows)) continue;
        db.exec(`DELETE FROM ${table}`);
      }

      for (const table of insertOrder) {
        const rows = backup.data[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertStmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);

        for (const row of rows) {
          const values = columns.map(c => row[c] !== undefined ? row[c] : null);
          insertStmt.run(...values);
        }
      }
    });

    try {
      restore();
    } finally {
      db.pragma('foreign_keys = ON');
    }

    res.json({ success: true, message: 'Backup restaurado correctamente' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Error al restaurar backup: ' + error.message });
  }
});

// GET /api/admin/plans - Listar configuración de planes
app.get('/api/admin/plans', adminMiddleware, (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM plan_config ORDER BY created_at ASC').all();
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

// POST /api/admin/plans - Crear nuevo plan
app.post('/api/admin/plans', adminMiddleware, (req, res) => {
  try {
    const { plan_slug, plan_name, invites_included, generation_credits, iteration_credits, has_rsvp } = req.body;

    if (!plan_slug || !plan_name) {
      return res.status(400).json({ error: 'plan_slug y plan_name son requeridos' });
    }

    const existing = db.prepare('SELECT plan_slug FROM plan_config WHERE plan_slug = ?').get(plan_slug);
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un plan con ese slug' });
    }

    db.prepare(`
      INSERT INTO plan_config (plan_slug, plan_name, invites_included, generation_credits, iteration_credits, has_rsvp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      plan_slug,
      plan_name,
      invites_included ?? 1,
      generation_credits ?? 5,
      iteration_credits ?? 10,
      has_rsvp ?? 0
    );

    const plan = db.prepare('SELECT * FROM plan_config WHERE plan_slug = ?').get(plan_slug);
    res.status(201).json({ plan });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

// PUT /api/admin/plans/:slug - Actualizar plan
app.put('/api/admin/plans/:slug', adminMiddleware, (req, res) => {
  try {
    const { slug } = req.params;
    const { plan_name, invites_included, generation_credits, iteration_credits, has_rsvp } = req.body;

    const existing = db.prepare('SELECT plan_slug FROM plan_config WHERE plan_slug = ?').get(slug);
    if (!existing) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    const updates = [];
    const values = [];

    if (plan_name !== undefined) { updates.push('plan_name = ?'); values.push(plan_name); }
    if (invites_included !== undefined) { updates.push('invites_included = ?'); values.push(invites_included); }
    if (generation_credits !== undefined) { updates.push('generation_credits = ?'); values.push(generation_credits); }
    if (iteration_credits !== undefined) { updates.push('iteration_credits = ?'); values.push(iteration_credits); }
    if (has_rsvp !== undefined) { updates.push('has_rsvp = ?'); values.push(has_rsvp ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(slug);
    db.prepare(`UPDATE plan_config SET ${updates.join(', ')} WHERE plan_slug = ?`).run(...values);

    const plan = db.prepare('SELECT * FROM plan_config WHERE plan_slug = ?').get(slug);
    res.json({ plan });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
});

// DELETE /api/admin/plans/:slug - Eliminar plan
app.delete('/api/admin/plans/:slug', adminMiddleware, (req, res) => {
  try {
    const { slug } = req.params;

    const existing = db.prepare('SELECT plan_slug FROM plan_config WHERE plan_slug = ?').get(slug);
    if (!existing) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    const activeUsers = db.prepare('SELECT COUNT(*) as count FROM user_plans WHERE plan_slug = ?').get(slug);
    if (activeUsers.count > 0) {
      return res.status(409).json({ error: `No se puede eliminar: ${activeUsers.count} usuario(s) tienen este plan activo` });
    }

    db.prepare('DELETE FROM plan_config WHERE plan_slug = ?').run(slug);
    res.json({ success: true, message: 'Plan eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Error al eliminar plan' });
  }
});

// GET /api/admin/plans/backup - Descargar backup de plan_config
app.get('/api/admin/plans/backup', adminMiddleware, (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM plan_config ORDER BY created_at ASC').all();
    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      data: { plan_config: plans }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="plans-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backup);
  } catch (error) {
    console.error('Error creating plans backup:', error);
    res.status(500).json({ error: 'Error al crear backup de planes' });
  }
});

// POST /api/admin/plans/backup - Importar backup de plan_config (sobrescribe existentes)
app.post('/api/admin/plans/backup', adminMiddleware, (req, res) => {
  try {
    const backup = req.body;

    if (!backup || !backup.version || !backup.data || !Array.isArray(backup.data.plan_config)) {
      return res.status(400).json({ error: 'Formato de backup de planes inválido' });
    }

    const plans = backup.data.plan_config;
    if (plans.length === 0) {
      return res.status(400).json({ error: 'El backup no contiene planes' });
    }

    const requiredCols = ['plan_slug', 'plan_name'];
    for (const plan of plans) {
      if (!plan.plan_slug || !plan.plan_name) {
        return res.status(400).json({ error: 'Cada plan debe tener plan_slug y plan_name' });
      }
    }

    const replace = db.transaction(() => {
      db.exec('DELETE FROM plan_config');

      const columns = Object.keys(plans[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const insertStmt = db.prepare(`INSERT INTO plan_config (${columns.join(', ')}) VALUES (${placeholders})`);

      for (const plan of plans) {
        const values = columns.map(c => plan[c] !== undefined ? plan[c] : null);
        insertStmt.run(...values);
      }
    });

    replace();

    const updatedPlans = db.prepare('SELECT * FROM plan_config ORDER BY created_at ASC').all();
    res.json({ success: true, message: `Se importaron ${plans.length} plan(es) correctamente`, plans: updatedPlans });
  } catch (error) {
    console.error('Error restoring plans backup:', error);
    res.status(500).json({ error: 'Error al importar backup de planes: ' + error.message });
  }
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

// DEBUG: Ver códigos SSO generados - REMOVER EN PRODUCCIÓN
app.get('/api/debug/sso-codes', (req, res) => {
  const codes = db.prepare('SELECT * FROM local_sso_codes ORDER BY created_at DESC LIMIT 20').all();
  res.json({ codes, total: codes.length });
});

// DEBUG: Endpoint para probar token directamente
// ✅ ✅ ✅ ENDPOINT PRINCIPAL DE SSO QUE LARAVEL LLAMA DIRECTAMENTE
// ESTE ERA EL PROBLEMA QUE NADIE HABIA VISTO
app.get('/sso/consume', async (req, res) => {
  console.log('\n\n==================================================');
  console.log('📨 USUARIO LLEGA DESDE LARAVEL A /sso/consume');
  console.log(`   Código recibido: ${req.query.code?.substring(0, 30)}...`);
  console.log('==================================================');

  const code = req.query.code;
  
  if (!code) {
    console.log('❌ NO HAY CÓDIGO EN LA URL');
    return res.redirect('/?error=missing_code');
  }

  try {
    // ✅ PASO 1: CONSUMIR EL CÓDIGO CONTRA LARAVEL
    console.log('🔍 Paso 1: Consumiendo código SSO con Laravel...');
    
    const response = await fetchNoSSL(`${API_BASE_URL}/consume-token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    console.log(`📡 Respuesta Laravel: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Paso 1 completado: Código válido, token obtenido');
      console.log(`   Token: ${data.token?.substring(0, 40)}...`);

      // ✅ PASO 2: OBTENER DATOS DEL USUARIO DE LARAVEL
      console.log('🔍 Paso 2: Obteniendo datos del usuario...');
      const userResponse = await fetchNoSSL(`${API_BASE_URL}/user`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${data.token}`
        }
      });

      if (userResponse.ok) {
        const user = await userResponse.json();
        console.log('✅ Paso 2 completado: Usuario obtenido');
        console.log(`   ID: ${user.id}`);
        console.log(`   Nombre: ${user.name}`);
        console.log(`   Email: ${user.email}`);

        // ✅ PASO 3: CREAR USUARIO EN NUESTRA BASE DE DATOS
        console.log('🔍 Paso 3: Creando/actualizando usuario en DB local...');
        ensureUserInDB({
          id: user.id.toString(),
          name: user.name
        });
        console.log('✅ Paso 3 completado: Usuario creado/actualizado');

        // ✅ PASO 4: SINCRONIZAR PLANES DEL USUARIO
        console.log('🔍 Paso 4: Sincronizando planes...');
        await syncUserPlansFromBilling(user.id.toString(), data.token);
        console.log('✅ Paso 4 completado: Planes sincronizados');

        // ✅ PASO 5: GENERAR TOKEN INTERNO Y GUARDAR EN COOKIE
        console.log('🔍 Paso 5: Generando token interno y guardando en cookie...');
        const internalToken = generateInternalToken(user.id.toString());
        res.cookie('auth_token', internalToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
        });
        console.log('✅ Paso 5 completado: Token interno guardado en cookie');
      } else {
        console.log('❌ No se pudieron obtener datos del usuario de Laravel');
      }

      console.log('\n✅ TODO EL FLUJO COMPLETADO EXITOSAMENTE');
      console.log('✅ REDIRIGIENDO AL DASHBOARD');
      console.log('==================================================\n');
      return res.redirect('/');
    }

    console.log('❌ Código inválido o expirado');
    return res.redirect('/?error=invalid_code');

  } catch (error) {
    console.log(`❌ ERROR EN FLUJO SSO: ${error.message}`);
    console.log(error.stack);
    return res.redirect('/?error=server_error');
  }
});

// ✅ Fin del endpoint principal de SSO

// 📋 SISTEMA DE LOGS EN MEMORIA PARA DEBUG
const serverLogs = [];
const MAX_LOGS = 200;

// Guardar todos los console.log
const originalConsoleLog = console.log;
console.log = (...args) => {
  const timestamp = new Date().toISOString();
  serverLogs.unshift({
    time: timestamp,
    message: args.join(' ')
  });
  
  if (serverLogs.length > MAX_LOGS) {
    serverLogs.pop();
  }
  
  originalConsoleLog.apply(console, args);
};

// Endpoint para ver logs en JSON
app.get('/api/debug/logs', (req, res) => {
  res.json({ logs: serverLogs, total: serverLogs.length });
});

// Endpoint para ver logs en HTML legible
app.get('/api/debug/logs/html', (req, res) => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logs del Servidor</title>
      <meta charset="utf-8">
      <style>
        body { font-family: monospace; background: #1a1a1a; color: #fff; padding: 20px; }
        .log { margin: 5px 0; padding: 5px; border-bottom: 1px solid #333; }
        .time { color: #888; margin-right: 10px; }
        .success { color: #4ade80; }
        .error { color: #f87171; }
        .info { color: #60a5fa; }
      </style>
    </head>
    <body>
      <h1>Logs del Servidor</h1>
      <h3>Total: ${serverLogs.length} logs</h3>
      <button onclick="location.reload()">Actualizar</button>
      <hr>
  `;

  for (const log of serverLogs) {
    let className = '';
    if (log.message.includes('✅')) className = 'success';
    if (log.message.includes('❌') || log.message.includes('ERROR')) className = 'error';
    if (log.message.includes('🔍') || log.message.includes('📡')) className = 'info';
    
    html += `<div class="log ${className}"><span class="time">${log.time}</span> ${log.message}</div>`;
  }

  html += `
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));

  // GET /catalogo/:eventType/:slug - SSR con meta tags SEO inyectados dinámicamente
  app.get('/catalogo/:eventType/:slug', (req, res) => {
    try {
      const fullSlug = `${req.params.eventType}/${req.params.slug}`;
      const item = db.prepare('SELECT slug, seo_title, meta_description, structured_data, filename FROM catalogo WHERE slug = ? AND starred = 1').get(fullSlug);

      const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');

      if (!existsSync(distIndexPath)) {
        return res.sendFile(distIndexPath);
      }

      let html = readFileSync(distIndexPath, 'utf-8');

      if (item && item.seo_title) {
        let structuredData = null;
        try {
          structuredData = item.structured_data ? JSON.parse(item.structured_data) : null;
        } catch (e) {
          structuredData = null;
        }

        const seoTitle = item.seo_title || 'Invitaciones Digitales';
        const metaDesc = item.meta_description || '';
        const ogImage = item.filename ? `${process.env.PUBLIC_URL || ''}/storage/historico/${item.filename}` : '';

        html = html.replace(
          /<title[^>]*>[\s\S]*?<\/title>/i,
          `<title>${seoTitle}</title>`
        );

        if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']description["'][^>]*>/i,
            `<meta name="description" content="${metaDesc}">`
          );
        } else {
          html = html.replace(
            '</head>',
            `  <meta name="description" content="${metaDesc}">\n</head>`
          );
        }

        const ogTags = [];
        ogTags.push(`<meta property="og:title" content="${seoTitle}">`);
        ogTags.push(`<meta property="og:description" content="${metaDesc}">`);
        if (ogImage) {
          ogTags.push(`<meta property="og:image" content="${ogImage}">`);
        }
        ogTags.push(`<meta property="og:type" content="product">`);

        html = html.replace(
          /<meta\s+property=["']og:title["'][^>]*>/gi,
          ''
        );
        html = html.replace(
          /<meta\s+property=["']og:description["'][^>]*>/gi,
          ''
        );
        html = html.replace(
          /<meta\s+property=["']og:image["'][^>]*>/gi,
          ''
        );
        html = html.replace(
          /<meta\s+property=["']og:type["'][^>]*>/gi,
          ''
        );

        html = html.replace(
          '</head>',
          `  ${ogTags.join('\n  ')}\n</head>`
        );

        if (structuredData) {
          html = html.replace(
            '</head>',
            `  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>\n</head>`
          );
        }

        console.log(`🔍 SSR SEO inyectado para: ${fullSlug} | title: "${seoTitle.substring(0, 50)}..."`);
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Error en SSR SEO middleware:', error);
      res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
    }
  });
  
  // ✅ Catch-all para React Router
  app.get('*', (req, res, next) => {
    // Si es una ruta API, saltar
    if (
      req.path.startsWith('/api/') || 
      req.path.startsWith('/i/') || 
      req.path.startsWith('/sso/')
    ) {
      return next();
    }
    
    console.log(`📨 Ruta frontend: ${req.path}, devolviendo index.html`);
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
    const { prompt, attachments, editorConfig, imageFiles, promptInstruction, purchaseId } = req.body;
    const userId = ensureUserInDB(req.user);

    if (!purchaseId) {
      return res.status(400).json({ error: 'purchaseId es requerido' });
    }

    const plan = db.prepare('SELECT * FROM user_plans WHERE user_id = ? AND purchase_id = ?').get(userId, purchaseId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado para este usuario' });
    }

    const generationAvailable = Math.max(0, plan.generation_credits - plan.generation_used);
    if (generationAvailable < 1) {
      return res.status(400).json({ error: 'No tienes créditos de generación disponibles en este plan.' });
    }

    db.prepare('UPDATE user_plans SET generation_used = generation_used + 1 WHERE user_id = ? AND purchase_id = ?').run(userId, purchaseId);
    console.log('💳 Crédito de generación descontado del plan. Restantes:', generationAvailable - 1);

    const planConfigRow = db.prepare('SELECT has_rsvp FROM plan_config WHERE plan_slug = ?').get(plan.plan_slug);
    const hasRsvp = planConfigRow?.has_rsvp === 1;
    console.log('📋 Plan RSVP:', hasRsvp ? 'HABILITADO' : 'DESHABILITADO', '| plan_slug:', plan.plan_slug);

    let rsvpInstruction = '';
    if (hasRsvp) {
      rsvpInstruction = `\n\n===== RSVP / CONFIRMACION MODULE (MANDATORY) =====\nYou MUST include a "confirmacion" (RSVP) module in this invitation. This module MUST be purely INFORMATIONAL — do NOT include any form, button, or interactive element for confirming attendance. The module MUST contain a message similar to: "Si estás invitado a este evento, por favor revisa tu correo, SMS o WhatsApp donde recibirás un enlace único que te permitirá confirmar tu asistencia." Style it as a distinct section with data-gemini-id="confirmacion-texto" on the main text element. Use data-gemini-id prefix "confirmacion-" for all elements in this section. ===== END RSVP MODULE =====`;
    } else {
      rsvpInstruction = `\n\n===== RSVP / CONFIRMACION MODULE (FORBIDDEN) =====\nYou MUST NOT include any "confirmacion", RSVP, or attendance confirmation module/section in this invitation. Do NOT add any section about confirming attendance. ===== END RSVP FORBIDDEN =====`;
    }
    
    // Obtener configuración actual
    const configStmt = db.prepare('SELECT * FROM admin_config WHERE id = 1');
    const config = configStmt.get();
    
    if (!config) {
      db.prepare('UPDATE user_plans SET generation_used = generation_used - 1 WHERE user_id = ? AND purchase_id = ?').run(userId, purchaseId);
      return res.status(500).json({ error: 'Configuración no encontrada' });
    }
    
    console.log('=== GENERATE HTML DEBUG ===');
    console.log('Provider:', config.html_provider);
    console.log('html_api_key exists:', !!config.html_api_key);
    console.log('html_google_api_key exists:', !!config.html_google_api_key);
    console.log('html_google_model:', config.html_google_model);
    console.log('==========================');
    
    let htmlResult = '';
    const useModularRAG = config.use_modular_rag === 1;
    const useAgentOrchestrator = config.use_agent_orchestrator === 1;
    const useRagTemplates = config.use_rag_templates === 1;
    console.log('\ud83e\udde9 Modular RAG:', useModularRAG ? 'ACTIVADO' : 'DESACTIVADO');
    console.log('\ud83e\ud916 Agent Orchestrator:', useAgentOrchestrator ? 'ACTIVADO' : 'DESACTIVADO');
    console.log('\ud83d\udcc4 RAG Templates:', useRagTemplates ? 'ACTIVADO' : 'DESACTIVADO');

    // DEBUG: Ver qué API key se usa realmente
    console.log('===== DEBUG API KEY =====');
    console.log('Config from DB:', config.html_google_api_key ? `Preset: ${config.html_google_api_key.substring(0, 10)}...` : 'NO HAY');
    console.log('======================');

    if (config.html_google_api_key) {
const geminiOptions = {
        eventType: editorConfig?.eventType,
        theme: editorConfig?.theme,
        primaryColor: editorConfig?.primaryColor,
        secondaryColor: editorConfig?.secondaryColor,
        visualStyle: editorConfig?.visualStyle,
        mood: editorConfig?.mood,
        imageFiles: imageFiles || [],
        promptInstruction: (promptInstruction || '') + rsvpInstruction,
        imageApiKey: config.image_api_key || '',
        imageModel: config.image_model || 'gemini-3.1-flash-image-preview',
        userId: userId, // Pasar userId para tracking de uso RAG
        useRagTemplates: useRagTemplates
      };

      const attachmentsForGemini = Array.isArray(attachments) ? attachments : [];

      // Flujo de generación con prioridad: Modular RAG > Agent Orchestrator > generateWithGemini directo
      // - Modular RAG: orquestación modular (select/adapt/assemble de módulos) - runModularOrchestration
      //   tiene fallback interno a runOrchestration si no encuentra módulos en la KB.
      // - Agent Orchestrator: orquestación tradicional.
      // - generateWithGemini: generación directa sin orquestación.
      if (useModularRAG) {
        try {
          console.log('\ud83e\udde9 [MODULAR] Iniciando runModularOrchestration...');
          const { runModularOrchestration } = await import('./agentOrchestrator.js');
          htmlResult = await runModularOrchestration(
            prompt,
            config.html_google_api_key,
            config.html_google_model || 'gemini-3.1-pro-preview',
            geminiOptions,
            attachmentsForGemini
          );
        } catch (modularError) {
          console.error('\u26a0\ufe0f Modular Orchestrator fall\u00f3:', modularError.message);
          if (useAgentOrchestrator) {
            try {
              console.log('\ud83e\ud916 [FALLBACK] Intentando Agent Orchestrator tradicional...');
              const { runOrchestration } = await import('./agentOrchestrator.js');
              htmlResult = await runOrchestration(
                prompt,
                config.html_google_api_key,
                config.html_google_model || 'gemini-3.1-pro-preview',
                geminiOptions,
                attachmentsForGemini
              );
            } catch (orchestratorError) {
              console.error('\u26a0\ufe0f Agent Orchestrator tambi\u00e9n fall\u00f3, usando generateWithGemini:', orchestratorError.message);
              const { generateWithGemini } = await import('./geminiService.js');
              htmlResult = await generateWithGemini(
                prompt,
                config.html_google_api_key,
                config.html_google_model || 'gemini-3.1-pro-preview',
                geminiOptions,
                attachmentsForGemini
              );
            }
          } else {
            console.log('\ud83d\udcbb [FALLBACK] Sin Agent Orchestrator, usando generateWithGemini directo...');
            const { generateWithGemini } = await import('./geminiService.js');
            htmlResult = await generateWithGemini(
              prompt,
              config.html_google_api_key,
              config.html_google_model || 'gemini-3.1-pro-preview',
              geminiOptions,
              attachmentsForGemini
            );
          }
        }
      } else if (useAgentOrchestrator) {
        try {
          const { runOrchestration } = await import('./agentOrchestrator.js');
          htmlResult = await runOrchestration(
            prompt,
            config.html_google_api_key,
            config.html_google_model || 'gemini-3.1-pro-preview',
            geminiOptions,
            attachmentsForGemini
          );
        } catch (orchestratorError) {
          console.error('\u26a0\ufe0f Agent Orchestrator fall\u00f3, usando fallback:', orchestratorError.message);
          const { generateWithGemini } = await import('./geminiService.js');
          htmlResult = await generateWithGemini(
            prompt,
            config.html_google_api_key,
            config.html_google_model || 'gemini-3.1-pro-preview',
            geminiOptions,
            attachmentsForGemini
          );
        }
      } else {
        const { generateWithGemini } = await import('./geminiService.js');
        htmlResult = await generateWithGemini(
          prompt,
          config.html_google_api_key,
          config.html_google_model || 'gemini-3.1-pro-preview',
          geminiOptions,
          attachmentsForGemini
        );
      }
    } else {
      db.prepare('UPDATE user_plans SET generation_used = generation_used - 1 WHERE user_id = ? AND purchase_id = ?').run(userId, purchaseId);
      res.status(500).json({ error: 'No hay API key de Google configurada. Configúrala en el panel de admin.' });
      return;
    }
    
// Compilar TODAS las imágenes a base64 (locales + AI generadas)
    // Esto asegura que la invitación sea completamente autocontenida
    const { compileAllImagesToBase64 } = await import('./imageToBase64.js');
    htmlResult = await compileAllImagesToBase64(htmlResult, config.image_api_key, config.image_model);
    
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
    
    // Restaurar crédito de generación si hay error
    try {
      const userId = req.user?.id ? req.user.id.toString() : null;
      const pId = req.body?.purchaseId;
      if (userId && pId) {
        db.prepare('UPDATE user_plans SET generation_used = generation_used - 1 WHERE user_id = ? AND purchase_id = ?').run(userId, pId);
        console.log('💳 Crédito de generación restaurado por error');
      }
    } catch (restoreError) {
      console.error('Error restoring credit:', restoreError);
    }
    
    const errorMsg = error.message?.includes('Empty response')
      ? 'Gemini devolvió una respuesta vacía. Intenta de nuevo.'
      : error.message?.includes('API key')
      ? 'Error de autenticación con Gemini. Revisa la API key.'
      : error.message || 'Error al generar HTML';
    res.status(500).json({ error: errorMsg });
  }
});

// ==================== RAG KNOWLEDGE BASE ENDPOINTS ====================

// GET /api/admin/rag-templates - Listar todas las plantillas
app.get('/api/admin/rag-templates', adminMiddleware, (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT id, style_id, style_name, description, category, theme_tags, 
             is_active, created_at, updated_at,
             filename, colors, required_tags, ui_elements,
             color_palette,
             CASE WHEN html_content IS NOT NULL AND html_content != '' THEN 1 ELSE 0 END as has_html_content,
             CASE WHEN html_content IS NOT NULL THEN length(html_content) ELSE 0 END as html_size,
             html_content
      FROM knowledge_base 
      ORDER BY created_at DESC
    `).all();

    const withValidation = templates.map(t => {
      const hasHtml = t.has_html_content === 1;
      let validation = null;
      if (hasHtml && t.html_content) {
        try {
          validation = validateTemplate(t.html_content, t.category);
        } catch (e) {
          validation = null;
        }
      }
      delete t.html_content;
      return { ...t, validation };
    });
    
    res.json({ templates: withValidation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/rag-templates/backup - Descargar backup de knowledge_base
app.get('/api/admin/rag-templates/backup', adminMiddleware, (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM knowledge_base ORDER BY created_at ASC').all();
    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      data: { knowledge_base: templates }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="rag-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backup);
  } catch (error) {
    console.error('Error creating RAG backup:', error);
    res.status(500).json({ error: 'Error al crear backup de plantillas RAG' });
  }
});

// POST /api/admin/rag-templates/backup - Importar backup de knowledge_base (sobrescribe existentes)
app.post('/api/admin/rag-templates/backup', adminMiddleware, (req, res) => {
  try {
    const backup = req.body;

    if (!backup || !backup.version || !backup.data || !Array.isArray(backup.data.knowledge_base)) {
      return res.status(400).json({ error: 'Formato de backup de plantillas RAG inválido' });
    }

    const templates = backup.data.knowledge_base;
    if (templates.length === 0) {
      return res.status(400).json({ error: 'El backup no contiene plantillas RAG' });
    }

    for (const t of templates) {
      if (!t.style_id || !t.style_name) {
        return res.status(400).json({ error: 'Cada plantilla debe tener style_id y style_name' });
      }
    }

    const replace = db.transaction(() => {
      db.exec('DELETE FROM knowledge_base');

      const columns = Object.keys(templates[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const insertStmt = db.prepare(`INSERT INTO knowledge_base (${columns.join(', ')}) VALUES (${placeholders})`);

      for (const t of templates) {
        const values = columns.map(c => t[c] !== undefined ? t[c] : null);
        insertStmt.run(...values);
      }
    });

    replace();

    const updatedTemplates = db.prepare('SELECT * FROM knowledge_base ORDER BY created_at ASC').all();
    res.json({ success: true, message: `Se importaron ${templates.length} plantilla(s) RAG correctamente`, templates: updatedTemplates });
  } catch (error) {
    console.error('Error restoring RAG backup:', error);
    res.status(500).json({ error: 'Error al importar backup de plantillas RAG: ' + error.message });
  }
});

// GET /api/admin/rag-templates/:id - Obtener una plantilla completa
app.get('/api/admin/rag-templates/:id', adminMiddleware, (req, res) => {
  try {
    const template = db.prepare(`
      SELECT * FROM knowledge_base WHERE id = ?
    `).get(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    
    // Parsear JSON fields antes de enviar
    const parsed = {
      ...template,
      theme_tags: JSON.parse(template.theme_tags || '[]'),
      color_palette: JSON.parse(template.color_palette || '{}'),
      typography_scale: JSON.parse(template.typography_scale || '{}'),
      layout_rules: JSON.parse(template.layout_rules || '{}'),
      modules_def: JSON.parse(template.modules_def || '{}'),
      base_cdns: JSON.parse(template.base_cdns || '[]'),
      js_dependencies: JSON.parse(template.js_dependencies || '[]'),
      animation_rules: JSON.parse(template.animation_rules || '{}'),
      variation_params: JSON.parse(template.variation_params || '{}')
    };
    
    res.json({ template: parsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/rag-templates - Crear nueva plantilla
app.post('/api/admin/rag-templates', adminMiddleware, (req, res) => {
  try {
    const {
      style_id, style_name, description, category, theme_tags,
      color_palette, typography_scale, layout_rules, modules_def,
      base_cdns, js_dependencies, animation_rules, variation_params,
      html_content
    } = req.body;
    
    // Validar required fields
    if (!style_id || !style_name || !category) {
      return res.status(400).json({ error: 'Faltan campos requeridos: style_id, style_name, category' });
    }

    const normalizedCat = normalizeCategory(category);

    const stmt = db.prepare(`
      INSERT INTO knowledge_base (
        style_id, style_name, description, category, theme_tags,
        color_palette, typography_scale, layout_rules, modules_def,
        base_cdns, js_dependencies, animation_rules, variation_params,
        html_content
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      style_id, style_name, description || '', normalizedCat,
      JSON.stringify(theme_tags || []),
      JSON.stringify(color_palette || {}),
      JSON.stringify(typography_scale || {}),
      JSON.stringify(layout_rules || {}),
      JSON.stringify(modules_def || {}),
      JSON.stringify(base_cdns || []),
      JSON.stringify(js_dependencies || []),
      JSON.stringify(animation_rules || {}),
      JSON.stringify(variation_params || {}),
      html_content || null
    );
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Ya existe una plantilla con ese style_id' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/rag-templates/:id - Actualizar plantilla (partial updates)
app.put('/api/admin/rag-templates/:id', adminMiddleware, (req, res) => {
  try {
    const body = req.body;
    const allowedFields = [
      'style_name', 'description', 'category', 'theme_tags',
      'color_palette', 'typography_scale', 'layout_rules', 'modules_def',
      'base_cdns', 'js_dependencies', 'animation_rules', 'variation_params',
      'is_active', 'html_content'
    ];
    const jsonFields = ['theme_tags', 'color_palette', 'typography_scale', 'layout_rules', 'modules_def', 'base_cdns', 'js_dependencies', 'animation_rules', 'variation_params'];

    const setClauses = [];
    const params = [];

    for (const field of allowedFields) {
      if (body[field] === undefined) continue;

      let value = body[field];

      if (field === 'category') {
        value = normalizeCategory(value);
      } else if (field === 'is_active') {
        value = value ? 1 : 0;
      } else if (jsonFields.includes(field)) {
        value = typeof value === 'string' ? value : JSON.stringify(value || (field === 'theme_tags' || field === 'base_cdns' || field === 'js_dependencies' ? [] : {}));
      }

      setClauses.push(`${field} = ?`);
      params.push(value);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    setClauses.push(`updated_at = datetime('now')`);
    params.push(req.params.id);

    db.prepare(`UPDATE knowledge_base SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/rag-templates/:id - Eliminar plantilla
app.delete('/api/admin/rag-templates/:id', adminMiddleware, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/rag-templates/upload - Subir template HTML y analizarlo con ragValidator
app.post('/api/admin/rag-templates/upload', adminMiddleware, ragUpload.single('htmlFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo HTML es requerido (campo htmlFile)' });
    }

    const rawEventType = req.body.event_type || 'boda';
    const eventType = normalizeCategory(rawEventType);
    const filename = req.file.originalname;
    const htmlContent = req.file.buffer.toString('utf8');

    const analysis = analyzeTemplate(htmlContent, eventType);

    const styleId = filename
      .toLowerCase()
      .replace(/\.html$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const styleName = analysis.description
      ? analysis.description.split('.')[0].substring(0, 80)
      : filename.replace(/\.html$/i, '');

    const requiredTags = REQUIRED_TAGS[eventType] || [];

    const stmt = db.prepare(`
      INSERT INTO knowledge_base (
        style_id, style_name, description, category,
        filename, ui_elements, colors, required_tags, html_size,
        html_content, is_active, theme_tags, color_palette
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const result = stmt.run(
      styleId,
      styleName,
      analysis.description || '',
      eventType,
      filename,
      JSON.stringify(analysis.ui_elements),
      JSON.stringify(analysis.colors),
      JSON.stringify(requiredTags),
      htmlContent.length,
      htmlContent,
      JSON.stringify(analysis.theme_tags || []),
      JSON.stringify(analysis.color_palette || {})
    );

    const response = {
      success: true,
      id: result.lastInsertRowid,
      html_content: htmlContent,
      analysis
    };

    if (analysis.found_tags.length === 0) {
      response.warning = 'Template sin data-gemini-id. No será editable en el editor visual.';
    }

    res.json(response);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Ya existe una plantilla con ese style_id (filename)' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/rag-templates/analyze - Analizar HTML y convertir a RAG usando LLM
app.post('/api/admin/rag-templates/analyze', adminMiddleware, async (req, res) => {
  try {
    const { html, style_name } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML es requerido' });
    }

    const stripBase64Images = (rawHtml) => {
      let cleaned = rawHtml.replace(/<img\s([^>]*?)src=["']data:image\/[^"']+["']([^>]*?)\/?>/gi, (match, before, after) => {
        const alt = (match.match(/alt=["']([^"']*)["']/i) || [])[1];
        const width = (match.match(/width=["']([^"']*)["']/i) || [])[1];
        const height = (match.match(/height=["']([^"']*)["']/i) || [])[1];
        const cls = (match.match(/class=["']([^"']*)["']/i) || [])[1];
        const isSelfClosing = match.trimEnd().endsWith('/>');
        let placeholder = '<img';
        if (cls) placeholder += ` class="${cls}"`;
        if (alt) placeholder += ` alt="${alt}"`;
        if (width) placeholder += ` width="${width}"`;
        if (height) placeholder += ` height="${height}"`;
        placeholder += ' src="[IMAGE]"';
        const leftover = after.replace(/src=["']data:image[^"']+["']/i, '').trim();
        if (leftover) placeholder += ' ' + leftover;
        placeholder = placeholder.replace(/\s+/g, ' ');
        placeholder += isSelfClosing ? ' />' : '>';
        return placeholder;
      });
      cleaned = cleaned.replace(/url\(["']?data:image\/[^"')]+["']?\)/gi, 'url([BG_IMAGE])');
      cleaned = cleaned.replace(/src=["']data:[^"']+["']/gi, 'src="[MEDIA]"');
      return cleaned;
    };

    const htmlClean = stripBase64Images(html);

    // 1. Quick regex extraction as baseline
    const cdnMatches = htmlClean.match(/src="(https:\/\/cdn[^"]+)"/g) || [];
    const regexCdns = [...new Set(cdnMatches.map(m => {
      const url = m.replace(/src="/, '').replace(/"/, '');
      if (url.includes('tailwindcss')) return 'tailwindcss';
      if (url.includes('gsap')) return 'gsap';
      if (url.includes('scrolltrigger')) return 'scrolltrigger';
      if (url.includes('three')) return 'three';
      if (url.includes('iconify')) return 'iconify';
      if (url.includes('animejs')) return 'animejs';
      if (url.includes('tsparticles')) return 'tsparticles';
      return null;
    }).filter(Boolean))];
    
    const colorMatches = htmlClean.match(/#[0-9A-Fa-f]{3,8}|rgb\([^)]+\)/g) || [];
    const regexColors = [...new Set(colorMatches)].slice(0, 15);
    
    const fontMatches = htmlClean.match(/family=([^:&"']+)/g) || [];
    const regexFonts = fontMatches.map(m => m.replace('family=', '').replace(/:/g, '').replace(/\+/g, ' '));
    
    // 2. Try LLM-based extraction
    const config = db.prepare('SELECT * FROM admin_config WHERE id = 1').get();
    let llmAnalysis = null;
    
    if (config && config.html_google_api_key) {
      try {
        const analyzePrompt = `You are an expert web designer analyzing HTML invitation code to extract a RAG (Retrieval-Augmented Generation) template. Analyze the following HTML code and extract ALL design properties.

Return ONLY a valid JSON object with these exact fields (no markdown, no code fences, no explanation):

{
  "style_id": "kebab-case-id-for-this-style",
  "style_name": "Human-readable style name",
  "description": "A vivid 1-2 sentence description of the visual style and aesthetic of this invitation",
  "category": "One of: boda, xv-años, cumpleaños, bautizo, comunion, baby-shower, otro",
  "theme_tags": ["tag1", "tag2", "tag3"],
  "color_palette": {
    "bg_primary": "#hex",
    "bg_secondary": "#hex",
    "bg_accent": "#hex",
    "accent": "#hex",
    "text": "#hex",
    "text_secondary": "#hex"
  },
  "typography_scale": {
    "display": "Font name for headings",
    "ui": "Font name for body/UI text"
  },
  "layout_rules": {
    "grid": "CSS grid approach used",
    "approach": "Overall layout strategy description",
    "negative_space": "Tailwind spacing pattern like py-24 py-28"
  },
  "modules_def": {
    "portada": {"layout": "layout type", "visual": "visual effect"},
    "countdown": {"layout": "layout type", "type": "timer type"},
    "itinerario": {"layout": "layout type"},
    "ubicacion": {"layout": "layout type"},
    "padrinos": {"layout": "layout type"},
    "padres": {"layout": "layout type"}
  },
  "base_cdns": ["tailwindcss", "iconify"],
  "js_dependencies": ["gsap", "scrolltrigger"],
  "animation_rules": {
    "scroll_reveal": true/false,
    "parallax": true/false,
    "hover_animations": true/false,
    "keyframe_animations": true/false,
    "description": "Brief description of animation style"
  },
  "variation_params": {
    "layouts": ["list of layout variations possible"],
    "animations": ["list of animation variations possible"],
    "color_variations": ["description of how colors can vary"]
  }
}

Be thorough and specific. Extract actual colors, fonts, and patterns from the HTML. Infer the category from the content. Generate meaningful theme tags. Describe the layout approach and animation patterns precisely.

HTML to analyze (base64 images stripped to save tokens):
${htmlClean.substring(0, 30000)}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.html_google_model || 'gemini-2.0-flash'}:generateContent`;
        
        const httpsAgent = new (await import('https')).Agent({ rejectUnauthorized: false });
        const llmResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.html_google_api_key
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: analyzePrompt }] }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              maxOutputTokens: 4096
            }
          })
        });

        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          const llmText = llmData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          const jsonMatch = llmText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            llmAnalysis = JSON.parse(jsonMatch[0]);
            console.log('[RAG ANALYZE] LLM extraction successful');
          }
        } else {
          const errBody = await llmResponse.text();
          console.log('[RAG ANALYZE] LLM call failed, using regex fallback:', llmResponse.status, errBody.substring(0, 200));
        }
      } catch (llmError) {
        console.error('[RAG ANALYZE] LLM error, using regex fallback:', llmError.message);
      }
    } else {
      console.log('[RAG ANALYZE] No Gemini API key configured, using regex extraction only');
    }
    
    // 3. Build final analysis: LLM takes priority, regex fills gaps
    const analysis = {
      style_id: llmAnalysis?.style_id || style_name?.toLowerCase().replace(/\s+/g, '-') || 'auto-detected',
      style_name: llmAnalysis?.style_name || style_name || '',
      description: llmAnalysis?.description || '',
      category: llmAnalysis?.category || 'otro',
      theme_tags: llmAnalysis?.theme_tags || [],
      color_palette: llmAnalysis?.color_palette || (() => {
        const cp = {};
        regexColors.forEach((c, i) => { cp[`color_${i + 1}`] = c; });
        return cp;
      })(),
      typography_scale: llmAnalysis?.typography_scale || {
        display: regexFonts[0] || 'default',
        ui: regexFonts[1] || 'default'
      },
      layout_rules: llmAnalysis?.layout_rules || {
        grid: html.includes('grid-cols') ? 'CSS Grid' : html.includes('flex') ? 'Flexbox' : 'Block',
        approach: 'Extracted from HTML structure',
        negative_space: 'py-16'
      },
      modules_def: llmAnalysis?.modules_def || (() => {
        const modulePatterns = {
          portada: /data-gemini-id="portada|id="portada"/,
          padres: /data-gemini-id="padres|id="padres"/,
          countdown: /data-gemini-id="countdown|id="countdown"/,
          itinerario: /data-gemini-id="itinerario|data-gemini-id="info-evento"/,
          ubicacion: /data-gemini-id="ubicacion|data-gemini-id="venue"/,
          padrinos: /data-gemini-id="padrinos|id="padrinos"/,
          corte: /data-gemini-id="corte|data-gemini-id="galeria"/,
          vestimenta: /data-gemini-id="vestimenta|id="dress-code"/,
          regalos: /data-gemini-id="regalos|id="regalos"/,
          confirmacion: /data-gemini-id="confirmacion|id="rsvp"/
        };
        const md = {};
        Object.entries(modulePatterns).forEach(([modName, pattern]) => {
          if (pattern.test(html)) {
            md[modName] = {
              detected: true,
              layout_type: html.includes('grid') ? 'grid' : html.includes('flex') ? 'flex' : 'block'
            };
          }
        });
        return md;
      })(),
      base_cdns: llmAnalysis?.base_cdns || regexCdns.length > 0 ? regexCdns : ['tailwindcss'],
      js_dependencies: llmAnalysis?.js_dependencies || [],
      animation_rules: llmAnalysis?.animation_rules || {
        has_keyframes: /@keyframes/.test(html),
        has_transitions: /transition:/.test(html),
        has_scroll_reveal: /IntersectionObserver|reveal/.test(html),
        has_parallax: /transform: translateY/.test(html)
      },
      variation_params: llmAnalysis?.variation_params || {
        uses_grid: html.includes('grid-cols'),
        uses_flex: html.includes('flex '),
        uses_masonry: html.includes('columns-'),
        uses_absolute: html.includes('absolute')
      }
    };
    
    res.json({ analysis });
  } catch (error) {
    console.error('[RAG ANALYZE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rag/query - Query público para buscar plantillas
app.get('/api/rag/query', (req, res) => {
  try {
    const { category, theme, limit = 3 } = req.query;
    
    let query = 'SELECT * FROM knowledge_base WHERE is_active = 1';
    const params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (theme) {
      query += ' AND (theme_tags LIKE ? OR description LIKE ?)';
      params.push(`%"${theme}"%`);
      params.push(`%${theme}%`);
    }
    
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(parseInt(limit) || 3);
    
    const templates = db.prepare(query).all(...params);
    
    // Parsear JSON
    const parsed = templates.map(t => ({
      ...t,
      theme_tags: JSON.parse(t.theme_tags || '[]'),
      color_palette: JSON.parse(t.color_palette || '{}'),
      modules_def: JSON.parse(t.modules_def || '{}'),
      base_cdns: JSON.parse(t.base_cdns || '[]')
    }));
    
    res.json({ templates: parsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FIN RAG ENDPOINTS ====================

// ==================== RAG MODULAR ENDPOINTS (PIEZAS) ====================

// GET /api/admin/rag-modules - Listar todos los módulos
app.get('/api/admin/rag-modules', adminMiddleware, (req, res) => {
  try {
    const { module_type, category, is_active } = req.query;
    
    let query = `
      SELECT id, module_id, module_type, style_name, description, tags, 
             descripcion_larga, theme_tags, color_palette, css_variables,
             has_memory_attributes, memory_sources, is_active, category,
             filename, html_size, created_at, updated_at
      FROM knowledge_base_modules 
      WHERE 1=1
    `;
    const params = [];
    
    if (module_type) {
      query += ' AND module_type = ?';
      params.push(module_type);
    }
    if (category && category !== 'general') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(parseInt(is_active));
    }
    
    query += ' ORDER BY created_at DESC';
    
    const modules = db.prepare(query).all(...params);
    
    // Parsear JSON fields
    const parsed = modules.map(m => ({
      ...m,
      tags: JSON.parse(m.tags || '[]'),
      descripcion_larga: JSON.parse(m.descripcion_larga || ''),
      theme_tags: JSON.parse(m.theme_tags || []),
      color_palette: JSON.parse(m.color_palette || {}),
      css_variables: JSON.parse(m.css_variables || {}),
      memory_sources: JSON.parse(m.memory_sources || {})
    }));
    
    res.json({ modules: parsed });
  } catch (error) {
    console.error('[RAG-MODULES LIST] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/rag-modules/:id - Obtener un módulo completo
app.get('/api/admin/rag-modules/:id', adminMiddleware, (req, res) => {
  try {
    const module = db.prepare(`
      SELECT * FROM knowledge_base_modules WHERE id = ?
    `).get(req.params.id);
    
    if (!module) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    
    // Parsear JSON fields
    const parsed = {
      ...module,
      tags: JSON.parse(module.tags || '[]'),
      descripcion_larga: JSON.parse(module.descripcion_larga || ''),
      theme_tags: JSON.parse(module.theme_tags || []),
      color_palette: JSON.parse(module.color_palette || {}),
      css_variables: JSON.parse(module.css_variables || {}),
      memory_sources: JSON.parse(module.memory_sources || {})
    };
    
    res.json({ module: parsed });
  } catch (error) {
    console.error('[RAG-MODULES GET] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/rag-modules/:id/preview - Obtener HTML para preview del módulo
app.get('/api/admin/rag-modules/:id/preview', adminMiddleware, (req, res) => {
  try {
    const row = db.prepare(`
      SELECT html_content, module_type, style_name 
      FROM knowledge_base_modules 
      WHERE id = ?
    `).get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    
    res.json({
      success: true,
      html_content: row.html_content,
      module_type: row.module_type,
      style_name: row.style_name
    });
  } catch (error) {
    console.error('[RAG-MODULES PREVIEW] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/rag-modules - Crear módulo manualmente
app.post('/api/admin/rag-modules', adminMiddleware, (req, res) => {
  try {
    const {
      module_id, module_type, style_name, description,
      tags, descripcion_larga, theme_tags, color_palette,
      css_variables, html_content, category, is_active
    } = req.body;
    
    // Validar required fields
    if (!module_id || !module_type || !style_name || !html_content) {
      return res.status(400).json({ error: 'Faltan campos requeridos: module_id, module_type, style_name, html_content' });
    }
    
    // Validar module_type conocido
    const knownTypes = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles', 'countdown', 'padrinos', 'galeria', 'corte', 'vestimenta', 'regalos', 'hospedaje', 'transporte', 'music', 'quotes', 'mensaje', 'pascar', 'mensaje_padres', 'gracias'];
    if (!knownTypes.includes(module_type)) {
      return res.status(400).json({ error: `module_type "${module_type}" no es válido. Tipos conocidos: ${knownTypes.join(', ')}` });
    }
    
    const normalizedCat = category || 'general';
    
    const stmt = db.prepare(`
      INSERT INTO knowledge_base_modules (
        module_id, module_type, style_name, description,
        tags, descripcion_larga, theme_tags, color_palette,
        css_variables, has_memory_attributes, memory_sources,
        html_content, category, is_active, html_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Extraer metadata si no se proporciona
    const meta = extractModuleMetadata(html_content);
    const hasMemory = meta.has_memory_attributes ? 1 : 0;
    const memSources = JSON.stringify(meta.memory_sources || {});
    
    const result = stmt.run(
      module_id,
      module_type,
      style_name,
      description || meta.module_metadata.descripcion || '',
      typeof tags === 'string' ? tags : JSON.stringify(tags || meta.module_metadata.tags || []),
      typeof descripcion_larga === 'string' ? descripcion_larga : JSON.stringify(descripcion_larga || meta.module_metadata.descripcion || ''),
      typeof theme_tags === 'string' ? theme_tags : JSON.stringify(theme_tags || meta.theme_tags || []),
      typeof color_palette === 'string' ? color_palette : JSON.stringify(color_palette || meta.color_palette || {}),
      typeof css_variables === 'string' ? css_variables : JSON.stringify(css_variables || meta.css_variables || {}),
      hasMemory,
      memSources,
      html_content,
      normalizedCat,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      Buffer.byteLength(html_content, 'utf8')
    );
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Ya existe un módulo con ese module_id' });
    }
    console.error('[RAG-MODULES CREATE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/rag-modules/:id - Actualizar módulo
app.put('/api/admin/rag-modules/:id', adminMiddleware, (req, res) => {
  try {
    const body = req.body;
    const allowedFields = [
      'style_name', 'description', 'module_type', 'category',
      'tags', 'descripcion_larga', 'theme_tags', 'color_palette',
      'css_variables', 'html_content', 'is_active'
    ];
    const jsonFields = ['tags', 'descripcion_larga', 'theme_tags', 'color_palette', 'css_variables'];
    
    const setClauses = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (body[field] === undefined) continue;
      
      let value = body[field];
      
      if (field === 'is_active') {
        value = value ? 1 : 0;
      } else if (jsonFields.includes(field)) {
        value = typeof value === 'string' ? value : JSON.stringify(value);
      }
      
      if (field === 'html_content') {
        const meta = extractModuleMetadata(value);
        setClauses.push('html_size = ?');
        params.push(Buffer.byteLength(value, 'utf8'));
        setClauses.push('has_memory_attributes = ?');
        params.push(meta.has_memory_attributes ? 1 : 0);
        setClauses.push('memory_sources = ?');
        params.push(JSON.stringify(meta.memory_sources || {}));
      }
      
      setClauses.push(`${field} = ?`);
      params.push(value);
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    setClauses.push('updated_at = datetime(\'now\')');
    params.push(req.params.id);
    
    db.prepare(`UPDATE knowledge_base_modules SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    res.json({ success: true });
  } catch (error) {
    console.error('[RAG-MODULES UPDATE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/rag-modules/:id - Eliminar módulo
app.delete('/api/admin/rag-modules/:id', adminMiddleware, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM knowledge_base_modules WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[RAG-MODULES DELETE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/rag-modules/upload - Subir módulo HTML individual y analizarlo
app.post('/api/admin/rag-modules/upload', adminMiddleware, ragUpload.single('htmlFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo HTML es requerido (campo htmlFile)' });
    }
    
    const moduleTypeHint = req.body.module_type || null;
    const filename = req.file.originalname;
    const htmlContent = req.file.buffer.toString('utf8');
    
    // Analizar módulo
    const analysis = analyzeModule(htmlContent, moduleTypeHint);
    
    // VALIDACIÓN DE FALLBACK: asegurar campos requeridos antes del INSERT
    if (!analysis.module_type) {
      analysis.module_type = moduleTypeHint || 'general';
    }
    if (!analysis.module_id) {
      analysis.module_id = generateModuleIdFromFilename(filename);
    }
    if (!analysis.style_name) {
      analysis.style_name = generateStyleName(analysis.metadata, filename);
    }
    if (analysis.html_size === undefined || analysis.html_size === null) {
      analysis.html_size = Buffer.byteLength(htmlContent, 'utf8');
    }
    // Asegurar que los campos JSON/string no sean undefined
    analysis.tags = analysis.tags || '[]';
    analysis.descripcion_larga = analysis.descripcion_larga || JSON.stringify('');
    analysis.theme_tags = analysis.theme_tags || '[]';
    analysis.color_palette = analysis.color_palette || '{}';
    analysis.css_variables = analysis.css_variables || '{}';
    analysis.memory_sources = analysis.memory_sources || '{}';
    analysis.description = analysis.description || '';
    
    // Validar (sólo errores fatales, no warnings)
    if (!analysis.is_valid) {
      return res.status(400).json({ 
        error: 'Módulo no válido',
        validation: { errors: analysis.errors, warnings: analysis.warnings }
      });
    }
    
    const moduleId = analysis.module_id;
    const styleName = analysis.style_name;
    
    // Insertar con manejo de errores específico
    const stmt = db.prepare(`
      INSERT INTO knowledge_base_modules (
        module_id, module_type, style_name, description,
        tags, descripcion_larga, theme_tags, color_palette,
        css_variables, has_memory_attributes, memory_sources,
        html_content, category, is_active, filename, html_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    // Helper para ejecutar el INSERT con un module_id dado.
    // Devuelve { result, id } o lanza el error original.
    const tryInsert = (idCandidate) => {
      return stmt.run(
        idCandidate,
        analysis.module_type,
        styleName,
        analysis.description,
        analysis.tags,
        analysis.descripcion_larga,
        analysis.theme_tags,
        analysis.color_palette,
        analysis.css_variables,
        analysis.has_memory_attributes ? 1 : 0,
        analysis.memory_sources,
        htmlContent,
        'general',
        filename,
        analysis.html_size
      );
    };

    let result;
    let finalModuleId = moduleId;
    let renamedFrom = null;

    try {
      result = tryInsert(moduleId);
    } catch (dbError) {
      if (dbError.message && dbError.message.includes('NOT NULL')) {
        const fieldMap = ['module_id', 'module_type', 'style_name', 'description', 'tags', 'descripcion_larga', 'theme_tags', 'color_palette', 'css_variables', 'has_memory_attributes', 'memory_sources', 'html_content', 'category', 'filename', 'html_size'];
        const missingField = fieldMap.find(f => dbError.message.includes(f));
        return res.status(400).json({ 
          error: 'Campo requerido faltante en el módulo', 
          field: missingField || 'desconocido',
          detail: dbError.message
        });
      }
      if (dbError.message && dbError.message.includes('UNIQUE')) {
        // Reintentar con sufijo incremental en module_id hasta encontrar uno libre
        const baseId = moduleId;
        const MAX_ATTEMPTS = 50;
        const checkStmt = db.prepare('SELECT 1 FROM knowledge_base_modules WHERE module_id = ?');
        let attempt = 2;
        while (attempt <= MAX_ATTEMPTS) {
          const candidate = `${baseId}-${attempt}`;
          if (checkStmt.get(candidate)) {
            attempt++;
            continue;
          }
          try {
            result = tryInsert(candidate);
            finalModuleId = candidate;
            renamedFrom = baseId;
            break;
          } catch (e) {
            if (e.message && e.message.includes('UNIQUE')) {
              attempt++;
              continue;
            }
            throw e;
          }
        }
        if (!result) {
          return res.status(400).json({ 
            error: `No se pudo insertar el módulo: el module_id "${baseId}" y sus ${MAX_ATTEMPTS} variantes ya existen.` 
          });
        }
      } else {
        throw dbError;
      }
    }
    
    const response = {
      success: true,
      id: result.lastInsertRowid,
      module_id: finalModuleId,
      renamed_from: renamedFrom,
      module_type: analysis.module_type,
      html_content: htmlContent,
      analysis: {
        metadata: analysis.metadata,
        errors: analysis.errors,
        warnings: analysis.warnings
      }
    };
    
    res.json(response);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Ya existe un módulo con ese module_id' });
    }
    console.error('[RAG-MODULES UPLOAD] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/rag-modules/analyze - Analizar HTML de módulo con ragModuleValidator (con LLM fallback)
app.post('/api/admin/rag-modules/analyze', adminMiddleware, async (req, res) => {
  try {
    const { html, module_type } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML es requerido' });
    }

    // Helper local para sanear base64 (mismo patrón que rag-templates/analyze)
    const stripBase64Images = (rawHtml) => {
      let cleaned = rawHtml.replace(/<img\s([^>]*?)src=["']data:image\/[^"']+["']([^>]*?)\/?>/gi, (match, before, after) => {
        const alt = (match.match(/alt=["']([^"']*)["']/i) || [])[1];
        const width = (match.match(/width=["']([^"']*)["']/i) || [])[1];
        const height = (match.match(/height=["']([^"']*)["']/i) || [])[1];
        const cls = (match.match(/class=["']([^"']*)["']/i) || [])[1];
        const isSelfClosing = match.trimEnd().endsWith('/>');
        let placeholder = '<img';
        if (cls) placeholder += ` class="${cls}"`;
        if (alt) placeholder += ` alt="${alt}"`;
        if (width) placeholder += ` width="${width}"`;
        if (height) placeholder += ` height="${height}"`;
        placeholder += ' src="[IMAGE]"';
        const leftover = after.replace(/src=["']data:image[^"']+["']/i, '').trim();
        if (leftover) placeholder += ' ' + leftover;
        placeholder = placeholder.replace(/\s+/g, ' ');
        placeholder += isSelfClosing ? ' />' : '>';
        return placeholder;
      });
      cleaned = cleaned.replace(/url\(["']?data:image\/[^"')]+["']?\)/gi, 'url([BG_IMAGE])');
      cleaned = cleaned.replace(/src=["']data:[^"']+["']/gi, 'src="[MEDIA]"');
      return cleaned;
    };
    
    // 1. Regex extraction (baseline) usando ragModuleValidator
    const regexAnalysis = analyzeModule(html, module_type);

    // 2. Intento de extracción con LLM (Gemini) si hay API key configurada
    const config = db.prepare('SELECT * FROM admin_config WHERE id = 1').get();
    let llmAnalysis = null;

    if (config && config.html_google_api_key) {
      try {
        const htmlClean = stripBase64Images(html);

        const modulePrompt = `You are an expert web designer analyzing an HTML MODULE (a single reusable piece of a digital invitation) to extract its RAG (Retrieval-Augmented Generation) metadata. This is NOT a full invitation template; it is ONE module (e.g. portada, padres, ubicacion, countdown).

Analyze the following HTML code and extract ALL module properties.

Return ONLY a valid JSON object with these exact fields (no markdown, no code fences, no explanation):

{
  "module_id": "kebab-case-id-from-data-gemini-id-or-generated-from-content",
  "module_type": "One of: portada, padres, ubicacion, itinerario, confirmacion, detalles, countdown, padrinos, corte, galeria, regalos, vestimenta, hospedaje, transporte, music, quotes, mensaje, pascar, mensaje_padres, gracias",
  "style_name": "Human-readable name for this module variant (max 80 chars)",
  "description": "A vivid 1-2 sentence description of what this module does visually",
  "tags": ["tag1", "tag2", "tag3"],
  "theme_tags": ["elegant", "modern", "romantico", "animado", ...],
  "color_palette": {
    "bg_primary": "#hex",
    "bg_secondary": "#hex",
    "accent": "#hex",
    "text": "#hex",
    "text_secondary": "#hex"
  },
  "css_variables": {
    "--var-name": "value"
  },
  "has_memory_attributes": true/false,
  "memory_sources": {
    "generated": 0,
    "library": 0
  }
}

Rules:
- Detect data-gemini-id attribute to derive module_id and module_type (module_type is the part before the first hyphen, e.g. "portada-nombre" → "portada").
- memory_attributes: true if any element in the module has memory_type, memory_usage, or memory_source attributes.
- memory_sources: count occurrences of memory_source="generated" and memory_source="library" across all elements (including descendants of elements with memory_source inherited).
- theme_tags: extract from font families, CSS techniques (glassmorphism, gradients, animations), and visual style. Use Spanish tags like: elegante, moderno, romantico, impactante, glassmorphism, gradientes, animado, cinematografico.
- color_palette: extract actual hex/rgb values used in CSS variables or inline styles. Map to canonical keys when possible.
- css_variables: extract all CSS custom properties (--xxx) declared in <style> blocks of the module.
- description and tags should reflect the module purpose (e.g. "portada with countdown", "ubicacion with map placeholder").
- If data-gemini-id is missing, generate a meaningful module_id based on the module_type and content.

HTML to analyze (base64 images stripped to save tokens):
${htmlClean.substring(0, 30000)}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.html_google_model || 'gemini-2.0-flash'}:generateContent`;
        
        const httpsAgent = new (await import('https')).Agent({ rejectUnauthorized: false });
        const llmResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.html_google_api_key
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: modulePrompt }] }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              maxOutputTokens: 4096
            }
          })
        });

        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          const llmText = llmData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          const jsonMatch = llmText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            llmAnalysis = JSON.parse(jsonMatch[0]);
            console.log('[RAG-MODULE ANALYZE] LLM extraction successful');
          }
        } else {
          const errBody = await llmResponse.text();
          console.log('[RAG-MODULE ANALYZE] LLM call failed, using regex fallback:', llmResponse.status, errBody.substring(0, 200));
        }
      } catch (llmError) {
        console.error('[RAG-MODULE ANALYZE] LLM error, using regex fallback:', llmError.message);
      }
    } else {
      console.log('[RAG-MODULE ANALYZE] No Gemini API key configured, using regex extraction only');
    }

    // 3. Construir análisis final: LLM tiene prioridad, regex llena los huecos
    const analysis = {
      module_id: llmAnalysis?.module_id || regexAnalysis.module_id,
      module_type: llmAnalysis?.module_type || regexAnalysis.module_type || module_type || null,
      style_name: llmAnalysis?.style_name || regexAnalysis.style_name,
      description: llmAnalysis?.description || regexAnalysis.description,
      tags: Array.isArray(llmAnalysis?.tags) ? llmAnalysis.tags : JSON.parse(regexAnalysis.tags),
      descripcion_larga: JSON.parse(regexAnalysis.descripcion_larga),
      theme_tags: Array.isArray(llmAnalysis?.theme_tags) ? llmAnalysis.theme_tags : JSON.parse(regexAnalysis.theme_tags),
      color_palette: (llmAnalysis?.color_palette && typeof llmAnalysis.color_palette === 'object') 
        ? llmAnalysis.color_palette 
        : JSON.parse(regexAnalysis.color_palette),
      css_variables: (llmAnalysis?.css_variables && typeof llmAnalysis.css_variables === 'object')
        ? llmAnalysis.css_variables
        : JSON.parse(regexAnalysis.css_variables),
      has_memory_attributes: typeof llmAnalysis?.has_memory_attributes === 'boolean'
        ? (llmAnalysis.has_memory_attributes ? 1 : 0)
        : regexAnalysis.has_memory_attributes,
      memory_sources: (llmAnalysis?.memory_sources && typeof llmAnalysis.memory_sources === 'object')
        ? llmAnalysis.memory_sources
        : JSON.parse(regexAnalysis.memory_sources),
      html_size: regexAnalysis.html_size,
      is_valid: regexAnalysis.is_valid,
      errors: regexAnalysis.errors,
      warnings: regexAnalysis.warnings,
      metadata: regexAnalysis.metadata,
      llm_used: llmAnalysis !== null
    };
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('[RAG-MODULES ANALYZE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rag/modules/query - Query público para buscar módulos por tipo y tags
app.get('/api/rag/modules/query', (req, res) => {
  try {
    const { module_type, tags, category, limit = 5 } = req.query;
    
    if (!module_type) {
      return res.status(400).json({ error: 'module_type es requerido (ej: portada, padres, ubicacion)' });
    }
    
    let query = `
      SELECT id, module_id, module_type, style_name, description, tags,
             theme_tags, color_palette, css_variables, memory_sources,
             category, html_size
      FROM knowledge_base_modules 
      WHERE is_active = 1 AND module_type = ?
    `;
    const params = [module_type];
    
    if (category && category !== 'general') {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (tags) {
      // Buscar módulos que tengan al menos uno de los tags solicitados
      const tagList = tags.split(',').map(t => t.trim());
      // Construir condiciones OR para cada tag
      const tagConditions = tagList.map(() => 'tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      tagList.forEach(tag => {
        params.push(`%"${tag}"%`);
      });
    }
    
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(parseInt(limit) || 5);
    
    const modules = db.prepare(query).all(...params);
    
    // Parsear JSON
    const parsed = modules.map(m => ({
      ...m,
      tags: JSON.parse(m.tags || '[]'),
      theme_tags: JSON.parse(m.theme_tags || []),
      color_palette: JSON.parse(m.color_palette || {}),
      css_variables: JSON.parse(m.css_variables || {}),
      memory_sources: JSON.parse(m.memory_sources || {})
    }));
    
    res.json({ modules: parsed });
  } catch (error) {
    console.error('[RAG-MODULES QUERY] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== FIN RAG MODULAR ENDPOINTS ====================
