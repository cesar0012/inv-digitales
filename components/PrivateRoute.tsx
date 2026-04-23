import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [loginUrl, setLoginUrl] = useState<string>('/admin-login');

  useEffect(() => {
    const fetchLoginUrl = async () => {
      try {
        const baseUrl = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:3001';
        const res = await fetch(`${baseUrl}/api/config/public`);
        const config = await res.json();
        setLoginUrl(config.login_page_url || '/admin-login');
      } catch {
        setLoginUrl('/admin-login');
      }
    };
    fetchLoginUrl();
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      if (loginUrl.startsWith('http://') || loginUrl.startsWith('https://')) {
        window.location.href = loginUrl;
      }
    }
  }, [loading, isAuthenticated, loginUrl]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (loginUrl.startsWith('http://') || loginUrl.startsWith('https://')) {
      return null;
    }
    window.location.href = loginUrl;
    return null;
  }

  return <>{children}</>;
};
