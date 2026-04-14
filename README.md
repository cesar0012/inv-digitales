<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Invitaciones Digitales 🚀

## Run Locally
```bash
npm install
npm run dev
```
Frontend: http://localhost:3002
Backend: http://localhost:3001

## 🚀 Despliegue en Coolify (Producción)

### 1. Preparar Repositorio
```bash
git init
git add .
git commit -m "Ready for Coolify"
git remote add origin https://github.com/tuuser/invitaciones-digitales.git
git push -u origin main
```

### 2. Coolify Dashboard
```
New Project → GitHub repo
New Application (Node.js):
├── Build Command: npm ci
├── Start Command: npm start
├── Ports: 3001 (HTTP)
├── Persistent Volume: /app/server/storage
└── Environment Variables:
    NODE_ENV=production
    VITE_PUBLIC_URL=https://tudominio.com
    GEMINI_API_KEY=AIzaSy...
```

### 3. Configuración Post-Deploy
1. Visita https://tudominio.com/admin
2. Login admin (test@test.com / test123)
3. Panel Admin → Configurar API Keys:
   - html_google_api_key (Gemini HTML)
   - image_api_key (Gemini Imágenes)

### 4. URLs en Producción
```
✅ App: https://tudominio.com
✅ Invitaciones: https://tudominio.com/i/slug
✅ API: https://tudominio.com/api/*
✅ Admin: https://tudominio.com/admin
```

## 🔧 Variables Importantes (.env.example)
Ver `.env.example` para todas las variables.

**¡Listo para Production! 🎉**
