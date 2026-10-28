import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const SSOConsume: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { consumeSSOCode } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const consumedRef = useRef(false);
  
  useEffect(() => {
    // Evitar múltiples llamadas
    if (consumedRef.current) return;
    
    const code = searchParams.get('code');
    
    if (!code) {
      setStatus('error');
      setError('No se encontró código SSO en la URL');
      return;
    }
    
    const consume = async () => {
      consumedRef.current = true;
      
      try {
        await consumeSSOCode(code);
        setStatus('success');
        setTimeout(() => navigate('/'), 1500);
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Error al procesar código SSO');
      }
    };
    
    consume();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-pink-100 shadow-xl p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Procesando autenticación...</h2>
            <p className="text-gray-500">Verificando código SSO</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">¡Autenticación exitosa!</h2>
            <p className="text-gray-500">Redirigiendo al panel...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Error de autenticación</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => navigate('/test')}
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium"
            >
              Ir a página de prueba
            </button>
          </>
        )}
      </div>
    </div>
  );
};
