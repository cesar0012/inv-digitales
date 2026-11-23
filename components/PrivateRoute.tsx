import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getNoSessionUrl } from '../services/noSessionRedirect';
import { Loader2 } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const Espera: React.FC<{ texto: string }> = ({ texto }) => (
  <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
      <p className="text-gray-600">{texto}</p>
    </div>
  </div>
);

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  // Destino para quien no tiene sesión (null = todavía no se sabe)
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    // Nunca falla: ante cualquier error devuelve la página de planes de la app.
    getNoSessionUrl().then((url) => { if (vivo) setDestino(url); });
    return () => { vivo = false; };
  }, []);

  // Sin sesión se sale del generador hacia el destino único. Ese destino
  // nunca es /admin ni una página privada, así que no puede haber bucle.
  useEffect(() => {
    if (!loading && !isAuthenticated && destino && destino !== window.location.href) {
      window.location.assign(destino);
    }
  }, [loading, isAuthenticated, destino]);

  if (loading) return <Espera texto="Verificando autenticación..." />;
  if (!isAuthenticated) return <Espera texto="Un momento..." />;
  return <>{children}</>;
};
