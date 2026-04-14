import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  login as authServiceLogin, 
  consumeToken, 
  setAuthToken, 
  clearAuthToken, 
  getCurrentUser,
  issueCode,
  logout as authServiceLogout,
  getDashboardUrl
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  consumeSSOCode: (code: string) => Promise<void>;
  redirectToDashboard: () => void;
  generateSSOCode: () => Promise<{ code: string; expires_in: number } | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { user, authenticated } = await getCurrentUser();
      if (authenticated && user) {
        setUser(user);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authServiceLogin(email, password);
    await setAuthToken(response.token);
    setUser(response.user);
    setToken(response.token);
  };

  const logout = async () => {
    try {
      if (token) {
        await authServiceLogout(token);
      }
      await clearAuthToken();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  const consumeSSOCode = async (code: string) => {
    const response = await consumeToken(code);
    await setAuthToken(response.token);
    setUser(response.user);
    setToken(response.token);
  };

  const redirectToDashboard = () => {
    window.location.href = `${getDashboardUrl()}/login`;
  };

  const generateSSOCode = async () => {
    if (!token) return null;
    
    try {
      const response = await issueCode(token);
      return response;
    } catch (error) {
      console.error('Error generating SSO code:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        consumeSSOCode,
        redirectToDashboard,
        generateSSOCode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
