const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin.replace(':3000', ':3001');
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || window.location.origin;
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';
const LOCAL_API = `${window.location.origin.replace(':3000', ':3001')}/api/auth`;

export interface User {
  id: number;
  name: string;
  email: string;
  role_name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ConsumeTokenResponse {
  token: string;
  user: User;
}

export interface IssueResponse {
  code: string;
  expires_in: number;
}

export const getApiBaseUrl = (): string => API_BASE_URL;
export const getDashboardUrl = (): string => DASHBOARD_URL;
export const isDevMode = (): boolean => DEV_MODE;

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${LOCAL_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.email || 'Error al iniciar sesión');
  }
  
  return response.json();
};

export const issueCode = async (token: string): Promise<IssueResponse> => {
  const response = await fetch(`${LOCAL_API}/issue`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al emitir código SSO');
  }
  
  return response.json();
};

export const consumeToken = async (code: string): Promise<ConsumeTokenResponse> => {
  const response = await fetch(`${LOCAL_API}/consume-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ code })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Código inválido o expirado');
  }
  
  return response.json();
};

export const getUser = async (token: string): Promise<User> => {
  const response = await fetch(`${LOCAL_API}/user`, {
    headers: { 
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('No autenticado');
  }
  
  return response.json();
};

export const logout = async (token: string): Promise<void> => {
  await fetch(`${LOCAL_API}/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

export const setAuthToken = async (token: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${window.location.origin.replace(':3000', ':3001')}/api/auth/set-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token })
  });
  
  if (!response.ok) {
    throw new Error('Error al guardar token');
  }
  
  return response.json();
};

export const clearAuthToken = async (): Promise<{ success: boolean }> => {
  const response = await fetch(`${window.location.origin.replace(':3000', ':3001')}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  
  return response.json();
};

export const getCurrentUser = async (): Promise<{ user: User | null; authenticated: boolean }> => {
  const response = await fetch(`${window.location.origin.replace(':3000', ':3001')}/api/auth/me`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    return { user: null, authenticated: false };
  }
  
  return response.json();
};
