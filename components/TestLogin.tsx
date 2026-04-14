import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Eye, EyeOff, ExternalLink, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardUrl } from '../services/authService';

export const TestLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, token, generateSSOCode, logout } = useAuth();

  const [email, setEmail] = useState('arj1931126@gmail.com');
  const [password, setPassword] = useState('Jar123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoCode, setSsoCode] = useState<{ code: string; expires_in: number } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSSO = async () => {
    setLoading(true);
    try {
      const result = await generateSSOCode();
      if (result) {
        setSsoCode(result);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSSO = () => {
    if (ssoCode) {
      window.location.href = `/sso/consume?code=${ssoCode.code}`;
    }
  };

  const handleLogout = async () => {
    await logout();
    setSsoCode(null);
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 py-10">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-pink-100 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-8 text-white">
              <h1 className="text-2xl font-bold mb-2">Sesión Activa</h1>
              <p className="opacity-90">Estás autenticado correctamente</p>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Datos del Usuario</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID:</span>
                    <span className="font-mono">{user.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nombre:</span>
                    <span>{user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span>{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rol:</span>
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full text-xs">{user.role_name}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Token (solo para pruebas)
                </h3>
                <p className="text-xs text-amber-700 break-all font-mono bg-amber-100 rounded-lg p-2">
                  {token}
                </p>
              </div>

              {!ssoCode ? (
                <button
                  onClick={handleGenerateSSO}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Generar código SSO de prueba
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-emerald-800 mb-2">Código SSO generado</h3>
                  <p className="text-xs text-emerald-700 break-all font-mono bg-emerald-100 rounded-lg p-2 mb-2">
                    {ssoCode.code}
                  </p>
                  <p className="text-sm text-emerald-600 mb-3">
                    Expira en {ssoCode.expires_in} segundos
                  </p>
                  <button
                    onClick={handleTestSSO}
                    className="w-full py-2 bg-emerald-500 text-white rounded-lg font-medium"
                  >
                    Probar consumo de código SSO
                  </button>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-2 bg-pink-100 text-pink-600 rounded-xl font-medium hover:bg-pink-200"
                >
                  Ir al Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a
              href={getDashboardUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-pink-500 flex items-center justify-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Ir al Dashboard principal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center py-10">
      <div className="bg-white rounded-2xl border border-pink-100 shadow-xl overflow-hidden max-w-md w-full mx-4">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-8 text-white">
          <h1 className="text-2xl font-bold mb-2">Página de Prueba</h1>
          <p className="opacity-90">Solo disponible en desarrollo</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Iniciar Sesión
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Credenciales de prueba precargadas
          </p>
        </form>
      </div>
    </div>
  );
};
